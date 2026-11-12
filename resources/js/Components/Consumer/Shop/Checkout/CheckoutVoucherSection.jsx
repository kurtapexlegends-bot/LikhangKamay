import React from 'react';
import { Ticket, X, ChevronRight } from 'lucide-react';

const peso = (value) =>
    `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CheckoutVoucherSection({
    promoCodeInput = '',
    setPromoCodeInput,
    onApplyPromoCode,
    validatingCode = false,
    voucherError = '',
    setVoucherError,
    appliedShopVouchers = {},
    voucherCalculations = {},
    onRemoveShopVoucher,
    onOpenDrawer,
    totalAvailableVouchersCount = 0,
}) {
    const activeShopEntries = Object.entries(appliedShopVouchers).filter(
        ([sellerKey, v]) => v && (voucherCalculations?.shopDiscountsBySeller?.[sellerKey] || 0) > 0
    );

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Ticket size={16} className="text-clay-600 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-stone-900">
                        Shop Vouchers & Promo Codes
                    </span>
                </div>

                <button
                    type="button"
                    onClick={onOpenDrawer}
                    className="inline-flex items-center gap-1 rounded-xl bg-clay-50 border border-clay-200/70 px-2.5 py-1 text-xs font-bold text-clay-700 hover:bg-clay-100/80 transition"
                >
                    <span>
                        {totalAvailableVouchersCount > 0
                            ? `Select Vouchers (${totalAvailableVouchersCount})`
                            : 'Browse Vouchers'}
                    </span>
                    <ChevronRight size={13} />
                </button>
            </div>

            {/* Inline Promo Code Input */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => {
                        setPromoCodeInput(e.target.value.toUpperCase());
                        if (voucherError && setVoucherError) setVoucherError('');
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            onApplyPromoCode();
                        }
                    }}
                    placeholder="Enter shop promo code"
                    className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-xs font-mono font-bold uppercase text-stone-900 focus:border-clay-500 focus:ring-0"
                />
                <button
                    type="button"
                    disabled={validatingCode || !promoCodeInput.trim()}
                    onClick={() => onApplyPromoCode()}
                    className="rounded-xl bg-stone-900 px-4 min-h-[40px] text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-40 transition shrink-0"
                >
                    {validatingCode ? 'Applying...' : 'Apply'}
                </button>
            </div>

            {voucherError && (
                <p className="text-xs font-semibold text-rose-600">{voucherError}</p>
            )}

            {/* Applied Vouchers Ticket Pills */}
            {activeShopEntries.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {activeShopEntries.map(([sellerKey, v]) => {
                        const amt = voucherCalculations?.shopDiscountsBySeller?.[sellerKey] || 0;
                        return (
                            <span
                                key={`shop-${sellerKey}`}
                                className="inline-flex items-stretch rounded-xl border border-emerald-300 bg-white overflow-hidden text-xs font-bold shadow-2xs"
                            >
                                <span className="bg-emerald-600 text-white px-2.5 py-1 font-mono tracking-wide border-r border-dashed border-emerald-200 flex items-center">
                                    {v.code}
                                </span>
                                <span className="px-2.5 py-1 text-emerald-800 bg-emerald-50/50 flex items-center gap-1.5">
                                    <span>-{peso(amt)}</span>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveShopVoucher(sellerKey)}
                                        className="text-emerald-600 hover:text-emerald-900 p-0.5 rounded-full hover:bg-emerald-100 transition"
                                        aria-label={`Remove voucher ${v.code}`}
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
