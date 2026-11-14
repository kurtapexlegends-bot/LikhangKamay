import React from 'react';
import { CheckCircle2, Printer, X, Receipt } from 'lucide-react';

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));

export default function PosReceiptModal({
    order,
    studioProfile,
    onClose,
}) {
    if (!order) return null;

    const handlePrint80mm = () => {
        if (!order.receipt_url) return;
        const separator = order.receipt_url.includes('?') ? '&' : '?';
        window.open(`${order.receipt_url}${separator}auto_print=1`, '_blank', 'noopener,noreferrer');
    };

    const isCash = order.payment_method === 'POS Cash';

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/50 backdrop-blur-xs p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-receipt-title"
        >
            <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-stone-200 shadow-xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
                {/* Success Header */}
                <div className="px-5 py-4 border-b border-stone-200 bg-emerald-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                            <h3 id="pos-receipt-title" className="text-base font-bold text-stone-900">
                                Sale Completed
                            </h3>
                            <p className="text-xs font-mono text-stone-600">
                                {order.order_number}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close Receipt"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-white/80"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Change Due Banner for Cash */}
                {isCash && order.pos_cash_tendered !== null && (
                    <div className="mx-5 mt-4 p-3.5 rounded-xl bg-clay-50 border border-clay-200 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-clay-800">Change Due</p>
                            <p className="text-[11px] text-clay-700">
                                Cash Tendered: {formatCurrency(order.pos_cash_tendered)}
                            </p>
                        </div>
                        <span className="text-2xl font-extrabold text-clay-700">
                            {formatCurrency(order.pos_change_amount || 0)}
                        </span>
                    </div>
                )}

                {/* 80mm-Style Digital Receipt Preview */}
                <div className="p-5 max-h-[60vh] overflow-y-auto">
                    <div className="border border-dashed border-stone-300 rounded-xl p-4 bg-stone-50 font-mono text-xs text-stone-800 space-y-3">
                        <div className="text-center border-b border-dashed border-stone-300 pb-2.5">
                            <p className="font-bold text-sm text-stone-900">
                                {studioProfile?.tax_business_name || studioProfile?.shop_name || 'LikhangKamay Studio'}
                            </p>
                            {studioProfile?.tin && (
                                <p className="text-[11px] text-stone-600">TIN: {studioProfile.tin}</p>
                            )}
                            <p className="text-[11px] text-stone-500 mt-1">{order.created_at}</p>
                        </div>

                        <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-stone-500">Customer:</span>
                                <span className="font-semibold text-right">{order.customer_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-500">Payment:</span>
                                <span className="font-semibold">{order.payment_method}</span>
                            </div>
                            {order.pos_payment_reference && (
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Reference:</span>
                                    <span className="font-semibold">{order.pos_payment_reference}</span>
                                </div>
                            )}
                            {order.processed_by && (
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Cashier:</span>
                                    <span className="font-semibold">{order.processed_by}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-b border-dashed border-stone-300 py-2.5 space-y-2">
                            {(order.items || []).map((item) => (
                                <div key={item.id} className="flex justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-stone-900 break-words">
                                            {item.product_name}
                                        </p>
                                        <p className="text-[11px] text-stone-500">
                                            {item.quantity} x {formatCurrency(item.price)}
                                        </p>
                                    </div>
                                    <span className="font-bold shrink-0">
                                        {formatCurrency(item.line_total)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1 text-[11px]">
                            {order.vat_type === 'vat_inclusive' ? (
                                <>
                                    <div className="flex justify-between text-stone-600">
                                        <span>VATable Sales</span>
                                        <span>{formatCurrency(order.vatable_sales)}</span>
                                    </div>
                                    <div className="flex justify-between text-stone-600">
                                        <span>12% VAT</span>
                                        <span>{formatCurrency(order.vat_amount)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between text-stone-600">
                                    <span>VAT-Exempt Sales</span>
                                    <span>{formatCurrency(order.vat_exempt_sales || order.total_amount)}</span>
                                </div>
                            )}

                            <div className="pt-1.5 border-t border-dashed border-stone-300 flex justify-between text-sm font-bold text-stone-900">
                                <span>TOTAL</span>
                                <span>{formatCurrency(order.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row gap-2">
                    <button
                        type="button"
                        onClick={handlePrint80mm}
                        className="flex-1 min-h-[44px] px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-sm font-bold text-stone-800 inline-flex items-center justify-center gap-2"
                    >
                        <Printer className="w-4 h-4 text-clay-600" />
                        Print 80mm Receipt
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2"
                    >
                        <Receipt className="w-4 h-4" />
                        New Sale
                    </button>
                </div>
            </div>
        </div>
    );
}
