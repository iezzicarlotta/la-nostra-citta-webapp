import session from 'express-session';
import { pool } from './db.js';
import { env } from './env.js';

export class MySqlSessionStore extends session.Store {
  constructor() {
    super();
    this.cleanupTimer = setInterval(() => {
      pool.execute('DELETE FROM sessione_web WHERE scadenza <= NOW(3)').catch(() => {});
    }, 15 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  get(sessionId, callback) {
    pool.execute(
      'SELECT dati FROM sessione_web WHERE id_sessione = ? AND scadenza > NOW(3) LIMIT 1',
      [sessionId]
    ).then(([rows]) => {
      if (!rows[0]) return callback(null, null);
      const data = typeof rows[0].dati === 'string' ? JSON.parse(rows[0].dati) : rows[0].dati;
      callback(null, data);
    }).catch(callback);
  }

  set(sessionId, sessionData, callback = () => {}) {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires)
      : new Date(Date.now() + env.SESSION_MAX_AGE_MS);
    pool.execute(
      `INSERT INTO sessione_web (id_sessione, dati, scadenza)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE dati = VALUES(dati), scadenza = VALUES(scadenza)`,
      [sessionId, JSON.stringify(sessionData), expires]
    ).then(() => callback(null)).catch(callback);
  }

  destroy(sessionId, callback = () => {}) {
    pool.execute('DELETE FROM sessione_web WHERE id_sessione = ?', [sessionId])
      .then(() => callback(null)).catch(callback);
  }

  touch(sessionId, sessionData, callback = () => {}) {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires)
      : new Date(Date.now() + env.SESSION_MAX_AGE_MS);
    pool.execute('UPDATE sessione_web SET scadenza = ? WHERE id_sessione = ?', [expires, sessionId])
      .then(() => callback(null)).catch(callback);
  }
}
