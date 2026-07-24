import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '@middlewares/auth.middleware';
import {
  getUserProfile,
  updateUserProfile,
  listMemoryFacts,
  upsertMemoryFact,
  deleteMemoryFact,
} from '@services/memory.service';
import { startTwoFactorSetup, confirmTwoFactorSetup, disableTwoFactor } from '@services/twoFactor.service';
import { pool } from '@config/database';

const router = Router();
router.use(authGuard);

router.get('/profile', async (req, res) => {
  const profile = await getUserProfile(req.user!.id);
  res.json(profile);
});

const profileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  language: z.string().max(10).optional(),
  responseStyle: z.string().max(50).optional(),
  personality: z.string().max(2000).optional(),
});

router.put('/profile', async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  await updateUserProfile(req.user!.id, parsed.data);
  res.json({ success: true });
});

router.get('/memory', async (req, res) => {
  res.json(await listMemoryFacts(req.user!.id));
});

const factSchema = z.object({
  keyName: z.string().min(1).max(80),
  valueText: z.string().min(1).max(2000),
});

router.post('/memory', async (req, res) => {
  const parsed = factSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe uma chave e um valor.' });
  await upsertMemoryFact(req.user!.id, parsed.data.keyName, parsed.data.valueText);
  res.status(201).json({ success: true });
});

router.delete('/memory/:keyName', async (req, res) => {
  await deleteMemoryFact(req.user!.id, req.params.keyName);
  res.json({ success: true });
});

// ==========================================================
// 2FA opcional (TOTP — Google Authenticator, Authy, etc.)
// ==========================================================

router.post('/2fa/setup', async (req, res) => {
  const { qrCodeDataUrl } = await startTwoFactorSetup(req.user!.id, req.user!.email);
  res.json({ qrCodeDataUrl });
});

const confirmSchema = z.object({ code: z.string().min(6).max(6) });

router.post('/2fa/confirm', async (req, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Código inválido.' });

  const ok = await confirmTwoFactorSetup(req.user!.id, parsed.data.code);
  if (!ok) return res.status(400).json({ error: 'Código incorreto. Tente novamente.' });
  res.json({ success: true });
});

router.post('/2fa/disable', async (req, res) => {
  await disableTwoFactor(req.user!.id);
  res.json({ success: true });
});

router.get('/2fa/status', async (req, res) => {
  const [rows] = await pool.query('SELECT twofa_enabled FROM users WHERE id = :id', { id: req.user!.id });
  res.json({ enabled: !!(rows as any[])[0]?.twofa_enabled });
});

export default router;
