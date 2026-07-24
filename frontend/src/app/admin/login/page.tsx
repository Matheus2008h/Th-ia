'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';
import { adminLoginRequest } from '@/lib/adminApi';
import { useAdminStore } from '@/lib/adminAuthStore';

export default function AdminLoginPage() {
  const router = useRouter();
  const setSession = useAdminStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { accessToken, admin } = await adminLoginRequest(email, password);
      setSession(admin, accessToken);
      router.push('/admin');
    } catch {
      // Nunca detalha o motivo — mesma resposta de acesso negado do backend
      setError('Acesso negado.');
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
          <ShieldCheck className="mx-auto mb-3 text-brand-400" size={32} />
          <h1 className="text-lg font-semibold">Painel Administrativo</h1>
          <p className="text-xs text-gray-500 mt-1">TH IA (TH-5.5)</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="E-mail do administrador"
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
      </motion.form>
    </div>
  );
}
