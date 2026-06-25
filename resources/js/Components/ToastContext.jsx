import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, X, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext();

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const nextToastId = useRef(0);

    const addToast = useCallback((message, type = 'success', duration = 3000, onAction = null, actionLabel = 'Undo') => {
        nextToastId.current += 1;
        const id = `toast-${nextToastId.current}`;
        setToasts(prev => [...prev, { id, message, type, duration, onAction, actionLabel }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="pointer-events-none fixed bottom-6 right-6 z-[200] flex max-w-[calc(100vw-3rem)] flex-col gap-3">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onRemove }) {
    const isRemoving = useRef(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isRemoving.current) {
                onRemove(toast.id);
            }
        }, toast.duration);
        return () => clearTimeout(timer);
    }, [toast, onRemove]);

    const handleAction = (e) => {
        e.stopPropagation();
        if (toast.onAction) {
            toast.onAction();
        }
        onRemove(toast.id);
    };

    const statusConfig = {
        success: {
            iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100/50',
            icon: <Check size={12} strokeWidth={3} />,
            progressBg: 'bg-emerald-500',
        },
        error: {
            iconBg: 'bg-rose-50 text-rose-600 border border-rose-100/50',
            icon: <X size={12} strokeWidth={3} />,
            progressBg: 'bg-rose-500',
        },
        info: {
            iconBg: 'bg-blue-50 text-blue-600 border border-blue-100/50',
            icon: <Info size={12} strokeWidth={3} />,
            progressBg: 'bg-blue-500',
        },
        warning: {
            iconBg: 'bg-amber-50 text-amber-600 border border-amber-100/50',
            icon: <AlertTriangle size={12} strokeWidth={3} />,
            progressBg: 'bg-amber-500',
        },
    };

    const config = statusConfig[toast.type] || statusConfig.info;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="pointer-events-auto relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 bg-white/95 border border-stone-200/80 text-stone-850 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md overflow-hidden"
        >
            <div className={`shrink-0 p-1 rounded-lg flex items-center justify-center ${config.iconBg}`}>
                {config.icon}
            </div>
            
            <div className="flex-1 min-w-0 pr-2">
                <p className="text-xs font-semibold tracking-tight text-stone-800 leading-tight">{toast.message}</p>
            </div>

            {toast.onAction && (
                <button 
                    onClick={handleAction} 
                    className="shrink-0 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100 active:scale-95 transition-all shadow-sm mr-1"
                >
                    {toast.actionLabel}
                </button>
            )}

            <button 
                onClick={() => onRemove(toast.id)} 
                className="shrink-0 text-stone-400 hover:text-stone-600 transition-colors p-0.5 rounded"
            >
                <X size={14} />
            </button>
            
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-50">
                <div 
                    className={`h-full ${config.progressBg} animate-toast-shrink origin-left`} 
                    style={{ animationDuration: `${toast.duration}ms` }} 
                />
            </div>
        </motion.div>
    );
}
