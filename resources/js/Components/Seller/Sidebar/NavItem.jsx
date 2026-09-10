import React, { memo, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';

function NavItem({ href, icon: Icon, active, children, compact, onClick, isCollapsed, onMouseEnter, onMouseLeave, badge }) {
    const itemRef = useRef(null);

    useEffect(() => {
        if (active && itemRef.current) {
            // Smoothly scroll the sidebar to show the active item
            itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [active]);

    const numBadge = Number(badge);
    const hasBadge = !isNaN(numBadge) ? numBadge > 0 : Boolean(badge);
    const badgeDisplay = !isNaN(numBadge) && numBadge > 99 ? '99+' : badge;

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
                title={isCollapsed && typeof children === 'string' ? (hasBadge ? `${children} (${badgeDisplay})` : children) : undefined}
            >
                <div className="relative flex items-center justify-center shrink-0 w-5 h-5">
                    <Icon size={compact ? 16 : 18} strokeWidth={2.5} className={active ? 'text-white' : 'text-gray-400 group-hover:text-clay-600'} />
                    {isCollapsed && hasBadge && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-clay-500 ring-2 ring-white" />
                        </span>
                    )}
                </div>
                <span className={`overflow-hidden transition-[max-width,opacity,margin-left] duration-200 flex items-center whitespace-nowrap ${
                    isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-xs opacity-100 ml-3 flex-1 justify-between'
                }`}>
                    <span>{children}</span>
                    {hasBadge && (
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md leading-none transition-colors ml-2 ${
                            badgeDisplay === 'Elite'
                                ? (active ? 'bg-white text-violet-700' : 'bg-violet-100 text-violet-700 group-hover:bg-violet-200')
                                : (active ? 'bg-white text-clay-700' : 'bg-clay-100 text-clay-700 group-hover:bg-clay-200')
                        }`}>
                            {badgeDisplay}
                        </span>
                    )}
                </span>
            </Link>
        </div>
    );
}

export default memo(NavItem);
