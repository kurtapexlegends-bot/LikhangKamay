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

    const addToast = useCallback((messageOrConfig, type = 'success', duration = 3500, onAction = null, actionLabel = 'Undo') => {
        let finalMessage = messageOrConfig;
        let finalType = type;
        let finalDuration = duration;
        let finalOnAction = onAction;
        let finalActionLabel = actionLabel;

        if (typeof messageOrConfig === 'object' && messageOrConfig !== null) {
            finalMessage = messageOrConfig.message || '';
            finalType = messageOrConfig.type || type || 'success';
            finalDuration = messageOrConfig.duration || duration || 3500;
            finalOnAction = messageOrConfig.onAction || onAction || null;
            finalActionLabel = messageOrConfig.actionLabel || actionLabel || 'Undo';
        }

        nextToastId.current += 1;
        const id = `toast-${nextToastId.current}`;
        setToasts(prev => {
            // Filter out any active toast with the exact same message to prevent duplicate stacking
            const filtered = prev.filter(t => t.message !== finalMessage);
            const next = [...filtered, { id, message: finalMessage, type: finalType, duration: finalDuration, onAction: finalOnAction, actionLabel: finalActionLabel }];
            // Keep at most 3 active toasts
            return next.slice(-3);
        });
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {/* Toast Container */}
            <div className="pointer-events-none fixed top-3 inset-x-3 sm:inset-x-auto sm:top-6 sm:right-6 z-[300] flex max-w-full sm:max-w-md flex-col gap-2">
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
            iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-xs',
            icon: <Check size={16} strokeWidth={2.5} />,
            progressBg: 'bg-emerald-500',
            badgeText: 'Success',
            badgeClass: 'bg-emerald-100/60 text-emerald-800 border-emerald-200',
        },
        error: {
            iconBg: 'bg-rose-50 text-rose-600 border border-rose-200/80 shadow-xs',
            icon: <X size={16} strokeWidth={2.5} />,
            progressBg: 'bg-rose-500',
            badgeText: 'Notice',
            badgeClass: 'bg-rose-100/60 text-rose-800 border-rose-200',
        },
        info: {
            iconBg: 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-xs',
            icon: <Info size={16} strokeWidth={2.5} />,
            progressBg: 'bg-blue-500',
            badgeText: 'Info',
            badgeClass: 'bg-blue-100/60 text-blue-800 border-blue-200',
        },
        warning: {
            iconBg: 'bg-amber-50 text-amber-600 border border-amber-200/80 shadow-xs',
            icon: <AlertTriangle size={16} strokeWidth={2.5} />,
            progressBg: 'bg-amber-500',
            badgeText: 'Warning',
            badgeClass: 'bg-amber-100/60 text-amber-800 border-amber-200',
        },
    };

    const config = statusConfig[toast.type] || statusConfig.info;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.94, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="pointer-events-auto relative flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl p-2.5 sm:px-4 sm:py-3 bg-white/98 border border-stone-200/90 text-stone-900 shadow-xl shadow-stone-900/10 backdrop-blur-xl ring-1 ring-black/5 overflow-hidden w-full sm:min-w-[320px]"
        >
            <div className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center ${config.iconBg}`}>
                {config.icon}
            </div>

            <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border ${config.badgeClass}`}>
                        {config.badgeText}
                    </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-stone-900 leading-snug break-words">
                    {toast.message}
                </p>
            </div>

            {toast.onAction && (
                <button
                    onClick={handleAction}
                    className="shrink-0 px-2.5 py-1 bg-clay-700 text-white rounded-lg text-xs font-bold hover:bg-clay-800 active:scale-95 transition shadow-2xs"
                >
                    {toast.actionLabel}
                </button>
            )}

            <button
                onClick={() => onRemove(toast.id)}
                className="shrink-0 text-stone-400 hover:text-stone-700 transition p-1 rounded-lg hover:bg-stone-100"
                aria-label="Close notification"
            >
                <X size={14} strokeWidth={2} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-100">
                <div
                    className={`h-full ${config.progressBg} animate-toast-shrink origin-left`}
                    style={{ animationDuration: `${toast.duration}ms` }}
                />
            </div>
        </motion.div>
    );
}
