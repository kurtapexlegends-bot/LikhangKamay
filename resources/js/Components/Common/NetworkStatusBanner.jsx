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
                    initial={{ y: -48, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -48, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="fixed top-0 left-0 right-0 z-50 pointer-events-auto"
                    role="alert"
                    aria-live="assertive"
                >
                    {/* Offline Banner */}
                    {showOffline && (
                        <div className="bg-stone-900 text-stone-100 border-b border-stone-800 px-4 py-2 text-xs shadow-md">
                            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                                        <WifiOff size={14} />
                                    </div>
                                    <div className="truncate">
                                        <span className="font-bold text-stone-200">You are offline.</span>
                                        <span className="hidden sm:inline text-stone-400 ml-1.5">
                                            Actions and data sync are temporarily paused until connection returns.
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleManualRetry}
                                    disabled={retrying}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold text-white bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border border-stone-700/80 transition shrink-0 disabled:opacity-50"
                                >
                                    <RefreshCw size={11} className={retrying ? 'animate-spin' : ''} />
                                    <span>{retrying ? 'Checking...' : 'Check Connection'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Connection Restored Flash */}
                    {showRestored && (
                        <div className="bg-emerald-900 text-emerald-100 border-b border-emerald-800 px-4 py-2 text-xs shadow-md">
                            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                                        <Wifi size={14} />
                                    </div>
                                    <div>
                                        <span className="font-bold text-white">Back online.</span>
                                        <span className="text-emerald-200 ml-1.5">
                                            Connection restored and data sync is active.
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={clearWasOffline}
                                    className="text-emerald-300 hover:text-white p-1 rounded-md transition"
                                    aria-label="Dismiss banner"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Degraded Connection Banner */}
                    {showDegraded && (
                        <div className="bg-stone-900 text-stone-200 border-b border-amber-600/40 px-4 py-2 text-xs shadow-md">
                            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                        <AlertTriangle size={14} />
                                    </div>
                                    <div className="truncate">
                                        <span className="font-bold text-amber-200">Slow cellular network.</span>
                                        <span className="hidden sm:inline text-stone-400 ml-1.5">
                                            High latency detected; requests may take a moment to respond.
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDismissedDegraded(true)}
                                    className="text-stone-400 hover:text-white p-1 rounded-md transition"
                                    aria-label="Dismiss alert"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
