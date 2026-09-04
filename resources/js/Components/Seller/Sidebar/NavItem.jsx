import React, { memo, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';

function NavItem({ href, icon: Icon, active, children, compact, onClick, isCollapsed, onMouseEnter, onMouseLeave }) {
    const itemRef = useRef(null);

    useEffect(() => {
        if (active && itemRef.current) {
            // Smoothly scroll the sidebar to show the active item
            itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [active]);

    return (
        <div 
            ref={itemRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="w-full"
        >
            <Link
                href={href}
                prefetch="hover"
                preserveScroll
                onClick={onClick}
                className={`group relative flex items-center rounded-lg text-xs font-bold transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${
                    isCollapsed ? 'justify-center px-2' : 'px-4'
                } ${
                    compact ? 'py-2' : 'py-2.5'
                } ${active ? 'bg-clay-600 text-white shadow-sm' : 'text-gray-600 hover:bg-clay-50 hover:text-clay-700 active:bg-clay-100'}`}
                title={isCollapsed && typeof children === 'string' ? children : undefined}
            >
                <div className="flex items-center justify-center shrink-0 w-5 h-5">
                    <Icon size={compact ? 16 : 18} strokeWidth={2.5} className={active ? 'text-white' : 'text-gray-400 group-hover:text-clay-600'} />
                </div>
                <span className={`overflow-hidden transition-[max-width,opacity,margin-left] duration-200 flex items-center whitespace-nowrap ${
                    isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'
                }`}>
                    {children}
                </span>
            </Link>
        </div>
    );
}

export default memo(NavItem);
