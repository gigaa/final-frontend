'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { MessageCircle, ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { connectSocket, getSocket } from '@/lib/socket';
import { useNotificationSound } from '@/lib/useNotificationSound';
import { friendsApi } from '@/lib/api';
import type { FriendListItem, ChatMessage } from '@/types';

export default function GlobalChatListener() {
  const { user } = useAuth();
  const router = useRouter();
  const playSound = useNotificationSound();
  const friendsRef = useRef<FriendListItem[]>([]);
  // Store user.id in a ref so the stable listener closure always has current value
  const userIdRef = useRef<string>('');

  // ── Keep userIdRef in sync ────────────────────────────
  useEffect(() => {
    userIdRef.current = user?.id ?? '';
  }, [user?.id]);

  // ── Connect socket when user logs in ─────────────────
  useEffect(() => {
    if (!user) return;

    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('access_token') ?? '')
      : '';

    connectSocket(token);
  }, [user]);

  // ── Refresh friends list ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    friendsApi.list().then((f) => { friendsRef.current = f; }).catch(() => {});
  }, [user]);

  // ── Attach listeners ONCE (no user dep — stable handlers via refs) ────────
  useEffect(() => {
    const socket = getSocket();

    const handleMessage = (msg: ChatMessage) => {
      const myId = userIdRef.current;
      if (!myId || msg.sender === myId) return;

      const sender = friendsRef.current.find((f) => f.friend._id === msg.sender);
      const senderName = sender?.friend.name ?? sender?.friend.email ?? 'Someone';

      playSound();

      const onThisConversation =
        typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/chat') &&
        new URLSearchParams(window.location.search).get('with') === msg.sender;

      if (onThisConversation) return;

      const isImage = msg.type === 'image';
      const preview = isImage ? '📷 Sent you an image' : msg.content;
      const short = preview.length > 60 ? preview.slice(0, 57) + '…' : preview;

      toast(
        <div
          className="flex items-start gap-3"
          onClick={() => {
            router.push(`/chat?with=${msg.sender}`);
            toast.dismiss(`chat-${msg.sender}`);
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
            {senderName[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">{senderName}</p>
            <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
              {isImage && <ImageIcon size={11} className="flex-shrink-0 text-violet-400" />}
              <span className="truncate">{short}</span>
            </p>
          </div>
          <MessageCircle size={15} className="flex-shrink-0 text-violet-400 mt-0.5" />
        </div>,
        {
          toastId: `chat-${msg.sender}`,
          updateId: `chat-${msg.sender}`,
          position: 'bottom-right',
          autoClose: 5000,
          closeOnClick: false,
          style: {
            background: '#111827',
            border: '1px solid #4c1d95',
            borderRadius: '14px',
            padding: '10px 12px',
          },
          icon: false,
        },
      );
    };

    socket.on('message:receive', handleMessage);

    // No cleanup disconnect — socket lives for the full session
    return () => {
      socket.off('message:receive', handleMessage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: register once, use refs for current values

  return null;
}
