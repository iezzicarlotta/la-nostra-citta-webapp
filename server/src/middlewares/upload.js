import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';

const tempDirectory = path.resolve(env.repositoryRoot, env.UPLOAD_TEMP_DIR);
fs.mkdirSync(tempDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, tempDirectory),
  filename: (_request, _file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}.upload`)
});

export const reportUpload = multer({
  storage,
  limits: {
    files: env.MAX_FILES_PER_REPORT,
    fileSize: env.MAX_VIDEO_BYTES,
    fields: 20
  }
}).array('attachments', env.MAX_FILES_PER_REPORT);
