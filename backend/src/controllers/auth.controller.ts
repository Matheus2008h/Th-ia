import { Request, Response } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, loginAdmin, completeTwoFactorLogin } from '@services/auth.service';

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await registerUser(parsed.data.name, parsed.data.email, parsed.data.password);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await loginUser(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}

export async function adminLogin(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await loginAdmin(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err: any) {
    // Sempre 403 aqui também, para não revelar se o e-mail existe ou não
    res.status(403).json({ error: 'Acesso negado.' });
  }
}

const twoFactorLoginSchema = z.object({ challengeToken: z.string(), code: z.string().min(6).max(6) });

export async function verifyTwoFactorLogin(req: Request, res: Response) {
  const parsed = twoFactorLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Código inválido.' });

  try {
    const result = await completeTwoFactorLogin(parsed.data.challengeToken, parsed.data.code);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}
