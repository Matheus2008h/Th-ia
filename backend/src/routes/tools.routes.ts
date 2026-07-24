import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '@middlewares/auth.middleware';
import { calculate } from '@services/calculator.service';
import { searchWeb } from '@services/search.service';
import { pool } from '@config/database';

const router = Router();
router.use(authGuard);

const calcSchema = z.object({ expression: z.string().min(1).max(500), conversationId: z.string().uuid().optional() });

router.post('/calculator', async (req, res) => {
  const parsed = calcSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe uma expressão.' });

  const { result, error } = calculate(parsed.data.expression);
  if (error) return res.status(400).json({ error });

  if (parsed.data.conversationId) {
    await pool.query(
      "INSERT INTO messages (id, conversation_id, role, content) VALUES (UUID(), :convId, 'assistant', :content)",
      { convId: parsed.data.conversationId, content: `${parsed.data.expression} = ${result}` }
    );
  }

  res.json({ expression: parsed.data.expression, result });
});

const searchSchema = z.object({ query: z.string().min(1).max(300), conversationId: z.string().uuid().optional() });

router.post('/search', async (req, res) => {
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe o que você quer pesquisar.' });

  try {
    const results = await searchWeb(parsed.data.query);

    if (parsed.data.conversationId) {
      const summary = results.map((r) => `- [${r.title}](${r.url}): ${r.snippet}`).join('\n');
      await pool.query(
        "INSERT INTO messages (id, conversation_id, role, content) VALUES (UUID(), :convId, 'assistant', :content)",
        { convId: parsed.data.conversationId, content: `Resultados da pesquisa por "${parsed.data.query}":\n\n${summary || 'Nenhum resultado encontrado.'}` }
      );
    }

    res.json({ query: parsed.data.query, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao pesquisar.' });
  }
});

export default router;
