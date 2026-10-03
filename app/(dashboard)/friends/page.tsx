'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  MessageCircle,
  Users,
  Clock,
  Send,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { friendsApi } from '@/lib/api';
import { avatarGradient } from '@/lib/avatarColor';
import Button from '@/components/ui/Button';
import type {
  UserSearchResult,
  FriendListItem,
  Friendship,
} from '@/types';

type Tab = 'friends' | 'requests' | 'search';

export default function FriendsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('friends');

  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Friends + requests
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [received, setReceived] = useState<Friendship[]>([]);
  const [sent, setSent] = useState<Friendship[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Per-item loading state (avoids double-clicks)
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusy((prev) => new Set(prev).add(id));
    try {
      await fn();
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const loadAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [f, r, s] = await Promise.all([
        friendsApi.list(),
        friendsApi.pendingReceived(),
        friendsApi.pendingSent(),
      ]);
      setFriends(f);
      setReceived(r);
      setSent(s);
    } catch {
      toast.error('Failed to load friends data');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await friendsApi.search(query.trim());
        setSearchResults(results);
      } catch {
        toast.error('Search failed');
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSendRequest = async (userId: string) => {
    await withBusy(userId, async () => {
      try {
        await friendsApi.sendRequest(userId);
        toast.success('Friend request sent');
        // Update search results optimistically
        setSearchResults((prev) =>
          prev.map((u) =>
            u._id === userId
              ? { ...u, friendshipStatus: 'pending', iAmRequester: true }
              : u,
          ),
        );
        await loadAll();
      } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Failed to send request');
      }
    });
  };

  const handleRespond = async (
    friendshipId: string,
    status: 'accepted' | 'rejected',
  ) => {
    await withBusy(friendshipId, async () => {
      try {
        await friendsApi.respond(friendshipId, status);
        toast.success(status === 'accepted' ? 'Friend added!' : 'Request declined');
        await loadAll();
      } catch {
        toast.error('Failed to respond to request');
      }
    });
  };

  const handleRemoveFriend = async (friendshipId: string, name: string) => {
    await withBusy(friendshipId, async () => {
      try {
        await friendsApi.remove(friendshipId);
        toast.success(`Removed ${name}`);
        await loadAll();
      } catch {
        toast.error('Failed to remove friend');
      }
    });
  };

  const tabs: { id: Tab; label: string; icon: React.FC<{ size?: number; className?: string }>; count?: number }[] = [
    { id: 'friends', label: 'Friends', icon: Users, count: friends.length },
    {
      id: 'requests',
      label: 'Requests',
      icon: Clock,
      count: received.length || undefined,
    },
    { id: 'search', label: 'Find People', icon: Search },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Friends</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900/60 p-1 rounded-xl border border-gray-800">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              tab === id
                ? 'bg-violet-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800',
            )}
          >
            <Icon size={15} />
            {label}
            {count !== undefined && count > 0 && (
              <span
                className={clsx(
                  'ml-1 min-w-[1.25rem] h-5 rounded-full text-xs flex items-center justify-center px-1',
                  tab === id
                    ? 'bg-white/20 text-white'
                    : 'bg-violet-600/80 text-white',
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── FRIENDS TAB ──────────────────────────────────── */}
      {tab === 'friends' && (
        <div className="space-y-3">
          {loadingData ? (
            <LoadingSkeleton />
          ) : friends.length === 0 ? (
            <EmptyState
              icon={<Users size={40} className="text-gray-600" />}
              text="No friends yet. Use 'Find People' to add someone."
            />
          ) : (
            friends.map(({ friendshipId, friend }) => (
              <div
                key={friendshipId}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={friend.name ?? friend.email} email={friend.email} />
                  <div>
                    <p className="text-white font-medium text-sm">
                      {friend.name ?? friend.email}
                    </p>
                    <p className="text-gray-500 text-xs">{friend.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      router.push(`/chat?with=${friend._id}`)
                    }
                  >
                    <MessageCircle size={14} />
                    Chat
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busy.has(friendshipId)}
                    onClick={() =>
                      handleRemoveFriend(friendshipId, friend.name ?? friend.email)
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── REQUESTS TAB ─────────────────────────────────── */}
      {tab === 'requests' && (
        <div className="space-y-6">
          {/* Received */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Received ({received.length})
            </h2>
            {loadingData ? (
              <LoadingSkeleton />
            ) : received.length === 0 ? (
              <p className="text-gray-600 text-sm">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {received.map((req) => {
                  const sender = req.requester as any;
                  return (
                    <div
                      key={req._id}
                      className="flex items-center justify-between p-4 rounded-xl bg-gray-900/60 border border-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={sender.name ?? sender.email} email={sender.email} />
                        <div>
                          <p className="text-white font-medium text-sm">
                            {sender.name ?? sender.email}
                          </p>
                          <p className="text-gray-500 text-xs">{sender.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          loading={busy.has(req._id)}
                          onClick={() => handleRespond(req._id, 'accepted')}
                        >
                          <UserCheck size={14} />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={busy.has(req._id)}
                          onClick={() => handleRespond(req._id, 'rejected')}
                        >
                          <UserX size={14} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Sent */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Sent ({sent.length})
            </h2>
            {sent.length === 0 ? (
              <p className="text-gray-600 text-sm">No outgoing requests</p>
            ) : (
              <div className="space-y-3">
                {sent.map((req) => {
                  const recipient = req.recipient as any;
                  return (
                    <div
                      key={req._id}
                      className="flex items-center justify-between p-4 rounded-xl bg-gray-900/60 border border-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={recipient.name ?? recipient.email} email={recipient.email} />
                        <div>
                          <p className="text-white font-medium text-sm">
                            {recipient.name ?? recipient.email}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {recipient.email}
                          </p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                        <Clock size={12} />
                        Pending
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── SEARCH TAB ───────────────────────────────────── */}
      {tab === 'search' && (
        <div>
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              autoFocus
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="space-y-3">
            {!query.trim() ? (
              <EmptyState
                icon={<Search size={40} className="text-gray-600" />}
                text="Type a name or email to search"
              />
            ) : searchResults.length === 0 && !searching ? (
              <EmptyState
                icon={<UserX size={40} className="text-gray-600" />}
                text="No users found"
              />
            ) : (
              searchResults.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name ?? u.email} email={u.email} />
                    <div>
                      <p className="text-white font-medium text-sm">
                        {u.name ?? u.email}
                      </p>
                      <p className="text-gray-500 text-xs">{u.email}</p>
                    </div>
                  </div>
                  <SearchAction
                    user={u}
                    busy={busy.has(u._id)}
                    onSend={() => handleSendRequest(u._id)}
                    onChat={() => router.push(`/chat?with=${u._id}`)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function Avatar({ name, email }: { name: string; email?: string }) {
  return (
    <div style={avatarGradient(email ?? name)} className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
      {name[0].toUpperCase()}
    </div>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      {icon}
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 rounded-xl bg-gray-900/60 border border-gray-800 animate-pulse"
        />
      ))}
    </div>
  );
}

function SearchAction({
  user,
  busy,
  onSend,
  onChat,
}: {
  user: UserSearchResult;
  busy: boolean;
  onSend: () => void;
  onChat: () => void;
}) {
  const { friendshipStatus, iAmRequester } = user;

  if (friendshipStatus === 'accepted') {
    return (
      <Button size="sm" variant="secondary" onClick={onChat}>
        <MessageCircle size={14} />
        Chat
      </Button>
    );
  }

  if (friendshipStatus === 'pending' && iAmRequester) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
        <Clock size={12} />
        Pending
      </span>
    );
  }

  if (friendshipStatus === 'pending' && !iAmRequester) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20">
        <UserPlus size={12} />
        Wants to add you
      </span>
    );
  }

  return (
    <Button size="sm" variant="primary" loading={busy} onClick={onSend}>
      <Send size={14} />
      Add
    </Button>
  );
}
