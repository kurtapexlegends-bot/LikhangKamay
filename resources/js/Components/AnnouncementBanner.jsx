import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Megaphone, Info, AlertTriangle, AlertCircle, CheckCircle, Gift, Star, Zap, Sparkles, Tag, ShoppingBag } from 'lucide-react';
import { router, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';

function buildDismissalKey(announcement) {
    return `announcement_${announcement.id}_v${announcement.broadcast_version ?? 0}`;
}

const AVAILABLE_ICONS = {
    'megaphone': Megaphone,
    'gift': Gift,
    'star': Star,
    'zap': Zap,
    'sparkles': Sparkles,
    'tag': Tag,
    'shopping-bag': ShoppingBag,
    'info': Info,
    'alert-triangle': AlertTriangle,
};

const TYPE_CONFIG = {
    info:    { wrapper: 'bg-white/85 backdrop-blur-xl border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)]', text: 'text-stone-900', subText: 'text-stone-500', badge: 'bg-clay-100 text-clay-600 border-clay-200 shadow-sm', progress: 'bg-clay-400', close: 'text-stone-400 hover:bg-stone-100 hover:text-stone-900', icon: Info },
    warning: { wrapper: 'bg-white/90 backdrop-blur-xl border-amber-200/60 shadow-[0_8px_30px_rgb(245,158,11,0.15)] ring-1 ring-amber-500/10', text: 'text-amber-950', subText: 'text-amber-800', badge: 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md border-amber-300', progress: 'bg-amber-500', close: 'text-amber-700 hover:bg-amber-100 hover:text-amber-900', icon: AlertTriangle },
    danger:  { wrapper: 'bg-white/90 backdrop-blur-xl border-red-200/60 shadow-[0_8px_30px_rgb(239,68,68,0.15)] ring-1 ring-red-500/10', text: 'text-red-950', subText: 'text-red-800', badge: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md border-red-400', progress: 'bg-red-500', close: 'text-amber-700 hover:bg-red-100 hover:text-red-900', icon: AlertCircle },
    success: { wrapper: 'bg-white/90 backdrop-blur-xl border-emerald-200/60 shadow-[0_8px_30px_rgb(16,185,129,0.15)] ring-1 ring-emerald-500/10', text: 'text-emerald-950', subText: 'text-emerald-800', badge: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md border-emerald-400', progress: 'bg-emerald-500', close: 'text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900', icon: CheckCircle },
};

export default function AnnouncementBanner({ announcement }) {
    const [isVisible, setIsVisible] = useState(false);
    const [progress, setProgress] = useState(100);
    const pollRef = useRef(null);
    const timerRef = useRef(null);
    const frameRef = useRef(null);
    const startTimeRef = useRef(null);

    // Auto-poll for new announcements every 30s
    useEffect(() => {
        pollRef.current = setInterval(() => {
            router.reload({ only: ['globalAnnouncement'], preserveState: true, preserveScroll: true });
        }, 30000);
        return () => clearInterval(pollRef.current);
    }, []);

    const buildKey = useCallback((ann) => {
        return `announcement_${ann.id}_v${ann.broadcast_version || 0}`;
    }, []);

    const dismiss = useCallback(() => {
        setIsVisible(false);
        if (announcement) {
            sessionStorage.setItem(buildKey(announcement), 'dismissed');
        }
        cancelAnimationFrame(frameRef.current);
        clearTimeout(timerRef.current);
    }, [announcement, buildKey]);

    useEffect(() => {
        cancelAnimationFrame(frameRef.current);
        clearTimeout(timerRef.current);
        setProgress(100);

        if (!announcement) {
            setIsVisible(false);
            return;
        }

        const currentKey = buildKey(announcement);
        const isDismissed = sessionStorage.getItem(currentKey) === 'dismissed';

        if (isDismissed) {
            setIsVisible(false);
            return;
        }

        setIsVisible(true);

        const duration = announcement.display_duration;
        if (!duration || duration <= 0) return;

        const durationMs = duration * 1000;
        startTimeRef.current = performance.now();

        const tick = (now) => {
            const elapsed = now - startTimeRef.current;
            const remaining = Math.max(0, 1 - elapsed / durationMs);
            setProgress(remaining * 100);

            if (remaining > 0) {
                frameRef.current = requestAnimationFrame(tick);
            }
        };
        frameRef.current = requestAnimationFrame(tick);

        timerRef.current = setTimeout(dismiss, durationMs);

        return () => {
            cancelAnimationFrame(frameRef.current);
            clearTimeout(timerRef.current);
        };
    }, [announcement, dismiss, buildKey]);

    const isCustom = announcement?.type === 'custom';
    const config = isCustom ? TYPE_CONFIG.info : (TYPE_CONFIG[announcement?.type] || TYPE_CONFIG.info);
    
    // Determine Icon
    let Icon = config.icon;
    if (isCustom && announcement?.icon_name && AVAILABLE_ICONS[announcement.icon_name]) {
        Icon = AVAILABLE_ICONS[announcement.icon_name];
    }

    // Determine Custom Styles
    const customWrapperStyle = isCustom && announcement?.bg_color ? { backgroundColor: announcement.bg_color, color: announcement.text_color || '#ffffff' } : {};
    const customIconStyle = isCustom && announcement?.bg_color ? { backgroundColor: 'rgba(255,255,255,0.2)', color: announcement.text_color || '#ffffff' } : {};
    
    // Resolve Classes
    const wrapperClass = isCustom && announcement?.bg_color ? 'border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.15)]' : config.wrapper;
    const textClass = isCustom && announcement?.bg_color ? '' : config.text;
    const subTextClass = isCustom && announcement?.bg_color ? 'opacity-80' : config.subText;
    const closeClass = isCustom && announcement?.bg_color ? 'hover:bg-white/20 opacity-80 hover:opacity-100' : config.close;
    const hasTimer = announcement?.display_duration > 0;

    return (
        <AnimatePresence mode="wait">
            {announcement && isVisible && (
                <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-3xl pointer-events-none">
                    <motion.div 
                        key={buildKey(announcement)}
                        initial={{ y: -50, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                        transition={{ 
                            type: "spring",
                            damping: 25,
                            stiffness: 300,
                            mass: 0.8
                        }}
                        className="pointer-events-auto"
                    >
                        <div 
                            className={`relative overflow-hidden rounded-full border p-1.5 pr-2.5 sm:pr-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 transition-all ${wrapperClass}`}
                            style={customWrapperStyle}
                        >
                            {/* Left: Beautiful Circular Badge */}
                            <motion.div 
                                initial={{ rotate: -15, scale: 0.8 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 border ${isCustom ? '' : config.badge}`}
                                style={customIconStyle}
                            >
                                <Icon size={18} className="sm:w-5 sm:h-5" />
                            </motion.div>

                        {/* Middle: Content */}
                        <div className="flex-1 min-w-0 text-center sm:text-left py-1 sm:py-0">
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 mb-0.5">
                                <strong className={`text-[13px] sm:text-sm font-bold tracking-tight truncate ${textClass}`}>
                                    {announcement.title}
                                </strong>
                                <span className={`hidden sm:inline text-xs shrink-0 ${subTextClass}`}>&bull;</span>
                                <span className={`text-[12px] sm:text-[13px] font-medium truncate max-w-[500px] ${subTextClass}`}>
                                    {announcement.message}
                                </span>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            {/* Optional Call to Action Button */}
                            {announcement.action_url && announcement.action_text && (
                                <Link 
                                    href={announcement.action_url}
                                    className={`hidden sm:flex px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm ${isCustom ? 'bg-white/20 hover:bg-white/30' : 'bg-stone-900 text-white hover:bg-stone-800'}`}
                                    style={isCustom && announcement.text_color ? { color: announcement.text_color, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 } : {}}
                                >
                                    {announcement.action_text}
                                </Link>
                            )}

                            {/* Subtle Dismiss Button */}
                            <button 
                                onClick={dismiss}
                                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 ${closeClass}`}
                                aria-label="Dismiss announcement"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Ultra-subtle Progress Bar at bottom of pill */}
                        {hasTimer && (
                            <div className="absolute bottom-0 left-0 w-full h-[2px] opacity-30 origin-left pointer-events-none">
                                <motion.div 
                                    initial={{ scaleX: 1 }}
                                    animate={{ scaleX: progress / 100 }}
                                    transition={{ ease: "linear" }}
                                    className={`h-full origin-left ${isCustom ? 'bg-white' : config.progress}`} 
                                />
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
            )}
        </AnimatePresence>
    );
}