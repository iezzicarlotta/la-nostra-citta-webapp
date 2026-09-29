import { pool } from '../config/db.js';

export async function writeAudit({ userId = null, action, entity = null, entityId = null, details = null, ip = null }, connection = pool) {
  await connection.execute(
    `INSERT INTO audit_log (id_utente, azione, entita, id_entita, dettagli, indirizzo_ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, action, entity, entityId, details ? JSON.stringify(details) : null, ip]
  );
}
