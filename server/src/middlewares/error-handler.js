import multer from 'multer';
import fs from 'node:fs/promises';
import { env } from '../config/env.js';

export function notFound(request, response) {
  response.status(404).json({ error: { code: 'NOT_FOUND', message: `Risorsa non trovata: ${request.method} ${request.originalUrl}` } });
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);
  if (env.NODE_ENV !== 'test') {
    const log = (error.status || 500) >= 500 ? request.log?.error.bind(request.log) : request.log?.warn.bind(request.log);
    log?.({ err: error }, 'request failed');
  }
  if (request.files?.length) {
    Promise.allSettled(request.files.map((file) => fs.unlink(file.path))).catch(() => {});
  }

  if (error instanceof multer.MulterError) {
    return response.status(400).json({ error: { code: 'UPLOAD_ERROR', message: 'Caricamento non valido o limite superato.' } });
  }
  if (error.code === 'ER_DUP_ENTRY') {
    return response.status(409).json({ error: { code: 'DUPLICATE', message: 'Esiste già un record con questi dati.' } });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
    return response.status(409).json({ error: { code: 'REFERENCE_CONFLICT', message: 'Operazione non consentita per i collegamenti esistenti.' } });
  }
  if (error.code === 'ER_SIGNAL_EXCEPTION' || error.sqlState === '45000') {
    return response.status(409).json({ error: { code: 'BUSINESS_RULE', message: 'Operazione non consentita dalle regole della piattaforma.' } });
  }

  const status = error.status || 500;
  const payload = {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status === 500 ? 'Si è verificato un errore interno.' : error.message
    }
  };
  if (error.details) payload.error.details = error.details;
  if (env.NODE_ENV === 'development' && status === 500) payload.error.debug = error.message;
  response.status(status).json(payload);
}
