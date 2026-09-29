import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(10).max(128).regex(/[a-z]/, 'Serve una lettera minuscola.').regex(/[A-Z]/, 'Serve una lettera maiuscola.').regex(/[0-9]/, 'Serve un numero.');

export const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email,
  password,
  neighborhoodId: z.coerce.number().int().positive().nullable().optional()
}).strict();

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128)
}).strict();

export const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  neighborhoodId: z.coerce.number().int().positive().nullable()
}).strict();
