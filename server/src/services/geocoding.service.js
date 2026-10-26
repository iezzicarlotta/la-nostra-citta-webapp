import { spawn } from 'node:child_process';
import { HttpError } from '../utils/http-error.js';

const cache = new Map();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;
const cacheLifetime = 24 * 60 * 60 * 1000;
const requestTimeout = 3500;
const viewbox = '9.0406,45.53595,9.27799,45.38672';

function curlConfigValue(value) {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replace(/[\r\n]/g, ' ')}"`;
}

function requestWithCurl(url) {
  return new Promise((resolve, reject) => {
    const child = spawn('curl', [
      '--silent', '--show-error', '--max-time', '12',
      '--write-out', '\n%{http_code}', '--config', '-'
    ], { stdio: ['pipe', 'pipe', 'ignore'] });
    let output = '';

    child.stdout.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
    child.once('error', reject);
    child.once('close', (exitCode) => {
      if (exitCode !== 0) return reject(new Error('Trasporto Nominatim non disponibile.'));
      const separator = output.lastIndexOf('\n');
      const statusCode = Number(output.slice(separator + 1));
      if (statusCode < 200 || statusCode >= 300) {
        return reject(new Error(`Nominatim ha risposto ${statusCode}.`));
      }
      try {
        resolve(JSON.parse(output.slice(0, separator)));
      } catch {
        reject(new Error('Risposta Nominatim non valida.'));
      }
    });

    child.stdin.end([
      `url = ${curlConfigValue(url)}`,
      `header = ${curlConfigValue('User-Agent: LaNostraCittaWebApp/1.0 (https://github.com/iezzicarlotta/la-nostra-citta-webapp)')}`,
      `header = ${curlConfigValue('Accept-Language: it')}`
    ].join('\n'));
  });
}

function queueNominatimRequest(url) {
  const request = requestQueue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'LaNostraCittaWebApp/1.0 (https://github.com/iezzicarlotta/la-nostra-citta-webapp)',
          'Accept-Language': 'it'
        },
        signal: AbortSignal.timeout(requestTimeout)
      });
    } catch {
      return requestWithCurl(url);
    }
    if (!response.ok) throw new Error(`Nominatim ha risposto ${response.status}.`);
    return response.json();
  });
  requestQueue = request.catch(() => {});
  return request;
}

function formatAddress(result) {
  const street = result.address?.road || result.address?.pedestrian || result.address?.footway;
  const houseNumber = result.address?.house_number;
  if (street) return [street, houseNumber].filter(Boolean).join(' ');
  return result.name || result.display_name.split(',').slice(0, 2).join(',').trim();
}

export async function searchAddress(address) {
  const normalizedAddress = address.trim().replace(/\s+/g, ' ');
  const cacheKey = normalizedAddress.toLocaleLowerCase('it');
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  const params = new URLSearchParams({
    q: `${normalizedAddress}, Milano, Italia`,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'it',
    viewbox,
    bounded: '1'
  });

  let matches;
  try {
    matches = await queueNominatimRequest(`https://nominatim.openstreetmap.org/search?${params}`);
  } catch {
    throw new HttpError(503, 'Ricerca indirizzo momentaneamente non disponibile.', 'GEOCODER_UNAVAILABLE');
  }

  const results = matches.filter((match) => Number.isFinite(Number(match.lat)) && Number.isFinite(Number(match.lon)))
    .map((match) => ({
      latitude: Number(match.lat),
      longitude: Number(match.lon),
      displayName: match.display_name,
      formattedAddress: formatAddress(match)
    }));

  cache.set(cacheKey, { results, expiresAt: Date.now() + cacheLifetime });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return results;
}