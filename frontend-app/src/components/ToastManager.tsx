import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItemProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ id, message, type, duration = 4000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 200);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} className="text-[#087f74]" />,
    error: <AlertCircle size={20} className="text-[#d76756]" />,
    info: <Info size={20} className="text-[#087f74]" />,
    warning: <AlertCircle size={20} className="text-[#bd7a22]" />,
  };

  const bgColors = {
    success: 'bg-[#f3fbf8] border-[#b9e2d9]',
    error: 'bg-[#fff5f4] border-[#f4d4d0]',
    info: 'bg-[#f3fbf8] border-[#b9e2d9]',
    warning: 'bg-[#fffaf5] border-[#f4e1d4]',
  };

  return (
    <div
      className={`
        transform transition-all duration-200
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className={`
        flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg
        ${bgColors[type]}
        animate-toast-enter
      `}>
        {icons[type]}
        <span className="text-sm font-medium text-[#17212b]">{message}</span>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => onClose(id), 200);
          }}
          className="ml-auto rounded p-1 hover:bg-black/10 transition-colors"
        >
          <X size={16} className="text-[#9aa7af]" />
        </button>
      </div>
    </div>
  );
};

export interface ToastManagerContextType {
  show: (message: string, type: ToastType, duration?: number) => void;
}

export const ToastManagerContext = React.createContext<ToastManagerContextType | null>(null);

export const ToastManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType; duration?: number }>>([]);

  const show = (message: string, type: ToastType, duration?: number) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastManagerContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastManagerContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastManagerContext);
  if (!context) {
    throw new Error('useToast must be used within ToastManager');
  }
  return context;
};

export default ToastManager;
