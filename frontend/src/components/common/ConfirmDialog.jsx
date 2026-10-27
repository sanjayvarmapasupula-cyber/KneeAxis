import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Reusable Confirmation Dialog for destructive operations
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Confirm action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-[420px] bg-white rounded-[16px] p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-full flex items-center justify-center"
              style={{
                background: isDanger ? '#FEE2E2' : '#E0F2FE',
                color: isDanger ? '#DC2626' : '#0284C7',
              }}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="dialog-title" className="text-[17px] font-bold text-slate-900">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[13px] leading-relaxed text-slate-600 mb-6">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-[8px] transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-[13px] font-semibold text-white rounded-[8px] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            style={{
              background: isDanger
                ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                : 'linear-gradient(135deg, #00A5B5 0%, #0082A6 100%)',
            }}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
