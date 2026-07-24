'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { registerRequest } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { accessToken, user } = await registerRequest(name, email, password);
      setSession(user, accessToken);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-lg font-semibold">Criar conta no TH IA</h1>
          <p className="text-xs text-gray-500 mt-1">Plano FREE incluso automaticamente</p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg bg-base-850 border border-base-700 px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition"
          />
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
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg bg-base-850 border border-base-700 px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition"
          />
        </div>

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 transition py-2.5 text-sm font-medium"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Criar conta'}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand-400 hover:underline">
            Entrar
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
