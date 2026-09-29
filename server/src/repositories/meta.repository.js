import { pool } from '../config/db.js';

export async function listNeighborhoods(connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id_quartiere AS id, nome AS name, descrizione AS description, municipio AS municipality
     FROM quartiere ORDER BY nome`
  );
  return rows;
}

export async function listCategories(connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id_categoria AS id, nome AS name, descrizione AS description
     FROM categoria ORDER BY nome`
  );
  return rows;
}

export async function listStatuses({ publicOnly = false } = {}, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id_stato AS id, nome AS name, descrizione AS description, ordine AS position, pubblicabile AS publishable
     FROM stato_segnalazione
     WHERE (? = FALSE OR pubblicabile = TRUE)
     ORDER BY ordine`,
    [publicOnly]
  );
  return rows;
}

export async function createNeighborhood(data, connection = pool) {
  const [result] = await connection.execute(
    `INSERT INTO quartiere (nome, descrizione, municipio) VALUES (?, ?, ?)`,
    [data.name, data.description || null, data.municipality ?? null]
  );
  return { id: result.insertId, ...data };
}

export async function updateNeighborhood(id, data, connection = pool) {
  const [result] = await connection.execute(
    `UPDATE quartiere SET nome = ?, descrizione = ?, municipio = ? WHERE id_quartiere = ?`,
    [data.name, data.description || null, data.municipality ?? null, id]
  );
  return result.affectedRows;
}

export async function deleteNeighborhood(id, connection = pool) {
  const [result] = await connection.execute(`DELETE FROM quartiere WHERE id_quartiere = ?`, [id]);
  return result.affectedRows;
}

export async function createCategory(data, connection = pool) {
  const [result] = await connection.execute(
    `INSERT INTO categoria (nome, descrizione) VALUES (?, ?)`,
    [data.name, data.description || null]
  );
  return { id: result.insertId, name: data.name, description: data.description };
}

export async function updateCategory(id, data, connection = pool) {
  const [result] = await connection.execute(
    `UPDATE categoria SET nome = ?, descrizione = ? WHERE id_categoria = ?`,
    [data.name, data.description || null, id]
  );
  return result.affectedRows;
}

export async function deleteCategory(id, connection = pool) {
  const [result] = await connection.execute(`DELETE FROM categoria WHERE id_categoria = ?`, [id]);
  return result.affectedRows;
}
