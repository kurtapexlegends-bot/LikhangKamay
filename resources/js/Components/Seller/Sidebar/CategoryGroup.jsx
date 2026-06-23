import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

function CategoryGroup({ title, open, onToggle, children, isCollapsed }) {
    return (
        <div className={`transition-[margin,padding,border-color] duration-300 ${
            isCollapsed 
                ? 'mt-1.5 pt-1.5 border-t border-clay-100/10 first:border-t-0 mt-1.5 first:mt-0' 
                : 'mt-3 first:mt-1 border-t-0 pt-0'
        }`}>
            <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
                isCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-10 opacity-100'
            }`}>
                <motion.button
                    type="button"
                    onClick={onToggle}
                    whileTap={{ scale: 0.98, x: 1 }}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-600 transition-[color,box-shadow] hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
                >
                    <span>{title}</span>
                    <ChevronRight
                        size={13}
                        className={`transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
                    />
                </motion.button>
            </div>
            <motion.div 
                initial={false}
                animate={{ 
                    height: (isCollapsed || open) ? 'auto' : 0, 
                    opacity: (isCollapsed || open) ? 1 : 0 
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden space-y-0.5 pt-0.5"
            >
                {children}
            </motion.div>
        </div>
    );
}

export default memo(CategoryGroup, (prevProps, nextProps) => {
    return prevProps.title === nextProps.title &&
           prevProps.open === nextProps.open &&
           prevProps.isCollapsed === nextProps.isCollapsed;
});
