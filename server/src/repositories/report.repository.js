import { pool } from '../config/db.js';

const reportSelect = `
  s.id_segnalazione AS id,
  s.titolo AS title,
  s.descrizione AS description,
  s.data_inserimento AS createdAt,
  s.data_aggiornamento AS updatedAt,
  s.latitudine AS latitude,
  s.longitudine AS longitude,
  s.indirizzo AS address,
  s.visibilita AS visibility,
  s.id_autore AS authorId,
  q.id_quartiere AS neighborhoodId,
  q.nome AS neighborhoodName,
  st.id_stato AS statusId,
  st.nome AS statusName,
  st.pubblicabile AS publishable,
  (SELECT a.id_allegato FROM allegato a
   WHERE a.id_segnalazione = s.id_segnalazione AND a.tipo_media = 'IMMAGINE'
   ORDER BY a.data_caricamento LIMIT 1) AS previewAttachmentId,
  CASE WHEN s.visibilita = 'ANONIMA' THEN NULL ELSE CONCAT(u.nome, ' ', LEFT(u.cognome, 1), '.') END AS authorDisplayName,
  (SELECT COUNT(*) FROM sostegno so WHERE so.id_segnalazione = s.id_segnalazione) AS supportCount,
  (SELECT GROUP_CONCAT(c.nome ORDER BY c.nome SEPARATOR '||')
     FROM segnalazione_categoria sc JOIN categoria c ON c.id_categoria = sc.id_categoria
     WHERE sc.id_segnalazione = s.id_segnalazione) AS categoryNames
`;

function normalizeReport(row) {
  return {
    ...row,
    publishable: Boolean(row.publishable),
    categories: row.categoryNames ? row.categoryNames.split('||') : []
  };
}

