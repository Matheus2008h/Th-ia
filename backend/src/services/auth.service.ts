import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '@config/database';
import { env } from '@config/env';

export async function registerUser(name: string, email: string, password: string) {
  const [existing] = await pool.query('SELECT id FROM users WHERE email = :email', { email });
  if ((existing as any[]).length > 0) {
    throw new Error('Já existe uma conta com este e-mail.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, plan) VALUES (UUID(), :name, :email, :password_hash, 'FREE')",
    { name, email, password_hash: passwordHash }
  );

  const [rows] = await pool.query('SELECT id, name, email, plan FROM users WHERE email = :email', { email });
  const user = (rows as any[])[0];
  return issueTokens(user);
}

export async function loginUser(email: string, password: string) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = :email', { email });
  const user = (rows as any[])[0];
  if (!user) throw new Error('Credenciais inválidas.');
  if (user.is_blocked) throw new Error('Esta conta foi bloqueada pelo administrador.');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Credenciais inválidas.');

  if (user.twofa_enabled) {
    // Token de curta duração só pra provar que a senha já foi validada — o front usa
    // ele na segunda etapa (POST /api/auth/2fa/verify-login) junto do código do app autenticador.
    const challengeToken = jwt.sign({ id: user.id, stage: '2fa' }, env.jwt.secret, { expiresIn: '5m' });
    return { requiresTwoFactor: true, challengeToken };
  }

  return issueTokens(user);
}

export async function completeTwoFactorLogin(challengeToken: string, code: string) {
  let payload: any;
  try {
    payload = jwt.verify(challengeToken, env.jwt.secret);
  } catch {
    throw new Error('Sessão de verificação expirada, faça login novamente.');
  }
  if (payload.stage !== '2fa') throw new Error('Token de verificação inválido.');

  const { verifyTwoFactorToken } = await import('./twoFactor.service');
  const valid = await verifyTwoFactorToken(payload.id, code);
  if (!valid) throw new Error('Código de verificação inválido.');

  const [rows] = await pool.query('SELECT id, name, email, plan FROM users WHERE id = :id', { id: payload.id });
  return issueTokens((rows as any[])[0]);
}

function issueTokens(user: { id: string; name: string; email: string; plan: string }) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
  const refreshToken = jwt.sign({ id: user.id }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
  };
}

export async function loginAdmin(email: string, password: string) {
  const [rows] = await pool.query('SELECT * FROM admins WHERE email = :email', { email });
  const admin = (rows as any[])[0];
  if (!admin) throw new Error('Credenciais inválidas.');

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) throw new Error('Credenciais inválidas.');

  const accessToken = jwt.sign(
    { id: admin.id, email: admin.email, isAdmin: true },
    env.jwt.secret,
    { expiresIn: '12h' }
  );
  return { accessToken, admin: { id: admin.id, name: admin.name, email: admin.email } };
}
