import React from 'react';
import {
    ShoppingBag,
    Trash2,
    Plus,
    Minus,
    User,
    Banknote,
    QrCode,
    Smartphone,
    AlertCircle,
    ArrowRight,
    X,
} from 'lucide-react';
import { getPosPromoBreakdown, calculatePosLineTotal } from './posPricing';

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));

export default function PosCartPanel({
    cart,
    onUpdateQuantity,
    onRemoveItem,
    onClearCart,
    customerName,
    onCustomerNameChange,
    paymentMethod,
    onPaymentMethodChange,
    studioProfile,
    onOpenPaymentModal,
    processing,
    errors,
    canEditPos,
}) {
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + calculatePosLineTotal(item), 0);
    const roundedTotal = Number(subtotal.toFixed(2));
    const isVatRegistered = Boolean(studioProfile?.is_vat_registered);
    const vatableSales = isVatRegistered ? Number((roundedTotal / 1.12).toFixed(2)) : 0;
    const vatAmount = isVatRegistered ? Number((roundedTotal - vatableSales).toFixed(2)) : 0;

    const errorMessages = Object.values(errors || {}).filter(Boolean);
    const isChargeDisabled = !canEditPos || processing || cart.length === 0;

    return (
        <div className="h-full min-h-0 bg-white lg:border-l border-stone-200 flex flex-col">
            {/* Compact Ticket Header */}
            <div className="shrink-0 px-3.5 py-2.5 border-b border-stone-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-clay-100 text-clay-700 flex items-center justify-center">
                        <ShoppingBag className="w-3.5 h-3.5" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-extrabold text-stone-900">Current Ticket</h2>
                    {itemCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-clay-600 text-white text-[10px] font-bold leading-none">
                            {itemCount}
                        </span>
                    )}
                </div>

                {cart.length > 0 && (
                    <button
                        type="button"
                        onClick={onClearCart}
                        disabled={!canEditPos}
                        className="h-7 px-2 rounded-md text-[11px] font-semibold text-stone-500 hover:text-red-600 hover:bg-red-50 inline-flex items-center gap-1 transition-colors disabled:opacity-40"
                    >
                        <Trash2 className="w-3 h-3" />
                        Clear
                    </button>
                )}
            </div>

            {/* Compact Customer Input */}
            <div className="shrink-0 px-3.5 py-2 border-b border-stone-100 bg-stone-50/70">
                <div className="relative flex items-center">
                    <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 pointer-events-none" />
                    <input
                        type="text"
                        value={customerName}
                        onChange={(e) => onCustomerNameChange(e.target.value)}
                        placeholder="Customer name (optional, Walk-In Guest)"
                        maxLength={120}
                        disabled={!canEditPos}
                        className="w-full h-8 max-md:min-h-[40px] pl-8 pr-2.5 rounded-lg border border-stone-200 bg-white text-[11px] font-medium text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-clay-500"
                    />
                </div>
            </div>

            {/* Line Items List */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3.5 divide-y divide-stone-100">
                {cart.length === 0 ? (
                    <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center py-6">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-300 flex items-center justify-center mb-2">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-stone-600">Ticket is empty</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                            Tap items or scan a SKU to begin
                        </p>
                    </div>
                ) : (
                    cart.map((item) => {
                        const breakdown = getPosPromoBreakdown(item);
                        return (
                        <div key={item.id} className="py-2 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-stone-900 line-clamp-2 leading-tight">
                                    {item.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-stone-500">
                                    <span>{formatCurrency(breakdown.promoQty === 0 ? breakdown.regularPrice : item.unitPrice)}</span>
                                    {item.quantity >= item.stock && (
                                        <span className="px-1 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold leading-none">
                                            Max
                                        </span>
                                    )}
                                </div>
                                {breakdown.hasSplitTier && (
                                    <p className="text-[10px] text-amber-700 mt-0.5">
                                        {breakdown.promoQty} @ {formatCurrency(breakdown.promoPrice)} + {breakdown.regularQty} @ {formatCurrency(breakdown.regularPrice)}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                    type="button"
                                    disabled={!canEditPos}
                                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                    aria-label={`Decrease ${item.name} quantity`}
                                    className="w-7 h-7 max-md:w-9 max-md:h-9 flex items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-xs font-extrabold text-stone-900">
                                    {item.quantity}
                                </span>
                                <button
                                    type="button"
                                    disabled={!canEditPos || item.quantity >= item.stock}
                                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                    aria-label={`Increase ${item.name} quantity`}
                                    className="w-7 h-7 max-md:w-9 max-md:h-9 flex items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs font-extrabold text-stone-900 min-w-[60px] text-right">
                                    {formatCurrency(breakdown.lineTotal)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onRemoveItem(item.id)}
                                    aria-label={`Remove ${item.name}`}
                                    className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        );
                    })
                )}
            </div>

            {/* Pinned Compact Bottom Totals & Charge Action */}
            <div className="shrink-0 p-3 border-t border-stone-200 bg-stone-50/90 space-y-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {errorMessages.length > 0 && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 space-y-1">
                        {errorMessages.map((msg, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{msg}</span>
                            </div>
                        ))}
                    </div>
                )}

                {!canEditPos && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
                        View-only mode. Order editing permission required.
                    </div>
                )}

                <div className="space-y-0.5 text-[11px]">
                    {isVatRegistered ? (
                        <div className="flex justify-between text-stone-500">
                            <span>VATable ({formatCurrency(vatableSales)}) + 12% VAT</span>
                            <span className="font-semibold text-stone-700">{formatCurrency(vatAmount)}</span>
                        </div>
                    ) : (
                        <div className="flex justify-between text-stone-500">
                            <span>Tax Status</span>
                            <span>Non-VAT / VAT-Exempt</span>
                        </div>
                    )}
                    <div className="flex items-baseline justify-between pt-0.5">
                        <span className="text-xs font-bold text-stone-900">Total Due</span>
                        <span className="text-lg font-black tracking-tight text-stone-900">
                            {formatCurrency(roundedTotal)}
                        </span>
                    </div>
                </div>

                {/* Compact Payment Method Selector */}
                <div className="grid grid-cols-3 gap-1">
                    {[
                        { id: 'pos_cash', label: 'Cash', icon: Banknote },
                        { id: 'pos_gcash', label: 'GCash', icon: QrCode },
                        { id: 'pos_maya', label: 'Maya', icon: Smartphone },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = paymentMethod === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                disabled={!canEditPos}
                                onClick={() => onPaymentMethodChange(tab.id)}
                                className={`h-8 max-md:min-h-[42px] px-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                                    isActive
                                        ? 'bg-stone-900 border-stone-900 text-white'
                                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Primary Charge CTA */}
                <button
                    type="button"
                    disabled={isChargeDisabled}
                    onClick={() => onOpenPaymentModal()}
                    className="w-full h-10 max-md:min-h-[46px] px-3.5 rounded-lg bg-clay-600 text-white text-xs sm:text-sm font-extrabold shadow-2xs hover:bg-clay-700 active:scale-[0.99] disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-all flex items-center justify-between"
                >
                    <span>{processing ? 'Processing...' : 'Charge'}</span>
                    <span className="inline-flex items-center gap-1">
                        {formatCurrency(roundedTotal)}
                        <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                </button>
            </div>
        </div>
    );
}
