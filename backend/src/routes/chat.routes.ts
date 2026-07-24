import { Router } from 'express';
import { authGuard } from '@middlewares/auth.middleware';
import { freePlanRateLimit } from '@middlewares/rateLimit.middleware';
import { pool } from '@config/database';

const router = Router();
router.use(authGuard);

router.get('/conversations', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, title, is_favorite, model_used, updated_at FROM conversations WHERE user_id = :userId ORDER BY updated_at DESC',
    { userId: req.user!.id }
  );
  res.json(rows);
});

router.post('/conversations', async (req, res) => {
  const [result]: any = await pool.query(
    "INSERT INTO conversations (id, user_id, title) VALUES (UUID(), :userId, 'Nova conversa')",
    { userId: req.user!.id }
  );
  const [rows] = await pool.query(
    'SELECT id, title FROM conversations WHERE user_id = :userId ORDER BY created_at DESC LIMIT 1',
    { userId: req.user!.id }
  );
  res.status(201).json((rows as any[])[0]);
});

router.patch('/conversations/:id', async (req, res) => {
  const { title, isFavorite } = req.body;
  await pool.query(
    'UPDATE conversations SET title = COALESCE(:title, title), is_favorite = COALESCE(:isFavorite, is_favorite) WHERE id = :id AND user_id = :userId',
    { title: title ?? null, isFavorite: isFavorite ?? null, id: req.params.id, userId: req.user!.id }
  );
  res.json({ success: true });
});

router.delete('/conversations/:id', async (req, res) => {
  await pool.query('DELETE FROM conversations WHERE id = :id AND user_id = :userId', {
    id: req.params.id,
    userId: req.user!.id,
  });
  res.json({ success: true });
});

router.get('/conversations/:id/messages', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, role, content, attachments, model_used, created_at FROM messages WHERE conversation_id = :id ORDER BY created_at ASC',
    { id: req.params.id }
  );
  res.json(rows);
});

// Envio de mensagem via REST (o streaming em tempo real acontece via Socket.IO — ver sockets/chat.socket.ts)
router.post('/conversations/:id/messages', freePlanRateLimit, async (req, res) => {
  const { content, attachments } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório.' });
  }

  await pool.query(
    "INSERT INTO messages (id, conversation_id, role, content, attachments) VALUES (UUID(), :convId, 'user', :content, :attachments)",
    { convId: req.params.id, content, attachments: attachments ? JSON.stringify(attachments) : null }
  );

  res.status(202).json({ accepted: true, note: 'Use o gateway Socket.IO para receber a resposta em streaming.' });
});

export default router;
