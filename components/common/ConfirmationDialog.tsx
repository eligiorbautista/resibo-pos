import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'default';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600'
    },
    warning: {
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: 'text-yellow-600'
    },
    default: {
      confirmButton: 'bg-black hover:bg-gray-800 text-white',
      icon: 'text-black'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-start gap-4 mb-6">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black tracking-tighter text-black uppercase mb-2">
              {title}
            </h3>
            <p className="text-sm font-bold text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${styles.confirmButton}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;

