'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ImageIcon, Upload, LayoutGrid, LogOut, Wand2 } from 'lucide-react';
import clsx from 'clsx';

const navLinks = [
  { href: '/gallery', label: 'Gallery', icon: LayoutGrid },
  { href: '/upload', label: 'Upload', icon: Upload },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/gallery"
          className="flex items-center gap-2.5 text-white font-bold text-lg"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 shadow-lg shadow-violet-600/40">
            <Wand2 size={16} />
          </span>
          <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            PixelForge
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                pathname.startsWith(href)
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800',
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* User */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                {(user.name ?? user.email)[0].toUpperCase()}
              </div>
              <span className="text-sm text-gray-300 hidden sm:block">
                {user.name ?? user.email}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut size={15} />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
