import React from 'react';
import VoucherScopeTags from '@/Components/Seller/Marketing/VoucherScopeTags';
import { Award, Ticket } from 'lucide-react';

const formatPesoCompact = (value) => {
    const num = Number(value || 0);
    return Number.isInteger(num)
        ? num.toLocaleString()
        : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function VoucherTicketCard({
    voucher,
    isApplied = false,
    isEligible = true,
    notchBgClass = 'bg-white',
    subtitle = null,
    actionSlot = null,
    footerNotice = null,
}) {
    const isPercentage = voucher?.discount_type === 'percentage';
    const numericVal = Number(voucher?.discount_value || 0);
    const displayRate = isPercentage
        ? `${Number.isInteger(numericVal) ? numericVal : numericVal}%`
        : formatPesoCompact(numericVal);

    const cardBorderClass = isApplied
        ? 'border-emerald-300 bg-emerald-50/35'
        : isEligible
        ? 'border-stone-200 bg-white hover:border-clay-300 shadow-2xs'
        : 'border-stone-200/80 bg-stone-50/80';

    const notchBorderClass = isApplied
        ? 'border-emerald-300'
        : 'border-stone-200';

    const stubThemeClass = isApplied
        ? 'bg-emerald-600 text-white'
        : isEligible
        ? 'bg-clay-600 text-white'
        : 'bg-stone-200 text-stone-500';

    return (
        <div
            className={`relative flex items-stretch rounded-2xl border transition-all overflow-hidden ${cardBorderClass}`}
        >
            {/* Left Serrated Ticket Stub */}
            <div
                className={`relative w-[88px] sm:w-[96px] shrink-0 flex flex-col items-center justify-center px-2 py-3 text-center select-none ${stubThemeClass}`}
            >
                {/* Left Roll Stamp Perforations */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-2 left-0 flex flex-col justify-between"
                >
                    <span className={`w-2 h-2 -ml-1 rounded-full ${notchBgClass}`} />
                    <span className={`w-2 h-2 -ml-1 rounded-full ${notchBgClass}`} />
                    <span className={`w-2 h-2 -ml-1 rounded-full ${notchBgClass}`} />
                    <span className={`w-2 h-2 -ml-1 rounded-full ${notchBgClass}`} />
                </div>

                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider opacity-85 mb-1">
                    <Ticket size={10} />
                    Voucher
                </span>

                {!isPercentage && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-90 leading-none">
                        PHP
                    </span>
                )}

                <span
                    className={`font-black tracking-tight leading-none ${
                        displayRate.length >= 6 ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
                    }`}
                >
                    {displayRate}
                </span>

                <span className="text-[9.5px] font-extrabold uppercase tracking-widest opacity-90 mt-0.5">
                    OFF
                </span>
            </div>

            {/* Vertical Perforated Seam + Top/Bottom Punched Semi-Circle Cutouts */}
            <div className="relative w-0 shrink-0" aria-hidden="true">
                <div
                    className={`absolute inset-y-2 left-0 border-l-2 border-dashed ${
                        isApplied ? 'border-emerald-200' : 'border-stone-200/90'
                    }`}
                />
                <span
                    className={`absolute -top-2 -left-2 w-4 h-4 rounded-full border ${notchBgClass} ${notchBorderClass} z-10`}
                />
                <span
                    className={`absolute -bottom-2 -left-2 w-4 h-4 rounded-full border ${notchBgClass} ${notchBorderClass} z-10`}
                />
            </div>

            {/* Right Ticket Body */}
            <div className={`flex-1 min-w-0 p-3 pl-3.5 flex flex-col justify-between gap-2 ${!isEligible && !isApplied ? 'opacity-85' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-extrabold text-[11px] text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/80">
                                {voucher?.code || 'VOUCHER-CODE'}
                            </span>
                            {voucher?.is_featured && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                    <Award size={9} />
                                    Featured
                                </span>
                            )}
                        </div>
                        <p className="font-bold text-stone-900 text-xs leading-snug line-clamp-2">
                            {voucher?.name || 'Voucher Title'}
                        </p>
                    </div>

                    {actionSlot && <div className="shrink-0">{actionSlot}</div>}
                </div>

                {/* Scope, Audience & Condition Metadata */}
                <div className="space-y-1.5">
                    <VoucherScopeTags voucher={voucher} className="" />

                    {subtitle && (
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-stone-500">
                            {subtitle}
                        </div>
                    )}

                    {footerNotice}
                </div>
            </div>
        </div>
    );
}
