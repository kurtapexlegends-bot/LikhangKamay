import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const ActionTooltip = ({ text, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    return (
        <div className="relative inline-flex items-center justify-center" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: -8, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute bottom-full left-0 right-0 flex justify-center z-50 pointer-events-none"
                    >
                        <div className="flex flex-col items-center mb-2">
                            <div className="bg-white/95 backdrop-blur-xl border border-clay-200/60 px-3 py-1.5 rounded-xl shadow-xl shadow-clay-900/5">
                                <span className="text-[9px] font-bold tracking-widest text-clay-700 uppercase whitespace-nowrap">{text}</span>
                            </div>
                            <div className="w-2 h-2 bg-white/95 border-b border-r border-clay-200/60 rotate-45 -mt-1 shadow-sm" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {children}
        </div>
    );
};

export default function BulkActionPill({ selectedCount, onClear, children }) {
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolling(true);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => setIsScrolling(false), 300);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, []);

    return (
        <AnimatePresence>
            {selectedCount > 0 && (
                <motion.div 
                    initial={{ y: 100, x: '-50%', opacity: 0, scale: 0.9 }}
                    animate={{ 
                        y: 0, 
                        x: '-50%', 
                        opacity: isScrolling ? 0.6 : 1, 
                        scale: isScrolling ? 0.98 : 1
                    }}
                    exit={{ y: 100, x: '-50%', opacity: 0, scale: 0.9 }}
                    transition={{ 
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                        opacity: { duration: 0.2 }
                    }}
                    className="fixed bottom-8 left-1/2 z-50 pointer-events-none"
                >
                    <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-white/80 backdrop-blur-2xl px-4 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-clay-200/50 ring-1 ring-black/5">
                        <div className="flex items-center gap-2.5 pr-3 border-r border-clay-100">
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-clay-50 text-[10px] font-bold text-clay-600 px-1.5 border border-clay-100"
                            >
                                {selectedCount}
                            </motion.div>
                            <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">Selected</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {children}
                        </div>

                        <ActionTooltip text="Clear selection">
                            <button
                                onClick={onClear}
                                className="ml-1 rounded-full p-1.5 text-stone-400 hover:bg-clay-50 hover:text-clay-600 transition-all active:scale-90"
                            >
                                <X size={14} />
                            </button>
                        </ActionTooltip>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}