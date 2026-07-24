import { Router } from 'express';
import { authGuard } from '@middlewares/auth.middleware';
import { getPurchaseInfo, activatePremium } from '@controllers/license.controller';

const router = Router();

// Informações públicas de compra (preço + link do WhatsApp) usadas no botão "Adquirir Premium"
router.get('/purchase-info', getPurchaseInfo);

// Ativação da key exige usuário autenticado
router.post('/activate', authGuard, activatePremium);

export default router;
