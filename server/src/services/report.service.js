import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileTypeFromFile } from 'file-type';
import { env } from '../config/env.js';
import { withTransaction } from '../config/db.js';
import { writeAudit } from '../repositories/audit.repository.js';
import {
  countValidReferences,
  findAttachmentById,
  findReportById,
  findStatusById,
  findStatusByName,
  lockReportAndState
} from '../repositories/report.repository.js';
import { HttpError } from '../utils/http-error.js';

const allowedFiles = new Map([
  ['image/jpeg', { mediaType: 'IMMAGINE', extension: 'jpg' }],
  ['image/png', { mediaType: 'IMMAGINE', extension: 'png' }],
  ['image/webp', { mediaType: 'IMMAGINE', extension: 'webp' }],
  ['video/mp4', { mediaType: 'VIDEO', extension: 'mp4' }],
  ['video/quicktime', { mediaType: 'VIDEO', extension: 'mov' }],
  ['video/webm', { mediaType: 'VIDEO', extension: 'webm' }]
]);

const transitions = Object.freeze({
  Inserita: ['In verifica', 'Rifiutata'],
  'In verifica': ['Approvata', 'Rifiutata'],
  Approvata: ['Presa in carico', 'In valutazione', 'Chiusa'],
  'Presa in carico': ['In valutazione', 'Chiusa'],
  'In valutazione': ['Inserita nel documento programmatico', 'Rifiutata', 'Chiusa'],
  'Inserita nel documento programmatico': ['Inviata ai candidati', 'Chiusa'],
  'Inviata ai candidati': ['Chiusa'],
  Rifiutata: ['In verifica'],
  Chiusa: []
});

export function canTransition(from, to) {
  return transitions[from]?.includes(to) ?? false;
}

