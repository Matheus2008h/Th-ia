import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '@config/database';
import { createLicenseKey, revokeLicenseKey, deleteLicenseKey } from '@services/license.service';
import { createApiKey, revokeApiKey, deleteApiKey, listApiKeys } from '@services/apiKey.service';
import { encrypt } from '@utils/crypto';

const generateKeySchema = z.object({
  durationDays: z.union([z.literal(7), z.literal(30), z.literal(90), z.null()]),
});

export async function generateKey(req: Request, res: Response) {
  const parsed = generateKeySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Duração inválida (use 7, 30, 90 ou null para permanente).' });

  const code = await createLicenseKey({
    durationDays: parsed.data.durationDays,
    createdByAdminId: req.admin!.id,
  });
  res.status(201).json({ code });
}

export async function listKeys(_req: Request, res: Response) {
  const [rows] = await pool.query(
    `SELECT lk.*, u.name AS user_name, u.email AS user_email
     FROM license_keys lk
     LEFT JOIN users u ON u.id = lk.used_by_user_id
     ORDER BY lk.created_at DESC`
  );
  res.json(rows);
}

export async function revokeKey(req: Request, res: Response) {
  await revokeLicenseKey(req.params.id);
  res.json({ success: true });
}

export async function deleteKey(req: Request, res: Response) {
  await deleteLicenseKey(req.params.id);
  res.json({ success: true });
}

export async function listUsers(_req: Request, res: Response) {
  const [rows] = await pool.query(
    'SELECT id, name, email, plan, is_blocked, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(rows);
}

export async function blockUser(req: Request, res: Response) {
  await pool.query('UPDATE users SET is_blocked = TRUE WHERE id = :id', { id: req.params.id });
  res.json({ success: true });
}

export async function unblockUser(req: Request, res: Response) {
  await pool.query('UPDATE users SET is_blocked = FALSE WHERE id = :id', { id: req.params.id });
  res.json({ success: true });
}

export async function deleteUser(req: Request, res: Response) {
  await pool.query('DELETE FROM users WHERE id = :id', { id: req.params.id });
  res.json({ success: true });
}

export async function stats(_req: Request, res: Response) {
  const [[users]]: any = await pool.query('SELECT COUNT(*) AS total FROM users');
  const [[premium]]: any = await pool.query("SELECT COUNT(*) AS total FROM users WHERE plan = 'PREMIUM'");
  const [[freeKeys]]: any = await pool.query("SELECT COUNT(*) AS total FROM license_keys WHERE status = 'UNUSED'");
  const [[usedKeys]]: any = await pool.query("SELECT COUNT(*) AS total FROM license_keys WHERE status != 'UNUSED'");

  res.json({
    totalUsers: users.total,
    premiumUsers: premium.total,
    freeKeysAvailable: freeKeys.total,
    keysUsed: usedKeys.total,
  });
}

// ==========================================================
// PROVIDERS / MODELOS DE IA (multi-IA configurada pelo admin)
// ==========================================================

const providerSchema = z.object({
  name: z.string().min(2),
  providerKey: z.enum(['openai', 'anthropic', 'google', 'mistral', 'deepseek', 'groq', 'openrouter', 'ollama', 'tavily', 'serper']),
  apiKey: z.string().optional(), // não obrigatório (ex: ollama local não precisa)
  baseUrl: z.string().url().optional().or(z.literal('')),
});

export async function createProvider(req: Request, res: Response) {
  const parsed = providerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, providerKey, apiKey, baseUrl } = parsed.data;
  const apiKeyEncrypted = apiKey ? encrypt(apiKey) : null;

  await pool.query(
    `INSERT INTO ai_providers (id, name, provider_key, api_key_encrypted, base_url, is_active)
     VALUES (UUID(), :name, :providerKey, :apiKeyEncrypted, :baseUrl, TRUE)`,
    { name, providerKey, apiKeyEncrypted, baseUrl: baseUrl || null }
  );
  res.status(201).json({ success: true });
}

export async function listProviders(_req: Request, res: Response) {
  const [rows] = await pool.query(
    'SELECT id, name, provider_key, base_url, is_active, created_at, (api_key_encrypted IS NOT NULL) AS has_key FROM ai_providers ORDER BY created_at DESC'
  );
  res.json(rows);
}

export async function updateProviderStatus(req: Request, res: Response) {
  const { isActive } = req.body;
  await pool.query('UPDATE ai_providers SET is_active = :isActive WHERE id = :id', {
    isActive: !!isActive,
    id: req.params.id,
  });
  res.json({ success: true });
}

export async function deleteProvider(req: Request, res: Response) {
  await pool.query('DELETE FROM ai_providers WHERE id = :id', { id: req.params.id });
  res.json({ success: true });
}

const modelSchema = z.object({
  providerId: z.string().uuid(),
  modelName: z.string().min(1),
  taskType: z.enum(['chat', 'vision', 'image_gen', 'code', 'audio']).default('chat'),
  priority: z.number().int().default(0),
});

export async function createModel(req: Request, res: Response) {
  const parsed = modelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { providerId, modelName, taskType, priority } = parsed.data;
  await pool.query(
    `INSERT INTO ai_models (id, provider_id, model_name, task_type, priority, is_active)
     VALUES (UUID(), :providerId, :modelName, :taskType, :priority, TRUE)`,
    { providerId, modelName, taskType, priority }
  );
  res.status(201).json({ success: true });
}

export async function listModels(_req: Request, res: Response) {
  const [rows] = await pool.query(
    `SELECT m.id, m.model_name, m.task_type, m.priority, m.is_active, p.name AS provider_name, p.provider_key
     FROM ai_models m JOIN ai_providers p ON p.id = m.provider_id
     ORDER BY m.task_type, m.priority DESC`
  );
  res.json(rows);
}

export async function updateModelPriority(req: Request, res: Response) {
  const { priority, isActive } = req.body;
  await pool.query(
    'UPDATE ai_models SET priority = COALESCE(:priority, priority), is_active = COALESCE(:isActive, is_active) WHERE id = :id',
    { priority: priority ?? null, isActive: isActive ?? null, id: req.params.id }
  );
  res.json({ success: true });
}

export async function deleteModel(req: Request, res: Response) {
  await pool.query('DELETE FROM ai_models WHERE id = :id', { id: req.params.id });
  res.json({ success: true });
}

// ==========================================================
// API KEYS MENSAIS (acesso à API pública /api/v1, vendida separado do Premium)
// Só o administrador pode gerar — cada key fica ativa por 30 dias.
// ==========================================================

const apiKeyLabelSchema = z.object({ label: z.string().max(120).optional() });

export async function generateApiKey(req: Request, res: Response) {
  const parsed = apiKeyLabelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Rótulo inválido.' });

  const { code, expiresAt } = await createApiKey(parsed.data.label, req.admin!.id);
  res.status(201).json({ code, expiresAt });
}

export async function listApiKeysHandler(_req: Request, res: Response) {
  res.json(await listApiKeys());
}

export async function revokeApiKeyHandler(req: Request, res: Response) {
  await revokeApiKey(req.params.id);
  res.json({ success: true });
}

export async function deleteApiKeyHandler(req: Request, res: Response) {
  await deleteApiKey(req.params.id);
  res.json({ success: true });
}
