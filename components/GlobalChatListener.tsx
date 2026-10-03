'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { MessageCircle, ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { connectSocket } from '@/lib/socket';
import { useNotificationSound } from '@/lib/useNotificationSound';
import { friendsApi } from '@/lib/api';
import type { FriendListItem, ChatMessage } from '@/types';

export default function GlobalChatListener() {
  const { user } = useAuth();
  const router = useRouter();
  const playSound = useNotificationSound();
  const friendsRef = useRef<FriendListItem[]>([]);
  const userIdRef = useRef<string>('');

  useEffect(() => { userIdRef.current = user?.id ?? ''; }, [user?.id]);

  // Refresh friends list whenever user changes
  useEffect(() => {
    if (!user) return;
    friendsApi.list().then((f) => { friendsRef.current = f; }).catch(() => {});
  }, [user]);

  // Connect socket and listen for incoming messages globally
  useEffect(() => {
    if (!user?.id) return;

    const socket = connectSocket();

    const handleMessage = (data: ChatMessage) => {
      const myId = userIdRef.current;
      // Ignore echo of own messages
      if (data.sender === myId) return;

      const sender = friendsRef.current.find((f) => f.friend._id === data.sender);
      const senderName = sender?.friend.name ?? sender?.friend.email ?? 'Someone';

      // Always play sound
      playSound();

      // Don't show toast if already on this conversation
      const onThisConversation =
        typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/chat') &&
        new URLSearchParams(window.location.search).get('with') === data.sender;

      if (onThisConversation) return;

      const isImage = data.type === 'image';
      const preview = isImage ? '📷 Sent you an image' : data.content;
      const short = preview.length > 60 ? preview.slice(0, 57) + '…' : preview;

      toast(
        <div
          className="flex items-start gap-3"
          onClick={() => {
            router.push(`/chat?with=${data.sender}`);
            toast.dismiss(`chat-${data.sender}`);
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
          toastId: `chat-${data.sender}`,
          updateId: `chat-${data.sender}`,
          position: 'bottom-right',
          // autoClose: 5000,
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

    return () => {
      socket.off('message:receive', handleMessage);
    };
  }, [user?.id, playSound, router]);

  return null;
}
