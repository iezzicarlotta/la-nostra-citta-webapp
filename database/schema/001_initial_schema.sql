-- La Nostra Città, Il Nostro Futuro
-- Schema iniziale per MySQL 8.0.16+

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS quartiere (
  id_quartiere BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descrizione TEXT,
  municipio TINYINT UNSIGNED,
  is_nil BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT ck_quartiere_municipio CHECK (municipio IS NULL OR municipio BETWEEN 1 AND 9)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS utente (
  id_utente BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  cognome VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  ruolo VARCHAR(20) NOT NULL DEFAULT 'CITTADINO',
  data_registrazione TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_verificata_at TIMESTAMP NULL,
  stato_account VARCHAR(20) NOT NULL DEFAULT 'ATTIVO',
  id_quartiere_residenza BIGINT UNSIGNED,
  CONSTRAINT ck_utente_nome CHECK (CHAR_LENGTH(TRIM(nome)) >= 2),
  CONSTRAINT ck_utente_cognome CHECK (CHAR_LENGTH(TRIM(cognome)) >= 2),
  CONSTRAINT ck_utente_ruolo CHECK (ruolo IN ('CITTADINO', 'MODERATORE', 'AMMINISTRATORE')),
  CONSTRAINT ck_utente_stato CHECK (stato_account IN ('ATTIVO', 'SOSPESO', 'ELIMINATO')),
  CONSTRAINT fk_utente_quartiere FOREIGN KEY (id_quartiere_residenza)
    REFERENCES quartiere(id_quartiere) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_utente_quartiere (id_quartiere_residenza),
  INDEX idx_utente_stato (stato_account)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stato_segnalazione (
  id_stato BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE,
  descrizione TEXT,
  ordine SMALLINT UNSIGNED NOT NULL UNIQUE,
  pubblicabile BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT ck_stato_ordine CHECK (ordine > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descrizione TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS segnalazione (
  id_segnalazione BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titolo VARCHAR(150) NOT NULL,
  descrizione TEXT NOT NULL,
  data_inserimento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_aggiornamento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  latitudine DECIMAL(9,6),
  longitudine DECIMAL(9,6),
  indirizzo VARCHAR(255),
  visibilita VARCHAR(20) NOT NULL DEFAULT 'PUBBLICA',
  id_autore BIGINT UNSIGNED NOT NULL,
  id_quartiere BIGINT UNSIGNED NOT NULL,
  id_stato_corrente BIGINT UNSIGNED NOT NULL,
  CONSTRAINT ck_seg_titolo CHECK (CHAR_LENGTH(TRIM(titolo)) BETWEEN 5 AND 150),
  CONSTRAINT ck_seg_descrizione CHECK (CHAR_LENGTH(TRIM(descrizione)) BETWEEN 20 AND 5000),
  CONSTRAINT ck_seg_lat CHECK (latitudine IS NULL OR latitudine BETWEEN -90 AND 90),
  CONSTRAINT ck_seg_lon CHECK (longitudine IS NULL OR longitudine BETWEEN -180 AND 180),
  CONSTRAINT ck_seg_coord CHECK (
    (latitudine IS NULL AND longitudine IS NULL) OR
    (latitudine IS NOT NULL AND longitudine IS NOT NULL)
  ),
  CONSTRAINT ck_seg_vis CHECK (visibilita IN ('PUBBLICA', 'PRIVATA', 'ANONIMA')),
  CONSTRAINT fk_seg_autore FOREIGN KEY (id_autore)
    REFERENCES utente(id_utente) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_seg_quartiere FOREIGN KEY (id_quartiere)
    REFERENCES quartiere(id_quartiere) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_seg_stato FOREIGN KEY (id_stato_corrente)
    REFERENCES stato_segnalazione(id_stato) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_seg_autore (id_autore),
  INDEX idx_seg_quartiere (id_quartiere),
  INDEX idx_seg_stato_quartiere_data (id_stato_corrente, id_quartiere, data_inserimento),
  INDEX idx_seg_data (data_inserimento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS allegato (
  id_allegato BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome_file_originale VARCHAR(255) NOT NULL,
  chiave_storage VARCHAR(255) NOT NULL UNIQUE,
  tipo_mime VARCHAR(100) NOT NULL,
  tipo_media VARCHAR(10) NOT NULL,
  dimensione_bytes BIGINT UNSIGNED NOT NULL,
  data_caricamento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  latitudine_exif DECIMAL(9,6),
  longitudine_exif DECIMAL(9,6),
  id_segnalazione BIGINT UNSIGNED NOT NULL,
  CONSTRAINT ck_all_tipo CHECK (tipo_media IN ('IMMAGINE', 'VIDEO')),
  CONSTRAINT ck_all_dim CHECK (dimensione_bytes > 0),
  CONSTRAINT ck_all_lat CHECK (latitudine_exif IS NULL OR latitudine_exif BETWEEN -90 AND 90),
  CONSTRAINT ck_all_lon CHECK (longitudine_exif IS NULL OR longitudine_exif BETWEEN -180 AND 180),
  CONSTRAINT ck_all_coord CHECK (
    (latitudine_exif IS NULL AND longitudine_exif IS NULL) OR
    (latitudine_exif IS NOT NULL AND longitudine_exif IS NOT NULL)
  ),
  CONSTRAINT fk_all_seg FOREIGN KEY (id_segnalazione)
    REFERENCES segnalazione(id_segnalazione) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_all_seg (id_segnalazione)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS segnalazione_categoria (
  id_segnalazione BIGINT UNSIGNED NOT NULL,
  id_categoria BIGINT UNSIGNED NOT NULL,
  origine_assegnazione VARCHAR(20) NOT NULL DEFAULT 'MANUALE',
  affidabilita_ia DECIMAL(5,4),
  data_assegnazione TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_segnalazione, id_categoria),
  CONSTRAINT ck_sc_origine CHECK (origine_assegnazione IN ('MANUALE', 'IA', 'IMPORTATA')),
  CONSTRAINT ck_sc_aff CHECK (affidabilita_ia IS NULL OR affidabilita_ia BETWEEN 0 AND 1),
  CONSTRAINT ck_sc_ia CHECK (origine_assegnazione <> 'IA' OR affidabilita_ia IS NOT NULL),
  CONSTRAINT fk_sc_seg FOREIGN KEY (id_segnalazione)
    REFERENCES segnalazione(id_segnalazione) ON DELETE CASCADE,
  CONSTRAINT fk_sc_cat FOREIGN KEY (id_categoria)
    REFERENCES categoria(id_categoria) ON DELETE RESTRICT,
  INDEX idx_sc_categoria_segnalazione (id_categoria, id_segnalazione)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sostegno (
  id_utente BIGINT UNSIGNED NOT NULL,
  id_segnalazione BIGINT UNSIGNED NOT NULL,
  data_sostegno TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_utente, id_segnalazione),
  CONSTRAINT fk_sostegno_utente FOREIGN KEY (id_utente)
    REFERENCES utente(id_utente) ON DELETE CASCADE,
  CONSTRAINT fk_sostegno_seg FOREIGN KEY (id_segnalazione)
    REFERENCES segnalazione(id_segnalazione) ON DELETE CASCADE,
  INDEX idx_sostegno_seg (id_segnalazione)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS storico_stato (
  id_storico BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  data_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivazione TEXT NOT NULL,
  id_segnalazione BIGINT UNSIGNED NOT NULL,
  id_stato BIGINT UNSIGNED NOT NULL,
  id_utente_operatore BIGINT UNSIGNED,
  CONSTRAINT fk_storico_seg FOREIGN KEY (id_segnalazione)
    REFERENCES segnalazione(id_segnalazione) ON DELETE CASCADE,
  CONSTRAINT fk_storico_stato FOREIGN KEY (id_stato)
    REFERENCES stato_segnalazione(id_stato) ON DELETE RESTRICT,
  CONSTRAINT fk_storico_operatore FOREIGN KEY (id_utente_operatore)
    REFERENCES utente(id_utente) ON DELETE SET NULL,
  INDEX idx_storico_seg_data (id_segnalazione, data_cambio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analisi_ia (
  id_analisi BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo_analisi VARCHAR(40) NOT NULL,
  modello VARCHAR(150) NOT NULL,
  versione_modello VARCHAR(80),
  risultato JSON NOT NULL,
  punteggio DECIMAL(5,4),
  data_analisi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revisionata BOOLEAN NOT NULL DEFAULT FALSE,
  id_revisore BIGINT UNSIGNED,
  id_segnalazione BIGINT UNSIGNED,
  id_allegato BIGINT UNSIGNED,
  CONSTRAINT ck_ai_tipo CHECK (tipo_analisi IN (
    'MODERAZIONE_TESTO', 'CLASSIFICAZIONE_TESTO', 'ANALISI_IMMAGINE',
    'ESTRAZIONE_EXIF', 'VERIFICA_PERTINENZA'
  )),
  CONSTRAINT ck_ai_punteggio CHECK (punteggio IS NULL OR punteggio BETWEEN 0 AND 1),
  CONSTRAINT ck_ai_target CHECK (
    (id_segnalazione IS NOT NULL AND id_allegato IS NULL) OR
    (id_segnalazione IS NULL AND id_allegato IS NOT NULL)
  ),
  CONSTRAINT fk_ai_revisore FOREIGN KEY (id_revisore)
    REFERENCES utente(id_utente) ON DELETE SET NULL,
  CONSTRAINT fk_ai_seg FOREIGN KEY (id_segnalazione)
    REFERENCES segnalazione(id_segnalazione) ON DELETE CASCADE,
  CONSTRAINT fk_ai_all FOREIGN KEY (id_allegato)
    REFERENCES allegato(id_allegato) ON DELETE CASCADE,
  INDEX idx_ai_seg (id_segnalazione),
  INDEX idx_ai_all (id_allegato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessione_web (
  id_sessione VARCHAR(128) PRIMARY KEY,
  dati JSON NOT NULL,
  scadenza DATETIME(3) NOT NULL,
  INDEX idx_sessione_scadenza (scadenza)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_segnalazione_stato_iniziale$$
CREATE TRIGGER trg_segnalazione_stato_iniziale
BEFORE INSERT ON segnalazione
FOR EACH ROW
BEGIN
  DECLARE nome_stato VARCHAR(80);
  DECLARE stato_autore VARCHAR(20);

  SELECT nome INTO nome_stato
  FROM stato_segnalazione WHERE id_stato = NEW.id_stato_corrente;

  SELECT stato_account INTO stato_autore
  FROM utente WHERE id_utente = NEW.id_autore;

  IF nome_stato <> 'Inserita' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lo stato iniziale deve essere Inserita';
  END IF;
  IF stato_autore <> 'ATTIVO' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'L autore deve avere un account ATTIVO';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_verifica_pubblicazione$$
CREATE TRIGGER trg_verifica_pubblicazione
BEFORE UPDATE ON segnalazione
FOR EACH ROW
BEGIN
  DECLARE stato_pubblicabile BOOLEAN;
  DECLARE n_allegati INT DEFAULT 0;
  DECLARE n_categorie INT DEFAULT 0;

  SELECT pubblicabile INTO stato_pubblicabile
  FROM stato_segnalazione WHERE id_stato = NEW.id_stato_corrente;

  IF stato_pubblicabile THEN
    SELECT COUNT(*) INTO n_allegati FROM allegato WHERE id_segnalazione = NEW.id_segnalazione;
    SELECT COUNT(*) INTO n_categorie FROM segnalazione_categoria WHERE id_segnalazione = NEW.id_segnalazione;
    IF n_allegati = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Serve almeno un allegato';
    END IF;
    IF n_categorie = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Serve almeno una categoria';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_verifica_sostegno$$
CREATE TRIGGER trg_verifica_sostegno
BEFORE INSERT ON sostegno
FOR EACH ROW
BEGIN
  DECLARE autore BIGINT UNSIGNED;
  DECLARE stato_utente VARCHAR(20);
  DECLARE pubblicabile_stato BOOLEAN;

  SELECT stato_account INTO stato_utente FROM utente WHERE id_utente = NEW.id_utente;
  SELECT s.id_autore, st.pubblicabile INTO autore, pubblicabile_stato
  FROM segnalazione s
  JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
  WHERE s.id_segnalazione = NEW.id_segnalazione;

  IF stato_utente <> 'ATTIVO' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo utenti ATTIVI possono esprimere sostegno';
  END IF;
  IF autore = NEW.id_utente THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Non puoi sostenere la tua segnalazione';
  END IF;
  IF NOT pubblicabile_stato THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La segnalazione non e pubblica';
  END IF;
END$$

DELIMITER ;

CREATE OR REPLACE VIEW v_classifica_segnalazioni AS
SELECT
  s.id_segnalazione,
  s.titolo,
  s.descrizione,
  s.data_inserimento,
  q.nome AS quartiere,
  st.nome AS stato,
  COUNT(so.id_utente) AS numero_sostegni
FROM segnalazione s
JOIN quartiere q ON q.id_quartiere = s.id_quartiere
JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
LEFT JOIN sostegno so ON so.id_segnalazione = s.id_segnalazione
WHERE st.pubblicabile = TRUE AND s.visibilita IN ('PUBBLICA', 'ANONIMA')
GROUP BY s.id_segnalazione, s.titolo, s.descrizione, s.data_inserimento, q.nome, st.nome;

CREATE OR REPLACE VIEW v_segnalazioni_pubbliche AS
SELECT
  s.id_segnalazione,
  s.titolo,
  s.descrizione,
  s.data_inserimento,
  s.latitudine,
  s.longitudine,
  s.indirizzo,
  q.nome AS quartiere,
  st.nome AS stato,
  CASE
    WHEN s.visibilita = 'ANONIMA' THEN NULL
    ELSE CONCAT(u.nome, ' ', LEFT(u.cognome, 1), '.')
  END AS autore_visualizzato,
  COUNT(DISTINCT so.id_utente) AS numero_sostegni
FROM segnalazione s
JOIN utente u ON u.id_utente = s.id_autore
JOIN quartiere q ON q.id_quartiere = s.id_quartiere
JOIN stato_segnalazione st ON st.id_stato = s.id_stato_corrente
LEFT JOIN sostegno so ON so.id_segnalazione = s.id_segnalazione
WHERE st.pubblicabile = TRUE AND s.visibilita IN ('PUBBLICA', 'ANONIMA')
GROUP BY
  s.id_segnalazione, s.titolo, s.descrizione, s.data_inserimento,
  s.latitudine, s.longitudine, s.indirizzo, q.nome, st.nome,
  s.visibilita, u.nome, u.cognome;
