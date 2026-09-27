'use client';

import { useEffect, useState, useRef, useCallback, type SyntheticEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { imagesApi } from '@/lib/api';
import { ImageRecord, TransformPayload, ImageFormat, ImageFilter } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Wand2, ArrowLeft, RotateCw, FlipHorizontal2, FlipVertical2,
  CropIcon, Paintbrush, FileImage, Gauge, Type, ImageIcon,
  Check, X, Maximize2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

/* ─── constants ─────────────────────────────────────────── */
const FORMAT_OPTIONS: { value: ImageFormat; label: string }[] = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png',  label: 'PNG'  },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'gif',  label: 'GIF'  },
];

const FILTER_OPTIONS: { value: ImageFilter | ''; label: string; emoji: string }[] = [
  { value: '',          label: 'None',      emoji: '✨' },
  { value: 'grayscale', label: 'Grayscale', emoji: '⬛' },
  { value: 'sepia',     label: 'Sepia',     emoji: '🟫' },
  { value: 'blur',      label: 'Blur',      emoji: '🌫️' },
  { value: 'sharpen',   label: 'Sharpen',   emoji: '🔪' },
  { value: 'negate',    label: 'Negate',    emoji: '🔄' },
];

const ASPECT_OPTIONS = [
  { label: 'Free', value: undefined },
  { label: '1:1',  value: 1 },
  { label: '4:3',  value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:4',  value: 3 / 4 },
];

/* ─── helpers ───────────────────────────────────────────── */
function Section({ title, icon, children, action }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-violet-400">{icon}</span>
          <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function centerAspectCrop(w: number, h: number, aspect: number): Crop {
  return centerCrop(makeAspectCrop({ unit: '%', width: 80 }, aspect, w, h), w, h);
}

/* ─── page ──────────────────────────────────────────────── */
export default function TransformPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [original,    setOriginal]    = useState<ImageRecord | null>(null);
  const [result,      setResult]      = useState<ImageRecord | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [transforming, setTransforming] = useState(false);

  /* crop state */
  const imgRef          = useRef<HTMLImageElement | null>(null);
  const [cropEnabled,   setCropEnabled]   = useState(false);
  const [aspectOpt,     setAspectOpt]     = useState(ASPECT_OPTIONS[1]); // 1:1
  const [crop,          setCrop]          = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [cropApplied,   setCropApplied]   = useState<PixelCrop | null>(null);

  /* other controls */
  const [width,     setWidth]     = useState('');
  const [height,    setHeight]    = useState('');
  const [rotate,    setRotate]    = useState(0);
  const [flip,      setFlip]      = useState(false);
  const [mirror,    setMirror]    = useState(false);
  const [quality,   setQuality]   = useState(85);
  const [format,    setFormat]    = useState<ImageFormat>('jpeg');
  const [filter,    setFilter]    = useState<ImageFilter | ''>('');
  const [watermark, setWatermark] = useState('');

  useEffect(() => {
    imagesApi.get(id)
      .then(setOriginal)
      .catch(() => toast.error('Image not found'))
      .finally(() => setLoading(false));
  }, [id]);

  /* when image loads inside ReactCrop, set initial crop */
  const onImageLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    if (aspectOpt.value) {
      setCrop(centerAspectCrop(width, height, aspectOpt.value));
    } else {
      setCrop(centerCrop({ unit: '%', width: 80, height: 80 }, width, height));
    }
  }, [aspectOpt.value]);

  const handleAspect = (opt: typeof ASPECT_OPTIONS[0]) => {
    setAspectOpt(opt);
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    if (opt.value) {
      setCrop(centerAspectCrop(width, height, opt.value));
    } else {
      setCrop(centerCrop({ unit: '%', width: 80, height: 80 }, width, height));
    }
  };

  /* convert display-px → natural-px and lock in */
  const applyCrop = () => {
    if (!completedCrop || !imgRef.current || !original) return;
    const img = imgRef.current;
    const scaleX = original.width  / img.width;
    const scaleY = original.height / img.height;
    setCropApplied({
      unit:   'px',
      x:      Math.round(completedCrop.x      * scaleX),
      y:      Math.round(completedCrop.y      * scaleY),
      width:  Math.round(completedCrop.width  * scaleX),
      height: Math.round(completedCrop.height * scaleY),
    });
    setCropEnabled(false);
    toast.success('Crop applied');
  };

  const clearCrop = () => {
    setCropApplied(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const handleTransform = async () => {
    if (!original) return;
    setTransforming(true);
    setResult(null);

    const payload: TransformPayload = {};
    if (width)          payload.width    = Number(width);
    if (height)         payload.height   = Number(height);
    if (rotate !== 0)   payload.rotate   = rotate;
    if (flip)           payload.flip     = true;
    if (mirror)         payload.mirror   = true;
    if (quality !== 85) payload.quality  = quality;
    payload.format = format;
    if (filter)           payload.filter    = filter;
    if (watermark.trim()) payload.watermark = watermark.trim();

    if (cropApplied) {
      payload.crop     = true;
      payload.cropLeft = cropApplied.x;
      payload.cropTop  = cropApplied.y;
      payload.width    = cropApplied.width;
      payload.height   = cropApplied.height;
    }

    try {
      const res = await imagesApi.transform(id, payload);
      setResult(res.image);
      toast.success('Transformation complete!');
    } catch {
      toast.error('Transformation failed');
    } finally {
      setTransforming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!original) return null;

  const originalSrc = original.url ?? '';
  const resultSrc   = result?.url ?? null;

  /* display-px size of completed crop converted to natural-px for label */
  const cropLabel = (() => {
    if (!completedCrop || !imgRef.current || !original) return null;
    const sx = original.width  / imgRef.current.width;
    const sy = original.height / imgRef.current.height;
    return `${Math.round(completedCrop.width * sx)}×${Math.round(completedCrop.height * sy)}px`;
  })();

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-100 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Transform Image</h1>
          <p className="text-gray-400 text-sm truncate max-w-xs mt-0.5">{original.originalName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ────── Left: controls ────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Resize */}
          <Section title="Resize" icon={<Maximize2 size={16} />}>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Width (px)"  type="number" placeholder={String(original.width  || 800)} value={width}  onChange={(e) => setWidth(e.target.value)}  min={1} />
              <Input label="Height (px)" type="number" placeholder={String(original.height || 600)} value={height} onChange={(e) => setHeight(e.target.value)} min={1} />
            </div>
          </Section>

          {/* Crop */}
          <Section
            title="Crop"
            icon={<CropIcon size={16} />}
            action={
              cropApplied ? (
                <button
                  onClick={clearCrop}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <X size={12} /> Clear
                </button>
              ) : undefined
            }
          >
            {/* applied badge */}
            {cropApplied && !cropEnabled && (
              <div className="flex items-center justify-between bg-violet-600/10 border border-violet-500/30 rounded-xl px-3 py-2 mb-3">
                <div className="flex items-center gap-2">
                  <CropIcon size={13} className="text-violet-400" />
                  <span className="text-xs text-violet-300 font-medium">
                    {cropApplied.width}×{cropApplied.height}px
                  </span>
                  <span className="text-xs text-gray-500">offset {cropApplied.x},{cropApplied.y}</span>
                </div>
                <button
                  onClick={() => setCropEnabled(true)}
                  className="text-xs text-gray-400 hover:text-violet-300 transition-colors"
                >
                  Re-crop
                </button>
              </div>
            )}

            {!cropEnabled ? (
              <button
                onClick={() => setCropEnabled(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-700 text-sm text-gray-400 hover:border-violet-500/50 hover:text-violet-300 hover:bg-violet-500/5 transition-all"
              >
                <CropIcon size={15} />
                {cropApplied ? 'Edit Crop' : 'Enable Crop'}
              </button>
            ) : (
              /* aspect controls shown inline when crop is active */
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500">Aspect:</span>
                  {ASPECT_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleAspect(opt)}
                      className={clsx(
                        'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                        aspectOpt.label === opt.label
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {cropLabel && (
                    <span className="ml-auto text-xs text-gray-500 flex items-center gap-1">
                      <Maximize2 size={11} />{cropLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Drag the selection on the image →
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={applyCrop}
                    disabled={!completedCrop?.width}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check size={13} /> Apply Crop
                  </button>
                  <button
                    onClick={() => { setCropEnabled(false); if (!cropApplied) clearCrop(); }}
                    className="px-3 py-2 rounded-xl border border-gray-700 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Rotate & Flip */}
          <Section title="Rotate & Flip" icon={<RotateCw size={16} />}>
            <div className="mb-3">
              <label className="text-sm text-gray-300 mb-2 block">
                Rotate: <span className="text-violet-400 font-semibold">{rotate}°</span>
              </label>
              <input
                type="range" min={-180} max={180} step={1} value={rotate}
                onChange={(e) => setRotate(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>-180°</span><span>0°</span><span>180°</span>
              </div>
            </div>
            <div className="flex gap-3">
              {[
                { label: 'Flip',   icon: <FlipVertical2   size={15} />, active: flip,   toggle: () => setFlip(f   => !f) },
                { label: 'Mirror', icon: <FlipHorizontal2 size={15} />, active: mirror, toggle: () => setMirror(m => !m) },
              ].map(({ label, icon, active, toggle }) => (
                <button key={label} onClick={toggle}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-all',
                    active
                      ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                      : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600',
                  )}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </Section>

          {/* Filters */}
          <Section title="Filter" icon={<Paintbrush size={16} />}>
            <div className="grid grid-cols-3 gap-2">
              {FILTER_OPTIONS.map((f) => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={clsx(
                    'flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all',
                    filter === f.value
                      ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200',
                  )}
                >
                  <span className="text-lg leading-none">{f.emoji}</span>
                  {f.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Format & Quality */}
          <Section title="Format & Quality" icon={<FileImage size={16} />}>
            <div className="flex flex-wrap gap-2 mb-4">
              {FORMAT_OPTIONS.map((f) => (
                <button key={f.value} onClick={() => setFormat(f.value)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    format === f.value
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-2 flex items-center gap-2">
                <Gauge size={14} />
                Quality: <span className="text-violet-400 font-semibold">{quality}%</span>
              </label>
              <input
                type="range" min={1} max={100} value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>1%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </Section>

          {/* Watermark */}
          <Section title="Watermark" icon={<Type size={16} />}>
            <Input
              placeholder="e.g. © MyBrand 2026"
              value={watermark}
              onChange={(e) => setWatermark(e.target.value)}
            />
          </Section>

          <Button onClick={handleTransform} loading={transforming} size="lg" className="w-full">
            <Wand2 size={18} />
            Apply Transformations
          </Button>
        </div>

        {/* ────── Right: preview ────── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Original — with inline ReactCrop when crop is active */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <ImageIcon size={14} className="text-gray-500" />
                <span className="text-xs text-gray-400 font-medium">Original</span>
                <span className="ml-auto text-xs text-gray-600">
                  {original.width}×{original.height}
                </span>
                {cropEnabled && (
                  <span className="ml-2 flex items-center gap-1 text-[10px] font-semibold text-violet-400 bg-violet-600/15 px-1.5 py-0.5 rounded-md">
                    <CropIcon size={9} /> Crop mode
                  </span>
                )}
              </div>
              <div className="bg-gray-800/30 flex items-center justify-center p-2">
                {cropEnabled ? (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, pct) => setCrop(pct)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspectOpt.value}
                    className="max-w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imgRef}
                      src={originalSrc}
                      alt="Original"
                      onLoad={onImageLoad}
                      className="max-w-full max-h-72 object-contain block"
                    />
                  </ReactCrop>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={originalSrc}
                    alt="Original"
                    className="max-w-full max-h-72 object-contain"
                  />
                )}
              </div>
            </div>

            {/* Result */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <Wand2 size={14} className="text-violet-400" />
                <span className="text-xs text-gray-400 font-medium">Result</span>
                {result && (
                  <span className="ml-auto text-xs text-gray-600">
                    {result.width}×{result.height}
                  </span>
                )}
              </div>
              <div className="relative bg-gray-800/30 flex items-center justify-center p-2 min-h-[200px]">
                {transforming ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-500">Processing...</span>
                  </div>
                ) : resultSrc ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resultSrc}
                      alt="Result"
                      className="max-w-full max-h-72 object-contain block"
                    />
                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check size={13} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wand2 size={32} className="text-gray-700 mx-auto mb-2" />
                    <p className="text-xs text-gray-600">Apply transformations<br />to see result</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Result actions */}
          {result && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-200">Transformation saved</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {result.format?.toUpperCase()} · {result.width}×{result.height} · {(result.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!result) return;
                    try {
                      const { blob, filename } = await imagesApi.downloadBlob(result._id, result.originalName);
                      const url = URL.createObjectURL(blob);
                      const a   = document.createElement('a');
                      a.href = url; a.download = filename; a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      toast.error('Download failed');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => router.push('/gallery')}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
                >
                  Gallery
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
