import { Router } from 'express';
import {
  attachmentController, createReportController, listReportsController, mapReportsController, moderationListController, ownReportsController,
  reportDetailController, stateChangeController, supportController, unsupportController
} from '../controllers/report.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { requireCsrf } from '../middlewares/csrf.js';
import { reportUpload } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { reportBodySchema, reportQuerySchema, stateChangeSchema } from '../validators/report.validators.js';

const router = Router();

router.get('/', validate(reportQuerySchema, 'query'), asyncHandler(listReportsController));
router.get('/mine', requireAuth, validate(reportQuerySchema.pick({ page: true, limit: true }), 'query'), asyncHandler(ownReportsController));
router.get('/moderation', requireRole('MODERATORE', 'AMMINISTRATORE'), validate(reportQuerySchema.pick({ page: true, limit: true }), 'query'), asyncHandler(moderationListController));
router.get('/map', asyncHandler(mapReportsController));
router.get('/:id', asyncHandler(reportDetailController));
router.post('/', requireAuth, requireCsrf, reportUpload, validate(reportBodySchema), asyncHandler(createReportController));
router.post('/:id/support', requireAuth, requireCsrf, asyncHandler(supportController));
router.delete('/:id/support', requireAuth, requireCsrf, asyncHandler(unsupportController));
router.patch('/:id/state', requireRole('MODERATORE', 'AMMINISTRATORE'), requireCsrf, validate(stateChangeSchema), asyncHandler(stateChangeController));
router.get('/attachments/:id/file', asyncHandler(attachmentController));

export default router;
