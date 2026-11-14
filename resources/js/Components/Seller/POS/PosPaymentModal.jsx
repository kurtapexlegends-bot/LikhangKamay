import React from 'react';
import {
    X,
    Banknote,
    QrCode,
    Smartphone,
    Delete,
    AlertCircle,
    Settings2,
    Check,
} from 'lucide-react';

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));

const QUICK_CASH_BILLS = [100, 200, 500, 1000, 2000];
const NUMPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'BACK'];

export default function PosPaymentModal({
    open,
    onClose,
    totalAmount,
    itemCount,
    customerName,
    paymentMethod,
    onPaymentMethodChange,
    cashTendered,
    onCashTenderedChange,
    paymentReference,
    onPaymentReferenceChange,
    studioProfile,
    onOpenQrSetup,
    onSubmitCheckout,
    processing,
    errors,
    canEditPos,
}) {
    if (!open) return null;

    const roundedTotal = Number(Number(totalAmount || 0).toFixed(2));
    const numericCash = parseFloat(cashTendered);
    const hasValidCash = Number.isFinite(numericCash) && numericCash >= roundedTotal;
    const cashDifference = Number.isFinite(numericCash) ? numericCash - roundedTotal : -roundedTotal;

    const activeQrUrl = paymentMethod === 'pos_gcash'
        ? studioProfile?.pos_gcash_qr_url
        : paymentMethod === 'pos_maya'
            ? studioProfile?.pos_maya_qr_url
            : null;
    const activeWalletLabel = paymentMethod === 'pos_gcash' ? 'GCash' : 'Maya';

    const errorMessages = Object.values(errors || {}).filter(Boolean);
    const canSubmit =
        canEditPos &&
        !processing &&
        roundedTotal > 0 &&
        (paymentMethod !== 'pos_cash' || hasValidCash);

    const handleNumpadTap = (key) => {
        if (!canEditPos || processing) return;

        if (key === 'BACK') {
            onCashTenderedChange((prev) => String(prev || '').slice(0, -1));
            return;
        }

        onCashTenderedChange((prev) => {
            const current = String(prev || '');
            if (key === '.') {
                if (current.includes('.')) return current;
                return current === '' ? '0.' : `${current}.`;
            }

            if (current.includes('.')) {
                const [, decimals = ''] = current.split('.');
                if (decimals.length >= 2) return current;
            }

            if (current === '0' && key !== '.') {
                return key;
            }

            return `${current}${key}`;
        });
    };

    const handleDirectCashInput = (rawValue) => {
        const cleaned = rawValue.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        if (parts.length > 2) return;
        if (parts[1] && parts[1].length > 2) {
            onCashTenderedChange(`${parts[0]}.${parts[1].slice(0, 2)}`);
            return;
        }
        onCashTenderedChange(cleaned);
    };

    const handleCashInputKeyDown = (e) => {
        if (e.key === 'Enter' && canSubmit) {
            e.preventDefault();
            onSubmitCheckout();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/55 backdrop-blur-xs p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-payment-modal-title"
        >
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-stone-200 shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
                {/* Modal Header */}
                <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
                    <div>
                        <h3 id="pos-payment-modal-title" className="text-sm font-extrabold text-stone-900">
                            Collect Payment
                        </h3>
                        <p className="text-[11px] text-stone-500">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            {customerName?.trim() ? ` • ${customerName.trim()}` : ' • Walk-In Guest'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="text-right">
                            <span className="block text-[10px] font-semibold text-stone-500">Total Due</span>
                            <span className="text-base sm:text-lg font-black text-clay-700">
                                {formatCurrency(roundedTotal)}
                            </span>
                        </div>
                        <button
                            type="button"
                            disabled={processing}
                            onClick={onClose}
                            aria-label="Close Payment Modal"
                            className="h-9 w-9 max-md:min-h-[42px] max-md:min-w-[42px] flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200/60"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Payment Method Switcher */}
                <div className="px-4 pt-3">
                    <div className="grid grid-cols-3 gap-1.5">
                        {[
                            { id: 'pos_cash', label: 'Cash', icon: Banknote },
                            { id: 'pos_gcash', label: 'GCash QR', icon: QrCode },
                            { id: 'pos_maya', label: 'Maya QR', icon: Smartphone },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = paymentMethod === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    disabled={processing || !canEditPos}
                                    onClick={() => onPaymentMethodChange(tab.id)}
                                    className={`h-9 max-md:min-h-[42px] px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
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
                </div>

                {/* Tender Body */}
                <div className="p-4 max-h-[65vh] overflow-y-auto space-y-3">
                    {errorMessages.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
                            {errorMessages.map((msg, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span>{msg}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {paymentMethod === 'pos_cash' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                            {/* Left: Tender Readout, Change & Bills */}
                            <div className="sm:col-span-6 space-y-2.5">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[11px] font-bold text-stone-700">
                                            Cash Tendered
                                        </label>
                                        {cashTendered && (
                                            <button
                                                type="button"
                                                disabled={processing}
                                                onClick={() => onCashTenderedChange('')}
                                                className="text-[11px] font-semibold text-stone-500 hover:text-stone-900"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-extrabold text-stone-400">
                                            ₱
                                        </span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={cashTendered}
                                            onChange={(e) => handleDirectCashInput(e.target.value)}
                                            onKeyDown={handleCashInputKeyDown}
                                            placeholder="0.00"
                                            disabled={!canEditPos || processing}
                                            className="w-full h-11 pl-7 pr-3 rounded-lg border border-stone-300 bg-stone-50 text-lg font-black text-stone-900 focus:bg-white focus:border-clay-500 focus:ring-clay-500"
                                        />
                                    </div>
                                </div>

                                {/* Live Change Due */}
                                <div
                                    className={`px-3 py-2.5 rounded-lg border flex items-center justify-between ${
                                        hasValidCash
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                            : 'bg-amber-50 border-amber-200 text-amber-900'
                                    }`}
                                >
                                    <span className="text-[11px] font-bold">
                                        {hasValidCash ? 'Change Due' : 'Short by'}
                                    </span>
                                    <span className="text-base font-black">
                                        {formatCurrency(Math.abs(cashDifference))}
                                    </span>
                                </div>

                                {/* Quick Bills */}
                                <div>
                                    <p className="text-[10px] font-bold text-stone-500 mb-1">Quick Cash</p>
                                    <div className="grid grid-cols-3 gap-1">
                                        <button
                                            type="button"
                                            disabled={!canEditPos || processing}
                                            onClick={() => onCashTenderedChange(roundedTotal.toFixed(2))}
                                            className="h-8 max-md:min-h-[40px] px-1.5 rounded-md bg-clay-100 hover:bg-clay-200 text-[11px] font-extrabold text-clay-800 transition-colors"
                                        >
                                            Exact
                                        </button>
                                        {QUICK_CASH_BILLS.map((bill) => (
                                            <button
                                                key={bill}
                                                type="button"
                                                disabled={!canEditPos || processing}
                                                onClick={() => onCashTenderedChange(String(bill))}
                                                className="h-8 max-md:min-h-[40px] px-1.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[11px] font-bold text-stone-800 transition-colors"
                                            >
                                                {formatCurrency(bill).replace('.00', '')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Compact Touch Keypad */}
                            <div className="sm:col-span-6 bg-stone-100/80 border border-stone-200 rounded-lg p-2">
                                <div className="grid grid-cols-3 gap-1">
                                    {NUMPAD_KEYS.map((key) => (
                                        <button
                                            key={key}
                                            type="button"
                                            disabled={!canEditPos || processing}
                                            onClick={() => handleNumpadTap(key)}
                                            aria-label={key === 'BACK' ? 'Backspace' : `Digit ${key}`}
                                            className="h-10 max-md:min-h-[44px] rounded-md bg-white border border-stone-200 hover:bg-stone-50 active:bg-stone-200 text-sm font-extrabold text-stone-900 flex items-center justify-center shadow-2xs transition-colors"
                                        >
                                            {key === 'BACK' ? <Delete className="w-4 h-4 text-stone-600" /> : key}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-stone-800">
                                    Scan {activeWalletLabel} QR to Pay {formatCurrency(roundedTotal)}
                                </span>
                                {canEditPos && (
                                    <button
                                        type="button"
                                        onClick={onOpenQrSetup}
                                        className="h-7 px-2 rounded-md text-[11px] font-bold text-clay-700 hover:bg-clay-50 inline-flex items-center gap-1"
                                    >
                                        <Settings2 className="w-3 h-3" />
                                        {activeQrUrl ? 'Replace QR' : 'Upload QR'}
                                    </button>
                                )}
                            </div>

                            {activeQrUrl ? (
                                <div className="flex flex-col items-center p-3 bg-stone-50 border border-stone-200 rounded-xl">
                                    <img
                                        src={activeQrUrl}
                                        alt={`${activeWalletLabel} Walk-In QR`}
                                        onError={(e) => {
                                            e.currentTarget.src = '/images/placeholder.svg';
                                            e.currentTarget.onerror = null;
                                        }}
                                        className="w-40 h-40 object-contain rounded-lg bg-white border border-stone-200 p-1.5 shadow-2xs"
                                    />
                                    <p className="mt-2 text-xs font-bold text-stone-900">
                                        Exact Total: <span className="text-clay-700">{formatCurrency(roundedTotal)}</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="p-5 rounded-xl bg-stone-50 border border-dashed border-stone-300 text-center space-y-2">
                                    <p className="text-xs font-semibold text-stone-600">
                                        No {activeWalletLabel} QR image uploaded for this studio yet.
                                    </p>
                                    {canEditPos && (
                                        <button
                                            type="button"
                                            onClick={onOpenQrSetup}
                                            className="h-9 px-3.5 rounded-lg bg-clay-600 text-white text-xs font-bold hover:bg-clay-700"
                                        >
                                            Upload Studio QR
                                        </button>
                                    )}
                                </div>
                            )}

                            {(studioProfile?.payout_account_name || studioProfile?.payout_account_number) && (
                                <div className="px-3 py-2 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-stone-900">
                                        {studioProfile.payout_account_name || studioProfile.shop_name}
                                    </span>
                                    {studioProfile.payout_account_number && (
                                        <span className="font-mono font-semibold text-stone-700">
                                            {studioProfile.payout_account_number}
                                        </span>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                                    Reference Number (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={paymentReference}
                                    onChange={(e) => onPaymentReferenceChange(e.target.value)}
                                    placeholder="e.g. Transfer reference number"
                                    maxLength={100}
                                    disabled={!canEditPos || processing}
                                    className="w-full h-9 max-md:min-h-[42px] px-3 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:bg-white focus:border-clay-500 focus:ring-clay-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-4 py-3 border-t border-stone-200 bg-stone-50 flex items-center gap-2">
                    <button
                        type="button"
                        disabled={processing}
                        onClick={onClose}
                        className="h-10 max-md:min-h-[44px] px-4 rounded-lg border border-stone-300 bg-white text-xs font-bold text-stone-700 hover:bg-stone-100"
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={onSubmitCheckout}
                        className="flex-1 h-10 max-md:min-h-[44px] px-4 rounded-lg bg-clay-600 hover:bg-clay-700 disabled:bg-stone-300 disabled:text-stone-500 text-white text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                        <Check className="w-4 h-4" />
                        {processing ? 'Recording Sale...' : `Complete Sale • ${formatCurrency(roundedTotal)}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
