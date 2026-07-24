'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Power, ArrowUp, ArrowDown } from 'lucide-react';
import {
  listProvidersRequest,
  createProviderRequest,
  toggleProviderRequest,
  deleteProviderRequest,
  listModelsRequest,
  createModelRequest,
  updateModelRequest,
  deleteModelRequest,
  ProviderRow,
  ModelRow,
} from '@/lib/adminApi';

const PROVIDER_OPTIONS = ['openai', 'anthropic', 'google', 'mistral', 'deepseek', 'groq', 'openrouter', 'ollama', 'tavily', 'serper'];
const TASK_OPTIONS = ['chat', 'vision', 'image_gen', 'code', 'audio'];

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [pName, setPName] = useState('');
  const [pKey, setPKey] = useState('openai');
  const [pApiKey, setPApiKey] = useState('');
  const [pBaseUrl, setPBaseUrl] = useState('');
  const [creatingProvider, setCreatingProvider] = useState(false);

  const [mProviderId, setMProviderId] = useState('');
  const [mModelName, setMModelName] = useState('');
  const [mTask, setMTask] = useState('chat');
  const [creatingModel, setCreatingModel] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([listProvidersRequest(), listModelsRequest()]);
      setProviders(p);
      setModels(m);
      if (!mProviderId && p.length > 0) setMProviderId(p[0].id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateProvider(e: React.FormEvent) {
    e.preventDefault();
    setCreatingProvider(true);
    try {
      await createProviderRequest({ name: pName, providerKey: pKey, apiKey: pApiKey || undefined, baseUrl: pBaseUrl || undefined });
      setPName('');
      setPApiKey('');
      setPBaseUrl('');
      refresh();
    } finally {
      setCreatingProvider(false);
    }
  }

  async function handleCreateModel(e: React.FormEvent) {
    e.preventDefault();
    if (!mProviderId || !mModelName) return;
    setCreatingModel(true);
    try {
      await createModelRequest({ providerId: mProviderId, modelName: mModelName, taskType: mTask, priority: 0 });
      setMModelName('');
      refresh();
    } finally {
      setCreatingModel(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Provedores de IA</h1>
        <p className="text-sm text-gray-500 mb-6">
          Cadastre as APIs (OpenAI, Anthropic, Google, Mistral, DeepSeek, Groq, OpenRouter, Ollama). O sistema escolhe
          automaticamente o modelo de maior prioridade e troca para outro se algum falhar.
        </p>

        <form onSubmit={handleCreateProvider} className="rounded-xl border border-base-700 bg-base-900 p-5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              placeholder="Nome (ex: Anthropic Produção)"
              required
              className="rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <select
              value={pKey}
              onChange={(e) => setPKey(e.target.value)}
              className="rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {PROVIDER_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              value={pApiKey}
              onChange={(e) => setPApiKey(e.target.value)}
              placeholder="API Key (opcional para Ollama local)"
              type="password"
              className="rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              value={pBaseUrl}
              onChange={(e) => setPBaseUrl(e.target.value)}
              placeholder="Base URL (opcional, ex: para Ollama)"
              className="rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={creatingProvider}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-3 py-2 text-sm font-medium transition"
          >
            {creatingProvider ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Cadastrar provedor
          </button>
        </form>

        <div className="rounded-xl border border-base-700 bg-base-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-base-700">
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">API Key</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-b border-base-800 last:border-0">
                  <td className="px-4 py-2.5">{p.name}</td>
                  <td className="px-4 py-2.5 text-gray-400">{p.provider_key}</td>
                  <td className="px-4 py-2.5 text-gray-400">{p.has_key ? 'Configurada' : '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs ${p.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                      {p.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={async () => {
                          await toggleProviderRequest(p.id, !p.is_active);
                          refresh();
                        }}
                        className="text-gray-400 hover:text-white"
                        title="Ativar/desativar"
                      >
                        <Power size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          await deleteProviderRequest(p.id);
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
              {providers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Nenhum provedor cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-1">Modelos e prioridade</h2>
        <p className="text-sm text-gray-500 mb-4">
          Cadastre os modelos de cada provedor por tarefa. O de maior prioridade é usado primeiro; se falhar, o sistema
          tenta o próximo automaticamente.
        </p>

        <form onSubmit={handleCreateModel} className="rounded-xl border border-base-700 bg-base-900 p-5 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <select
              value={mProviderId}
              onChange={(e) => setMProviderId(e.target.value)}
              className="rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              value={mModelName}
              onChange={(e) => setMModelName(e.target.value)}
              placeholder="Nome do modelo (ex: claude-sonnet-4-6)"
              required
              className="rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <select
              value={mTask}
              onChange={(e) => setMTask(e.target.value)}
              className="rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {TASK_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creatingModel || providers.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-3 py-2 text-sm font-medium transition"
          >
            {creatingModel ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Cadastrar modelo
          </button>
        </form>

        <div className="rounded-xl border border-base-700 bg-base-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-base-700">
                <th className="px-4 py-2.5 font-medium">Modelo</th>
                <th className="px-4 py-2.5 font-medium">Provedor</th>
                <th className="px-4 py-2.5 font-medium">Tarefa</th>
                <th className="px-4 py-2.5 font-medium">Prioridade</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-b border-base-800 last:border-0">
                  <td className="px-4 py-2.5">{m.model_name}</td>
                  <td className="px-4 py-2.5 text-gray-400">{m.provider_name}</td>
                  <td className="px-4 py-2.5 text-gray-400">{m.task_type}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          await updateModelRequest(m.id, { priority: m.priority + 1 });
                          refresh();
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <span className="w-5 text-center">{m.priority}</span>
                      <button
                        onClick={async () => {
                          await updateModelRequest(m.id, { priority: m.priority - 1 });
                          refresh();
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={async () => {
                          await updateModelRequest(m.id, { isActive: !m.is_active });
                          refresh();
                        }}
                        className={m.is_active ? 'text-green-400' : 'text-gray-500'}
                        title="Ativar/desativar"
                      >
                        <Power size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          await deleteModelRequest(m.id);
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
              {models.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Nenhum modelo cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
