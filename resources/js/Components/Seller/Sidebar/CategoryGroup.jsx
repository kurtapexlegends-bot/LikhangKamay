import React, { memo } from 'react';
import { ChevronRight } from 'lucide-react';

function CategoryGroup({ title, open, onToggle, children, isCollapsed }) {
    return (
        <div className={`transition-[margin,padding,border-color] duration-200 ${
            isCollapsed 
                ? 'mt-1.5 pt-1.5 border-t border-clay-100/10 first:border-t-0 mt-1.5 first:mt-0' 
                : 'mt-3 first:mt-1 border-t-0 pt-0'
        }`}>
            <div className={`overflow-hidden transition-[max-height,opacity] duration-200 ${
                isCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-10 opacity-100'
            }`}>
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-600 transition-colors hover:text-stone-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
                >
                    <span>{title}</span>
                    <ChevronRight
                        size={13}
                        className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                    />
                </button>
            </div>
            <div 
                className={`overflow-hidden space-y-0.5 pt-0.5 transition-all duration-200 ease-in-out ${
                    (isCollapsed || open) ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                {children}
            </div>
        </div>
    );
}

export default memo(CategoryGroup);
