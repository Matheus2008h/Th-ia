'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';
import { loginRequest, verifyTwoFactorLoginRequest } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await loginRequest(email, password);
      if ('requiresTwoFactor' in result) {
        setChallengeToken(result.challengeToken);
        return;
      }
      setSession(result.user, result.accessToken);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeToken) return;
    setLoading(true);
    setError(null);
    try {
      const { accessToken, user } = await verifyTwoFactorLoginRequest(challengeToken, code);
      setSession(user, accessToken);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (challengeToken) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base-950 px-4">
        <motion.form
          onSubmit={handleVerify2FA}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-2xl border border-base-700 bg-base-900 p-6"
        >
          <div className="mb-6 text-center">
            <ShieldCheck className="mx-auto mb-3 text-brand-400" size={28} />
            <h1 className="text-lg font-semibold">Verificação em duas etapas</h1>
            <p className="text-xs text-gray-500 mt-1">Digite o código do seu app autenticador</p>
          </div>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            placeholder="000000"
            autoFocus
            required
            className="w-full text-center tracking-[0.4em] rounded-lg bg-base-850 border border-base-700 px-3 py-2.5 text-lg outline-none focus:border-brand-500 transition"
          />

          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 transition py-2.5 text-sm font-medium"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Verificar e entrar'}
          </button>

          <button
            type="button"
            onClick={() => setChallengeToken(null)}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-300 mt-3 transition"
          >
            Voltar
          </button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-base-950 px-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-base-700 bg-base-900 p-6"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600" />
          <h1 className="text-lg font-semibold">Entrar no TH IA</h1>
          <p className="text-xs text-gray-500 mt-1">TH-5.5</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg bg-base-850 border border-base-700 px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg bg-base-850 border border-base-700 px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition"
          />
        </div>

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 transition py-2.5 text-sm font-medium"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Entrar'}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Não tem conta?{' '}
          <Link href="/register" className="text-brand-400 hover:underline">
            Criar conta
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
