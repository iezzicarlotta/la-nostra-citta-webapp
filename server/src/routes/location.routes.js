import { Router } from 'express';
import { searchAddressController } from '../controllers/location.controller.js';
import { requireCsrf } from '../middlewares/csrf.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { locationSearchSchema } from '../validators/location.validators.js';

const router = Router();

router.post('/search', requireCsrf, validate(locationSearchSchema), asyncHandler(searchAddressController));

export default router;