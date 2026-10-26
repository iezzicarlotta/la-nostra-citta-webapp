import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';

const dataPath = path.resolve(env.repositoryRoot, 'client/public/data/milano-nil.geojson');
const geoJson = JSON.parse(await fs.readFile(dataPath, 'utf8'));
const features = geoJson.features.filter((feature) => feature.properties.Valido_al === 'Vigente');
const connection = await pool.getConnection();

try {
  const [columns] = await connection.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    ['quartiere', 'is_nil']
  );
  if (!columns.length) {
    await connection.query('ALTER TABLE quartiere ADD COLUMN is_nil BOOLEAN NOT NULL DEFAULT FALSE');
  }

  for (const feature of features) {
    const { ID_NIL: code, NIL: name } = feature.properties;
    await connection.execute(
      `INSERT INTO quartiere (nome, descrizione, municipio, is_nil)
       VALUES (?, ?, NULL, TRUE)
       ON DUPLICATE KEY UPDATE
         is_nil = TRUE,
         descrizione = IF(descrizione IS NULL OR descrizione = '', VALUES(descrizione), descrizione)`,
      [name, `NIL ufficiale PGT 2030, codice ${code}`]
    );
  }

  const [[summary]] = await connection.query(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT nome) AS uniqueNames
     FROM quartiere WHERE is_nil = TRUE`
  );
  if (summary.total !== 88 || summary.uniqueNames !== 88) {
    throw new Error(`Import incompleto: ${summary.total} NIL, ${summary.uniqueNames} nomi unici.`);
  }
  console.log(`Import completato: ${summary.total} NIL ufficiali.`);
} catch (error) {
  console.error(`Import NIL non completato: ${error.message}`);
  process.exitCode = 1;
} finally {
  connection.release();
  await pool.end();
}