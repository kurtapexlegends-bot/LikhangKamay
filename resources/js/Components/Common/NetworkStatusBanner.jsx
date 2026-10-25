import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, AlertTriangle, RefreshCw, X } from 'lucide-react';
import useNetworkStatus from '@/hooks/useNetworkStatus';

export default function NetworkStatusBanner() {
    const { isOnline, isDegraded, wasOffline, checkConnection, clearWasOffline } = useNetworkStatus();
    const [retrying, setRetrying] = useState(false);
    const [dismissedDegraded, setDismissedDegraded] = useState(false);

    // Auto-clear reconnected flash after 3.5 seconds
    useEffect(() => {
        if (wasOffline && isOnline) {
            const timer = setTimeout(() => {
                clearWasOffline();
            }, 3500);
            return () => clearTimeout(timer);
        }
    }, [wasOffline, isOnline, clearWasOffline]);

    const handleManualRetry = async () => {
        setRetrying(true);
        await checkConnection();
        setRetrying(false);
    };

    const showOffline = !isOnline;
    const showRestored = isOnline && wasOffline;
    const showDegraded = isOnline && !wasOffline && isDegraded && !dismissedDegraded;

    const isVisible = showOffline || showRestored || showDegraded;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: -60, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -60, opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] sm:w-auto max-w-xl pointer-events-auto"
                    role="alert"
                    aria-live="assertive"
                >
                    {/* Offline Banner */}
                    {showOffline && (
                        <div className="bg-stone-900/95 backdrop-blur-md text-stone-100 border border-stone-800 rounded-2xl px-4 py-2.5 text-xs shadow-xl flex items-center justify-between gap-3.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                                    <WifiOff size={14} />
                                </div>
                                <div className="truncate">
                                    <span className="font-bold text-stone-200">You are offline.</span>
                                    <span className="hidden sm:inline text-stone-400 ml-1.5">
                                        Data sync is paused until connection returns.
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleManualRetry}
                                disabled={retrying}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border border-stone-700/80 transition shrink-0 disabled:opacity-50 cursor-pointer min-h-[32px]"
                            >
                                <RefreshCw size={11} className={retrying ? 'animate-spin' : ''} />
                                <span>{retrying ? 'Checking...' : 'Check Connection'}</span>
                            </button>
                        </div>
                    )}

                    {/* Connection Restored Flash */}
                    {showRestored && (
                        <div className="bg-emerald-950/95 backdrop-blur-md text-emerald-100 border border-emerald-700/80 rounded-2xl px-4 py-2.5 text-xs shadow-xl flex items-center justify-between gap-3.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                                    <Wifi size={14} />
                                </div>
                                <div className="truncate">
                                    <span className="font-bold text-white">Back online.</span>
                                    <span className="text-emerald-200 ml-1.5">
                                        Connection restored and data sync is active.
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={clearWasOffline}
                                className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-900/60 transition cursor-pointer shrink-0"
                                aria-label="Dismiss banner"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {/* Degraded Connection Banner */}
                    {showDegraded && (
                        <div className="bg-stone-900/95 backdrop-blur-md text-stone-200 border border-amber-600/50 rounded-2xl px-4 py-2.5 text-xs shadow-xl flex items-center justify-between gap-3.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={14} />
                                </div>
                                <div className="truncate">
                                    <span className="font-bold text-amber-200">Slow cellular network.</span>
                                    <span className="hidden sm:inline text-stone-400 ml-1.5">
                                        High latency detected; requests may take a moment.
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDismissedDegraded(true)}
                                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition cursor-pointer shrink-0"
                                aria-label="Dismiss alert"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
