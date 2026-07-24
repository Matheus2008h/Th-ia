import crypto from 'crypto';
import { env } from '@config/env';

// Deriva uma chave de 32 bytes a partir do JWT_SECRET caso ENCRYPTION_KEY não seja definida.
// Em produção, defina ENCRYPTION_KEY separadamente no .env por segurança.
const secretSource = process.env.ENCRYPTION_KEY || env.jwt.secret;
const key = crypto.createHash('sha256').update(secretSource).digest();

/** Criptografa a API key de um provedor antes de salvar no banco (ai_providers.api_key_encrypted) */
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Descriptografa a API key para uso na chamada real ao provedor */
export function decrypt(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
