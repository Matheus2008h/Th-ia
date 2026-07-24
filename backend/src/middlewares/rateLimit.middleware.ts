import { Request, Response, NextFunction } from 'express';
import { pool } from '@config/database';
import { env } from '@config/env';

export interface FreeLimitResult {
  allowed: boolean;
  limit: number;
  windowHours: number;
  secondsRemaining?: number;
  resetAt?: string;
}

/**
 * Núcleo da regra do plano FREE, reutilizado tanto pela rota REST quanto
 * pelo gateway Socket.IO (sockets/chat.socket.ts), já que o chat em tempo
 * real acontece via socket e precisa respeitar o mesmo limite.
 */
export async function checkFreePlanLimit(userId: string, plan: 'FREE' | 'PREMIUM'): Promise<FreeLimitResult> {
  if (plan === 'PREMIUM') {
    return { allowed: true, limit: Infinity, windowHours: env.free.windowHours };
  }

  const windowMs = env.free.windowHours * 60 * 60 * 1000;
  const now = new Date();

  const [rows] = await pool.query(
    'SELECT id, window_start, message_count FROM message_usage WHERE user_id = :userId ORDER BY window_start DESC LIMIT 1',
    { userId }
  );
  const usage = (rows as any[])[0];

  if (!usage || now.getTime() - new Date(usage.window_start).getTime() >= windowMs) {
    await pool.query(
      'INSERT INTO message_usage (id, user_id, window_start, message_count) VALUES (UUID(), :userId, :now, 1)',
      { userId, now }
    );
    return { allowed: true, limit: env.free.messageLimit, windowHours: env.free.windowHours };
  }

  if (usage.message_count >= env.free.messageLimit) {
    const windowEnd = new Date(new Date(usage.window_start).getTime() + windowMs);
    const secondsRemaining = Math.max(0, Math.floor((windowEnd.getTime() - now.getTime()) / 1000));
    return {
      allowed: false,
      limit: env.free.messageLimit,
      windowHours: env.free.windowHours,
      secondsRemaining,
      resetAt: windowEnd.toISOString(),
    };
  }

  await pool.query('UPDATE message_usage SET message_count = message_count + 1 WHERE id = :id', {
    id: usage.id,
  });
  return { allowed: true, limit: env.free.messageLimit, windowHours: env.free.windowHours };
}

export async function freePlanRateLimit(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Não autenticado.' });

  const result = await checkFreePlanLimit(user.id, user.plan);
  if (!result.allowed) {
    return res.status(429).json({
      error: 'Limite de mensagens do plano FREE atingido.',
      limit: result.limit,
      windowHours: result.windowHours,
      secondsRemaining: result.secondsRemaining,
      resetAt: result.resetAt,
    });
  }
  next();
}
