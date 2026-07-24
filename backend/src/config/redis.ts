import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

redis.on('connect', () => console.log('[Redis] Conectado com sucesso.'));
redis.on('error', (err) => console.error('[Redis] Erro de conexão:', err.message));
