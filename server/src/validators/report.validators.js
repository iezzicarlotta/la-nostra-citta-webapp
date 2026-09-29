import { z } from 'zod';

const nullableCoordinate = z.preprocess((value) => value === '' || value === undefined ? null : value, z.coerce.number().nullable());

export const reportBodySchema = z.object({
  title: z.string().trim().min(5).max(150),
  description: z.string().trim().min(20).max(5000),
  neighborhoodId: z.coerce.number().int().positive(),
  address: z.string().trim().max(255).optional().default(''),
  latitude: nullableCoordinate.refine((value) => value === null || (value >= -90 && value <= 90), 'Latitudine non valida.'),
  longitude: nullableCoordinate.refine((value) => value === null || (value >= -180 && value <= 180), 'Longitudine non valida.'),
  visibility: z.enum(['PUBBLICA', 'PRIVATA', 'ANONIMA']).default('PUBBLICA'),
  categoryIds: z.preprocess((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return value.split(','); }
    }
    return value;
  }, z.array(z.coerce.number().int().positive()).min(1).max(5))
}).superRefine((value, context) => {
  if ((value.latitude === null) !== (value.longitude === null)) {
    context.addIssue({ code: 'custom', message: 'Latitudine e longitudine devono essere inserite insieme.' });
  }
});

export const reportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  neighborhoodId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  statusId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'support']).default('newest')
});

export const stateChangeSchema = z.object({
  stateId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(5).max(1000)
}).strict();

export const entitySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional().default(''),
  municipality: z.coerce.number().int().min(1).max(9).nullable().optional()
}).strict();

export const userAdminSchema = z.object({
  role: z.enum(['CITTADINO', 'MODERATORE', 'AMMINISTRATORE']).optional(),
  accountStatus: z.enum(['ATTIVO', 'SOSPESO', 'ELIMINATO']).optional()
}).refine((value) => value.role || value.accountStatus, 'Inserisci almeno una modifica.');
