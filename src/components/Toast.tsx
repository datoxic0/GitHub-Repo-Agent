import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function Toast({ toasts, removeToast }: ToastProps) {
  return (
    <div className="fixed right-6 bottom-6 flex flex-col gap-3 z-50 pointer-events-none max-w-md w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-emerald-500 text-white';
          let Icon = CheckCircle;

          if (toast.type === 'error') {
            bgColor = 'bg-rose-500 text-white';
            Icon = XCircle;
          } else if (toast.type === 'warn') {
            bgColor = 'bg-amber-500 text-white';
            Icon = AlertCircle;
          } else if (toast.type === 'info') {
            bgColor = 'bg-blue-600 text-white';
            Icon = Info;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border border-white/10 ${bgColor}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-sm font-medium pr-2 whitespace-pre-line leading-relaxed">
                {toast.text}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 hover:bg-black/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
