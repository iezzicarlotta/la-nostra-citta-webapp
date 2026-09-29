import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { loginController, logoutController, meController, profileController, registerController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { issueCsrfToken, requireCsrf } from '../middlewares/csrf.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { loginSchema, profileSchema, registerSchema } from '../validators/auth.validators.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/csrf', issueCsrfToken);
router.post('/register', authLimiter, requireCsrf, validate(registerSchema), asyncHandler(registerController));
router.post('/login', authLimiter, requireCsrf, validate(loginSchema), asyncHandler(loginController));
router.post('/logout', requireAuth, requireCsrf, asyncHandler(logoutController));
router.get('/me', requireAuth, asyncHandler(meController));
router.put('/profile', requireAuth, requireCsrf, validate(profileSchema), asyncHandler(profileController));

export default router;
