import argon2 from 'argon2';
import { HttpError } from '../utils/http-error.js';
import { createUser, findUserByEmail, findUserById, updateProfile } from '../repositories/user.repository.js';

const argonOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
};

export async function verifyPasswordHash(passwordHash, password) {
  if (typeof passwordHash !== 'string' || !passwordHash.startsWith('$argon2id$')) return false;
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function register(data) {
  const existing = await findUserByEmail(data.email);
  if (existing) throw new HttpError(409, 'Esiste già un account con questa e-mail.', 'EMAIL_EXISTS');
  const passwordHash = await argon2.hash(data.password, argonOptions);
  return createUser({ ...data, passwordHash });
}

export async function authenticate(email, password) {
  const user = await findUserByEmail(email);
  const valid = user ? await verifyPasswordHash(user.passwordHash, password) : false;
  if (!valid) throw new HttpError(401, 'E-mail o password non corrette.', 'INVALID_CREDENTIALS');
  if (user.accountStatus !== 'ATTIVO') throw new HttpError(403, 'Account non attivo.', 'ACCOUNT_DISABLED');
  delete user.passwordHash;
  return user;
}

export async function getProfile(id) {
  const user = await findUserById(id);
  if (!user) throw new HttpError(404, 'Utente non trovato.', 'USER_NOT_FOUND');
  return user;
}

export async function editProfile(id, data) {
  const user = await updateProfile(id, data);
  if (!user) throw new HttpError(404, 'Utente non trovato.', 'USER_NOT_FOUND');
  return user;
}