async function safeUnlink(filePath) {
  try { await fs.unlink(filePath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

async function validateAndMoveFiles(files) {
  if (!files?.length) throw new HttpError(400, 'È obbligatorio allegare almeno una foto o un video.', 'ATTACHMENT_REQUIRED');
  const destination = path.resolve(env.repositoryRoot, env.UPLOAD_DIR);
  await fs.mkdir(destination, { recursive: true });
  const moved = [];

  try {
    for (const file of files) {
      const detected = await fileTypeFromFile(file.path);
      const rule = detected && allowedFiles.get(detected.mime);
      if (!rule) throw new HttpError(400, `Formato non ammesso per ${file.originalname}.`, 'FILE_TYPE_NOT_ALLOWED');
      const limit = rule.mediaType === 'IMMAGINE' ? env.MAX_IMAGE_BYTES : env.MAX_VIDEO_BYTES;
      if (file.size > limit) throw new HttpError(400, `${file.originalname} supera il limite consentito.`, 'FILE_TOO_LARGE');
      const storageKey = `${crypto.randomUUID()}.${rule.extension}`;
      const finalPath = path.join(destination, storageKey);
      await fs.rename(file.path, finalPath);
      moved.push({
        originalName: path.basename(file.originalname).slice(0, 255),
        storageKey,
        mimeType: detected.mime,
        mediaType: rule.mediaType,
        sizeBytes: file.size,
        finalPath
      });
    }
    return moved;
  } catch (error) {
    await Promise.allSettled([...files.map((file) => safeUnlink(file.path)), ...moved.map((file) => safeUnlink(file.finalPath))]);
    throw error;
  }
}

export async function createReport({ data, files, userId, ip }) {
  const movedFiles = await validateAndMoveFiles(files);
  try {
    return await withTransaction(async (connection) => {
      const uniqueCategoryIds = [...new Set(data.categoryIds)];
      const refs = await countValidReferences(uniqueCategoryIds, data.neighborhoodId, connection);
      if (refs.neighborhood !== 1 || refs.categories !== uniqueCategoryIds.length) {
        throw new HttpError(400, 'Quartiere o categorie non validi.', 'INVALID_REFERENCE');
      }
      const initialState = await findStatusByName('Inserita', connection);
      if (!initialState) throw new HttpError(500, 'Stato iniziale non configurato.', 'MISSING_INITIAL_STATE');
      const [result] = await connection.execute(
        `INSERT INTO segnalazione
          (titolo, descrizione, latitudine, longitudine, indirizzo, visibilita, id_autore, id_quartiere, id_stato_corrente)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.title, data.description, data.latitude, data.longitude, data.address || null, data.visibility,
          userId, data.neighborhoodId, initialState.id]
      );
      const reportId = result.insertId;
      for (const categoryId of uniqueCategoryIds) {
        await connection.execute(
          `INSERT INTO segnalazione_categoria (id_segnalazione, id_categoria) VALUES (?, ?)`,
          [reportId, categoryId]
        );
      }
      for (const file of movedFiles) {
        await connection.execute(
          `INSERT INTO allegato
            (nome_file_originale, chiave_storage, tipo_mime, tipo_media, dimensione_bytes, id_segnalazione)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [file.originalName, file.storageKey, file.mimeType, file.mediaType, file.sizeBytes, reportId]
        );
      }
      await connection.execute(
        `INSERT INTO storico_stato (motivazione, id_segnalazione, id_stato, id_utente_operatore)
         VALUES (?, ?, ?, ?)`,
        ['Creazione della segnalazione', reportId, initialState.id, userId]
      );
      await writeAudit({ userId, action: 'SEGNALAZIONE_CREATA', entity: 'segnalazione', entityId: reportId, ip }, connection);
      return findReportById(reportId, userId, connection);
    });
  } catch (error) {
    await Promise.allSettled(movedFiles.map((file) => safeUnlink(file.finalPath)));
    throw error;
  }
}

export async function getReportForViewer(id, user) {
  const report = await findReportById(id, user?.id);
  if (!report) throw new HttpError(404, 'Segnalazione non trovata.', 'REPORT_NOT_FOUND');
  const privileged = user && ['MODERATORE', 'AMMINISTRATORE'].includes(user.role);
  const owner = user?.id === report.authorId;
  const publicReport = report.publishable && ['PUBBLICA', 'ANONIMA'].includes(report.visibility);
  if (!publicReport && !owner && !privileged) throw new HttpError(404, 'Segnalazione non trovata.', 'REPORT_NOT_FOUND');
  return report;
}

export async function getAttachmentForViewer(id, user) {
  const attachment = await findAttachmentById(id);
  if (!attachment) throw new HttpError(404, 'Allegato non trovato.', 'ATTACHMENT_NOT_FOUND');
  const privileged = user && ['MODERATORE', 'AMMINISTRATORE'].includes(user.role);
  const owner = user?.id === attachment.authorId;
  const publicAttachment = Boolean(attachment.publishable) && ['PUBBLICA', 'ANONIMA'].includes(attachment.visibility);
  if (!publicAttachment && !owner && !privileged) throw new HttpError(404, 'Allegato non trovato.', 'ATTACHMENT_NOT_FOUND');
  return { ...attachment, filePath: path.resolve(env.repositoryRoot, env.UPLOAD_DIR, attachment.storageKey) };
}

export async function changeReportState({ reportId, stateId, reason, operatorId, ip }) {
  return withTransaction(async (connection) => {
    const report = await lockReportAndState(reportId, connection);
    const nextState = await findStatusById(stateId, connection);
    if (!report || !nextState) throw new HttpError(404, 'Segnalazione o stato non trovato.', 'NOT_FOUND');
    if (!canTransition(report.statusName, nextState.name)) {
      throw new HttpError(409, `Transizione da “${report.statusName}” a “${nextState.name}” non consentita.`, 'INVALID_STATE_TRANSITION');
    }
    await connection.execute(`UPDATE segnalazione SET id_stato_corrente = ? WHERE id_segnalazione = ?`, [stateId, reportId]);
    await connection.execute(
      `INSERT INTO storico_stato (motivazione, id_segnalazione, id_stato, id_utente_operatore)
       VALUES (?, ?, ?, ?)`,
      [reason, reportId, stateId, operatorId]
    );
    await writeAudit({ userId: operatorId, action: 'STATO_SEGNALAZIONE_MODIFICATO', entity: 'segnalazione', entityId: reportId,
      details: { from: report.statusName, to: nextState.name }, ip }, connection);
    return findReportById(reportId, operatorId, connection);
  });
}
