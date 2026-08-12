import React from 'react';
import { Link } from '@inertiajs/react';
import { ShoppingBag, RefreshCcw, Star, MessageSquare, AlertCircle, ArrowUpRight } from 'lucide-react';
import { ActionCard, MobileToolTile } from './WorkspaceCards';

export default function WorkspaceTools({ stats = [], cards = [], theme }) {
    const getStatIcon = (label) => {
        const lower = label.toLowerCase();
        if (lower.includes('attention') || lower.includes('order')) return ShoppingBag;
        if (lower.includes('return')) return RefreshCcw;
        if (lower.includes('reply') || lower.includes('review')) return Star;
        if (lower.includes('message') || lower.includes('team')) return MessageSquare;
        return AlertCircle;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    {stats.map((stat) => {
                        const numericVal = Number(stat.value || 0);
                        const hasValue = numericVal > 0;
                        const Icon = getStatIcon(stat.label);

                        const targetHref = stat.routeName && route().has(stat.routeName) ? route(stat.routeName) : null;
                        const Component = targetHref ? Link : 'div';

                        return (
                            <Component
                                key={stat.label}
                                href={targetHref}
                                className={`group relative flex flex-col justify-between p-4 rounded-2xl border border-stone-200/80 bg-white shadow-2xs transition-all duration-200 hover:border-stone-300 hover:shadow-sm ${targetHref ? 'cursor-pointer' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-stone-50 border border-stone-200/80 text-stone-600">
                                        <Icon size={14} />
                                    </div>
                                    
                                    {hasValue && (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clay-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-clay-600"></span>
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 flex items-end justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                            {stat.label}
                                        </p>
                                        <p className="mt-0.5 text-xl font-mono font-bold text-stone-900">
                                            {stat.value}
                                        </p>
                                    </div>

                                    {targetHref && (
                                        <ArrowUpRight size={14} className="text-stone-400 group-hover:text-stone-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 mb-1" />
                                    )}
                                </div>
                            </Component>
                        );
                    })}
                </div>
            )}

            {/* Desktop Grid Layout */}
            <div className="hidden lg:grid gap-4 lg:grid-cols-2">
                {cards.map((card) => (
                    <ActionCard key={`${card.module}-${card.routeName}`} card={card} theme={theme} />
                ))}
            </div>

            {/* Mobile Grid Layout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 lg:hidden">
                {cards.map((card) => (
                    <MobileToolTile key={`${card.module}-${card.routeName}`} card={card} theme={theme} />
                ))}
            </div>
        </div>
    );
}
