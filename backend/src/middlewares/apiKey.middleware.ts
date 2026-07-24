import { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '@services/apiKey.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiKeyId?: string;
    }
  }
}

/**
 * Extrai a key do header Authorization: Bearer <key> (ou x-api-key, por conveniência)
 * e confere se está ativa e dentro da validade de 30 dias.
 */
export async function apiKeyGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearerKey = header?.startsWith('Bearer ') ? header.substring(7) : null;
  const code = bearerKey || (req.headers['x-api-key'] as string | undefined);

  if (!code) {
    return res.status(401).json({ error: { message: 'API key ausente. Envie em Authorization: Bearer <key>.' } });
  }

  const key = await validateApiKey(code);
  if (!key) {
    return res.status(401).json({ error: { message: 'API key inválida, revogada ou expirada.' } });
  }

  req.apiKeyId = key.id;
  next();
}
