import React from 'react';
import VoucherTicketCard from '@/Components/Common/VoucherTicketCard';
import { X, Ticket, Store, CheckCircle2, Heart } from 'lucide-react';

const peso = (value) =>
    `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CheckoutVoucherDrawer({
    isOpen,
    onClose,
    availableVouchers = { shops: {} },
    sellerGroups = [],
    appliedShopVouchers = {},
    voucherCalculations = {},
    onApplyVoucher,
    onRemoveShopVoucher,
    onFollowShop,
    followingShopId = null,
    promoCodeInput = '',
    setPromoCodeInput,
    onApplyPromoCode,
    validatingCode = false,
    voucherError = '',
}) {
    if (!isOpen) return null;

    const shopsMap = availableVouchers?.shops || {};

    const renderVoucherCard = (voucher, isApplied, onSelect, onRemove) => {
        const isEligible = Boolean(voucher.is_eligible);
        const canFollowToUnlock =
            !isEligible &&
            voucher.target_audience === 'followers' &&
            voucher.audience_eligible === false &&
            onFollowShop;

        const actionSlot = isApplied ? (
            <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-2.5 h-8 min-h-[34px] text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 transition"
            >
                <CheckCircle2 size={12} />
                Applied
            </button>
        ) : canFollowToUnlock ? (
            <button
                type="button"
                disabled={String(followingShopId) === String(voucher.shop_id)}
                onClick={() => onFollowShop(voucher.shop_id)}
                className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 h-8 min-h-[34px] text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-60 transition"
            >
                <Heart size={11} />
                {String(followingShopId) === String(voucher.shop_id) ? 'Following...' : 'Follow & Unlock'}
            </button>
        ) : (
            <button
                type="button"
                disabled={!isEligible}
                onClick={() => onSelect(voucher)}
                className="rounded-xl bg-clay-600 px-3 h-8 min-h-[34px] text-[11px] font-bold text-white hover:bg-clay-700 disabled:bg-stone-200 disabled:text-stone-400 transition"
            >
                Claim & Use
            </button>
        );

        const subtitle = (
            <>
                <span>
                    {voucher.min_requirement_type === 'quantity'
                        ? `Min. ${voucher.min_quantity || 1} item(s)`
                        : Number(voucher.min_spend || 0) > 0
                        ? `Min. spend ${peso(voucher.min_spend)}`
                        : 'No min. spend'}
                </span>
                {voucher.max_discount && <span>Cap {peso(voucher.max_discount)}</span>}
                {voucher.expires_formatted && <span>Until {voucher.expires_formatted}</span>}
            </>
        );

        const footerNotice =
            !isEligible && (voucher.ineligible_reason || voucher.shortfall > 0) ? (
                <p className="text-[11px] font-semibold text-amber-700">
                    {voucher.ineligible_reason ||
                        `Add ${peso(voucher.shortfall)} more to unlock (${peso(voucher.discount_amount)} savings)`}
                </p>
            ) : null;

        return (
            <VoucherTicketCard
                key={voucher.id}
                voucher={voucher}
                isApplied={isApplied}
                isEligible={isEligible}
                notchBgClass="bg-stone-50"
                subtitle={subtitle}
                actionSlot={actionSlot}
                footerNotice={footerNotice}
            />
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-stone-200 flex flex-col">
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-200 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-clay-100 text-clay-700 flex items-center justify-center border border-clay-200/70">
                            <Ticket size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-stone-900">Select Shop Vouchers</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition"
                        aria-label="Close voucher drawer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Quick Code Input Inside Drawer */}
                <div className="p-3.5 border-b border-stone-200 bg-white space-y-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={promoCodeInput}
                            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                            placeholder="Enter shop promo code (e.g. CRAFT-10)"
                            className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-xs font-mono font-bold uppercase text-stone-900 focus:border-clay-500 focus:ring-0"
                        />
                        <button
                            type="button"
                            disabled={validatingCode || !promoCodeInput.trim()}
                            onClick={() => onApplyPromoCode()}
                            className="rounded-xl bg-stone-900 px-4 min-h-[40px] text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-40 transition shrink-0"
                        >
                            {validatingCode ? 'Checking...' : 'Apply'}
                        </button>
                    </div>
                    {voucherError && <p className="text-[11px] font-semibold text-rose-600">{voucherError}</p>}
                </div>

                {/* Scrollable Vouchers Tray */}
                <div className="flex-1 overflow-y-auto bg-stone-50 p-4 space-y-5">
                    {sellerGroups.map((group) => {
                        const sellerKey = String(group.sellerId);
                        const shopList = Array.isArray(shopsMap[sellerKey]) ? shopsMap[sellerKey] : [];
                        const activeShopVoucher = appliedShopVouchers[sellerKey] || null;
                        const activeDiscountForShop = Number(voucherCalculations?.shopDiscountsBySeller?.[sellerKey] || 0);

                        return (
                            <div key={sellerKey} className="space-y-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600">
                                    <Store size={14} className="text-clay-600" />
                                    <span className="truncate">{group.shopName} Vouchers</span>
                                </div>
                                {shopList.length > 0 ? (
                                    <div className="space-y-3">
                                        {shopList.map((voucher) =>
                                            renderVoucherCard(
                                                voucher,
                                                activeShopVoucher?.code === voucher.code && Boolean(voucher.is_eligible) && activeDiscountForShop > 0,
                                                onApplyVoucher,
                                                () => onRemoveShopVoucher(sellerKey)
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <p className="rounded-xl border border-stone-200/70 bg-white p-3 text-xs text-stone-400 text-center">
                                        No public vouchers listed by {group.shopName}.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Drawer Footer */}
                <div className="p-3.5 border-t border-stone-200 bg-white pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-xl bg-clay-600 py-2.5 min-h-[44px] text-xs font-bold text-white hover:bg-clay-700 transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
