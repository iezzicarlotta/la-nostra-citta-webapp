import { z } from 'zod';

export const locationSearchSchema = z.object({
  address: z.string().trim().min(5).max(150)
}).strict();