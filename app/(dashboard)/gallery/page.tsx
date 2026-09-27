'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { imagesApi } from '@/lib/api';
import { ImageRecord } from '@/types';
import ImageCard from '@/components/ImageCard';
import Button from '@/components/ui/Button';
import {
  Upload, Images, ChevronLeft, ChevronRight,
  CheckSquare, Square, Trash2, Download, X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

export default function GalleryPage() {
  const [images,  setImages]  = useState<ImageRecord[]>([]);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);

  // ── selection state ──
  const [selectMode,   setSelectMode]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDling,    setBulkDling]    = useState(false);

  const fetchImages = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await imagesApi.list(p, 12);
      setImages(res.data);
      setPages(res.pages);
      setTotal(res.total);
    } catch {
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImages(page); }, [page, fetchImages]);

  // Exit select mode when page changes
  useEffect(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [page]);

  const handleDeleted = (id: string) => {
    setImages((prev) => prev.filter((img) => img._id !== id));
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    setTotal((t) => t - 1);
  };

  // ── select helpers ──
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const isAllSelected = images.length > 0 && selectedIds.size === images.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((i) => i._id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // ── bulk delete ──
  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} image${selectedIds.size > 1 ? 's' : ''}?`)) return;
    setBulkDeleting(true);
    let count = 0;
    for (const id of selectedIds) {
      try {
        await imagesApi.delete(id);
        handleDeleted(id);
        count++;
      } catch {
        toast.error(`Failed to delete one image`);
      }
    }
    setBulkDeleting(false);
    if (count) toast.success(`${count} image${count > 1 ? 's' : ''} deleted`);
    exitSelectMode();
  };

  // ── bulk download ──
  const handleBulkDownload = async () => {
    if (!selectedIds.size) return;
    setBulkDling(true);
    const selected = images.filter((i) => selectedIds.has(i._id));

    try {
      if (selected.length === 1) {
        // single file — direct via backend
        const img = selected[0];
        const { blob, filename } = await imagesApi.downloadBlob(img._id, img.originalName);
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        toast.success('Download started');
      } else {
        // multiple files — fetch all through backend, pack into ZIP
        const JSZip = (await import('jszip')).default;
        const zip   = new JSZip();

        toast.loading(`Preparing ${selected.length} files…`, { id: 'zip' });

        // Sequential to avoid hammering the server and to preserve unique names
        const seen = new Map<string, number>();
        for (const img of selected) {
          const { blob, filename } = await imagesApi.downloadBlob(img._id, img.originalName);

          // Deduplicate filenames inside the ZIP
          let finalName = filename;
          if (seen.has(filename)) {
            const count = seen.get(filename)! + 1;
            seen.set(filename, count);
            const ext  = filename.includes('.') ? '.' + filename.split('.').pop() : '';
            const base = filename.includes('.') ? filename.slice(0, filename.lastIndexOf('.')) : filename;
            finalName  = `${base} (${count})${ext}`;
          } else {
            seen.set(filename, 1);
          }

          zip.file(finalName, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url     = URL.createObjectURL(zipBlob);
        const a       = document.createElement('a');
        a.href = url;
        a.download = `pixelforge-${selected.length}-images.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${selected.length} images zipped and downloaded`, { id: 'zip' });
      }
    } catch {
      toast.error('Download failed', { id: 'zip' });
    } finally {
      setBulkDling(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Gallery</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {total} image{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectMode(true)}
                disabled={images.length === 0}
              >
                <CheckSquare size={15} />
                Select
              </Button>
              <Link href="/upload">
                <Button size="sm">
                  <Upload size={15} />
                  Upload
                </Button>
              </Link>
            </>
          ) : (
            <button
              onClick={exitSelectMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
            >
              <X size={15} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk action toolbar ── */}
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300',
          selectMode ? 'max-h-20 mb-4 opacity-100' : 'max-h-0 mb-0 opacity-0',
        )}
      >
        <div className="flex items-center gap-3 bg-gray-900/80 border border-gray-800 rounded-2xl px-4 py-3">
          {/* Select all toggle */}
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            {isAllSelected ? (
              <CheckSquare size={16} className="text-violet-400" />
            ) : (
              <Square size={16} className="text-gray-500" />
            )}
            {isAllSelected ? 'Deselect all' : 'Select all'}
          </button>

          {/* Count badge */}
          <div className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
            selectedCount > 0
              ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
              : 'bg-gray-800 text-gray-500',
          )}>
            {selectedCount > 0 ? `${selectedCount} selected` : 'None selected'}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bulk download */}
          <button
            onClick={handleBulkDownload}
            disabled={selectedCount === 0 || bulkDling || bulkDeleting}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
              selectedCount > 0
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'
                : 'border-gray-800 text-gray-600 cursor-not-allowed',
            )}
          >
            {bulkDling ? (
              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <Download size={14} />
            )}
            Download{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>

          {/* Bulk delete */}
          <button
            onClick={handleBulkDelete}
            disabled={selectedCount === 0 || bulkDeleting || bulkDling}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
              selectedCount > 0
                ? 'border-red-600/40 text-red-400 hover:bg-red-600/20 hover:border-red-500/50'
                : 'border-gray-800 text-gray-600 cursor-not-allowed',
            )}
          >
            {bulkDeleting ? (
              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <Trash2 size={14} />
            )}
            Delete{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gray-800/50 animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-800/60 flex items-center justify-center mb-5">
            <Images size={36} className="text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No images yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-xs">
            Upload your first image to start transforming and managing it here.
          </p>
          <Link href="/upload">
            <Button>
              <Upload size={16} />
              Upload your first image
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img) => (
              <ImageCard
                key={img._id}
                image={img}
                onDeleted={handleDeleted}
                selectable={selectMode}
                selected={selectedIds.has(img._id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                <ChevronLeft size={16} />
                Prev
              </Button>
              <span className="text-sm text-gray-400">Page {page} of {pages}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pages}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
