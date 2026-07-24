'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import AuthGuard from '@/components/AuthGuard';

export default function HomePage() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <AuthGuard>
      <div className="flex h-screen w-screen overflow-hidden bg-base-950">
        <Sidebar activeId={activeId} onSelect={(id) => setActiveId(id || null)} />
        {activeId ? (
          <ChatWindow key={activeId} conversationId={activeId} />
        ) : (
          <main className="flex flex-1 flex-col items-center justify-center text-gray-400">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-white mb-2">TH IA (TH-5.5)</h1>
              <p className="text-sm">Selecione ou inicie uma nova conversa para começar.</p>
            </div>
          </main>
        )}
      </div>
    </AuthGuard>
  );
}

