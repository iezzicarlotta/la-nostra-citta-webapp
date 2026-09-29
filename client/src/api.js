let csrfToken = null;

async function parseResponse(response) {
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Richiesta non riuscita.');
    error.code = data.error?.code;
    error.details = data.error?.details;
    throw error;
  }
  return data;
}

export async function refreshCsrf() {
  const response = await fetch('/api/auth/csrf', { credentials: 'include' });
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
  const response = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' });
  const result = await parseResponse(response);
  if (mutating && ['/auth/login', '/auth/register', '/auth/logout'].includes(path)) csrfToken = null;
  return result;
}

export function jsonBody(value) {
  return JSON.stringify(value);
}
