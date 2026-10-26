import { pool } from '../config/db.js';

const requiredTables = [
  'quartiere', 'utente', 'stato_segnalazione', 'categoria', 'segnalazione',
  'allegato', 'segnalazione_categoria', 'sostegno', 'storico_stato', 'analisi_ia'
];

const columnRenames = [
  ['quartiere', 'idQuartiere', 'id_quartiere'],
  ['utente', 'idUtente', 'id_utente'],
  ['utente', 'passwordHash', 'password_hash'],
  ['utente', 'dataRegistrazione', 'data_registrazione'],
  ['utente', 'statoAccount', 'stato_account'],
  ['utente', 'idQuartiereResidenza', 'id_quartiere_residenza'],
  ['stato_segnalazione', 'idStato', 'id_stato'],
  ['categoria', 'idCategoria', 'id_categoria'],
  ['segnalazione', 'idSegnalazione', 'id_segnalazione'],
  ['segnalazione', 'dataInserimento', 'data_inserimento'],
  ['segnalazione', 'idAutore', 'id_autore'],
  ['segnalazione', 'idQuartiere', 'id_quartiere'],
  ['segnalazione', 'idStatoCorrente', 'id_stato_corrente'],
  ['allegato', 'idAllegato', 'id_allegato'],
  ['allegato', 'nomeFile', 'nome_file_originale'],
  ['allegato', 'percorsoFile', 'chiave_storage'],
  ['allegato', 'tipoMIME', 'tipo_mime'],
  ['allegato', 'tipoMedia', 'tipo_media'],
  ['allegato', 'dimensione', 'dimensione_bytes'],
  ['allegato', 'dataCaricamento', 'data_caricamento'],
  ['allegato', 'latitudineEXIF', 'latitudine_exif'],
  ['allegato', 'longitudineEXIF', 'longitudine_exif'],
  ['allegato', 'risultatoAnalisi', 'risultato_analisi'],
  ['allegato', 'idSegnalazione', 'id_segnalazione'],
  ['segnalazione_categoria', 'idSegnalazione', 'id_segnalazione'],
  ['segnalazione_categoria', 'idCategoria', 'id_categoria'],
  ['segnalazione_categoria', 'origineAssegnazione', 'origine_assegnazione'],
  ['segnalazione_categoria', 'affidabilitaIA', 'affidabilita_ia'],
  ['segnalazione_categoria', 'dataAssegnazione', 'data_assegnazione'],
  ['sostegno', 'idUtente', 'id_utente'],
  ['sostegno', 'idSegnalazione', 'id_segnalazione'],
  ['sostegno', 'dataSostegno', 'data_sostegno'],
  ['storico_stato', 'idStorico', 'id_storico'],
  ['storico_stato', 'dataCambio', 'data_cambio'],
  ['storico_stato', 'idSegnalazione', 'id_segnalazione'],
  ['storico_stato', 'idStato', 'id_stato'],
  ['storico_stato', 'idUtenteOperatore', 'id_utente_operatore'],
  ['analisi_ia', 'idAnalisi', 'id_analisi'],
  ['analisi_ia', 'tipoAnalisi', 'tipo_analisi'],
  ['analisi_ia', 'dataAnalisi', 'data_analisi'],
  ['analisi_ia', 'idSegnalazione', 'id_segnalazione'],
  ['analisi_ia', 'idAllegato', 'id_allegato']
];

async function columnExists(connection, table, column) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(connection, table, column, definition) {
  if (await columnExists(connection, table, column)) return false;
  await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  return true;
}

async function checkConstraintExists(connection, table, constraint) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'CHECK' LIMIT 1`,
    [table, constraint]
  );
  return rows.length > 0;
}

async function dropCheckIfExists(connection, table, constraint) {
  if (await checkConstraintExists(connection, table, constraint)) {
    await connection.query(`ALTER TABLE \`${table}\` DROP CHECK \`${constraint}\``);
  }
}

