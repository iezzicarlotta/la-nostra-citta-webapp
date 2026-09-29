import { Router } from 'express';
import { z } from 'zod';
import {
  createCategoryController, createNeighborhoodController, deleteCategoryController, deleteNeighborhoodController,
  listUsersController, updateCategoryController, updateNeighborhoodController, updateUserController
} from '../controllers/admin.controller.js';
import { requireRole } from '../middlewares/auth.js';
import { requireCsrf } from '../middlewares/csrf.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { entitySchema, userAdminSchema } from '../validators/report.validators.js';

const router = Router();
const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(100).default('')
});
const categorySchema = entitySchema.omit({ municipality: true });

router.use(requireRole('AMMINISTRATORE'));
router.get('/users', validate(userQuerySchema, 'query'), asyncHandler(listUsersController));
router.patch('/users/:id', requireCsrf, validate(userAdminSchema), asyncHandler(updateUserController));
router.post('/neighborhoods', requireCsrf, validate(entitySchema), asyncHandler(createNeighborhoodController));
router.put('/neighborhoods/:id', requireCsrf, validate(entitySchema), asyncHandler(updateNeighborhoodController));
router.delete('/neighborhoods/:id', requireCsrf, asyncHandler(deleteNeighborhoodController));
router.post('/categories', requireCsrf, validate(categorySchema), asyncHandler(createCategoryController));
router.put('/categories/:id', requireCsrf, validate(categorySchema), asyncHandler(updateCategoryController));
router.delete('/categories/:id', requireCsrf, asyncHandler(deleteCategoryController));

export default router;
