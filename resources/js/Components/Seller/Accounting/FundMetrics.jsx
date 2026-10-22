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
                <div className="relative w-full h-full rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all duration-200 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider truncate">
                                Ready for Payout
                            </p>
                            {readyForPayout > 0 && (
                                <span className="inline-flex px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Ready
                                </span>
                            )}
                        </div>
                        <h3 className="text-2xl font-bold text-stone-900 tracking-tight">
                            {formatShortMoney(readyForPayout)}
                        </h3>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-2xs border border-emerald-100/50">
                        <CheckCircle2 size={18} />
                    </div>
                </div>
            </div>

            {/* 2. Orders in Progress */}
            <div className="w-[85vw] max-w-[280px] sm:w-auto shrink-0 snap-center h-full">
                <div className="relative w-full h-full rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all duration-200 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate">
                            Orders in Progress
                        </p>
                        <h3 className="text-2xl font-bold text-stone-900 tracking-tight">
                            {formatShortMoney(ordersInProgress)}
                        </h3>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-2xs border border-amber-100/50">
                        <Clock size={18} />
                    </div>
                </div>
            </div>

            {/* 3. Payouts Received */}
            <div className="w-[85vw] max-w-[280px] sm:w-auto shrink-0 snap-center h-full">
                <div className="relative w-full h-full rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all duration-200 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate">
                            Payouts Received
                        </p>
                        <h3 className="text-2xl font-bold text-stone-900 tracking-tight">
                            {formatShortMoney(payoutsReceived)}
                        </h3>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-700 shadow-2xs border border-clay-100/50">
                        <Banknote size={18} />
                    </div>
                </div>
            </div>

            {/* 4. Operating Funds */}
            <div className="w-[85vw] max-w-[280px] sm:w-auto shrink-0 snap-center h-full">
                <div className="relative w-full h-full rounded-2xl border border-stone-900 bg-stone-900 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all duration-200 flex items-start justify-between gap-3 overflow-hidden">
                    <div className="min-w-0 z-10">
                        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate">
                            Operating Funds
                        </p>
                        <h3 className="text-2xl font-bold text-white tracking-tight">
                            {formatShortMoney(operatingFunds)}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 z-10 shrink-0">
                        <button
                            type="button"
                            onClick={onEditBaseFunds}
                            disabled={!canEditAccounting}
                            className={`flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-white/20 transition active:scale-95 ${
                                canEditAccounting ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            }`}
                            title={canEditAccounting ? 'Edit Base Funds' : 'Read only'}
                        >
                            <Pencil size={10} />
                            <span className="hidden sm:inline">Edit Base</span>
                        </button>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 shadow-2xs">
                            <Building2 size={18} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
