import React from 'react';
import { Link } from '@inertiajs/react';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items = [], className = '', showHome = false }) {
    if (!items || items.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 text-xs text-stone-500 ${className}`}>
            {showHome && (
                <>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1 hover:text-stone-900 transition-colors"
                        title="Home"
                    >
                        <Home size={13} className="text-stone-400" />
                        <span className="sr-only">Home</span>
                    </Link>
                    <ChevronRight size={12} className="text-stone-300 shrink-0" />
                </>
            )}

            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <React.Fragment key={index}>
                        {index > 0 && (
                            <ChevronRight size={12} className="text-stone-300 shrink-0" />
                        )}

                        {isLast || !item.href ? (
                            <span className="font-semibold text-stone-900 truncate max-w-[160px] sm:max-w-[220px]" title={item.label}>
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                href={item.href}
                                className="hover:text-stone-900 transition-colors font-medium text-stone-500 truncate max-w-[140px] sm:max-w-[180px]"
                                title={item.label}
                            >
                                {item.label}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
