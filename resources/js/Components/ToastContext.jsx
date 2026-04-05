import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, X, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const nextToastId = useRef(0);

    const addToast = useCallback((message, type = 'success', duration = 3000) => {
        nextToastId.current += 1;
        const id = `toast-${nextToastId.current}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex max-w-[calc(100vw-2.5rem)] flex-col gap-2">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onRemove }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, toast.duration);
        return () => clearTimeout(timer);
    }, [toast, onRemove]);

    const icons = {
        success: <Check size={18} className="text-white" />,
        error: <X size={18} className="text-white" />,
        info: <Info size={18} className="text-white" />,
        warning: <AlertTriangle size={18} className="text-white" />,
    };

    const bgColors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-amber-500',
    };

    return (
        <div className={`pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg transform transition-all duration-300 animate-in slide-in-from-right-10 fade-in ${bgColors[toast.type] || 'bg-gray-800'}`}>
            <div className={`p-1 rounded-full bg-white/20`}>
                {icons[toast.type]}
            </div>
            <p className="text-sm font-medium pr-2">{toast.message}</p>
            <button onClick={() => onRemove(toast.id)} className="text-white/70 hover:text-white transition">
                <X size={14} />
            </button>
        </div>
    );
}
