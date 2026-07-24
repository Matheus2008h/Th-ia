import { Request, Response } from 'express';
import { z } from 'zod';
import { activateLicenseKey, buildWhatsappPurchaseLink } from '@services/license.service';
import { env } from '@config/env';

const activateSchema = z.object({ code: z.string().min(10) });

/** Retorna as informações para o botão "Adquirir Premium" no frontend */
export async function getPurchaseInfo(_req: Request, res: Response) {
  res.json({
    priceLabel: env.premium.priceLabel,
    whatsappNumber: env.premium.whatsappNumber,
    whatsappLink: buildWhatsappPurchaseLink(),
    message:
      `Para adquirir uma key, chame ${env.premium.whatsappNumber} — ${env.premium.priceLabel}.`,
  });
}

export async function activatePremium(req: Request, res: Response) {
  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe uma key válida.' });
  if (!req.user) return res.status(401).json({ error: 'Não autenticado.' });

  try {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const result = await activateLicenseKey(req.user.id, parsed.data.code.trim().toUpperCase(), ip);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json({ success: true, expiresAt: result.expiresAt, message: 'Premium ativado com sucesso!' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao ativar a key.' });
  }
}
