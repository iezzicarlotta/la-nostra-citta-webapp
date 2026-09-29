import { pool } from '../config/db.js';

const publicColumns = `
  u.id_utente AS id,
  u.nome AS firstName,
  u.cognome AS lastName,
  u.email,
  u.ruolo AS role,
  u.stato_account AS accountStatus,
  u.data_registrazione AS registeredAt,
  u.id_quartiere_residenza AS neighborhoodId,
  q.nome AS neighborhoodName
`;

export async function findUserByEmail(email, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT ${publicColumns}, u.password_hash AS passwordHash
     FROM utente u
     LEFT JOIN quartiere q ON q.id_quartiere = u.id_quartiere_residenza
     WHERE u.email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findUserById(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT ${publicColumns}
     FROM utente u
     LEFT JOIN quartiere q ON q.id_quartiere = u.id_quartiere_residenza
     WHERE u.id_utente = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createUser(data, connection = pool) {
  const [result] = await connection.execute(
    `INSERT INTO utente (nome, cognome, email, password_hash, id_quartiere_residenza)
     VALUES (?, ?, ?, ?, ?)`,
    [data.firstName, data.lastName, data.email, data.passwordHash, data.neighborhoodId ?? null]
  );
  return findUserById(result.insertId, connection);
}

export async function updateProfile(id, data, connection = pool) {
  await connection.execute(
    `UPDATE utente SET nome = ?, cognome = ?, id_quartiere_residenza = ? WHERE id_utente = ?`,
    [data.firstName, data.lastName, data.neighborhoodId, id]
  );
  return findUserById(id, connection);
}

export async function listUsers({ page, limit, search = '' }, connection = pool) {
  const offset = (page - 1) * limit;
  const pattern = `%${search}%`;
  const [rows] = await connection.execute(
    `SELECT ${publicColumns}
     FROM utente u
     LEFT JOIN quartiere q ON q.id_quartiere = u.id_quartiere_residenza
     WHERE (? = '' OR u.nome LIKE ? OR u.cognome LIKE ? OR u.email LIKE ?)
     ORDER BY u.data_registrazione DESC
     LIMIT ? OFFSET ?`,
    [search, pattern, pattern, pattern, limit, offset]
  );
  const [[count]] = await connection.execute(
    `SELECT COUNT(*) AS total FROM utente
     WHERE (? = '' OR nome LIKE ? OR cognome LIKE ? OR email LIKE ?)`,
    [search, pattern, pattern, pattern]
  );
  return { items: rows, page, limit, total: count.total };
}

export async function updateUserAdmin(id, data, connection = pool) {
  const fields = [];
  const values = [];
  if (data.role) { fields.push('ruolo = ?'); values.push(data.role); }
  if (data.accountStatus) { fields.push('stato_account = ?'); values.push(data.accountStatus); }
  values.push(id);
  await connection.execute(`UPDATE utente SET ${fields.join(', ')} WHERE id_utente = ?`, values);
  return findUserById(id, connection);
}

export function toSessionUser(user) {
  return { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role };
}
