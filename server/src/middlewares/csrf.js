import crypto from 'node:crypto';
import { HttpError } from '../utils/http-error.js';

export function issueCsrfToken(request, response) {
  if (!request.session.csrfToken) {
    request.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  response.json({ csrfToken: request.session.csrfToken });
}

export function requireCsrf(request, _response, next) {
  const supplied = request.get('x-csrf-token');
  const expected = request.session?.csrfToken;
  if (!supplied || !expected) {
    return next(new HttpError(403, 'Token CSRF mancante.', 'CSRF_INVALID'));
  }
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return next(new HttpError(403, 'Token CSRF non valido.', 'CSRF_INVALID'));
  }
  next();
}
