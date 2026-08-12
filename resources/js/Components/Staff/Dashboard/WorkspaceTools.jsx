import React from 'react';
import { Link } from '@inertiajs/react';
import { ActionCard, MobileToolTile } from './WorkspaceCards';

export default function WorkspaceTools({ stats = [], cards = [], theme }) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {stats.map((stat) => {
                        const hasValue = Number(stat.value || 0) > 0;
                        const isAttention = stat.label.toLowerCase().includes('attention');
                        const isMessages = stat.label.toLowerCase().includes('message');
                        const isReply = stat.label.toLowerCase().includes('reply');
                        
                        let cardBg = 'bg-white border-stone-200/80';
                        let valueColor = 'text-stone-850';
                        let dotColor = 'bg-stone-400';
                        
                        if (hasValue) {
                            if (isAttention) {
                                cardBg = 'bg-[#FCF7F2]/80 border-clay-200/50 hover:border-clay-300';
                                valueColor = 'text-clay-700';
                                dotColor = 'bg-clay-600';
                            } else if (isMessages || isReply) {
                                cardBg = 'bg-emerald-50/40 border-emerald-250/30 hover:border-emerald-300';
                                valueColor = 'text-emerald-800';
                                dotColor = 'bg-emerald-600';
                            } else {
                                cardBg = 'bg-stone-50/80 border-stone-300/40 hover:border-stone-400/60';
                                valueColor = 'text-stone-800';
                                dotColor = 'bg-stone-500';
                            }
                        } else {
                            valueColor = 'text-stone-400';
                        }

                        const targetHref = stat.routeName ? route(stat.routeName) : null;
                        const Component = targetHref ? Link : 'div';

                        return (
                            <Component
                                key={stat.label}
                                href={targetHref}
                                className={`group flex flex-col justify-between p-4 rounded-xl border transition-all duration-300 hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 ${cardBg} ${targetHref ? 'cursor-pointer' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400 group-hover:text-stone-700 transition-colors">
                                        {stat.label}
                                    </p>
                                    {hasValue && (
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}></span>
                                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`}></span>
                                        </span>
                                    )}
                                </div>
                                <p className={`mt-2.5 text-xl font-black tracking-tight ${valueColor}`}>
                                    {stat.value}
                                </p>
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
