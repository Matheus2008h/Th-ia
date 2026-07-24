'use client';

import { useEffect, useState } from 'react';
import { Copy, Loader2, Ban, Trash2, Plus, Check, Code2 } from 'lucide-react';
import {
  listApiKeysRequest,
  generateApiKeyRequest,
  revokeApiKeyRequest,
  deleteApiKeyRequest,
  ApiKeyRow,
} from '@/lib/adminApi';

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-900/40 text-green-400',
  EXPIRED: 'bg-yellow-900/40 text-yellow-400',
  REVOKED: 'bg-red-900/40 text-red-400',
};

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setKeys(await listApiKeysRequest());
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
      const { code } = await generateApiKeyRequest(label.trim() || undefined);
      setLastGenerated(code);
      setLabel('');
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
      <h1 className="text-xl font-semibold mb-1">API Keys mensais</h1>
      <p className="text-sm text-gray-500 mb-6">
        Acesso à API pública da plataforma (<code className="text-xs">/api/v1/chat/completions</code> e{' '}
        <code className="text-xs">/api/v1/images/generations</code>, formato compatível com OpenAI). Só você, como
        administrador, pode gerar essas keys — cada uma fica ativa por <strong>30 dias</strong> e depois para de
        funcionar automaticamente.
      </p>

      <div className="rounded-xl border border-base-700 bg-base-900 p-5 mb-6">
        <p className="text-sm text-gray-400 mb-3">Gerar nova API key</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Rótulo opcional (ex: Cliente X - integração Zapier)"
            className="flex-1 min-w-[240px] rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-3 py-2 text-sm font-medium transition"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Gerar API Key
          </button>
        </div>

        {lastGenerated && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-base-850 border border-base-700 px-3 py-2">
            <code className="text-sm text-brand-300 truncate">{lastGenerated}</code>
            <button onClick={() => handleCopy(lastGenerated, 'new')} className="text-gray-400 hover:text-white shrink-0 ml-2">
              {copiedId === 'new' ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-base-700 bg-base-900 p-4 mb-6 flex items-start gap-3">
        <Code2 size={16} className="text-brand-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-400 leading-relaxed">
          Exemplo de uso:{' '}
          <code className="text-gray-300">
            curl {process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/completions -H &quot;Authorization: Bearer SUA_KEY&quot; -H
            &quot;Content-Type: application/json&quot; -d &apos;{'{'}&quot;messages&quot;:[{'{'}&quot;role&quot;:&quot;user&quot;,&quot;content&quot;:&quot;oi&quot;{'}'}]{'}'}&apos;
          </code>
        </p>
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
                <th className="px-4 py-2.5 font-medium">Key</th>
                <th className="px-4 py-2.5 font-medium">Rótulo</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Uso</th>
                <th className="px-4 py-2.5 font-medium">Expira em</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-base-800 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-gray-300">{k.key_code.slice(0, 18)}...</code>
                      <button onClick={() => handleCopy(k.key_code, k.id)} className="text-gray-500 hover:text-white">
                        {copiedId === k.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{k.label || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[k.status]}`}>{k.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{k.request_count} req.</td>
                  <td className="px-4 py-2.5 text-gray-400">{new Date(k.expires_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      {k.status === 'ACTIVE' && (
                        <button
                          onClick={async () => {
                            await revokeApiKeyRequest(k.id);
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
                          await deleteApiKeyRequest(k.id);
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
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    Nenhuma API key gerada ainda.
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
