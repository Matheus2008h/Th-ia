'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Star, Settings, Crown, MessageSquare, User, Trash2, Pencil, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PremiumModal from './PremiumModal';
import {
  Conversation,
  listConversations,
  createConversation,
  renameConversation,
  toggleFavoriteConversation,
  deleteConversationRequest,
} from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

interface SidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function Sidebar({ activeId, onSelect }: SidebarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const { user, updatePlan, logout } = useAuthStore();

  async function refresh() {
    try {
      const data = await listConversations();
      setConversations(data);
    } catch {
      // usuário pode não estar autenticado ainda
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleNewChat() {
    const conv = await createConversation();
    await refresh();
    onSelect(conv.id);
  }

  async function handleToggleFavorite(id: string, current: boolean) {
    await toggleFavoriteConversation(id, !current);
    refresh();
  }

  async function handleDelete(id: string) {
    await deleteConversationRequest(id);
    refresh();
    if (activeId === id) onSelect('');
  }

  function startRename(id: string, title: string) {
    setEditingId(id);
    setEditingTitle(title);
  }

  async function confirmRename() {
    if (editingId) {
      await renameConversation(editingId, editingTitle.trim() || 'Nova conversa');
      setEditingId(null);
      refresh();
    }
  }

  const filtered = conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex h-full w-72 flex-col border-r border-base-700 bg-base-900 p-3"
      >
        <div className="flex items-center gap-2 px-1 py-2 mb-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-brand-400 to-brand-600" />
          <span className="font-semibold tracking-tight">
            TH IA <span className="text-gray-500 text-xs">TH-5.5</span>
          </span>
        </div>

        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-500 transition px-3 py-2 text-sm font-medium mb-3"
        >
          <Plus size={16} /> Novo Chat
        </button>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar conversas..."
            className="w-full rounded-lg bg-base-850 border border-base-700 pl-8 pr-3 py-2 text-sm outline-none focus:border-brand-500 transition"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-0.5">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-500 px-2 py-4 text-center">Nenhuma conversa ainda.</p>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition group cursor-pointer ${
                activeId === c.id ? 'bg-base-850 text-white' : 'text-gray-300 hover:bg-base-850'
              }`}
              onClick={() => onSelect(c.id)}
            >
              <MessageSquare size={14} className="shrink-0 text-gray-500" />
              {editingId === c.id ? (
                <input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={confirmRename}
                  onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent border-b border-brand-500 outline-none text-sm"
                />
              ) : (
                <span className="truncate flex-1 text-left">{c.title}</span>
              )}

              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(c.id, c.is_favorite); }}>
                  <Star size={13} className={c.is_favorite ? 'text-brand-400 fill-brand-400' : 'text-gray-500'} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); startRename(c.id, c.title); }}>
                  <Pencil size={13} className="text-gray-500 hover:text-white" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>
                  <Trash2 size={13} className="text-gray-500 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-base-700 space-y-1">
          <button
            onClick={() => setPremiumOpen(true)}
            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-brand-400 hover:bg-base-850 transition"
          >
            <Crown size={16} /> {user?.plan === 'PREMIUM' ? 'Premium ativo' : 'Ativar Premium'}
          </button>
          <button className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-300 hover:bg-base-850 transition" onClick={() => router.push('/settings')}>
            <Settings size={16} /> Configurações
          </button>
          <button className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-300 hover:bg-base-850 transition" onClick={() => router.push('/settings')}>
            <User size={16} /> {user?.name || 'Perfil'}
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-400 hover:bg-base-850 transition"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </motion.aside>

      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} onActivated={() => updatePlan('PREMIUM')} />
    </>
  );
}

