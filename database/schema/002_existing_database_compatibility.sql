SET @has_is_nil = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'quartiere'
    AND COLUMN_NAME = 'is_nil'
);
SET @migration_sql = IF(
  @has_is_nil = 0,
  'ALTER TABLE quartiere ADD COLUMN is_nil BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_publishable = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stato_segnalazione'
    AND COLUMN_NAME = 'pubblicabile'
);
SET @migration_sql = IF(
  @has_publishable = 0,
  'ALTER TABLE stato_segnalazione ADD COLUMN pubblicabile BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  @has_publishable = 0,
  'UPDATE stato_segnalazione SET pubblicabile = nome IN (''Approvata'', ''Presa in carico'', ''In valutazione'', ''Inserita nel documento programmatico'', ''Inviata ai candidati'', ''Chiusa'')',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sessione_web (
  id_sessione VARCHAR(128) PRIMARY KEY,
  dati JSON NOT NULL,
  scadenza DATETIME(3) NOT NULL,
  INDEX idx_sessione_scadenza (scadenza)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @has_updated_at = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'segnalazione'
    AND COLUMN_NAME = 'data_aggiornamento'
);
SET @migration_sql = IF(
  @has_updated_at = 0,
  'ALTER TABLE segnalazione ADD COLUMN data_aggiornamento TIMESTAMP NULL DEFAULT NULL',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

UPDATE segnalazione
SET data_aggiornamento = data_inserimento
WHERE data_aggiornamento IS NULL;

ALTER TABLE segnalazione
MODIFY COLUMN data_aggiornamento TIMESTAMP NOT NULL
  DEFAULT CURRENT_TIMESTAMP
  ON UPDATE CURRENT_TIMESTAMP;