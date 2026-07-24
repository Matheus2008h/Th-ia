'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Copy, RotateCcw, Pencil, Loader2, Paperclip, X, FileText, Image as ImageIcon, FileSpreadsheet, Wand2, Mic, Volume2, VolumeX, Calculator, Globe, Eraser } from 'lucide-react';
import { ChatMessage, listMessages, uploadFile, UploadedFile, generateImageRequest, calculatorRequest, searchWebRequest, editImageRequest } from '@/lib/api';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { speakText, stopSpeaking } from '@/lib/textToSpeech';

interface ChatWindowProps {
  conversationId: string;
}

interface StreamingMessage {
  id: string;
  role: 'assistant';
  content: string;
}

interface MessageWithAttachments extends ChatMessage {
  attachments?: UploadedFile[];
}

function AttachmentIcon({ kind }: { kind: UploadedFile['kind'] }) {
  if (kind === 'image') return <ImageIcon size={13} />;
  if (kind === 'spreadsheet') return <FileSpreadsheet size={13} />;
  return <FileText size={13} />;
}

function AttachmentChip({ file }: { file: UploadedFile }) {
  if (file.kind === 'image') {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={file.url} alt={file.fileName} className="max-w-xs rounded-lg border border-base-700" />
      </a>
    );
  }
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg bg-base-800 border border-base-700 px-2 py-1 text-xs text-gray-300 hover:border-brand-500 transition"
    >
      <AttachmentIcon kind={file.kind} />
      <span className="truncate max-w-[140px]">{file.fileName}</span>
    </a>
  );
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageWithAttachments[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState<StreamingMessage | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [rateLimitInfo, setRateLimitInfo] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [mode, setMode] = useState<'chat' | 'image' | 'calculator' | 'search' | 'edit'>('chat');
  const [toolLoading, setToolLoading] = useState(false);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editPreset, setEditPreset] = useState<'remove_object' | 'change_background' | 'upscale' | 'restore' | 'custom'>('remove_object');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { listening, supported: speechSupported, start: startListening, stop: stopListening } = useSpeechRecognition(
    (transcript) => setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
  );

  function handleToggleSpeak(id: string, content: string) {
    if (speakingId === id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    speakText(content, () => setSpeakingId(null));
  }

  const { sendMessage } = useChatSocket({
    onStart: () => setStreaming({ id: 'streaming', role: 'assistant', content: '' }),
    onChunk: (_id, chunk) =>
      setStreaming((prev) => (prev ? { ...prev, content: prev.content + chunk } : prev)),
    onEnd: () => {
      setStreaming((prev) => {
        if (prev) {
          setMessages((m) => [
            ...m,
            { id: crypto.randomUUID(), role: 'assistant', content: prev.content, created_at: new Date().toISOString() },
          ]);
        }
        return null;
      });
    },
    onError: (_id, error) => {
      setRateLimitInfo(error);
      setStreaming(null);
    },
  });

  useEffect(() => {
    setLoadingHistory(true);
    listMessages(conversationId)
      .then(setMessages)
      .finally(() => setLoadingHistory(false));
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming?.content]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (mode === 'edit') {
      setEditImageFile(files[0]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map(uploadFile));
      setPendingFiles((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      setRateLimitInfo(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removePendingFile(storedName: string) {
    setPendingFiles((prev) => prev.filter((f) => f.storedName !== storedName));
  }

  function handleSend() {
    if (mode === 'edit') return handleEditImage();
    if (!input.trim() && pendingFiles.length === 0) return;

    if (mode === 'image') return handleGenerateImage();
    if (mode === 'calculator') return handleCalculate();
    if (mode === 'search') return handleSearch();

    const content = input.trim() || '(arquivo enviado sem mensagem de texto)';
    const attachments = pendingFiles;

    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', content, created_at: new Date().toISOString(), attachments },
    ]);
    sendMessage(conversationId, content, attachments);
    setInput('');
    setPendingFiles([]);
    setRateLimitInfo(null);
  }

  async function handleGenerateImage() {
    const prompt = input.trim();
    if (!prompt) return;

    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', content: `🎨 Gerar imagem: ${prompt}`, created_at: new Date().toISOString() },
    ]);
    setInput('');
    setGeneratingImage(true);
    setRateLimitInfo(null);

    try {
      const { imageUrl } = await generateImageRequest(prompt, conversationId);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Imagem gerada a partir do prompt: "${prompt}"`,
          created_at: new Date().toISOString(),
          attachments: [
            { fileName: 'imagem-gerada.png', storedName: 'generated', url: imageUrl, kind: 'image', sizeBytes: 0, mimeType: 'image/png', extractedText: null },
          ],
        },
      ]);
    } catch (err: any) {
      setRateLimitInfo(err.message);
    } finally {
      setGeneratingImage(false);
    }
  }

  const EDIT_PRESET_LABELS: Record<string, string> = {
    remove_object: 'Remover objeto',
    change_background: 'Trocar fundo',
    upscale: 'Aumentar qualidade',
    restore: 'Restaurar foto',
    custom: 'Personalizado',
  };

  async function handleEditImage() {
    if (!editImageFile) return;
    const extra = input.trim();
    const localPreviewUrl = URL.createObjectURL(editImageFile);

    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: `✂️ Editar imagem (${EDIT_PRESET_LABELS[editPreset]})${extra ? `: ${extra}` : ''}`,
        created_at: new Date().toISOString(),
        attachments: [
          { fileName: editImageFile.name, storedName: 'local-preview', url: localPreviewUrl, kind: 'image', sizeBytes: editImageFile.size, mimeType: editImageFile.type, extractedText: null },
        ],
      },
    ]);

    const fileToSend = editImageFile;
    setInput('');
    setEditImageFile(null);
    setToolLoading(true);
    setRateLimitInfo(null);

    try {
      const { imageUrl } = await editImageRequest(fileToSend, editPreset, extra, conversationId);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Imagem editada (${EDIT_PRESET_LABELS[editPreset]}).`,
          created_at: new Date().toISOString(),
          attachments: [
            { fileName: 'imagem-editada.png', storedName: 'edited', url: imageUrl, kind: 'image', sizeBytes: 0, mimeType: 'image/png', extractedText: null },
          ],
        },
      ]);
    } catch (err: any) {
      setRateLimitInfo(err.message);
    } finally {
      setToolLoading(false);
    }
  }


    const expression = input.trim();
    if (!expression) return;

    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', content: `🧮 ${expression}`, created_at: new Date().toISOString() },
    ]);
    setInput('');
    setToolLoading(true);
    setRateLimitInfo(null);

    try {
      const { result } = await calculatorRequest(expression, conversationId);
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'assistant', content: `${expression} = ${result}`, created_at: new Date().toISOString() },
      ]);
    } catch (err: any) {
      setRateLimitInfo(err.message);
    } finally {
      setToolLoading(false);
    }
  }

  async function handleSearch() {
    const query = input.trim();
    if (!query) return;

    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', content: `🔎 ${query}`, created_at: new Date().toISOString() },
    ]);
    setInput('');
    setToolLoading(true);
    setRateLimitInfo(null);

    try {
      const { results } = await searchWebRequest(query, conversationId);
      const content =
        results.length > 0
          ? results.map((r) => `**${r.title}**\n${r.snippet}\n${r.url}`).join('\n\n')
          : 'Nenhum resultado encontrado.';
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content, created_at: new Date().toISOString() }]);
    } catch (err: any) {
      setRateLimitInfo(err.message);
    } finally {
      setToolLoading(false);
    }
  }

  function handleCopy(content: string) {
    navigator.clipboard.writeText(content);
  }

  function handleRegenerate(content: string) {
    sendMessage(conversationId, content);
  }

  function startEdit(id: string, content: string) {
    setEditingId(id);
    setEditingText(content);
  }

  function confirmEdit(id: string) {
    if (!editingText.trim()) return;
    // Atualiza a mensagem localmente e reenvia — gera uma nova resposta a partir do texto editado
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, content: editingText.trim() } : msg)));
    sendMessage(conversationId, editingText.trim());
    setEditingId(null);
    setEditingText('');
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl w-full mx-auto">
        {loadingHistory && (
          <div className="flex justify-center py-8 text-gray-500">
            <Loader2 className="animate-spin" size={20} />
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`group relative max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-base-850 border border-base-700 text-gray-100'
              }`}
            >
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {msg.attachments.map((f) => (
                    <AttachmentChip key={f.storedName} file={f} />
                  ))}
                </div>
              )}

              {editingId === msg.id ? (
                <div className="min-w-[240px]">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        confirmEdit(msg.id);
                      }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    rows={2}
                    className="w-full resize-none rounded-lg bg-black/20 border border-white/20 px-2 py-1.5 text-sm outline-none"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={() => confirmEdit(msg.id)} className="text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-1 transition">
                      Salvar e reenviar
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-white/70 hover:text-white px-2 py-1 transition">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              <div className="mt-1.5 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => handleCopy(msg.content)} className="text-gray-400 hover:text-white">
                  <Copy size={13} />
                </button>
                {msg.role === 'assistant' && (
                  <button onClick={() => handleRegenerate(msg.content)} className="text-gray-400 hover:text-white">
                    <RotateCcw size={13} />
                  </button>
                )}
                {msg.role === 'assistant' && (
                  <button onClick={() => handleToggleSpeak(msg.id, msg.content)} className="text-gray-400 hover:text-white">
                    {speakingId === msg.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>
                )}
                {msg.role === 'user' && (
                  <button onClick={() => startEdit(msg.id, msg.content)} className="text-gray-400 hover:text-white">
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-base-850 border border-base-700 text-gray-100">
              <p className="whitespace-pre-wrap">{streaming.content}<span className="animate-pulse">▍</span></p>
            </div>
          </div>
        )}

        {rateLimitInfo && (
          <div className="rounded-lg border border-yellow-700/40 bg-yellow-900/20 px-4 py-2.5 text-sm text-yellow-300">
            {rateLimitInfo}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-base-700 p-4">
        <div className="max-w-3xl mx-auto">
          {mode === 'edit' && (
            <div className="mb-2 space-y-2">
              {editImageFile && (
                <div className="flex items-center gap-2 rounded-lg bg-base-850 border border-base-700 px-2 py-1.5 w-fit">
                  <img src={URL.createObjectURL(editImageFile)} alt="preview" className="h-10 w-10 object-cover rounded" />
                  <span className="text-xs text-gray-300 truncate max-w-[160px]">{editImageFile.name}</span>
                  <button onClick={() => setEditImageFile(null)} className="text-gray-500 hover:text-red-400">
                    <X size={13} />
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(['remove_object', 'change_background', 'upscale', 'restore', 'custom'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setEditPreset(preset)}
                    className={`rounded-lg px-2.5 py-1 text-xs border transition ${
                      editPreset === preset ? 'border-brand-500 bg-brand-600/20 text-brand-300' : 'border-base-700 text-gray-400 hover:bg-base-850'
                    }`}
                  >
                    {EDIT_PRESET_LABELS[preset]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pendingFiles.map((f) => (
                <div key={f.storedName} className="flex items-center gap-1.5 rounded-lg bg-base-850 border border-base-700 px-2 py-1 text-xs text-gray-300">
                  <AttachmentIcon kind={f.kind} />
                  <span className="truncate max-w-[140px]">{f.fileName}</span>
                  <button onClick={() => removePendingFile(f.storedName)} className="text-gray-500 hover:text-red-400">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`flex items-end gap-2 rounded-xl border px-3 py-2 transition ${mode !== 'chat' ? 'border-brand-500 bg-brand-950/20' : 'border-base-700 bg-base-850'}`}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.pptx,.ppt,.zip,.rar,.js,.ts,.jsx,.tsx,.py,.java,.cs,.php,.lua,.json,.xml,.yaml,.yml,.sql,.html,.css,.mp3,.wav,.mp4"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || (mode !== 'chat' && mode !== 'edit')}
              className="p-2 text-gray-400 hover:text-white transition disabled:opacity-40"
              title={mode === 'edit' ? 'Escolher imagem para editar' : 'Anexar arquivo'}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            </button>

            <button
              onClick={() => setMode((m) => (m === 'image' ? 'chat' : 'image'))}
              className={`p-2 transition ${mode === 'image' ? 'text-brand-400' : 'text-gray-400 hover:text-white'}`}
              title="Gerar imagem por texto"
            >
              <Wand2 size={16} />
            </button>

            <button
              onClick={() => setMode((m) => (m === 'edit' ? 'chat' : 'edit'))}
              className={`p-2 transition ${mode === 'edit' ? 'text-brand-400' : 'text-gray-400 hover:text-white'}`}
              title="Editar imagem (remover objeto, trocar fundo, upscale, restaurar)"
            >
              <Eraser size={16} />
            </button>

            <button
              onClick={() => setMode((m) => (m === 'calculator' ? 'chat' : 'calculator'))}
              className={`p-2 transition ${mode === 'calculator' ? 'text-brand-400' : 'text-gray-400 hover:text-white'}`}
              title="Calculadora"
            >
              <Calculator size={16} />
            </button>

            <button
              onClick={() => setMode((m) => (m === 'search' ? 'chat' : 'search'))}
              className={`p-2 transition ${mode === 'search' ? 'text-brand-400' : 'text-gray-400 hover:text-white'}`}
              title="Pesquisar na internet"
            >
              <Globe size={16} />
            </button>

            {speechSupported && (
              <button
                onClick={() => (listening ? stopListening() : startListening())}
                className={`p-2 transition ${listening ? 'text-red-400 animate-pulse' : 'text-gray-400 hover:text-white'}`}
                title="Ditar mensagem por voz"
              >
                <Mic size={16} />
              </button>
            )}

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={
                mode === 'image'
                  ? 'Descreva a imagem que você quer gerar...'
                  : mode === 'calculator'
                  ? 'Digite a expressão (ex: 2 * (5 + 3) / 4)...'
                  : mode === 'search'
                  ? 'O que você quer pesquisar na internet?'
                  : mode === 'edit'
                  ? editImageFile
                    ? 'Descreva os detalhes da edição (opcional)...'
                    : 'Clique no clipe para escolher a imagem a editar...'
                  : 'Envie uma mensagem ou anexe um arquivo para o TH IA...'
              }
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-gray-500 max-h-40"
            />
            <button
              onClick={handleSend}
              disabled={mode === 'edit' ? !editImageFile || toolLoading : (!input.trim() && pendingFiles.length === 0) || generatingImage || toolLoading}
              className="rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed p-2 transition"
            >
              {generatingImage || toolLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'image' ? (
                <Wand2 size={16} />
              ) : mode === 'calculator' ? (
                <Calculator size={16} />
              ) : mode === 'search' ? (
                <Globe size={16} />
              ) : mode === 'edit' ? (
                <Eraser size={16} />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          {mode !== 'chat' && (
            <p className="text-xs text-brand-400/80 mt-1.5 px-1">
              {mode === 'image' && 'Modo geração de imagem ativo — descreva o que você quer criar.'}
              {mode === 'calculator' && 'Modo calculadora ativo — digite uma expressão matemática.'}
              {mode === 'search' && 'Modo pesquisa ativo — o resultado vem direto da internet.'}
              {mode === 'edit' && 'Modo edição de imagem ativo — escolha a imagem, o tipo de edição e envie.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
