import { HttpError } from '../utils/http-error.js';
import { findUserById, toSessionUser } from '../repositories/user.repository.js';

async function loadActiveUser(request) {
  if (!request.session?.user) {
    throw new HttpError(401, 'Devi effettuare l’accesso.', 'AUTH_REQUIRED');
  }
  const user = await findUserById(request.session.user.id);
  if (!user || user.accountStatus !== 'ATTIVO') {
    throw new HttpError(401, 'La sessione non è più valida.', 'SESSION_INVALID');
  }
  request.session.user = toSessionUser(user);
  return user;
}

export async function requireAuth(request, _response, next) {
  try {
    await loadActiveUser(request);
    next();
  } catch (error) { next(error); }
}

export function requireRole(...roles) {
  return async (request, _response, next) => {
    try {
      const user = await loadActiveUser(request);
      if (!roles.includes(user.role)) {
        throw new HttpError(403, 'Non hai i permessi necessari.', 'FORBIDDEN');
      }
      next();
    } catch (error) { next(error); }
  };
}
