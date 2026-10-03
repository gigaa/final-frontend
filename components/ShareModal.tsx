'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Search, Copy, Check, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { friendsApi, chatApi, imagesApi } from '@/lib/api';
import { avatarGradient } from '@/lib/avatarColor';
import { getSocket } from '@/lib/socket';
import type { FriendListItem, ImageRecord } from '@/types';

interface Props {
  /** Pass a single image OR an array for bulk-share */
  image?: ImageRecord;
  images?: ImageRecord[];
  onClose: () => void;
}

export default function ShareModal({ image, images: imagesProp, onClose }: Props) {
  const router = useRouter();
  // normalise: always work with an array
  const images: ImageRecord[] = imagesProp ?? (image ? [image] : []);
  const isBulk = images.length > 1;
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [filtered, setFiltered] = useState<FriendListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<Set<string>>(new Set());
  const [sent, setSentSet] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    friendsApi
      .list()
      .then((f) => {
        setFriends(f);
        setFiltered(f);
      })
      .catch(() => toast.error('Failed to load friends'))
      .finally(() => setLoading(false));

    // Focus search after mount
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(
      friends.filter(
        ({ friend }) =>
          (friend.name ?? '').toLowerCase().includes(q) ||
          friend.email.toLowerCase().includes(q),
      ),
    );
  }, [query, friends]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleCopy = async () => {
    // For bulk: copy all URLs joined by newline; for single: copy the one URL
    const text = images.map((img) => img.url ?? '').join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(isBulk ? `${images.length} links copied` : 'Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleSend = async (friendId: string, friendName: string) => {
    if (sending.has(friendId) || sent.has(friendId)) return;

    setSending((prev) => new Set(prev).add(friendId));
    try {
      for (const img of images) {
        // Download through backend proxy (avoids S3 CORS)
        const { blob } = await imagesApi.downloadBlob(img._id, img.originalName);
        const file = new File([blob], img.originalName, { type: img.mimetype });

        const msg = await chatApi.uploadImage(friendId, file);

        // Notify via socket so recipient gets it instantly
        try {
          const socket = getSocket();
          if (socket.connected) {
            socket.emit('message:image', {
              recipientId: friendId,
              messageId: String((msg as any)._id),
              imageUrl: (msg as any).imageUrl,
              imageOriginalName: msg.imageOriginalName ?? img.originalName,
            });
          }
        } catch {
          // Socket not connected — REST delivery is enough
        }
      }

      setSentSet((prev) => new Set(prev).add(friendId));
      toast.success(isBulk ? `${images.length} images sent to ${friendName}` : `Sent to ${friendName}`);
    } catch {
      toast.error(`Failed to send to ${friendName}`);
    } finally {
      setSending((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    }
  };

  const modal = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-4 pt-4 pb-3 border-b border-gray-800">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Copy link"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Search size={16} />}
          </button>
          <h2 className="flex-1 text-center text-white font-semibold text-base">
            {isBulk ? `Share ${images.length} images` : 'Share to'}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search friends…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        {/* Friends list */}
        <div className="overflow-x-auto px-4 pb-4 pt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-violet-500" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">
              {friends.length === 0 ? 'No friends yet' : 'No results'}
            </p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
              {filtered.map(({ friend }) => {
                const isSending = sending.has(friend._id);
                const isSent = sent.has(friend._id);
                const initials = (friend.name ?? friend.email)[0].toUpperCase();
                const displayName = friend.name ?? friend.email;

                return (
                  <button
                    key={friend._id}
                    onClick={() => handleSend(friend._id, displayName)}
                    disabled={isSending}
                    className="flex flex-col items-center gap-2 flex-shrink-0 w-16 group"
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div
                      style={avatarGradient(friend.email)}
                        className={clsx(
                          'w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold transition-all duration-200',
                          isSent
                            ? 'bg-green-600/80 ring-2 ring-green-500'
                            : `group-hover:ring-2 ring-violet-400 group-hover:scale-105`,
                          isSending && 'opacity-60',
                        )}
                      >
                        {isSending ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : isSent ? (
                          <Check size={20} />
                        ) : (
                          initials
                        )}
                      </div>
                    </div>
                    {/* Name */}
                    <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors text-center leading-tight line-clamp-2 w-full">
                      {displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Copy link button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleCopy}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200',
              copied
                ? 'bg-green-600/20 border-green-500/40 text-green-400'
                : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white',
            )}
          >
            {copied ? (
              <>
                <Check size={15} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={15} />
                {isBulk ? `Copy ${images.length} links` : 'Copy image link'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modal, document.body);
}
