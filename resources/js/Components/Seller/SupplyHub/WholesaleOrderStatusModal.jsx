import React from 'react';
import Modal from '@/Components/Modal';
import { X, CheckCircle2, Truck, CreditCard } from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WholesaleOrderStatusModal({
    isOpen,
    onClose,
    order,
    nextStatus,
    trackingNumber,
    setTrackingNumber,
    notes,
    setNotes,
    onSubmit,
    isSubmitting = false,
}) {
    if (!isOpen || !order) return null;

    const depositAmount = Number(order.deposit_amount || order.downpayment_amount || 0);
    const orderTotal = Number(order.total_amount || order.total || 0);
    const remainingBalance = Math.max(0, orderTotal - depositAmount);
    const paymentTerms = order.payment_terms || order.payment_mode || (order.payment_status === 'paid' ? 'Paid in Full' : 'Standard Settlement');

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-5 sm:p-6 bg-white rounded-2xl">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-100 text-clay-700">
                            <Truck size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-stone-900">
                            Update Supply Order #{order.order_number || order.id}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <p className="text-xs text-stone-600">
                        Mark this wholesale supply order as <strong className="text-stone-900 uppercase font-bold">{nextStatus}</strong>?
                    </p>

                    {/* Deposit & Payment Terms Verification */}
                    <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-stone-500 flex items-center gap-1 font-semibold">
                                <CreditCard size={13} className="text-clay-600" />
                                Payment Terms:
                            </span>
                            <span className="font-bold text-stone-800">{paymentTerms}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
                            <span className="text-stone-500 font-semibold">Total Order Value:</span>
                            <span className="font-bold text-stone-900 font-mono">{formatCurrency(orderTotal)}</span>
                        </div>
                        {depositAmount > 0 && (
                            <div className="flex items-center justify-between text-emerald-700 font-semibold">
                                <span>Verified Deposit / Paid:</span>
                                <span className="font-mono">{formatCurrency(depositAmount)}</span>
                            </div>
                        )}
                        {remainingBalance > 0 && depositAmount > 0 && (
                            <div className="flex items-center justify-between text-amber-800 font-semibold">
                                <span>Remaining Balance Due:</span>
                                <span className="font-mono">{formatCurrency(remainingBalance)}</span>
                            </div>
                        )}
                    </div>

                    {nextStatus === 'Shipped' && (
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                                Tracking / Freight Waybill Number
                            </label>
                            <input
                                type="text"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="e.g. LLM-9823412 or Truck Plate #"
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                            Dispatch Notes (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes for buyer artisan..."
                            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 transition disabled:opacity-50"
                        >
                            <CheckCircle2 size={13} />
                            <span>{isSubmitting ? 'Updating...' : `Confirm ${nextStatus}`}</span>
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
