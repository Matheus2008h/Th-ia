import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@config/env';

export interface AuthPayload {
  id: string;
  email: string;
  plan: 'FREE' | 'PREMIUM';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
      admin?: { id: string; email: string };
    }
  }
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação ausente.' });
  }

  const token = header.substring(7);
  try {
    const payload = jwt.verify(token, env.jwt.secret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

/**
 * Guarda exclusiva do painel administrativo.
 * Usuários comuns, mesmo autenticados, recebem 403 aqui.
 * Isso garante que o painel admin nunca é acessível por engano.
 */
export function adminGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const token = header.substring(7);
  try {
    const payload = jwt.verify(token, env.jwt.secret) as any;
    if (!payload.isAdmin) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    req.admin = { id: payload.id, email: payload.email };
    next();
  } catch {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
}
