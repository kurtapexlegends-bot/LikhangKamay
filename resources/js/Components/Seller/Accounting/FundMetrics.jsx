import React from 'react';
import { Banknote, ClipboardList, Building2, Pencil } from 'lucide-react';
import { formatShortMoney } from '@/utils/accountingFormatters';

export default function FundMetrics({ finances, canEditAccounting, onEditBaseFunds }) {
    return (
        <div className="snap-x snap-mandatory flex overflow-x-auto scrollbar-none gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 flex-nowrap sm:flex-wrap">
            {/* Revenue Card */}
            <div className="w-[82vw] max-w-[320px] sm:w-auto shrink-0 snap-center rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs">
                <div className="mb-3 flex items-start justify-between">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-600">
                        <Banknote size={18} />
                    </div>
                </div>
                <h3 className="mb-0.5 text-xl sm:text-2xl font-bold text-gray-900">{formatShortMoney(finances.revenue)}</h3>
                <p className="text-[10px] text-gray-400 font-medium">Total Realized Revenue</p>
            </div>

            {/* Expenses Card */}
            <div className="w-[82vw] max-w-[320px] sm:w-auto shrink-0 snap-center rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs">
                <div className="mb-3 flex items-start justify-between">
                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-2.5 text-rose-600">
                        <ClipboardList size={18} />
                    </div>
                </div>
                <h3 className="mb-0.5 text-xl sm:text-2xl font-bold text-gray-900">{formatShortMoney(finances.expenses)}</h3>
                <p className="text-[10px] text-gray-400 font-medium">Stock Purchases &amp; Payroll</p>
            </div>

            {/* Balance Card */}
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
                <h3 className="mb-0.5 text-2xl sm:text-3xl font-bold tracking-tight text-white relative z-10">{formatShortMoney(finances.balance)}</h3>
            </div>
        </div>
    );
}