async function renameLegacyColumns(connection) {
  for (const [table, legacyName, currentName] of columnRenames) {
    const hasLegacyName = await columnExists(connection, table, legacyName);
    const hasCurrentName = await columnExists(connection, table, currentName);
    if (hasLegacyName && hasCurrentName) {
      throw new Error(`Migrazione ambigua: ${table} contiene sia ${legacyName} sia ${currentName}.`);
    }
    if (hasLegacyName) {
      await connection.query(`ALTER TABLE \`${table}\` RENAME COLUMN \`${legacyName}\` TO \`${currentName}\``);
    }
  }
}

async function dropLegacyObjects(connection) {
  for (const trigger of [
    'trg_segnalazione_autore_attivo',
    'trg_segnalazione_storico_iniziale',
    'trg_segnalazione_storico_update',
    'trg_sostegno_no_autore',
    'trg_segnalazione_stato_iniziale',
    'trg_verifica_pubblicazione',
    'trg_verifica_sostegno'
  ]) {
    await connection.query(`DROP TRIGGER IF EXISTS \`${trigger}\``);
  }
  for (const [table, constraint] of [
    ['allegato', 'chk_allegato_dimensione'],
    ['allegato', 'chk_allegato_latitudine'],
    ['allegato', 'chk_allegato_longitudine'],
    ['allegato', 'chk_allegato_coordinate_exif'],
    ['segnalazione_categoria', 'chk_sc_affidabilita']
  ]) {
    await dropCheckIfExists(connection, table, constraint);
  }
  await connection.query('DROP VIEW IF EXISTS v_classifica_segnalazioni');
  await connection.query('DROP VIEW IF EXISTS v_segnalazioni_pubbliche');
}

async function restoreRenamedCheckConstraints(connection) {
  const checks = [
    ['allegato', 'chk_allegato_dimensione', 'CHECK (dimensione_bytes > 0)'],
    ['allegato', 'chk_allegato_latitudine', 'CHECK (latitudine_exif IS NULL OR latitudine_exif BETWEEN -90 AND 90)'],
    ['allegato', 'chk_allegato_longitudine', 'CHECK (longitudine_exif IS NULL OR longitudine_exif BETWEEN -180 AND 180)'],
    ['allegato', 'chk_allegato_coordinate_exif', 'CHECK ((latitudine_exif IS NULL AND longitudine_exif IS NULL) OR (latitudine_exif IS NOT NULL AND longitudine_exif IS NOT NULL))'],
    ['segnalazione_categoria', 'chk_sc_affidabilita', 'CHECK (affidabilita_ia IS NULL OR affidabilita_ia BETWEEN 0 AND 1)']
  ];
  for (const [table, constraint, expression] of checks) {
    if (!(await checkConstraintExists(connection, table, constraint))) {
      await connection.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraint}\` ${expression}`);
    }
  }
}

