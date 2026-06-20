import React from 'react';
import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    Briefcase,
    Calculator,
    ClipboardList,
    MessageSquareText,
    PackageSearch,
    ShieldCheck,
    Users,
} from 'lucide-react';

export const themeConfig = {
    clay: {
        banner: 'bg-stone-950 border border-stone-850',
        bannerIconRing: 'bg-clay-500/20 text-clay-400 ring-1 ring-clay-500/30',
        bannerEyebrow: 'text-clay-400',
        bannerTitle: 'text-white',
        bannerSubtitle: 'text-stone-400',
        cardGlow: 'group-hover:border-clay-300/80',
        statBorder: 'border-clay-100/60',
        statValue: 'text-clay-800',
        statBg: 'bg-[#FCF7F2]',
        icon: Users,
    },
    emerald: {
        banner: 'bg-[#0f1a14] border border-[#16271e]',
        bannerIconRing: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30',
        bannerEyebrow: 'text-emerald-400',
        bannerTitle: 'text-white',
        bannerSubtitle: 'text-emerald-100/50',
        cardGlow: 'group-hover:border-emerald-300/80',
        statBorder: 'border-emerald-100/60',
        statValue: 'text-emerald-800',
        statBg: 'bg-emerald-50/50',
        icon: Calculator,
    },
    amber: {
        banner: 'bg-[#1f130b] border border-[#2b1b10]',
        bannerIconRing: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30',
        bannerEyebrow: 'text-amber-500',
        bannerTitle: 'text-white',
        bannerSubtitle: 'text-amber-100/50',
        cardGlow: 'group-hover:border-amber-300/80',
        statBorder: 'border-amber-100/60',
        statValue: 'text-amber-800',
        statBg: 'bg-amber-50/50',
        icon: PackageSearch,
    },
    sky: {
        banner: 'bg-[#0c161f] border border-[#132230]',
        bannerIconRing: 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30',
        bannerEyebrow: 'text-sky-400',
        bannerTitle: 'text-white',
        bannerSubtitle: 'text-sky-100/50',
        cardGlow: 'group-hover:border-sky-300/80',
        statBorder: 'border-sky-100/60',
        statValue: 'text-sky-800',
        statBg: 'bg-sky-50/50',
        icon: MessageSquareText,
    },
};

const toneChipMap = {
    clay: 'bg-[#FCF7F2] text-clay-700 border-[#E7D8C9]',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-stone-50 text-stone-700 border-stone-200',
    red: 'bg-red-50 text-red-700 border-red-200',
};

const iconBoxToneMap = {
    clay: 'bg-[#FCF7F2] text-clay-700 border-[#E7D8C9]/70 ring-[#FCF7F2]/45',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 ring-emerald-50/60',
    amber: 'bg-amber-50/80 text-amber-700 border-amber-200/60 ring-amber-50/60',
    sky: 'bg-sky-50/80 text-sky-700 border-sky-200/60 ring-sky-50/60',
    violet: 'bg-violet-50/80 text-violet-700 border-violet-200/60 ring-violet-50/60',
    indigo: 'bg-indigo-50/80 text-indigo-700 border-indigo-200/60 ring-indigo-50/60',
    rose: 'bg-rose-50/80 text-rose-700 border-rose-200/60 ring-rose-50/60',
    slate: 'bg-stone-50 text-stone-700 border-stone-200/80 ring-stone-50/60',
    red: 'bg-red-50/80 text-red-700 border-red-200/60 ring-red-50/60',
};

const hoverTextToneMap = {
    clay: 'group-hover:text-clay-600',
    emerald: 'group-hover:text-emerald-600',
    amber: 'group-hover:text-amber-600',
    sky: 'group-hover:text-sky-600',
    violet: 'group-hover:text-violet-600',
    indigo: 'group-hover:text-indigo-600',
    rose: 'group-hover:text-rose-600',
    slate: 'group-hover:text-stone-750',
    red: 'group-hover:text-red-600',
};

const hoverArrowToneMap = {
    clay: 'text-clay-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
    violet: 'text-violet-600',
    indigo: 'text-indigo-600',
    rose: 'text-rose-600',
    slate: 'text-stone-600',
    red: 'text-red-650',
};

