import React from 'react';
import { Store, Globe, Banknote, Smartphone } from 'lucide-react';
import { formatShortMoney } from '@/utils/accountingFormatters';

const CHANNEL_ORDER = [
    { key: 'all', icon: Banknote },
    { key: 'online_gcash', icon: Globe },
    { key: 'online_maya', icon: Globe },
    { key: 'online_cod', icon: Globe },
    { key: 'pos_cash', icon: Store },
    { key: 'pos_gcash', icon: Smartphone },
    { key: 'pos_maya', icon: Smartphone },
];

export default function SalesChannelBreakdown({
    channelBreakdown = {},
    activeChannel = 'all',
    onSelectChannel,
}) {
    if (!channelBreakdown || Object.keys(channelBreakdown).length === 0) {
        return null;
    }

    const onlineTotal = channelBreakdown.online_all || { count: 0, net: 0 };
    const posTotal = channelBreakdown.pos_all || { count: 0, net: 0 };

    return (
        <section className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-stone-800">
                        Sales Channel Audit Breakdown
                    </h2>
                    <p className="text-[11px] font-medium text-stone-500">
                        Completed sales split by payment channel
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <button
                        type="button"
                        onClick={() => onSelectChannel('online_all')}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
                            activeChannel === 'online_all'
                                ? 'bg-stone-900 border-stone-900 text-white'
                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                    >
                        <Globe size={12} />
                        <span>System Online: {formatShortMoney(onlineTotal.net)} ({onlineTotal.count})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelectChannel('pos_all')}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
                            activeChannel === 'pos_all'
                                ? 'bg-clay-700 border-clay-700 text-white'
                                : 'bg-clay-50 border-clay-200 text-clay-800 hover:bg-clay-100'
                        }`}
                    >
                        <Store size={12} />
                        <span>Walk-In POS: {formatShortMoney(posTotal.net)} ({posTotal.count})</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {CHANNEL_ORDER.map(({ key, icon: Icon }) => {
                    const entry = channelBreakdown[key] || { label: key, count: 0, net: 0 };
                    const isActive = activeChannel === key;

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onSelectChannel(key)}
                            className={`text-left rounded-xl border p-2.5 transition-all cursor-pointer ${
                                isActive
                                    ? 'bg-clay-50 border-clay-500 ring-1 ring-clay-500'
                                    : 'bg-stone-50/70 border-stone-200/80 hover:border-stone-300 hover:bg-white'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                <span className="truncate">{entry.label}</span>
                                <Icon size={12} className={isActive ? 'text-clay-700 shrink-0' : 'text-stone-400 shrink-0'} />
                            </div>
                            <p className="mt-1 text-sm font-extrabold text-stone-900 truncate">
                                {formatShortMoney(entry.net)}
                            </p>
                            <p className="text-[10px] font-medium text-stone-500">
                                {entry.count} {entry.count === 1 ? 'order' : 'orders'}
                            </p>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
