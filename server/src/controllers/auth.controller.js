import { authenticate, editProfile, getProfile, register } from '../services/auth.service.js';
import { toSessionUser } from '../repositories/user.repository.js';
import { writeAudit } from '../repositories/audit.repository.js';

function regenerateSession(request) {
  return new Promise((resolve, reject) => request.session.regenerate((error) => error ? reject(error) : resolve()));
}

function destroySession(request) {
  return new Promise((resolve, reject) => request.session.destroy((error) => error ? reject(error) : resolve()));
}

export async function registerController(request, response) {
  const user = await register(request.body);
  await regenerateSession(request);
  request.session.user = toSessionUser(user);
  await writeAudit({ userId: user.id, action: 'REGISTRAZIONE', entity: 'utente', entityId: user.id, ip: request.ip });
  response.status(201).json({ user });
}

export async function loginController(request, response) {
  const user = await authenticate(request.body.email, request.body.password);
  await regenerateSession(request);
  request.session.user = toSessionUser(user);
  await writeAudit({ userId: user.id, action: 'LOGIN', entity: 'utente', entityId: user.id, ip: request.ip });
  response.json({ user });
}

export async function logoutController(request, response) {
  const userId = request.session.user?.id;
  if (userId) await writeAudit({ userId, action: 'LOGOUT', entity: 'utente', entityId: userId, ip: request.ip });
  await destroySession(request);
  response.clearCookie('lnc.sid');
  response.status(204).end();
}

export async function meController(request, response) {
  response.json({ user: await getProfile(request.session.user.id) });
}

export async function profileController(request, response) {
  const user = await editProfile(request.session.user.id, request.body);
  request.session.user = toSessionUser(user);
  await writeAudit({ userId: user.id, action: 'PROFILO_MODIFICATO', entity: 'utente', entityId: user.id, ip: request.ip });
  response.json({ user });
}
