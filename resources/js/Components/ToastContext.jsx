import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, X, Info, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

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
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
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

    const icons = {
        success: (
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.5 }}
                className="relative flex items-center justify-center w-5 h-5"
            >
                <motion.svg className="absolute inset-0 w-full h-full text-white" viewBox="0 0 50 50">
                    <motion.circle
                        cx="25" cy="25" r="20"
                        fill="none" stroke="currentColor" strokeWidth="4"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                </motion.svg>
                <motion.div
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                >
                    <Check size={14} className="text-white relative z-10" strokeWidth={3} />
                </motion.div>
            </motion.div>
        ),
        error: <X size={18} className="text-white" />,
        info: <Info size={18} className="text-white" />,
        warning: <AlertTriangle size={18} className="text-white" />,
    };

    const bgColors = {
        success: 'bg-emerald-600/95 backdrop-blur-md',
        error: 'bg-rose-600/95 backdrop-blur-md',
        info: 'bg-blue-600/95 backdrop-blur-md',
        warning: 'bg-amber-500/95 backdrop-blur-md',
    };

    return (
        <div className={`pointer-events-auto relative flex items-center gap-4 rounded-2xl px-5 py-4 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 transform transition-all duration-500 animate-in slide-in-from-right-10 fade-in overflow-hidden ${bgColors[toast.type] || 'bg-gray-800'}`}>
            <div className="shrink-0 p-1.5 rounded-xl bg-white/20 shadow-inner">
                {icons[toast.type]}
            </div>
            
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-tight pr-2">{toast.message}</p>
            </div>

            {toast.onAction && (
                <button 
                    onClick={handleAction} 
                    className="shrink-0 px-3 py-1.5 bg-white text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 active:scale-95 transition-all shadow-sm"
                >
                    {toast.actionLabel}
                </button>
            )}

            <button onClick={() => onRemove(toast.id)} className="shrink-0 text-white/50 hover:text-white transition-colors p-1">
                <X size={16} />
            </button>
            
            <div 
                className="absolute bottom-0 left-0 h-1 bg-white/30 animate-toast-shrink origin-left" 
                style={{ animationDuration: `${toast.duration}ms` }} 
            />
        </div>
    );
}
