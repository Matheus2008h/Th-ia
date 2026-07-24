import { Router } from 'express';
import { adminGuard } from '@middlewares/auth.middleware';
import {
  generateKey,
  listKeys,
  revokeKey,
  deleteKey,
  listUsers,
  blockUser,
  unblockUser,
  deleteUser,
  stats,
  createProvider,
  listProviders,
  updateProviderStatus,
  deleteProvider,
  createModel,
  listModels,
  updateModelPriority,
  deleteModel,
  generateApiKey,
  listApiKeysHandler,
  revokeApiKeyHandler,
  deleteApiKeyHandler,
} from '@controllers/admin.controller';

const router = Router();

// Todas as rotas abaixo exigem adminGuard.
// Qualquer requisição sem token de admin válido recebe 403,
// mesmo que a rota/URL seja descoberta por um usuário comum.
router.use(adminGuard);

router.get('/stats', stats);

router.post('/keys', generateKey);
router.get('/keys', listKeys);
router.patch('/keys/:id/revoke', revokeKey);
router.delete('/keys/:id', deleteKey);

router.get('/users', listUsers);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);
router.delete('/users/:id', deleteUser);

router.post('/providers', createProvider);
router.get('/providers', listProviders);
router.patch('/providers/:id', updateProviderStatus);
router.delete('/providers/:id', deleteProvider);

router.post('/models', createModel);
router.get('/models', listModels);
router.patch('/models/:id', updateModelPriority);
router.delete('/models/:id', deleteModel);

router.post('/api-keys', generateApiKey);
router.get('/api-keys', listApiKeysHandler);
router.patch('/api-keys/:id/revoke', revokeApiKeyHandler);
router.delete('/api-keys/:id', deleteApiKeyHandler);

export default router;
