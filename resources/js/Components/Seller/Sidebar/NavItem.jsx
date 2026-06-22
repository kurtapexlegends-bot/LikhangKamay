import React from 'react';
import { motion } from 'framer-motion';
import { Link } from '@inertiajs/react';

const MotionLink = motion(Link);

export default function NavItem({ href, icon: Icon, active, children, compact, onClick, isCollapsed, onMouseEnter, onMouseLeave }) {
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
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : `gap-3 px-4 ${compact ? 'py-2' : 'py-2.5'}`} rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${active ? 'bg-clay-600 text-white shadow-[0_4px_12px_rgba(182,107,76,0.25)]' : 'text-gray-500 hover:bg-clay-50 hover:text-clay-700'}`}
            >
                <Icon size={compact ? 16 : 18} strokeWidth={2.5} className={active ? 'text-white' : 'text-gray-400 group-hover:text-clay-600'} />
                {!isCollapsed && children}
            </MotionLink>
        </div>
    );
}
