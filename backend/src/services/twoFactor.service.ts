import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { pool } from '@config/database';
import { encrypt, decrypt } from '@utils/crypto';

const ISSUER = 'TH IA (TH-5.5)';

/** Gera um novo segredo TOTP e o QR code correspondente, mas só ativa depois da confirmação */
export async function startTwoFactorSetup(userId: string, userEmail: string) {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(userEmail, ISSUER, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  // Guarda o segredo já criptografado, mas twofa_enabled continua FALSE até confirmar
  await pool.query('UPDATE users SET twofa_secret = :secret WHERE id = :userId', {
    secret: encrypt(secret),
    userId,
  });

  return { qrCodeDataUrl, secret };
}

/** Confirma o código digitado pelo usuário e, se bater, ativa o 2FA de fato */
export async function confirmTwoFactorSetup(userId: string, token: string): Promise<boolean> {
  const [rows] = await pool.query('SELECT twofa_secret FROM users WHERE id = :userId', { userId });
  const row = (rows as any[])[0];
  if (!row?.twofa_secret) return false;

  const secret = decrypt(row.twofa_secret);
  const valid = authenticator.verify({ token, secret });

  if (valid) {
    await pool.query('UPDATE users SET twofa_enabled = TRUE WHERE id = :userId', { userId });
  }
  return valid;
}

export async function disableTwoFactor(userId: string) {
  await pool.query('UPDATE users SET twofa_enabled = FALSE, twofa_secret = NULL WHERE id = :userId', { userId });
}

/** Usado no login: confere o código contra o segredo já ativo do usuário */
export async function verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
  const [rows] = await pool.query('SELECT twofa_secret FROM users WHERE id = :userId', { userId });
  const row = (rows as any[])[0];
  if (!row?.twofa_secret) return false;

  const secret = decrypt(row.twofa_secret);
  return authenticator.verify({ token, secret });
}
