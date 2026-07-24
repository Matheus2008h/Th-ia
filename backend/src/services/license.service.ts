import crypto from 'crypto';
import { pool } from '@config/database';
import { env } from '@config/env';

export interface GenerateKeyOptions {
  durationDays: 7 | 30 | 90 | null; // null = permanente
  createdByAdminId: string;
}

/** Gera um código de key aleatório de alta segurança, formato THIA-XXXX-XXXX-XXXX-XXXX */
function generateSecureCode(): string {
  const block = () => crypto.randomBytes(3).toString('hex').toUpperCase();
  return `THIA-${block()}-${block()}-${block()}-${block()}`;
}

export async function createLicenseKey(opts: GenerateKeyOptions) {
  const code = generateSecureCode();
  await pool.query(
    `INSERT INTO license_keys (id, code, plan, duration_days, status, created_by_admin_id)
     VALUES (UUID(), :code, 'PREMIUM', :durationDays, 'UNUSED', :adminId)`,
    { code, durationDays: opts.durationDays, adminId: opts.createdByAdminId }
  );
  return code;
}

export async function revokeLicenseKey(keyId: string) {
  await pool.query("UPDATE license_keys SET status = 'REVOKED' WHERE id = :keyId", { keyId });
}

export async function deleteLicenseKey(keyId: string) {
  await pool.query('DELETE FROM license_keys WHERE id = :keyId', { keyId });
}

/**
 * Ativa uma key para um usuário.
 * Regras:
 *  - Key precisa existir e estar UNUSED (uso único).
 *  - Depois de ativada, fica vinculada PARA SEMPRE àquele usuário/key (não pode ser reutilizada).
 *  - Duração padrão do TH IA é 30 dias (ou o que foi definido na geração da key).
 *  - Ao expirar, o usuário volta automaticamente para FREE (verificado em checkAndDowngradeExpired).
 */
export async function activateLicenseKey(userId: string, code: string, ip: string) {
  const [rows] = await pool.query('SELECT * FROM license_keys WHERE code = :code LIMIT 1', { code });
  const key = (rows as any[])[0];

  if (!key) {
    return { success: false, message: 'Key inválida.' };
  }
  if (key.status !== 'UNUSED') {
    return { success: false, message: 'Esta key já foi utilizada ou não está mais disponível.' };
  }

  const now = new Date();
  const expiresAt = key.duration_days
    ? new Date(now.getTime() + key.duration_days * 24 * 60 * 60 * 1000)
    : null; // permanente

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE license_keys
       SET status = 'ACTIVE', used_by_user_id = :userId, activation_ip = :ip,
           activated_at = :now, expires_at = :expiresAt
       WHERE id = :keyId`,
      { userId, ip, now, expiresAt, keyId: key.id }
    );

    await conn.query(
      `INSERT INTO licenses (id, user_id, key_id, activated_at, expires_at, activation_ip, status)
       VALUES (UUID(), :userId, :keyId, :now, :expiresAt, :ip, 'ACTIVE')`,
      { userId, keyId: key.id, now, expiresAt: expiresAt ?? '9999-12-31 23:59:59', ip }
    );

    await conn.query("UPDATE users SET plan = 'PREMIUM' WHERE id = :userId", { userId });

    await conn.commit();
    return { success: true, expiresAt };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Deve rodar periodicamente (cron/job): rebaixa para FREE todo usuário
 * cuja licença ativa já passou de expires_at.
 */
export async function checkAndDowngradeExpired() {
  const now = new Date();

  const [expired] = await pool.query(
    `SELECT l.id, l.user_id FROM licenses l
     WHERE l.status = 'ACTIVE' AND l.expires_at IS NOT NULL AND l.expires_at < :now`,
    { now }
  );

  for (const row of expired as any[]) {
    await pool.query("UPDATE licenses SET status = 'EXPIRED' WHERE id = :id", { id: row.id });
    await pool.query("UPDATE license_keys SET status = 'EXPIRED' WHERE used_by_user_id = :userId AND status = 'ACTIVE'", {
      userId: row.user_id,
    });
    await pool.query("UPDATE users SET plan = 'FREE' WHERE id = :userId", { userId: row.user_id });
  }

  return expired;
}

export function buildWhatsappPurchaseLink(): string {
  const text = encodeURIComponent(env.premium.whatsappMessage);
  return `https://wa.me/${env.premium.whatsappNumber}?text=${text}`;
}
