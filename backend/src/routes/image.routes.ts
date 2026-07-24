import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import { authGuard } from '@middlewares/auth.middleware';
import { freePlanRateLimit } from '@middlewares/rateLimit.middleware';
import { upload } from '@middlewares/upload.middleware';
import { generateImage, editImage } from '@services/imageRouter.service';
import { pool } from '@config/database';

const router = Router();
router.use(authGuard);

const generateSchema = z.object({
  prompt: z.string().min(3).max(2000),
  conversationId: z.string().uuid().optional(),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024']).optional(),
});

router.post('/generate', freePlanRateLimit, async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Descreva a imagem que você quer gerar.' });

  try {
    const { prompt, conversationId, size } = parsed.data;
    const { imageUrl, modelUsed } = await generateImage(prompt, size);

    // Se a geração aconteceu dentro de uma conversa, salva como mensagem do assistente com o anexo da imagem
    if (conversationId) {
      const attachment = [{ fileName: 'imagem-gerada.png', url: imageUrl, kind: 'image' as const }];
      await pool.query(
        "INSERT INTO messages (id, conversation_id, role, content, attachments, model_used) VALUES (UUID(), :convId, 'assistant', :content, :attachments, :model)",
        {
          convId: conversationId,
          content: `Imagem gerada a partir do prompt: "${prompt}"`,
          attachments: JSON.stringify(attachment),
          model: modelUsed,
        }
      );
    }

    res.json({ imageUrl, modelUsed, prompt });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao gerar a imagem.' });
  }
});

// Presets prontos: cada um só monta um prompt de edição diferente por baixo dos panos
const EDIT_PRESETS: Record<string, (extra?: string) => string> = {
  remove_object: (extra) => `Remova ${extra || 'o objeto indicado'} da imagem de forma natural, preenchendo o fundo de maneira consistente com o resto da cena.`,
  change_background: (extra) => `Troque o fundo da imagem por: ${extra || 'um fundo neutro e profissional'}. Mantenha o assunto principal intacto.`,
  upscale: () => 'Aumente a qualidade e nitidez desta imagem, preservando todos os detalhes originais, sem alterar o conteúdo.',
  restore: () => 'Restaure esta foto antiga: corrija riscos, manchas, desbotamento e melhore a nitidez, mantendo o conteúdo original fiel.',
  custom: (extra) => extra || 'Edite a imagem conforme descrito.',
};

const editSchema = z.object({
  preset: z.enum(['remove_object', 'change_background', 'upscale', 'restore', 'custom']),
  extra: z.string().max(500).optional(),
  conversationId: z.string().uuid().optional(),
});

router.post('/edit', freePlanRateLimit, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie a imagem a ser editada.' });

  const parsed = editSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Escolha um tipo de edição válido.' });

  try {
    const { preset, extra, conversationId } = parsed.data;
    const prompt = EDIT_PRESETS[preset](extra);
    const imageBuffer = fs.readFileSync(req.file.path);

    const { imageUrl, modelUsed } = await editImage(imageBuffer, prompt);

    if (conversationId) {
      const attachment = [{ fileName: 'imagem-editada.png', url: imageUrl, kind: 'image' as const }];
      await pool.query(
        "INSERT INTO messages (id, conversation_id, role, content, attachments, model_used) VALUES (UUID(), :convId, 'assistant', :content, :attachments, :model)",
        { convId: conversationId, content: `Imagem editada (${preset}).`, attachments: JSON.stringify(attachment), model: modelUsed }
      );
    }

    res.json({ imageUrl, modelUsed, preset });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao editar a imagem.' });
  }
});

export default router;