const urgentBadgeToneMap = {
    clay: 'bg-clay-600 text-white border-clay-700/20 shadow-sm shadow-clay-600/10',
    emerald: 'bg-emerald-650 text-white border-emerald-700/20 shadow-sm shadow-emerald-600/10',
    amber: 'bg-amber-600 text-white border-amber-700/20 shadow-sm shadow-amber-600/10',
    sky: 'bg-sky-600 text-white border-sky-700/20 shadow-sm shadow-sky-600/10',
    violet: 'bg-violet-600 text-white border-violet-700/20 shadow-sm shadow-violet-600/10',
    indigo: 'bg-indigo-650 text-white border-indigo-750/20 shadow-sm shadow-indigo-600/10',
    rose: 'bg-rose-600 text-white border-rose-700/20 shadow-sm shadow-rose-600/10',
    slate: 'bg-stone-700 text-white border-stone-800/20 shadow-sm shadow-stone-700/10',
    red: 'bg-red-600 text-white border-red-700/20 shadow-sm shadow-red-600/10',
};

const urgentInnerToneMap = {
    clay: 'bg-white text-clay-700',
    emerald: 'bg-white text-emerald-700',
    amber: 'bg-white text-amber-700',
    sky: 'bg-white text-sky-700',
    violet: 'bg-white text-violet-700',
    indigo: 'bg-white text-indigo-700',
    rose: 'bg-white text-rose-700',
    slate: 'bg-white text-stone-700',
    red: 'bg-white text-red-755',
};

const cardIconMap = {
    hr: Users,
    accounting: Calculator,
    procurement: PackageSearch,
    stock_requests: ClipboardList,
    orders: Briefcase,
    reviews: ShieldCheck,
    products: PackageSearch,
    analytics: Briefcase,
    team_messages: MessageSquareText,
};

const capabilityMap = {
    hr: ['employees', 'payroll'],
    accounting: ['approvals', 'releases'],
    procurement: ['inventory', 'supplies'],
    stock_requests: ['receiving', 'stock flow'],
    orders: ['fulfillment', 'returns'],
    reviews: ['customer replies'],
    products: ['listings', 'stock limits'],
    analytics: ['revenue view'],
    team_messages: ['internal chat'],
};

export function StatCard({ stat, theme }) {
    return (
        <div className={`rounded-2xl border bg-white px-5 py-4 transition-all duration-300 hover:shadow-md ${theme.statBorder} ${theme.statBg || 'bg-stone-50/40'}`}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">
                {stat.label}
            </p>
            <p className={`mt-1.5 text-xl font-bold tracking-tight ${theme.statValue}`}>
                {stat.value}
            </p>
        </div>
    );
}

