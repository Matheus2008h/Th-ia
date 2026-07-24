import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { env } from '@config/env';
import { pool } from '@config/database';
import { checkFreePlanLimit } from '@middlewares/rateLimit.middleware';
import { routeAIRequest } from '@services/aiRouter.service';
import { buildMemorySystemPrompt } from '@services/memory.service';
import { ContentBlock } from '../providers/types';

interface AuthedSocket extends Socket {
  userId?: string;
}

interface Attachment {
  fileName: string;
  storedName: string;
  url: string;
  kind: 'image' | 'pdf' | 'docx' | 'spreadsheet' | 'text' | 'other';
  mimeType?: string;
  extractedText?: string | null;
}

const SHORT_MEMORY_LIMIT = 20; // últimas N mensagens da conversa usadas como contexto
const MAX_IMAGES_IN_CONTEXT = 4; // evita estourar o payload enviando imagens antigas demais

/**
 * Monta o conteúdo multimodal enviado à IA:
 * - Imagens viram blocos de imagem reais (base64), permitindo visão nativa nos
 *   modelos que suportam (Claude, GPT-4o, llava/Ollama).
 * - Documentos (PDF/DOCX/planilha/texto) têm o texto já extraído anexado ao final.
 */
function buildContentBlocks(content: string, attachments: Attachment[] | undefined, imagesBudget: { count: number }): string | ContentBlock[] {
  if (!attachments || attachments.length === 0) return content;

  const blocks: ContentBlock[] = [{ type: 'text', text: content }];
  const extraNotes: string[] = [];

  for (const att of attachments) {
    if (att.kind === 'image' && imagesBudget.count < MAX_IMAGES_IN_CONTEXT) {
      try {
        const filePath = path.join(env.upload.dir, att.storedName);
        const buffer = fs.readFileSync(filePath);
        blocks.push({ type: 'image', mediaType: att.mimeType || 'image/png', data: buffer.toString('base64') });
        imagesBudget.count += 1;
        if (att.extractedText) {
          extraNotes.push(`[Texto reconhecido por OCR em "${att.fileName}"]:\n${att.extractedText}`);
        }
      } catch {
        extraNotes.push(`[Não foi possível carregar a imagem "${att.fileName}".]`);
      }
    } else if (att.kind === 'image') {
      extraNotes.push(`[Imagem "${att.fileName}" omitida do contexto por limite de anexos recentes.]`);
    } else if (att.extractedText) {
      extraNotes.push(`--- Conteúdo de "${att.fileName}" ---\n${att.extractedText}`);
    } else {
      extraNotes.push(`[Arquivo anexado: ${att.fileName} — tipo "${att.kind}", sem texto extraível.]`);
    }
  }

  if (extraNotes.length > 0) {
    blocks[0] = { type: 'text', text: `${content}\n\n${extraNotes.join('\n\n')}` };
  }

  // Se não sobrou nenhum bloco de imagem, simplifica de volta pra string (mais barato)
  if (blocks.length === 1) return (blocks[0] as { type: 'text'; text: string }).text;
  return blocks;
}

export function registerChatSocket(io: Server) {
  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Não autenticado.'));
    try {
      const payload = jwt.verify(token, env.jwt.secret) as any;
      socket.userId = payload.id;
      next();
    } catch {
      next(new Error('Token inválido.'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    console.log(`[Socket] Usuário conectado: ${socket.userId}`);

    socket.on(
      'chat:message',
      async (data: { conversationId: string; content: string; attachments?: Attachment[] }) => {
        const { conversationId, content, attachments } = data;

        try {
          const [userRows] = await pool.query('SELECT plan FROM users WHERE id = :id', { id: socket.userId });
          const currentPlan = ((userRows as any[])[0]?.plan || 'FREE') as 'FREE' | 'PREMIUM';

          const limitCheck = await checkFreePlanLimit(socket.userId!, currentPlan);
          if (!limitCheck.allowed) {
            socket.emit('chat:error', {
              conversationId,
              error: `Limite de ${limitCheck.limit} mensagens a cada ${limitCheck.windowHours}h atingido. Tente novamente em ${Math.ceil(
                (limitCheck.secondsRemaining || 0) / 60
              )} min, ou ative o Premium.`,
              secondsRemaining: limitCheck.secondsRemaining,
            });
            return;
          }

          await pool.query(
            "INSERT INTO messages (id, conversation_id, role, content, attachments) VALUES (UUID(), :convId, 'user', :content, :attachments)",
            {
              convId: conversationId,
              content,
              attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
            }
          );

          const [historyRows] = await pool.query(
            'SELECT role, content, attachments FROM messages WHERE conversation_id = :convId ORDER BY created_at DESC LIMIT :limit',
            { convId: conversationId, limit: SHORT_MEMORY_LIMIT }
          );

          const imagesBudget = { count: 0 };
          // Percorre do mais recente pro mais antigo montando o contexto, respeitando o orçamento de imagens,
          // depois inverte pra ordem cronológica correta antes de enviar ao provedor.
          const history = (historyRows as any[]).map((row) => ({
            role: row.role,
            content: buildContentBlocks(row.content, row.attachments ? JSON.parse(row.attachments) : undefined, imagesBudget),
          })).reverse();

          // Memória longa: nome, idioma, estilo de resposta, personalidade e fatos salvos
          // entram como uma mensagem "system" antes do histórico da conversa.
          const memoryPrompt = await buildMemorySystemPrompt(socket.userId!);
          const messagesForAI = memoryPrompt ? [{ role: 'system', content: memoryPrompt }, ...history] : history;

          socket.emit('chat:start', { conversationId });

          let assembled = '';
          const { fullText, modelUsed } = await routeAIRequest({ taskType: 'chat', messages: messagesForAI }, (token) => {
            assembled += token;
            socket.emit('chat:chunk', { conversationId, chunk: token });
          });

          await pool.query(
            "INSERT INTO messages (id, conversation_id, role, content, model_used) VALUES (UUID(), :convId, 'assistant', :content, :model)",
            { convId: conversationId, content: fullText || assembled, model: modelUsed }
          );

          socket.emit('chat:end', { conversationId, modelUsed });
        } catch (err: any) {
          socket.emit('chat:error', {
            conversationId,
            error: err.message || 'Não foi possível gerar uma resposta no momento.',
          });
        }
      }
    );

    socket.on('disconnect', () => {
      console.log(`[Socket] Usuário desconectado: ${socket.userId}`);
    });
  });
}
