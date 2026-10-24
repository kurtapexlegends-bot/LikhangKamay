import React from 'react';
import { Banknote, Clock, CheckCircle2, Building2, Pencil } from 'lucide-react';
import { formatShortMoney } from '@/utils/accountingFormatters';

export default function FundMetrics({ finances = {}, canEditAccounting, onEditBaseFunds }) {
    const readyForPayout = Number(finances.readyForPayout ?? 0);
    const ordersInProgress = Number(finances.ordersInProgress ?? 0);
    const payoutsReceived = Number(finances.payouts ?? 0);
    const operatingFunds = Number(finances.balance ?? 0);

    return (
        <div className="flex overflow-x-auto gap-4 pb-2.5 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            
            {/* 1. Ready for Payout */}
            <div className="w-[85vw] max-w-[280px] sm:w-auto shrink-0 snap-center h-full">
                <div className="relative w-full h-full rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all duration-200 flex flex-col justify-between min-h-[125px]">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider truncate">
                            Ready for Payout
                        </p>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-2xs border border-emerald-100/60">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="my-0.5">
                        <h3 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap">
                            {formatShortMoney(readyForPayout)}
                        </h3>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 pt-1 border-t border-stone-100 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="truncate">Available to transfer</span>
                    </p>
                </div>
            </div>

            {/* 2. Orders in Progress */}
            <div className="w-[85vw] max-w-[280px] sm:w-auto shrink-0 snap-center h-full">
                <div className="relative w-full h-full rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all duration-200 flex flex-col justify-between min-h-[125px]">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider truncate">
                            Orders in Progress
                        </p>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-2xs border border-amber-100/60">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="my-0.5">
                        <h3 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap">
                            {formatShortMoney(ordersInProgress)}
                        </h3>
                    </div>
                    <p className="text-[11px] text-stone-400 font-medium pt-1 border-t border-stone-100 truncate">
                        In crafting &amp; transit
                    </p>
                </div>
            </div>

            {/* 3. Payouts Received */}
            <div className="w-[85vw] max-w-[280px] sm:w-auto shrink-0 snap-center h-full">
                <div className="relative w-full h-full rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all duration-200 flex flex-col justify-between min-h-[125px]">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider truncate">
                            Payouts Received
                        </p>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-700 shadow-2xs border border-clay-100/60">
                            <Banknote size={16} />
                        </div>
                    </div>
                    <div className="my-0.5">
                        <h3 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap">
                            {formatShortMoney(payoutsReceived)}
                        </h3>
                    </div>
                    <p className="text-[11px] text-stone-400 font-medium pt-1 border-t border-stone-100 truncate">
                        Transferred to GCash / Bank
                    </p>
                </div>
            </div>

            {/* 4. Operating Funds (Deep Greenish-Black Studio Capital) */}
            <div className="w-[85vw] max-w-[280px] sm:w-auto shrink-0 snap-center h-full">
                <div className="relative w-full h-full rounded-2xl border border-[#16382B] bg-[#0B1E17] p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[125px] overflow-hidden group">
                    {/* Subtle ambient light in top right */}
                    <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

                    <div className="flex items-start justify-between gap-2 relative z-10">
                        <p className="text-emerald-400/90 text-[10px] font-bold uppercase tracking-wider truncate">
                            Operating Funds
                        </p>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-900/40 text-emerald-400 border border-emerald-500/20 shadow-2xs">
                            <Building2 size={16} />
                        </div>
                    </div>

                    <div className="my-0.5 relative z-10">
                        <h3 className="text-2xl font-bold text-white tracking-tight whitespace-nowrap">
                            {formatShortMoney(operatingFunds)}
                        </h3>
                    </div>

                    <div className="flex items-center justify-between text-[11px] relative z-10 pt-1 border-t border-emerald-900/50">
                        <span className="text-emerald-300/70 text-[10px] font-medium truncate">
                            Base: {formatShortMoney(finances.baseFunds ?? 0)}
                        </span>
                        <button
                            type="button"
                            onClick={onEditBaseFunds}
                            disabled={!canEditAccounting}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-500/30 transition active:scale-95 shrink-0 ${
                                canEditAccounting ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            }`}
                            title={canEditAccounting ? 'Edit Starting Base Funds' : 'Read only'}
                        >
                            <Pencil size={9} />
                            <span>Edit Base</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
