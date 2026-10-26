let csrfToken = null;

async function fetchResponse(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error('Server non raggiungibile. Verifica che il backend sia attivo e riprova.');
  }
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallbackMessage = response.status >= 500
      ? 'Il server non è disponibile. Verifica che il backend sia attivo e riprova.'
      : `Richiesta non riuscita (HTTP ${response.status}).`;
    const error = new Error(data.error?.message || fallbackMessage);
    error.code = data.error?.code;
    error.details = data.error?.details;
    throw error;
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Il server ha restituito una risposta inattesa. Verifica che il backend sia attivo.');
  }
  return data;
}

export async function refreshCsrf() {
  const response = await fetchResponse('/api/auth/csrf', { credentials: 'include' });
  const data = await parseResponse(response);
  csrfToken = data.csrfToken;
  return csrfToken;
}

export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (mutating && !csrfToken) await refreshCsrf();
  const headers = new Headers(options.headers || {});
  if (mutating) headers.set('x-csrf-token', csrfToken);
  if (options.body && !(options.body instanceof FormData)) headers.set('content-type', 'application/json');
  const response = await fetchResponse(`/api${path}`, { ...options, headers, credentials: 'include' });
  const result = await parseResponse(response);
  if (mutating && ['/auth/login', '/auth/register', '/auth/logout'].includes(path)) csrfToken = null;
  return result;
}

export function jsonBody(value) {
  return JSON.stringify(value);
}
