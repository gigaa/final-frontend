'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, Wand2, Download, ImageIcon, Check, Share2 } from 'lucide-react';
import { ImageRecord } from '@/types';
import { imagesApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import ShareModal from './ShareModal';

interface Props {
  image: ImageRecord;
  onDeleted: (id: string) => void;
  // selection props (optional — when undefined, select mode is off)
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageCard({
  image,
  onDeleted,
  selectable = false,
  selected = false,
  onSelect,
}: Props) {
  const [deleting,    setDeleting]    = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imgError,    setImgError]    = useState(false);
  const [shareOpen,   setShareOpen]   = useState(false);

  const src = image.url ?? '';

  const handleDelete = async () => {
    if (!confirm('Delete this image?')) return;
    setDeleting(true);
    try {
      await imagesApi.delete(image._id);
      toast.success('Image deleted');
      onDeleted(image._id);
    } catch {
      toast.error('Failed to delete');
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await imagesApi.downloadBlob(image._id, image.originalName);
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleCardClick = () => {
    if (selectable && onSelect) onSelect(image._id);
  };

  return (
    <>
      <div
        onClick={selectable ? handleCardClick : undefined}
        className={clsx(
          'group relative bg-gray-900 border rounded-2xl overflow-hidden transition-all duration-200',
          selectable ? 'cursor-pointer' : '',
          selected
            ? 'border-violet-500 shadow-lg shadow-violet-500/20 ring-2 ring-violet-500/30'
            : 'border-gray-800 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/10',
        )}
      >
        {/* ── Checkbox (visible in select mode) ── */}
        {selectable && (
          <div className="absolute top-2.5 left-2.5 z-20">
            <div
              className={clsx(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150',
                selected
                  ? 'bg-violet-600 border-violet-500'
                  : 'bg-gray-900/70 border-gray-500 group-hover:border-violet-400',
              )}
            >
              {selected && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
          </div>
        )}

        {/* ── Image ── */}
        <div className="relative aspect-square bg-gray-800/50 overflow-hidden">
          {src && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={image.originalName}
              className={clsx(
                'w-full h-full object-cover transition-all duration-500',
                !selectable && 'group-hover:scale-105 [@media(hover:none)]:scale-100',
                selected && 'brightness-75',
              )}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon size={40} className="text-gray-600" />
            </div>
          )}

          {/* ── Share button — always visible (top-right), hidden in select mode ── */}
          {!selectable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShareOpen(true);
              }}
              className="absolute top-2.5 right-2.5 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all duration-150 hover:scale-110"
              title="Share"
            >
              <Share2 size={14} />
            </button>
          )}

          {/* Overlay actions — hidden in select mode */}
          {!selectable && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100 transition-all duration-300">
                <Link
                  href={`/transform/${image._id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
                >
                  <Wand2 size={13} />
                  Transform
                </Link>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className={clsx(
                    'flex items-center justify-center w-9 h-9 rounded-xl bg-gray-800/90 hover:bg-gray-700 text-gray-300 transition-colors',
                    downloading && 'opacity-50 cursor-not-allowed',
                  )}
                  title="Download"
                >
                  {downloading ? (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <Download size={14} />
                  )}
                </button>
                {/* <button
                  onClick={(e) => { e.stopPropagation(); setShareOpen(true); }}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-800/90 hover:bg-gray-700 text-gray-300 transition-colors"
                  title="Share"
                >
                  <Share2 size={14} />
                </button> */}
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={clsx(
                    'flex items-center justify-center w-9 h-9 rounded-xl transition-colors',
                    deleting
                      ? 'bg-gray-800/90 text-gray-500'
                      : 'bg-red-600/20 hover:bg-red-600/40 text-red-400',
                  )}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Info ── */}
        <div className="p-3">
          <p className="text-sm text-gray-200 font-medium truncate">{image.originalName}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{image.format}</span>
            <span className="text-xs text-gray-500">
              {image.width > 0 ? `${image.width}×${image.height}` : '—'}
              {' · '}
              {formatSize(image.size)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Share Modal ── */}
      {shareOpen && (
        <ShareModal
          image={image}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}
