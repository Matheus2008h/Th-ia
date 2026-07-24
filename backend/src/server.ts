import 'module-alias/register';
import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { env } from '@config/env';
import { testDbConnection } from '@config/database';
import { registerChatSocket } from '@sockets/chat.socket';
import { checkAndDowngradeExpired } from '@services/license.service';
import { checkAndExpireApiKeys } from '@services/apiKey.service';

async function bootstrap() {
  await testDbConnection();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: env.frontendUrl, credentials: true },
  });

  registerChatSocket(io);

  // Job periódico: rebaixa automaticamente usuários com key premium expirada
  // e desativa API keys que passaram dos 30 dias (mesma lógica, dois recursos diferentes)
  setInterval(() => {
    checkAndDowngradeExpired().catch((err) => console.error('[Scheduler] Erro ao verificar expiração premium:', err));
    checkAndExpireApiKeys().catch((err) => console.error('[Scheduler] Erro ao verificar expiração de API keys:', err));
  }, 60 * 60 * 1000); // a cada 1 hora

  server.listen(env.port, () => {
    console.log(`[Server] TH IA (TH-5.5) backend rodando na porta ${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Falha ao iniciar o servidor:', err);
  process.exit(1);
});
