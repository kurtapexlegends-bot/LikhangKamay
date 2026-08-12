import React from 'react';
import { Link } from '@inertiajs/react';
import { ShoppingBag, RefreshCcw, Star, MessageSquare, AlertCircle, ArrowUpRight } from 'lucide-react';
import { ActionCard, MobileToolTile } from './WorkspaceCards';

export default function WorkspaceTools({ stats = [], cards = [], theme }) {
    const getStatMeta = (label) => {
        const lower = label.toLowerCase();
        if (lower.includes('attention') || lower.includes('order')) {
            return { icon: ShoppingBag, color: 'text-amber-700 bg-amber-100/70 border-amber-200' };
        }
        if (lower.includes('return')) {
            return { icon: RefreshCcw, color: 'text-orange-700 bg-orange-100/70 border-orange-200' };
        }
        if (lower.includes('reply') || lower.includes('review')) {
            return { icon: Star, color: 'text-rose-700 bg-rose-100/70 border-rose-200' };
        }
        if (lower.includes('message') || lower.includes('team')) {
            return { icon: MessageSquare, color: 'text-emerald-700 bg-emerald-100/70 border-emerald-200' };
        }
        return { icon: AlertCircle, color: 'text-stone-700 bg-stone-100 border-stone-200' };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    {stats.map((stat) => {
                        const numericVal = Number(stat.value || 0);
                        const hasValue = numericVal > 0;
                        const meta = getStatMeta(stat.label);
                        const Icon = meta.icon;
                        
                        let cardBg = 'bg-white border-stone-200/80 shadow-2xs';
                        let valueColor = 'text-stone-400';
                        let badgeBg = 'bg-stone-100 text-stone-500 border-stone-200';
                        
                        if (hasValue) {
                            if (stat.label.toLowerCase().includes('attention')) {
                                cardBg = 'bg-gradient-to-br from-amber-50/90 to-amber-100/30 border-amber-300/80 shadow-sm';
                                valueColor = 'text-amber-950 font-black';
                                badgeBg = 'bg-amber-600 text-white border-amber-700';
                            } else if (stat.label.toLowerCase().includes('message') || stat.label.toLowerCase().includes('reply')) {
                                cardBg = 'bg-gradient-to-br from-emerald-50/90 to-emerald-100/30 border-emerald-300/80 shadow-sm';
                                valueColor = 'text-emerald-950 font-black';
                                badgeBg = 'bg-emerald-600 text-white border-emerald-700';
                            } else {
                                cardBg = 'bg-gradient-to-br from-stone-50 to-stone-100/40 border-stone-300/80 shadow-2xs';
                                valueColor = 'text-stone-900 font-black';
                                badgeBg = 'bg-stone-800 text-white border-stone-900';
                            }
                        }

                        const targetHref = stat.routeName && route().has(stat.routeName) ? route(stat.routeName) : null;
                        const Component = targetHref ? Link : 'div';

                        return (
                            <Component
                                key={stat.label}
                                href={targetHref}
                                className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${cardBg} ${targetHref ? 'cursor-pointer' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${meta.color} transition-transform group-hover:scale-105`}>
                                        <Icon size={15} />
                                    </div>
                                    
                                    {hasValue ? (
                                        <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${badgeBg}`}>
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                                            </span>
                                            Active
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">
                                            Clear
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 flex items-end justify-between">
                                    <div>
                                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 group-hover:text-stone-800 transition-colors">
                                            {stat.label}
                                        </p>
                                        <p className={`mt-0.5 text-2xl font-mono ${valueColor}`}>
                                            {stat.value}
                                        </p>
                                    </div>

                                    {targetHref && (
                                        <ArrowUpRight size={14} className="text-stone-400 group-hover:text-stone-800 transition-colors transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 mb-1" />
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
