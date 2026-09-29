import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(configDir, '../../..');
dotenv.config({ path: process.env.ENV_FILE || path.join(repositoryRoot, '.env'), quiet: true });

const booleanFromString = z.enum(['0', '1']).transform((value) => value === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  TRUST_PROXY: booleanFromString.default('0'),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1).default('app_user'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('la_nostra_citta'),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(50).default(10),
  SESSION_SECRET: z.string().min(32).default('development-only-secret-change-me-now'),
  SESSION_MAX_AGE_MS: z.coerce.number().int().positive().default(28_800_000),
  UPLOAD_DIR: z.string().default('storage/uploads'),
  UPLOAD_TEMP_DIR: z.string().default('storage/tmp'),
  MAX_IMAGE_BYTES: z.coerce.number().int().positive().default(10_485_760),
  MAX_VIDEO_BYTES: z.coerce.number().int().positive().default(52_428_800),
  MAX_FILES_PER_REPORT: z.coerce.number().int().min(1).max(10).default(5)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Configurazione non valida: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
}

if (parsed.data.NODE_ENV === 'production') {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'development-only-secret-change-me-now') {
    throw new Error('In produzione SESSION_SECRET deve essere impostata con un valore casuale.');
  }
  if (!process.env.DB_PASSWORD) {
    throw new Error('In produzione DB_PASSWORD è obbligatoria.');
  }
}

export const env = Object.freeze({ ...parsed.data, repositoryRoot });
