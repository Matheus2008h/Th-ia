'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Save, Trash2, Plus, Brain, User, ShieldCheck, ShieldOff } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import {
  getProfile,
  updateProfile,
  listMemory,
  saveMemoryFact,
  deleteMemoryFact,
  UserProfile,
  MemoryFact,
  setupTwoFactor,
  confirmTwoFactor,
  disableTwoFactorRequest,
  getTwoFactorStatus,
} from '@/lib/api';

const RESPONSE_STYLES = [
  { value: 'padrao', label: 'Padrão' },
  { value: 'direto', label: 'Direto e objetivo' },
  { value: 'detalhado', label: 'Detalhado e explicativo' },
  { value: 'casual', label: 'Casual e descontraído' },
  { value: 'formal', label: 'Formal' },
];

function SettingsContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [twoFALoading, setTwoFALoading] = useState(false);

  async function refreshTwoFA() {
    const { enabled } = await getTwoFactorStatus();
    setTwoFAEnabled(enabled);
  }

  async function handleStartTwoFA() {
    setTwoFALoading(true);
    setTwoFAError(null);
    try {
      const { qrCodeDataUrl } = await setupTwoFactor();
      setQrCode(qrCodeDataUrl);
    } finally {
      setTwoFALoading(false);
    }
  }

  async function handleConfirmTwoFA() {
    setTwoFALoading(true);
    setTwoFAError(null);
    try {
      await confirmTwoFactor(twoFACode);
      setQrCode(null);
      setTwoFACode('');
      refreshTwoFA();
    } catch (err: any) {
      setTwoFAError(err.message);
    } finally {
      setTwoFALoading(false);
    }
  }

  async function handleDisableTwoFA() {
    setTwoFALoading(true);
    try {
      await disableTwoFactorRequest();
      refreshTwoFA();
    } finally {
      setTwoFALoading(false);
    }
  }

  async function refresh() {
    const [p, f] = await Promise.all([getProfile(), listMemory()]);
    setProfile(p);
    setFacts(f);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    refreshTwoFA();
  }, []);

  async function handleSaveProfile() {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFact() {
    if (!newKey.trim() || !newValue.trim()) return;
    await saveMemoryFact(newKey.trim(), newValue.trim());
    setNewKey('');
    setNewValue('');
    refresh();
  }

  async function handleDeleteFact(keyName: string) {
    await deleteMemoryFact(keyName);
    refresh();
  }

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition">
          <ArrowLeft size={15} /> Voltar ao chat
        </button>

        <h1 className="text-xl font-semibold mb-6">Configurações</h1>

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-base-700 bg-base-900 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-brand-400" />
            <h2 className="text-sm font-semibold">Perfil e estilo de resposta</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nome</label>
              <input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Idioma</label>
                <select
                  value={profile.language}
                  onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                  className="w-full rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  <option value="pt-BR">Português (BR)</option>
                  <option value="en-US">English</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estilo de resposta</label>
                <select
                  value={profile.responseStyle}
                  onChange={(e) => setProfile({ ...profile, responseStyle: e.target.value })}
                  className="w-full rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  {RESPONSE_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Personalidade (como a IA deve se comportar com você)</label>
              <textarea
                value={profile.personality || ''}
                onChange={(e) => setProfile({ ...profile, personality: e.target.value })}
                rows={3}
                placeholder="Ex: seja bem direto, sem rodeios, e use humor de vez em quando."
                className="w-full rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-3 py-2 text-sm font-medium transition"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? 'Salvo!' : 'Salvar perfil'}
            </button>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-base-700 bg-base-900 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={16} className="text-brand-400" />
            <h2 className="text-sm font-semibold">Memória longa</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Fatos que a IA vai lembrar em toda conversa, mesmo em chats novos — projetos, preferências, contexto que
            você não quer repetir toda vez.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Ex: projeto_atual"
              className="sm:w-48 rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Ex: Estou desenvolvendo o TH IA, uma plataforma de chat"
              className="flex-1 rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={handleAddFact}
              disabled={!newKey.trim() || !newValue.trim()}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 px-3 py-2 text-sm font-medium transition shrink-0"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>

          <div className="space-y-1.5">
            {facts.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Nenhum fato salvo ainda.</p>}
            {facts.map((f) => (
              <div key={f.keyName} className="flex items-start justify-between gap-3 rounded-lg bg-base-850 border border-base-700 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs text-brand-400 font-medium">{f.keyName}</p>
                  <p className="text-sm text-gray-300 break-words">{f.valueText}</p>
                </div>
                <button onClick={() => handleDeleteFact(f.keyName)} className="text-gray-500 hover:text-red-400 shrink-0 mt-0.5">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-base-700 bg-base-900 p-5 mt-6">
          <div className="flex items-center gap-2 mb-1">
            {twoFAEnabled ? <ShieldCheck size={16} className="text-green-400" /> : <ShieldOff size={16} className="text-gray-500" />}
            <h2 className="text-sm font-semibold">Verificação em duas etapas (2FA)</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Opcional. Ativa uma segunda etapa de login usando um app autenticador (Google Authenticator, Authy, etc.).
          </p>

          {twoFAEnabled ? (
            <button
              onClick={handleDisableTwoFA}
              disabled={twoFALoading}
              className="flex items-center gap-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-300 disabled:opacity-60 px-3 py-2 text-sm font-medium transition"
            >
              {twoFALoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />} Desativar 2FA
            </button>
          ) : qrCode ? (
            <div>
              <img src={qrCode} alt="QR code do 2FA" className="rounded-lg border border-base-700 mb-3 w-40 h-40" />
              <p className="text-xs text-gray-500 mb-2">Escaneie com seu app autenticador e digite o código gerado:</p>
              <div className="flex gap-2">
                <input
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  maxLength={6}
                  placeholder="000000"
                  className="w-32 text-center tracking-widest rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button
                  onClick={handleConfirmTwoFA}
                  disabled={twoFALoading || twoFACode.length !== 6}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-3 py-2 text-sm font-medium transition"
                >
                  {twoFALoading ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar e ativar'}
                </button>
              </div>
              {twoFAError && <p className="text-xs text-red-400 mt-2">{twoFAError}</p>}
            </div>
          ) : (
            <button
              onClick={handleStartTwoFA}
              disabled={twoFALoading}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-3 py-2 text-sm font-medium transition"
            >
              {twoFALoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Ativar 2FA
            </button>
          )}
        </motion.section>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
