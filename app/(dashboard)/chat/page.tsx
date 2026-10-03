'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
} from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import {
  Send,
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Loader2,
  Check,
  CheckCheck,
  Download,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { friendsApi, chatApi } from '@/lib/api';
import { connectApinator, dmChannelName } from '@/lib/socket';
import type { FriendListItem, ChatMessage } from '@/types';

export default function ChatPageWrapper() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFriendIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string>('');
  // Track currently subscribed channel so we can unsubscribe on conversation switch
  const activeChannelRef = useRef<string | null>(null);

  useEffect(() => { activeFriendIdRef.current = activeFriendId; }, [activeFriendId]);
  useEffect(() => { if (user?.id) userIdRef.current = user.id; }, [user?.id]);

  const activeFriend = friends.find((f) => f.friend._id === activeFriendId);

  // ── Load friends + unread counts ─────────────────────
  useEffect(() => {
    if (!user) return;
    friendsApi.list().then(setFriends).catch(() => toast.error('Failed to load friends'));
    chatApi.getUnreadCounts().then(setUnreadCounts).catch(() => {});
  }, [user]);

  // ── Honour ?with= query param ─────────────────────────
  useEffect(() => {
    const withId = searchParams.get('with');
    if (withId) setActiveFriendId(withId);
  }, [searchParams]);

  // ── Subscribe to DM channel when active conversation changes ─
  useEffect(() => {
    if (!user?.id || !activeFriendId) return;

    const apinator = connectApinator();
    const channelName = dmChannelName(user.id, activeFriendId);

    // Unsubscribe from previous channel if different
    if (activeChannelRef.current && activeChannelRef.current !== channelName) {
      apinator.unsubscribe(activeChannelRef.current);
    }
    activeChannelRef.current = channelName;

    const channel = apinator.subscribe(channelName);

    const onMessageReceive = (raw: unknown) => {
      const data = raw as ChatMessage;
      const myId = userIdRef.current;
      const friendId = activeFriendIdRef.current;

      // Only show messages for this conversation
      const belongsHere =
        friendId !== null &&
        ((data.sender === friendId && data.recipient === myId) ||
          (data.sender === myId && data.recipient === friendId));

      if (!belongsHere) return;

      setMessages((prev) => {
        // Replace optimistic temp message if content matches
        if (data.sender === myId) {
          const tempIdx = prev.findIndex(
            (m) => m._id.startsWith('temp-') && m.content === data.content && m.recipient === data.recipient,
          );
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = data;
            return next;
          }
        }
        // Deduplicate by _id
        if (prev.some((m) => m._id === data._id)) return prev;
        return [...prev, data];
      });

      // Mark incoming as read
      if (data.sender === friendId) {
        chatApi.markRead(friendId).catch(() => {});
      }
    };

    const onMessageRead = (raw: unknown) => {
      const data = raw as { type: string; by: string };
      if (data.type === 'message:read') {
        setMessages((prev) =>
          prev.map((m) => (m.recipient === data.by ? { ...m, read: true } : m)),
        );
      }
    };

    channel.bind('message:receive', onMessageReceive);
    // read receipts come through the same DM channel
    channel.bind('message:receive', onMessageRead);

    return () => {
      channel.unbind('message:receive', onMessageReceive);
      channel.unbind('message:receive', onMessageRead);
    };
  }, [user?.id, activeFriendId]);

  // ── Load conversation history ─────────────────────────
  const loadHistory = useCallback(async (friendId: string, pageNum = 1, append = false) => {
    setLoadingHistory(true);
    try {
      const data = await chatApi.getHistory(friendId, pageNum, 30);
      setMessages((prev) => (append ? [...data.messages, ...prev] : data.messages));
      setHasMore(pageNum < data.pages);
      setPage(pageNum);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!activeFriendId) return;
    setMessages([]);
    loadHistory(activeFriendId, 1);
    chatApi.markRead(activeFriendId).catch(() => {});
    setUnreadCounts((prev) => ({ ...prev, [activeFriendId]: 0 }));
  }, [activeFriendId, loadHistory]);

  // ── Scroll to bottom on new messages ─────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send text — REST (backend triggers Apinator) ──────
  const sendText = async () => {
    if (!text.trim() || !activeFriendId || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      _id: tempId,
      sender: userIdRef.current,
      recipient: activeFriendId,
      type: 'text',
      content,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      // REST call → backend saves + triggers Apinator → both sides receive via WS
      await chatApi.saveTextMessageRest(activeFriendId, content);
    } catch {
      toast.error('Failed to send message');
      setText(content);
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // ── Send image ────────────────────────────────────────
  const sendImage = async () => {
    if (!imagePreview || !activeFriendId || sending) return;
    setSending(true);
    try {
      await chatApi.uploadImage(activeFriendId, imagePreview.file);
      // Backend triggers Apinator on both channels — no manual emit needed
      setImagePreview(null);
    } catch {
      toast.error('Failed to send image');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Only image files are allowed'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }
    setImagePreview({ file, url: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const selectFriend = (friendId: string) => {
    setActiveFriendId(friendId);
    router.push(`/chat?with=${friendId}`, { scroll: false });
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-gray-800 overflow-hidden bg-gray-950/60">

      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-sm">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 px-4 text-center">
              <Users size={32} className="text-gray-600" />
              <p className="text-gray-500 text-xs">Add friends to start chatting</p>
            </div>
          ) : (
            friends.map(({ friend }) => {
              const isActive = activeFriendId === friend._id;
              const unread = unreadCounts[friend._id] ?? 0;
              return (
                <button
                  key={friend._id}
                  onClick={() => selectFriend(friend._id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors text-left',
                    isActive && 'bg-violet-600/20 border-r-2 border-violet-500',
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(friend.name ?? friend.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-medium truncate', isActive ? 'text-violet-300' : 'text-gray-200')}>
                      {friend.name ?? friend.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{friend.email}</p>
                  </div>
                  {unread > 0 && (
                    <span className="flex-shrink-0 min-w-[1.25rem] h-5 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center px-1">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Conversation panel */}
      {!activeFriendId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Users size={48} className="text-gray-700" />
          <p className="text-gray-500">Select a conversation</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950/80">
            <button onClick={() => setActiveFriendId(null)} className="sm:hidden text-gray-400 hover:text-white">
              <ChevronLeft size={20} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              {(activeFriend?.friend.name ?? activeFriend?.friend.email ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{activeFriend?.friend.name ?? activeFriend?.friend.email}</p>
              <p className="text-xs text-gray-500">{activeFriend?.friend.email}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {hasMore && (
              <div className="flex justify-center mb-3">
                <button
                  onClick={() => loadHistory(activeFriendId, page + 1, true)}
                  disabled={loadingHistory}
                  className="text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50 flex items-center gap-1"
                >
                  {loadingHistory && <Loader2 size={12} className="animate-spin" />}
                  Load older messages
                </button>
              </div>
            )}
            {loadingHistory && messages.length === 0 && (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-violet-500" />
              </div>
            )}
            {(() => {
              const imageMessages = messages
                .filter((m) => m.type === 'image' && m.imageUrl)
                .map((m) => ({ src: m.imageUrl!, name: m.imageOriginalName ?? 'image', messageId: m._id }));
              return messages.map((msg, idx) => (
                <MessageBubble
                  key={msg._id ?? idx}
                  msg={msg}
                  isMine={msg.sender === user?.id}
                  allImages={imageMessages}
                  imageIndex={imageMessages.findIndex((im) => im.messageId === msg._id)}
                />
              ));
            })()}
            <div ref={bottomRef} />
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/60">
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-700">
                  <Image src={imagePreview.url} alt="preview" fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{imagePreview.file.name}</p>
                  <p className="text-xs text-gray-500">{(imagePreview.file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => { URL.revokeObjectURL(imagePreview.url); setImagePreview(null); }} className="text-gray-500 hover:text-red-400 transition-colors">
                  <X size={18} />
                </button>
                <button onClick={sendImage} disabled={sending} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          {!imagePreview && (
            <div className="px-4 py-3 border-t border-gray-800 bg-gray-950/80">
              <div className="flex items-end gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors mb-0.5">
                  <ImageIcon size={20} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  className="flex-1 resize-none rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-sm px-4 py-2.5 focus:outline-none focus:border-violet-500 transition-colors max-h-32 overflow-y-auto"
                  style={{ lineHeight: '1.5' }}
                />
                <button onClick={sendText} disabled={!text.trim() || sending} className="flex-shrink-0 p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors mb-0.5">
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Image Lightbox ───────────────────────────────────────

function ImageLightbox({
  images, initialIndex, onClose,
}: {
  images: Array<{ src: string; name: string; messageId?: string }>;
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [downloading, setDownloading] = useState(false);
  const current = images[index];

  const goPrev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const goNext = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, goPrev, goNext]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      if (current.messageId) {
        await chatApi.downloadImage(current.messageId, current.name || 'image');
      } else {
        const res = await fetch(current.src, { mode: 'cors' });
        if (!res.ok) throw new Error('fetch failed');
        const blob = await res.blob();
        const u = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: u, download: current.name || 'image' });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(u), 1000);
      }
    } catch { toast.error('Download failed'); }
    finally { setDownloading(false); }
  };

  if (typeof window === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent" onClick={(e) => e.stopPropagation()}>
        <p className="text-white/80 text-sm truncate max-w-[60vw]">
          {current.name}
          {images.length > 1 && <span className="ml-2 text-white/40 text-xs">{index + 1} / {images.length}</span>}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-medium transition-colors">
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download
          </button>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-14 h-14 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 hover:border-white/40 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 shadow-xl">
          <ChevronLeft size={30} strokeWidth={2.5} />
        </button>
      )}
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-14 h-14 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 hover:border-white/40 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 shadow-xl">
          <ChevronRight size={30} strokeWidth={2.5} />
        </button>
      )}
      <div className="relative max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={current.src} src={current.src} alt={current.name} className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl" />
      </div>
    </div>,
    document.body,
  );
}

// ── Message Bubble ────────────────────────────────────────

function MessageBubble({
  msg, isMine, allImages, imageIndex,
}: {
  msg: ChatMessage;
  isMine: boolean;
  allImages: Array<{ src: string; name: string; messageId?: string }>;
  imageIndex: number;
}) {
  const [lightbox, setLightbox] = useState(false);
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isTemp = msg._id.startsWith('temp-');

  return (
    <>
      <div className={clsx('flex items-end gap-1.5 max-w-[75%]', isMine ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
        <div className={clsx(
          'rounded-2xl px-3.5 py-2 text-sm shadow-sm transition-opacity',
          isMine ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-gray-800 text-gray-100 rounded-bl-sm',
          isTemp && 'opacity-60',
        )}>
          {msg.type === 'image' && msg.imageUrl ? (
            <div className="space-y-1">
              <button onClick={() => setLightbox(true)} className="block focus:outline-none">
                <div className="relative w-48 h-48 rounded-lg overflow-hidden">
                  <Image src={msg.imageUrl} alt={msg.imageOriginalName ?? 'image'} fill className="object-cover hover:opacity-90 transition-opacity" />
                </div>
              </button>
              {msg.imageOriginalName && <p className="text-xs opacity-70 truncate max-w-[12rem]">{msg.imageOriginalName}</p>}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          )}
          <div className={clsx('flex items-center gap-1 mt-1', isMine ? 'justify-end' : 'justify-start')}>
            <span className="text-[10px] opacity-60">{time}</span>
            {isMine && (
              <span className="opacity-60">
                {isTemp ? <Loader2 size={10} className="animate-spin" /> : msg.read ? <CheckCheck size={12} /> : <Check size={12} />}
              </span>
            )}
          </div>
        </div>
      </div>
      {lightbox && msg.imageUrl && (
        <ImageLightbox images={allImages} initialIndex={imageIndex} onClose={() => setLightbox(false)} />
      )}
    </>
  );
}
