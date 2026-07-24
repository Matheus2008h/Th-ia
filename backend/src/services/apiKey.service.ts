import crypto from 'crypto';
import { pool } from '@config/database';

const API_KEY_DURATION_DAYS = 30; // mesmo padrão do Premium — a key expira automaticamente

function generateSecureApiKey(): string {
  const raw = crypto.randomBytes(24).toString('base64url'); // URL-safe, bom para header Authorization
  return `thia-api-${raw}`;
}

/** Só o administrador chama isso (rota protegida por adminGuard) */
export async function createApiKey(label: string | undefined, createdByAdminId: string) {
  const code = generateSecureApiKey();
  const expiresAt = new Date(Date.now() + API_KEY_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO api_keys (id, key_code, label, status, created_by_admin_id, expires_at)
     VALUES (UUID(), :code, :label, 'ACTIVE', :adminId, :expiresAt)`,
    { code, label: label || null, adminId: createdByAdminId, expiresAt }
  );

  return { code, expiresAt };
}

export async function revokeApiKey(id: string) {
  await pool.query("UPDATE api_keys SET status = 'REVOKED' WHERE id = :id", { id });
}

export async function deleteApiKey(id: string) {
  await pool.query('DELETE FROM api_keys WHERE id = :id', { id });
}

export async function listApiKeys() {
  const [rows] = await pool.query('SELECT * FROM api_keys ORDER BY created_at DESC');
  return rows;
}

/**
 * Valida uma API key recebida na requisição pública (/api/v1/*).
 * Retorna null se inválida, revogada, ou expirada (e nesse último caso já
 * marca automaticamente como EXPIRED no banco, sem precisar esperar o job periódico).
 */
export async function validateApiKey(code: string) {
  const [rows] = await pool.query('SELECT * FROM api_keys WHERE key_code = :code LIMIT 1', { code });
  const key = (rows as any[])[0];
  if (!key) return null;

  if (key.status === 'REVOKED') return null;

  if (new Date(key.expires_at) < new Date()) {
    if (key.status !== 'EXPIRED') {
      await pool.query("UPDATE api_keys SET status = 'EXPIRED' WHERE id = :id", { id: key.id });
    }
    return null;
  }

  // Atualiza estatísticas de uso de forma assíncrona (não bloqueia a resposta)
  pool
    .query('UPDATE api_keys SET request_count = request_count + 1, last_used_at = NOW() WHERE id = :id', { id: key.id })
    .catch(() => {});

  return key;
}

/** Job periódico: expira em lote qualquer key vencida que ainda esteja marcada como ACTIVE */
export async function checkAndExpireApiKeys() {
  await pool.query("UPDATE api_keys SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND expires_at < NOW()");
}
