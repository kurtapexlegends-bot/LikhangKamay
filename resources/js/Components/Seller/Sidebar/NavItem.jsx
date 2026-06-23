import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@inertiajs/react';

const MotionLink = motion(Link);

function NavItem({ href, icon: Icon, active, children, compact, onClick, isCollapsed, onMouseEnter, onMouseLeave }) {
    return (
        <div 
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="w-full"
        >
            <MotionLink
                href={href}
                prefetch="hover"
                preserveScroll
                onClick={onClick}
                whileTap={{ scale: 0.98 }}
                className={`group relative flex items-center rounded-lg text-xs font-bold transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 px-4 ${
                    compact ? 'py-2' : 'py-2.5'
                } ${active ? 'bg-clay-600 text-white shadow-[0_4px_12px_rgba(182,107,76,0.25)]' : 'text-gray-500 hover:bg-clay-50 hover:text-clay-700'}`}
            >
                <div className="flex items-center justify-center shrink-0 w-5 h-5">
                    <Icon size={compact ? 16 : 18} strokeWidth={2.5} className={active ? 'text-white' : 'text-gray-400 group-hover:text-clay-600'} />
                </div>
                <span className={`overflow-hidden transition-[max-width,opacity,margin-left] duration-300 flex items-center whitespace-nowrap ${
                    isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'
                }`}>
                    {children}
                </span>
            </MotionLink>
        </div>
    );
}

export default memo(NavItem);
