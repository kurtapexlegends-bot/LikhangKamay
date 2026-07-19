import React from 'react';
import Skeleton from "@/Components/Skeleton";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const StatSkeleton = () => (
    <div className="flex items-start justify-between rounded-2xl border border-stone-200 bg-white p-5">
        <div className="space-y-3 w-full">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2 w-32 mt-2 opacity-60" />
        </div>
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
    </div>
);

export const RowSkeleton = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4">
            <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-16 opacity-60" />
                </div>
            </div>
        </td>
        <td className="px-6 py-4">
            <div className="flex justify-center">
                <Skeleton className="h-5 w-32 rounded-full" />
            </div>
        </td>
        <td className="px-6 py-4">
            <div className="flex justify-end">
                <Skeleton className="h-3 w-20" />
            </div>
        </td>
    </tr>
);

export const StatCard = ({ title, metric, prefix = "", icon: Icon, bg, text, subtitle }) => {
    const value = typeof metric === 'object' ? metric?.value : metric;
    const growth = typeof metric === 'object' ? metric?.growth : undefined;
    const trend = typeof metric === 'object' ? metric?.trend : undefined;

    const derivedTrend = trend || (growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral');

    return (
        <div className="flex items-start justify-between rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-300">
            <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    {title}
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-stone-900">
                    {prefix}{value !== undefined ? value.toLocaleString() : '0'}
                </h3>
                
                {growth !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${
                        derivedTrend === 'up' ? 'text-emerald-600' : 
                        derivedTrend === 'down' ? 'text-rose-600' : 'text-stone-400'
                    }`}>
                        {derivedTrend === 'up' && <TrendingUp size={12}/>}
                        {derivedTrend === 'down' && <TrendingDown size={12}/>}
                        {derivedTrend === 'neutral' && <Minus size={12}/>}
                        <span>{derivedTrend === 'up' ? '+' : ''}{growth}% vs last 30 days</span>
                    </div>
                )}
                {subtitle && (
                    <p className="text-[10px] font-medium text-stone-400 mt-1">{subtitle}</p>
                )}
                {!subtitle && growth === undefined && (
                    <p className="text-[10px] font-medium text-stone-400 mt-1">Real-time status</p>
                )}
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${text}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};