export async function listPublicReports(filters, userId = null, connection = pool) {
  const where = ["st.pubblicabile = TRUE", "s.visibilita IN ('PUBBLICA', 'ANONIMA')"];
  const params = [];
  if (filters.neighborhoodId) { where.push('s.id_quartiere = ?'); params.push(filters.neighborhoodId); }
  if (filters.statusId) { where.push('s.id_stato_corrente = ?'); params.push(filters.statusId); }
  if (filters.categoryId) {
    where.push('EXISTS (SELECT 1 FROM segnalazione_categoria scf WHERE scf.id_segnalazione = s.id_segnalazione AND scf.id_categoria = ?)');
    params.push(filters.categoryId);
  }
  if (filters.search) {
    where.push('(s.titolo LIKE ? OR s.descrizione LIKE ? OR s.indirizzo LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }
  const orderBy = {
    newest: 's.data_inserimento DESC',
    oldest: 's.data_inserimento ASC',
    support: 'supportCount DESC, s.data_inserimento DESC'
  }[filters.sort];
  const offset = (filters.page - 1) * filters.limit;

  const [rows] = await connection.execute(
    `SELECT ${reportSelect},
      EXISTS(SELECT 1 FROM sostegno mine WHERE mine.id_segnalazione = s.id_segnalazione AND mine.id_utente = ?) AS supportedByMe
     FROM segnalazione s
     JOIN utente u ON u.id_utente = s.id_autore
     JOIN quartiere q ON q.id_quartiere = s.id_quartiere
     JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [userId || 0, ...params, filters.limit, offset]
  );
  const [[count]] = await connection.execute(
    `SELECT COUNT(*) AS total
     FROM segnalazione s
     JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
     WHERE ${where.join(' AND ')}`,
    params
  );
  return {
    items: rows.map((row) => ({ ...normalizeReport(row), supportedByMe: Boolean(row.supportedByMe) })),
    page: filters.page,
    limit: filters.limit,
    total: count.total
  };
}

export async function listPublicMapReports(connection = pool) {
  const [rows] = await connection.execute(
    `SELECT s.id_segnalazione AS id, s.titolo AS title, s.descrizione AS description,
            s.latitudine AS latitude, s.longitudine AS longitude, s.indirizzo AS address,
            q.nome AS neighborhoodName, st.nome AS statusName,
            (SELECT GROUP_CONCAT(c.nome ORDER BY c.nome SEPARATOR '||')
             FROM segnalazione_categoria sc
             JOIN categoria c ON c.id_categoria = sc.id_categoria
             WHERE sc.id_segnalazione = s.id_segnalazione) AS categoryNames
     FROM segnalazione s
     JOIN quartiere q ON q.id_quartiere = s.id_quartiere
     JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
     WHERE st.pubblicabile = TRUE
       AND s.visibilita IN ('PUBBLICA', 'ANONIMA')
       AND s.latitudine IS NOT NULL AND s.longitudine IS NOT NULL
       AND s.latitudine BETWEEN -90 AND 90
       AND s.longitudine BETWEEN -180 AND 180
     ORDER BY s.data_inserimento DESC`
  );
  return rows.map(({ categoryNames, ...row }) => ({
    ...row,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    categories: categoryNames ? categoryNames.split('||') : []
  }));
}

export async function listModerationReports({ page, limit }, connection = pool) {
  const offset = (page - 1) * limit;
  const [rows] = await connection.execute(
    `SELECT ${reportSelect}
     FROM segnalazione s
     JOIN utente u ON u.id_utente = s.id_autore
     JOIN quartiere q ON q.id_quartiere = s.id_quartiere
     JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
     ORDER BY st.ordine ASC, s.data_inserimento ASC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[count]] = await connection.execute(`SELECT COUNT(*) AS total FROM segnalazione`);
  return { items: rows.map(normalizeReport), page, limit, total: count.total };
}

export async function listOwnReports(userId, { page, limit }, connection = pool) {
  const offset = (page - 1) * limit;
  const [rows] = await connection.execute(
    `SELECT ${reportSelect}
     FROM segnalazione s
     JOIN utente u ON u.id_utente = s.id_autore
     JOIN quartiere q ON q.id_quartiere = s.id_quartiere
     JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
     WHERE s.id_autore = ?
     ORDER BY s.data_inserimento DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  const [[count]] = await connection.execute(
    `SELECT COUNT(*) AS total FROM segnalazione WHERE id_autore = ?`,
    [userId]
  );
  return { items: rows.map(normalizeReport), page, limit, total: count.total };
}

export async function findReportById(id, userId = null, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT ${reportSelect},
      EXISTS(SELECT 1 FROM sostegno mine WHERE mine.id_segnalazione = s.id_segnalazione AND mine.id_utente = ?) AS supportedByMe
     FROM segnalazione s
     JOIN utente u ON u.id_utente = s.id_autore
     JOIN quartiere q ON q.id_quartiere = s.id_quartiere
     JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
     WHERE s.id_segnalazione = ? LIMIT 1`,
    [userId || 0, id]
  );
  if (!rows[0]) return null;
  const [attachments] = await connection.execute(
    `SELECT id_allegato AS id, nome_file_originale AS originalName, tipo_mime AS mimeType,
            tipo_media AS mediaType, dimensione_bytes AS sizeBytes, data_caricamento AS uploadedAt
     FROM allegato WHERE id_segnalazione = ? ORDER BY data_caricamento`,
    [id]
  );
  const [history] = await connection.execute(
    `SELECT h.id_storico AS id, h.data_cambio AS changedAt, h.motivazione AS reason,
            st.nome AS statusName,
            CASE WHEN u.id_utente IS NULL THEN NULL ELSE CONCAT(u.nome, ' ', u.cognome) END AS operatorName
     FROM storico_stato h
     JOIN stato_segnalazione st ON st.id_stato = h.id_stato
     LEFT JOIN utente u ON u.id_utente = h.id_utente_operatore
     WHERE h.id_segnalazione = ? ORDER BY h.data_cambio`,
    [id]
  );
  return { ...normalizeReport(rows[0]), supportedByMe: Boolean(rows[0].supportedByMe), attachments, history };
}

export async function findAttachmentById(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT a.id_allegato AS id, a.chiave_storage AS storageKey, a.nome_file_originale AS originalName,
            a.tipo_mime AS mimeType, s.id_autore AS authorId, s.visibilita AS visibility,
            st.pubblicabile AS publishable
     FROM allegato a
     JOIN segnalazione s ON s.id_segnalazione = a.id_segnalazione
     JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
     WHERE a.id_allegato = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function addSupport(reportId, userId, connection = pool) {
  await connection.execute(
    `INSERT INTO sostegno (id_utente, id_segnalazione) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data_sostegno = data_sostegno`,
    [userId, reportId]
  );
}

export async function removeSupport(reportId, userId, connection = pool) {
  await connection.execute(`DELETE FROM sostegno WHERE id_utente = ? AND id_segnalazione = ?`, [userId, reportId]);
}

export async function lockReportAndState(id, connection) {
  const [rows] = await connection.execute(
    `SELECT s.id_segnalazione AS id, s.id_stato_corrente AS statusId, st.nome AS statusName
     FROM segnalazione s JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
     WHERE s.id_segnalazione = ? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

export async function findStatusById(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id_stato AS id, nome AS name, pubblicabile AS publishable FROM stato_segnalazione WHERE id_stato = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findStatusByName(name, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id_stato AS id, nome AS name, pubblicabile AS publishable FROM stato_segnalazione WHERE nome = ? LIMIT 1`,
    [name]
  );
  return rows[0] || null;
}

export async function countValidReferences(categoryIds, neighborhoodId, connection = pool) {
  const [[neighborhood]] = await connection.execute(`SELECT COUNT(*) AS total FROM quartiere WHERE id_quartiere = ?`, [neighborhoodId]);
  const placeholders = categoryIds.map(() => '?').join(',');
  const [[categories]] = await connection.execute(
    `SELECT COUNT(*) AS total FROM categoria WHERE id_categoria IN (${placeholders})`,
    categoryIds
  );
  return { neighborhood: neighborhood.total, categories: categories.total };
}