export function ActionCard({ card, theme }) {
    const Icon = cardIconMap[card.module] || Briefcase;
    const capabilities = capabilityMap[card.module] || [];

    const isUrgent = (
        card.module === 'accounting' ||
        card.module === 'orders' ||
        card.module === 'reviews' ||
        card.module === 'products' ||
        card.module === 'analytics' ||
        card.module === 'team_messages'
    ) && card.metricValue > 0;

    const iconBoxTone = iconBoxToneMap[card.tone] || iconBoxToneMap.slate;
    const hoverTextTone = hoverTextToneMap[card.tone] || hoverTextToneMap.slate;
    const hoverArrowTone = hoverArrowToneMap[card.tone] || hoverArrowToneMap.slate;
    const urgentBadgeTone = urgentBadgeToneMap[card.tone] || urgentBadgeToneMap.slate;
    const urgentInnerTone = urgentInnerToneMap[card.tone] || urgentInnerToneMap.slate;

    return (
        <Link
            href={route(card.routeName)}
            className={`group flex h-full flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] ${theme.cardGlow || 'hover:border-stone-300'}`}
        >
            <div className="space-y-3.5">
                {/* Top Row: Icon + Title (Left) and High-contrast Metric Badge (Right) */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ring-4 ring-stone-50/30 transition duration-300 group-hover:scale-105 shadow-sm group-hover:shadow-md ${iconBoxTone}`}>
                            <Icon size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className={`text-sm font-bold text-stone-900 transition-colors duration-300 flex items-center gap-1.5 ${hoverTextTone}`}>
                                {card.title}
                                <ArrowRight size={12} className={`opacity-0 -translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ${hoverArrowTone}`} />
                            </h3>
                        </div>
                    </div>

                    {/* Unified Metric Indicator Badge */}
                    <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-1 py-1 text-[8.5px] font-bold uppercase tracking-wider border transition-all duration-300 ${
                        isUrgent
                            ? urgentBadgeTone
                            : 'bg-stone-50/80 border-stone-200/70 text-stone-500'
                    }`}>
                        {isUrgent && (
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                            </span>
                        )}
                        <span>{card.metricLabel}</span>
                        <span className={`inline-flex items-center justify-center h-4.5 min-w-[18px] rounded-full text-[9px] font-black px-1.5 ${
                            isUrgent
                                ? urgentInnerTone
                                : 'bg-stone-200 text-stone-700'
                        }`}>
                            {card.metricValue}
                        </span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-xs font-medium leading-relaxed text-stone-500">
                    {card.description}
                </p>
            </div>

            {/* Bottom Row: Capabilities as Footer Tags */}
            {capabilities.length > 0 && (
                <div className="mt-4.5 flex flex-wrap gap-1.5 border-t border-stone-100/70 pt-3">
                    {capabilities.map((cap) => (
                        <span
                            key={cap}
                            className="inline-flex items-center rounded-lg bg-stone-50 border border-stone-200/50 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-stone-500 transition-colors duration-300 group-hover:bg-stone-100/50 group-hover:text-stone-700"
                        >
                            {cap}
                        </span>
                    ))}
                </div>
            )}
        </Link>
    );
}

export function MobileToolTile({ card, theme }) {
    const Icon = cardIconMap[card.module] || Briefcase;
    const isUrgent = (
        card.module === 'accounting' ||
        card.module === 'orders' ||
        card.module === 'reviews' ||
        card.module === 'products' ||
        card.module === 'analytics' ||
        card.module === 'team_messages'
    ) && card.metricValue > 0;

    const iconBoxTone = iconBoxToneMap[card.tone] || iconBoxToneMap.slate;
    const hoverTextTone = hoverTextToneMap[card.tone] || hoverTextToneMap.slate;
    const urgentBadgeTone = urgentBadgeToneMap[card.tone] || urgentBadgeToneMap.slate;

    return (
        <Link
            href={route(card.routeName)}
            className={`group relative flex flex-col items-center justify-between rounded-2xl border border-stone-200/90 bg-white p-4 text-center shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-md active:scale-[0.97] min-h-[148px] ${theme.cardGlow || 'hover:border-stone-300'}`}
        >
            {/* Top-right urgent indicator badge */}
            {isUrgent && (
                <span className={`absolute top-2.5 right-2.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 text-[8.5px] font-black text-white shadow-sm ${urgentBadgeTone}`}>
                    {card.metricValue}
                </span>
            )}

            {/* Icon and Title Container */}
            <div className="flex flex-col items-center justify-center flex-1 w-full">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ring-4 ring-stone-50/20 transition-all duration-300 group-hover:scale-105 ${iconBoxTone}`}>
                    <Icon size={16} strokeWidth={2.5} className="transition duration-300" />
                </div>
                
                <h4 className={`mt-2 text-[10.5px] font-bold text-stone-900 transition-colors duration-300 line-clamp-2 px-0.5 leading-snug ${hoverTextTone}`}>
                    {card.title}
                </h4>
            </div>

            {/* Bottom Metric Container */}
            <div className="mt-2.5 w-full border-t border-stone-100/60 pt-2 flex flex-col items-center justify-center">
                <p className="text-[7.5px] font-extrabold uppercase tracking-[0.16em] text-stone-400 truncate max-w-full">
                    {card.metricLabel}
                </p>
                <p className={`text-[10.5px] font-black mt-0.5 transition-colors duration-300 ${isUrgent ? 'text-clay-600' : 'text-stone-700'}`}>
                    {card.metricValue}
                </p>
            </div>
        </Link>
    );
}
