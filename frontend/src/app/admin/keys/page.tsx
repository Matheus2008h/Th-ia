'use client';

import { useEffect, useState } from 'react';
import { Copy, Loader2, Ban, Trash2, Plus, Check } from 'lucide-react';
import { listKeysRequest, generateKeyRequest, revokeKeyRequest, deleteKeyRequest, LicenseKeyRow } from '@/lib/adminApi';

const DURATIONS: { label: string; value: 7 | 30 | 90 | null }[] = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
  { label: 'Permanente', value: null },
];

const STATUS_STYLE: Record<string, string> = {
  UNUSED: 'bg-gray-700/40 text-gray-300',
  ACTIVE: 'bg-green-900/40 text-green-400',
  EXPIRED: 'bg-yellow-900/40 text-yellow-400',
  REVOKED: 'bg-red-900/40 text-red-400',
};

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<LicenseKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState<7 | 30 | 90 | null>(30);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setKeys(await listKeysRequest());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { code } = await generateKeyRequest(duration);
      setLastGenerated(code);
      refresh();
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Keys Premium</h1>

      <div className="rounded-xl border border-base-700 bg-base-900 p-5 mb-6">
        <p className="text-sm text-gray-400 mb-3">Gerar nova key (uso único — 30 dias é o padrão do TH IA)</p>
        <div className="flex flex-wrap items-center gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.label}
              onClick={() => setDuration(d.value)}
              className={`rounded-lg px-3 py-1.5 text-sm border transition ${
                duration === d.value
                  ? 'border-brand-500 bg-brand-600/20 text-brand-300'
                  : 'border-base-700 text-gray-400 hover:bg-base-850'
              }`}
            >
              {d.label}
            </button>
          ))}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-3 py-1.5 text-sm font-medium transition ml-auto"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Gerar Key
          </button>
        </div>

        {lastGenerated && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-base-850 border border-base-700 px-3 py-2">
            <code className="text-sm text-brand-300">{lastGenerated}</code>
            <button onClick={() => handleCopy(lastGenerated, 'new')} className="text-gray-400 hover:text-white">
              {copiedId === 'new' ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-base-700 bg-base-900 overflow-hidden">
        {loading ? (
          <div className="p-6 flex justify-center text-gray-500">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-base-700">
                <th className="px-4 py-2.5 font-medium">Código</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Vinculado a</th>
                <th className="px-4 py-2.5 font-medium">Expira em</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-base-800 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-gray-300">{k.code}</code>
                      <button onClick={() => handleCopy(k.code, k.id)} className="text-gray-500 hover:text-white">
                        {copiedId === k.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[k.status]}`}>{k.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{k.user_email || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400">
                    {k.expires_at ? new Date(k.expires_at).toLocaleDateString('pt-BR') : k.duration_days ? '—' : 'Nunca'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      {k.status === 'ACTIVE' && (
                        <button
                          onClick={async () => {
                            await revokeKeyRequest(k.id);
                            refresh();
                          }}
                          className="text-yellow-400 hover:text-yellow-300"
                          title="Revogar"
                        >
                          <Ban size={14} />
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await deleteKeyRequest(k.id);
                          refresh();
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Nenhuma key gerada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
