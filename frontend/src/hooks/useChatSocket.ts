'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, UploadedFile } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

interface StreamHandlers {
  onStart?: (conversationId: string) => void;
  onChunk?: (conversationId: string, chunk: string) => void;
  onEnd?: (conversationId: string) => void;
  onError?: (conversationId: string, error: string) => void;
}

export function useChatSocket(handlers: StreamHandlers) {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:start', ({ conversationId }) => handlers.onStart?.(conversationId));
    socket.on('chat:chunk', ({ conversationId, chunk }) => handlers.onChunk?.(conversationId, chunk));
    socket.on('chat:end', ({ conversationId }) => handlers.onEnd?.(conversationId));
    socket.on('chat:error', ({ conversationId, error }) => handlers.onError?.(conversationId, error));

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sendMessage = useCallback((conversationId: string, content: string, attachments?: UploadedFile[]) => {
    socketRef.current?.emit('chat:message', { conversationId, content, attachments });
  }, []);

  return { connected, sendMessage };
}
