
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

export const ConfirmationModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const colorClass = variant === 'danger' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-100';
  const iconBg = variant === 'danger' ? 'bg-rose-100 text-rose-500' : 'bg-amber-100 text-amber-500';

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-6">
          <div className={`p-3 rounded-2xl ${iconBg}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full text-slate-300 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-2 mb-8">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <p className="text-slate-500 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onCancel} 
            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onCancel(); }} 
            className={`flex-1 py-4 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${colorClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
