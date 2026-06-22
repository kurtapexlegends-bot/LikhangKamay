import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function CategoryGroup({ title, open, onToggle, children, isCollapsed }) {
    if (isCollapsed) {
        return (
            <div className="space-y-0.5 pt-1.5 border-t border-clay-100/10 first:border-t-0 mt-1.5 first:mt-0">
                {children}
            </div>
        );
    }

    return (
        <div className="mt-3 first:mt-1">
            <motion.button
                type="button"
                onClick={onToggle}
                whileTap={{ scale: 0.98, x: 1 }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 transition-all hover:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
            >
                <span>{title}</span>
                <ChevronRight
                    size={13}
                    className={`transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
                />
            </motion.button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden space-y-0.5 pt-0.5"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
