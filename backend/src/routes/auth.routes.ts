import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, adminLogin, verifyTwoFactorLogin } from '@controllers/auth.controller';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/2fa/verify-login', authLimiter, verifyTwoFactorLogin);
router.post('/admin/login', authLimiter, adminLogin);

export default router;
