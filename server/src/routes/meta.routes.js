import { Router } from 'express';
import { metaController } from '../controllers/meta.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();
router.get('/', asyncHandler(metaController));
export default router;
