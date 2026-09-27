'use client';

import React, { type SyntheticEvent, useRef, useState, useCallback } from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { CropIcon, X, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  src: string;               // object URL of the selected file
  filename: string;
  onCrop: (blob: Blob, filename: string) => void;
  onCancel: () => void;
}

type AspectOption = { label: string; value: number | undefined };

const ASPECT_OPTIONS: AspectOption[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:4', value: 3 / 4 },
];

function centerAspectCrop(w: number, h: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, aspect, w, h),
    w,
    h,
  );
}

export default function ImageCropper({ src, filename, onCrop, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspectOption, setAspectOption] = useState<AspectOption>(ASPECT_OPTIONS[1]); // default 1:1
  const [loading, setCropping] = useState(false);

  const onImageLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      if (aspectOption.value) {
        setCrop(centerAspectCrop(width, height, aspectOption.value));
      } else {
        setCrop(centerCrop({ unit: '%', width: 80, height: 80 }, width, height));
      }
    },
    [aspectOption.value],
  );

  const handleAspectChange = (opt: AspectOption) => {
    setAspectOption(opt);
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    if (opt.value) {
      setCrop(centerAspectCrop(width, height, opt.value));
    } else {
      setCrop(centerCrop({ unit: '%', width: 80, height: 80 }, width, height));
    }
  };

  const handleCrop = async () => {
    if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) return;
    setCropping(true);

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const ext = filename.split('.').pop() ?? 'jpg';
        const croppedName = filename.replace(/\.[^/.]+$/, '') + '_cropped.' + ext;
        onCrop(blob, croppedName);
        setCropping(false);
      },
      'image/jpeg',
      0.95,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <CropIcon size={15} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Crop Image</h2>
              <p className="text-xs text-gray-500 truncate max-w-[260px]">{filename}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Aspect ratio pills */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800 shrink-0">
          <span className="text-xs text-gray-500 mr-1">Aspect:</span>
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleAspectChange(opt)}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-medium border transition-all',
                aspectOption.label === opt.label
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200',
              )}
            >
              {opt.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
            <Maximize2 size={12} />
            {completedCrop
              ? `${Math.round(completedCrop.width)}×${Math.round(completedCrop.height)}px`
              : 'Select area'}
          </div>
        </div>

        {/* Crop area */}
        <div className="flex-1 overflow-auto p-5 flex items-center justify-center bg-gray-950/50 min-h-0">
          <ReactCrop
            crop={crop}
            onChange={(_, pct) => setCrop(pct)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectOption.value}
            className="max-h-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-h-[50vh] max-w-full object-contain block"
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-800 shrink-0">
          <p className="text-xs text-gray-500">
            Drag to select the area you want to keep
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCrop}
              disabled={loading || !completedCrop?.width}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <CropIcon size={15} />
              )}
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
