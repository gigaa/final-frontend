'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { imagesApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import ImageCropper from '@/components/ImageCropper';
import { Upload, X, ImagePlus, CheckCircle2, CropIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

const ACCEPTED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/avif': ['.avif'],
};

interface FileEntry {
  file: File;          // final file (may be crop-replaced)
  preview: string;     // object URL for display
  cropped: boolean;    // was it cropped?
}

export default function UploadPage() {
  const router = useRouter();

  // Ready-to-upload queue
  const [entries, setEntries] = useState<FileEntry[]>([]);

  // Cropper state — one file at a time
  const [cropTarget, setCropTarget] = useState<{ src: string; filename: string; index: number } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setUploaded(false);
    // Open the cropper for the first dropped file immediately
    if (accepted.length === 1) {
      const file = accepted[0];
      const src = URL.createObjectURL(file);
      // Add as pending entry first
      setEntries([{ file, preview: src, cropped: false }]);
      setCropTarget({ src, filename: file.name, index: 0 });
    } else {
      // Multiple files — add all, no auto-crop
      const newEntries = accepted.map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
        cropped: false,
      }));
      setEntries((prev) => [...prev, ...newEntries]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
    onDropRejected: (rejected) => {
      const err = rejected[0]?.errors[0];
      if (err?.code === 'file-too-large') toast.error('File too large (max 10MB)');
      else if (err?.code === 'file-invalid-type') toast.error('Unsupported file type');
      else toast.error('File rejected');
    },
  });

  const openCropper = (index: number) => {
    const entry = entries[index];
    if (!entry) return;
    setCropTarget({ src: entry.preview, filename: entry.file.name, index });
  };

  const handleCropDone = (blob: Blob, croppedName: string) => {
    if (!cropTarget) return;
    const newFile = new File([blob], croppedName, { type: 'image/jpeg' });
    const newPreview = URL.createObjectURL(newFile);

    // Revoke old preview
    URL.revokeObjectURL(entries[cropTarget.index].preview);

    setEntries((prev) =>
      prev.map((e, i) =>
        i === cropTarget.index ? { file: newFile, preview: newPreview, cropped: true } : e,
      ),
    );
    setCropTarget(null);
    toast.success('Crop applied');
  };

  const handleCropCancel = () => {
    setCropTarget(null);
  };

  const removeEntry = (i: number) => {
    URL.revokeObjectURL(entries[i].preview);
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleUpload = async () => {
    if (!entries.length) return;
    setUploading(true);
    let successCount = 0;
    for (const entry of entries) {
      try {
        await imagesApi.upload(entry.file);
        successCount++;
      } catch {
        toast.error(`Failed to upload ${entry.file.name}`);
      }
    }
    setUploading(false);
    if (successCount > 0) {
      setUploaded(true);
      toast.success(`${successCount} image${successCount > 1 ? 's' : ''} uploaded!`);
      setTimeout(() => router.push('/gallery'), 1200);
    }
  };

  return (
    <div className="max-w-2xl mx-auto fade-in">
      {/* Cropper modal */}
      {cropTarget && (
        <ImageCropper
          src={cropTarget.src}
          filename={cropTarget.filename}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload Images</h1>
        <p className="text-gray-400 text-sm mt-1">
          JPEG, PNG, WebP, GIF, AVIF · Max 10MB · Up to 5 files
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300',
          isDragActive
            ? 'border-violet-500 bg-violet-500/10 scale-[1.01]'
            : 'border-gray-700 hover:border-gray-600 bg-gray-900/40',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div
            className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
              isDragActive ? 'bg-violet-600' : 'bg-gray-800',
            )}
          >
            <ImagePlus size={28} className={isDragActive ? 'text-white' : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-gray-200 font-semibold">
              {isDragActive ? 'Drop files here' : 'Drag & drop or click to browse'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Single file → opens crop editor · Multiple files → add to queue
            </p>
          </div>
        </div>
      </div>

      {/* File queue */}
      {entries.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Queue ({entries.length})
          </p>
          <div className="grid grid-cols-3 gap-3">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="relative group aspect-square rounded-xl overflow-hidden bg-gray-800 border border-gray-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.preview} alt="" className="w-full h-full object-cover" />

                {/* Cropped badge */}
                {entry.cropped && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-violet-600/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                    <CropIcon size={9} />
                    Cropped
                  </div>
                )}

                {/* Hover actions */}
                <div className="absolute inset-0 bg-gray-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => openCropper(i)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
                  >
                    <CropIcon size={12} />
                    Crop
                  </button>
                  <button
                    onClick={() => removeEntry(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-600/30 hover:bg-red-600/60 text-red-300 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 truncate text-[10px] text-gray-300 bg-gray-900/80 px-1.5 py-1">
                  {entry.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {entries.length > 0 && (
        <div className="mt-6 flex gap-3">
          <Button
            onClick={handleUpload}
            loading={uploading}
            size="lg"
            className="flex-1"
          >
            {uploaded ? (
              <>
                <CheckCircle2 size={18} className="text-green-400" />
                Uploaded!
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload {entries.length} file{entries.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              entries.forEach((e) => URL.revokeObjectURL(e.preview));
              setEntries([]);
              setUploaded(false);
            }}
            disabled={uploading}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
