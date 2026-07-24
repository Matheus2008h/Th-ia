import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from '@config/env';
import { openApiSpec } from '@config/openapi';

import authRoutes from '@routes/auth.routes';
import licenseRoutes from '@routes/license.routes';
import adminRoutes from '@routes/admin.routes';
import chatRoutes from '@routes/chat.routes';
import uploadRoutes from '@routes/upload.routes';
import imageRoutes from '@routes/image.routes';
import publicApiRoutes from '@routes/publicApi.routes';
import userRoutes from '@routes/user.routes';
import toolsRoutes from '@routes/tools.routes';

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Arquivos enviados pelos usuários (imagens, PDFs, etc.) ficam disponíveis aqui
app.use('/uploads', express.static(env.upload.dir));

// Rate limit global (proteção geral contra abuso/DoS)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'TH IA (TH-5.5)' }));

// Documentação interativa da API
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: 'TH IA API Docs' }));

app.use('/api/auth', authRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/image', imageRoutes);

// API pública da plataforma — protegida por API key (gerada exclusivamente pelo admin, válida por 30 dias)
app.use('/api/v1', publicApiRoutes);

// Painel administrativo: nunca visível/acessível para usuários comuns.
// A guarda `adminGuard` (dentro de admin.routes) retorna 403 para qualquer
// requisição sem um token de admin válido, mesmo que a URL seja descoberta.
app.use('/api/admin', adminRoutes);

// Qualquer rota /api/admin/* não mapeada também deve responder 403, nunca 404,
// para não revelar a existência/estrutura do painel.
app.use('/api/admin', (_req, res) => res.status(403).json({ error: 'Acesso negado.' }));

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ErrorHandler]', err);

  if (err.name === 'MulterError' || /Tipo de arquivo não suportado/.test(err.message || '')) {
    return res.status(400).json({ error: err.message || 'Falha no upload do arquivo.' });
  }

  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor.' });
});
