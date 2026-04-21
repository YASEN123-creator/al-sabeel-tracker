'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function Toast() {
  const { toasts, removeToast } = useAppStore();

  const icons = {
    success: <CheckCircle size={18} className="text-emerald-500" />,
    error: <XCircle size={18} className="text-red-500" />,
    info: <Info size={18} className="text-blue-500" />,
  };

  const borders = {
    success: 'border-emerald-200 dark:border-emerald-800',
    error: 'border-red-200 dark:border-red-800',
    info: 'border-blue-200 dark:border-blue-800',
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border ${borders[toast.type]} shadow-lg cursor-pointer max-w-sm`}
          >
            {icons[toast.type]}
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
