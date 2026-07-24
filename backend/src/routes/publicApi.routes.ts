import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { apiKeyGuard } from '@middlewares/apiKey.middleware';
import { routeAIRequest } from '@services/aiRouter.service';
import { generateImage } from '@services/imageRouter.service';

const router = Router();

// Rate limit próprio da API pública (independente do limite do plano FREE, que é só do chat interno)
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60, // 60 requisições por minuto por IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);
router.use(apiKeyGuard);

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })).min(1),
  stream: z.boolean().optional(),
});

/**
 * Endpoint compatível com o formato "chat completions" (mesmo padrão da OpenAI),
 * pra facilitar integração de qualquer sistema externo que já fale esse protocolo.
 */
router.post('/chat/completions', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { message: 'Parâmetro "messages" é obrigatório.' } });

  try {
    if (parsed.data.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await routeAIRequest({ taskType: 'chat', messages: parsed.data.messages }, (token) => {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: token } }] })}\n\n`);
      });
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const { fullText, modelUsed } = await routeAIRequest({ taskType: 'chat', messages: parsed.data.messages }, () => {});
    res.json({
      id: `thia-${Date.now()}`,
      model: modelUsed,
      choices: [{ index: 0, message: { role: 'assistant', content: fullText }, finish_reason: 'stop' }],
    });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Falha ao gerar resposta.' } });
  }
});

const imageSchema = z.object({
  prompt: z.string().min(3).max(2000),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024']).optional(),
});

/** Endpoint compatível com o formato "images/generations" da OpenAI */
router.post('/images/generations', async (req, res) => {
  const parsed = imageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { message: 'Parâmetro "prompt" é obrigatório.' } });

  try {
    const { imageUrl, modelUsed } = await generateImage(parsed.data.prompt, parsed.data.size);
    res.json({ created: Date.now(), model: modelUsed, data: [{ url: imageUrl }] });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Falha ao gerar imagem.' } });
  }
});

export default router;