async function createSessionAndAuditTables(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS audit_log (
    id_audit BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_utente BIGINT UNSIGNED,
    azione VARCHAR(80) NOT NULL,
    entita VARCHAR(80),
    id_entita BIGINT UNSIGNED,
    dettagli JSON,
    indirizzo_ip VARCHAR(45),
    data_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_utente FOREIGN KEY (id_utente)
      REFERENCES utente(id_utente) ON DELETE SET NULL,
    INDEX idx_audit_utente_data (id_utente, data_evento),
    INDEX idx_audit_entita (entita, id_entita)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
  await connection.query(`CREATE TABLE IF NOT EXISTS sessione_web (
    id_sessione VARCHAR(128) PRIMARY KEY,
    dati JSON NOT NULL,
    scadenza DATETIME(3) NOT NULL,
    INDEX idx_sessione_scadenza (scadenza)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
}

async function createIntegrityTriggers(connection) {
  await connection.query(`CREATE TRIGGER trg_segnalazione_stato_iniziale
    BEFORE INSERT ON segnalazione FOR EACH ROW
    BEGIN
      DECLARE initial_status VARCHAR(80);
      DECLARE author_status VARCHAR(20);
      SELECT nome INTO initial_status FROM stato_segnalazione WHERE id_stato = NEW.id_stato_corrente;
      SELECT stato_account INTO author_status FROM utente WHERE id_utente = NEW.id_autore;
      IF initial_status <> 'Inserita' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lo stato iniziale deve essere Inserita';
      END IF;
      IF author_status <> 'ATTIVO' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'L autore deve avere un account ATTIVO';
      END IF;
    END`);

  await connection.query(`CREATE TRIGGER trg_verifica_pubblicazione
    BEFORE UPDATE ON segnalazione FOR EACH ROW
    BEGIN
      DECLARE is_publishable BOOLEAN DEFAULT FALSE;
      DECLARE attachment_count INT DEFAULT 0;
      DECLARE category_count INT DEFAULT 0;
      SELECT pubblicabile INTO is_publishable FROM stato_segnalazione WHERE id_stato = NEW.id_stato_corrente;
      IF is_publishable THEN
        SELECT COUNT(*) INTO attachment_count FROM allegato WHERE id_segnalazione = NEW.id_segnalazione;
        SELECT COUNT(*) INTO category_count FROM segnalazione_categoria WHERE id_segnalazione = NEW.id_segnalazione;
        IF attachment_count = 0 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Serve almeno un allegato';
        END IF;
        IF category_count = 0 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Serve almeno una categoria';
        END IF;
      END IF;
    END`);

  await connection.query(`CREATE TRIGGER trg_verifica_sostegno
    BEFORE INSERT ON sostegno FOR EACH ROW
    BEGIN
      DECLARE report_author BIGINT UNSIGNED;
      DECLARE supporter_status VARCHAR(20);
      DECLARE is_publishable BOOLEAN DEFAULT FALSE;
      SELECT stato_account INTO supporter_status FROM utente WHERE id_utente = NEW.id_utente;
      SELECT s.id_autore, st.pubblicabile INTO report_author, is_publishable
        FROM segnalazione s JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
        WHERE s.id_segnalazione = NEW.id_segnalazione;
      IF supporter_status <> 'ATTIVO' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo utenti ATTIVI possono esprimere sostegno';
      END IF;
      IF report_author = NEW.id_utente THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Non puoi sostenere una tua segnalazione';
      END IF;
      IF NOT is_publishable THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La segnalazione non e pubblica';
      END IF;
    END`);
}

async function recreateViews(connection) {
  await connection.query(`CREATE OR REPLACE VIEW v_classifica_segnalazioni AS
    SELECT s.id_segnalazione, s.titolo, s.descrizione, s.data_inserimento,
      q.nome AS quartiere, st.nome AS stato, COUNT(so.id_utente) AS numero_sostegni
    FROM segnalazione s
    JOIN quartiere q ON q.id_quartiere = s.id_quartiere
    JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
    LEFT JOIN sostegno so ON so.id_segnalazione = s.id_segnalazione
    WHERE st.pubblicabile = TRUE AND s.visibilita IN ('PUBBLICA', 'ANONIMA')
    GROUP BY s.id_segnalazione, s.titolo, s.descrizione, s.data_inserimento, q.nome, st.nome`);

  await connection.query(`CREATE OR REPLACE VIEW v_segnalazioni_pubbliche AS
    SELECT s.id_segnalazione, s.titolo, s.descrizione, s.data_inserimento,
      s.latitudine, s.longitudine, s.indirizzo, q.nome AS quartiere, st.nome AS stato,
      CASE WHEN s.visibilita = 'ANONIMA' THEN NULL ELSE CONCAT(u.nome, ' ', LEFT(u.cognome, 1), '.') END AS autore_visualizzato,
      COUNT(DISTINCT so.id_utente) AS numero_sostegni
    FROM segnalazione s
    JOIN utente u ON u.id_utente = s.id_autore
    JOIN quartiere q ON q.id_quartiere = s.id_quartiere
    JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
    LEFT JOIN sostegno so ON so.id_segnalazione = s.id_segnalazione
    WHERE st.pubblicabile = TRUE AND s.visibilita IN ('PUBBLICA', 'ANONIMA')
    GROUP BY s.id_segnalazione, s.titolo, s.descrizione, s.data_inserimento,
      s.latitudine, s.longitudine, s.indirizzo, q.nome, st.nome, s.visibilita, u.nome, u.cognome`);
}

async function migrate(connection) {
  const [tables] = await connection.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = ?`,
    ['BASE TABLE']
  );
  const existingTables = new Set(tables.map(({ TABLE_NAME }) => TABLE_NAME));
  const missingTables = requiredTables.filter((table) => !existingTables.has(table));
  if (missingTables.length) {
    throw new Error(`Tabelle richieste assenti: ${missingTables.join(', ')}.`);
  }

  await dropLegacyObjects(connection);
  await renameLegacyColumns(connection);
  await restoreRenamedCheckConstraints(connection);

  await addColumnIfMissing(connection, 'utente', 'email_verificata_at', 'TIMESTAMP NULL');
  await addColumnIfMissing(connection, 'quartiere', 'is_nil', 'BOOLEAN NOT NULL DEFAULT FALSE');
  const publishableAdded = await addColumnIfMissing(connection, 'stato_segnalazione', 'pubblicabile', 'BOOLEAN NOT NULL DEFAULT FALSE');
  if (publishableAdded) {
    await connection.query(`UPDATE stato_segnalazione
      SET pubblicabile = nome IN (
        'Approvata', 'Presa in carico', 'In valutazione',
        'Inserita nel documento programmatico', 'Inviata ai candidati', 'Chiusa'
      )`);
  }

  await addColumnIfMissing(connection, 'segnalazione', 'data_aggiornamento', 'TIMESTAMP NULL DEFAULT NULL');
  await connection.query(`UPDATE segnalazione SET data_aggiornamento = data_inserimento
    WHERE data_aggiornamento IS NULL`);
  await connection.query(`ALTER TABLE segnalazione MODIFY COLUMN data_aggiornamento
    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);

  await addColumnIfMissing(connection, 'analisi_ia', 'versione_modello', 'VARCHAR(80) NULL');
  await addColumnIfMissing(connection, 'analisi_ia', 'revisionata', 'BOOLEAN NOT NULL DEFAULT FALSE');
  const reviewerAdded = await addColumnIfMissing(connection, 'analisi_ia', 'id_revisore', 'BIGINT UNSIGNED NULL');
  if (reviewerAdded) {
    await connection.query(`ALTER TABLE analisi_ia ADD CONSTRAINT fk_ai_revisore
      FOREIGN KEY (id_revisore) REFERENCES utente(id_utente) ON DELETE SET NULL`);
  }

  await createSessionAndAuditTables(connection);

  await createIntegrityTriggers(connection);
  await recreateViews(connection);

  const [[summary]] = await connection.query(`SELECT
    (SELECT COUNT(*) FROM utente) AS utenti,
    (SELECT COUNT(*) FROM segnalazione) AS segnalazioni,
    (SELECT COUNT(*) FROM allegato) AS allegati,
    (SELECT COUNT(*) FROM sostegno) AS sostegni,
    (SELECT COUNT(*) FROM storico_stato) AS storico`);
  return summary;
}

const connection = await pool.getConnection();
try {
  const summary = await migrate(connection);
  console.log(`Schema legacy migrato; righe preservate: ${JSON.stringify(summary)}`);
} catch (error) {
  console.error(`Migrazione non completata: ${error.message}`);
  process.exitCode = 1;
} finally {
  connection.release();
  await pool.end();
}