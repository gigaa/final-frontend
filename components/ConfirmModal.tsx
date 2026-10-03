'use client';

import Modal from '@mui/material/Modal';
import { Trash2, X } from 'lucide-react';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      // keep MUI backdrop but style it ourselves
      slotProps={{
        backdrop: {
          style: { backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' },
        },
      }}
    >
      {/* MUI Modal requires exactly one non-Fragment child */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 outline-none">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {danger && (
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/15 text-red-400 flex-shrink-0">
                <Trash2 size={18} />
              </span>
            )}
            <h2
              id="confirm-modal-title"
              className="text-white font-semibold text-base leading-snug"
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <p id="confirm-modal-desc" className="text-gray-400 text-sm leading-relaxed mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2 ${
              danger
                ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20'
                : 'bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/20'
            }`}
          >
            {loading && (
              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
