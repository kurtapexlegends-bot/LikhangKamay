import React from 'react';
import { Banknote, Clock, CheckCircle2, Building2, Pencil } from 'lucide-react';
import { formatShortMoney } from '@/utils/accountingFormatters';

export default function FundMetrics({ finances = {}, canEditAccounting, onEditBaseFunds }) {
    const readyForPayout = Number(finances.readyForPayout ?? 0);
    const ordersInProgress = Number(finances.ordersInProgress ?? 0);
    const payoutsReceived = Number(finances.payouts ?? 0);
    const operatingFunds = Number(finances.balance ?? 0);

    return (
        <div className="snap-x snap-mandatory flex overflow-x-auto scrollbar-none gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 flex-nowrap sm:flex-wrap">
            
            {/* 1. Ready for Payout */}
            <div className="w-[82vw] max-w-[320px] sm:w-auto shrink-0 snap-center rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs">
                <div className="mb-3 flex items-start justify-between">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-600">
                        <CheckCircle2 size={18} />
                    </div>
                    {readyForPayout > 0 && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ready
                        </span>
                    )}
                </div>
                <h3 className="mb-0.5 text-xl sm:text-2xl font-black text-stone-900">{formatShortMoney(readyForPayout)}</h3>
                <p className="text-[11px] text-stone-500 font-medium">Ready for Payout</p>
                <p className="text-[10px] text-stone-400 font-medium mt-0.5">Completed customer orders</p>
            </div>

            {/* 2. Orders in Progress */}
            <div className="w-[82vw] max-w-[320px] sm:w-auto shrink-0 snap-center rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs">
                <div className="mb-3 flex items-start justify-between">
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-2.5 text-amber-600">
                        <Clock size={18} />
                    </div>
                </div>
                <h3 className="mb-0.5 text-xl sm:text-2xl font-black text-stone-900">{formatShortMoney(ordersInProgress)}</h3>
                <p className="text-[11px] text-stone-500 font-medium">Orders in Progress</p>
                <p className="text-[10px] text-stone-400 font-medium mt-0.5">Crafting or on the road</p>
            </div>

            {/* 3. Payouts Received */}
            <div className="w-[82vw] max-w-[320px] sm:w-auto shrink-0 snap-center rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs">
                <div className="mb-3 flex items-start justify-between">
                    <div className="rounded-xl border border-clay-100 bg-clay-50 p-2.5 text-clay-700">
                        <Banknote size={18} />
                    </div>
                </div>
                <h3 className="mb-0.5 text-xl sm:text-2xl font-black text-stone-900">{formatShortMoney(payoutsReceived)}</h3>
                <p className="text-[11px] text-stone-500 font-medium">Payouts Received</p>
                <p className="text-[10px] text-stone-400 font-medium mt-0.5">Transferred to GCash / Bank</p>
            </div>

            {/* 4. Operating Funds */}
            <div className="w-[82vw] max-w-[320px] sm:w-auto shrink-0 snap-center rounded-2xl border border-stone-900 bg-stone-900 p-4 sm:p-5 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="mb-3 flex items-start justify-between relative z-10">
                    <div className="rounded-xl border border-white/10 bg-white/10 p-2.5 text-white">
                        <Building2 size={18} />
                    </div>
                    <button
                        type="button"
                        onClick={onEditBaseFunds}
                        disabled={!canEditAccounting}
                        className={`flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-900/30 px-3 py-1.5 sm:py-1 text-[10px] font-bold uppercase text-emerald-300 transition min-h-[38px] sm:min-h-0 ${
                            canEditAccounting ? 'cursor-pointer hover:bg-emerald-800/50' : 'cursor-not-allowed opacity-50'
                        }`}
                        title={canEditAccounting ? 'Edit Base Funds' : 'Read only'}
                    >
                        <Pencil size={10} /> Edit Base Funds
                    </button>
                </div>
                <h3 className="mb-0.5 text-2xl sm:text-3xl font-black tracking-tight text-white relative z-10">{formatShortMoney(operatingFunds)}</h3>
                <p className="text-[11px] text-stone-300 font-medium relative z-10">Operating Funds</p>
                <p className="text-[10px] text-stone-400 font-medium mt-0.5 relative z-10">For supplies &amp; staff payroll</p>
            </div>
        </div>
    );
}
