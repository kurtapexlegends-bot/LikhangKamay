import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { X, AlertTriangle, Check, Clock, CreditCard, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';
import Modal from '@/Components/Modal';

const CANCELLATION_REASONS = [
    { id: 'change_delivery_address', label: 'Need to change delivery address' },
    { id: 'modify_order_items', label: 'Need to modify items or quantities' },
    { id: 'ordered_by_mistake', label: 'Order placed by mistake' },
    { id: 'found_better_price', label: 'Found alternative / better deal' },
    { id: 'delivery_time_too_long', label: 'Delivery time is too long' },
    { id: 'other', label: 'Other reason' },
];

export default function CancelOrderModal({ isOpen, onClose, order }) {
    const [selectedReason, setSelectedReason] = useState('change_delivery_address');
    const [details, setDetails] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    if (!order) return null;

    const isOnlinePaid = order.payment_status?.toLowerCase() === 'paid';
    const isGracePeriod = order.status === 'Accepted';

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);

        if (selectedReason === 'other' && !details.trim()) {
            setError('Please describe your cancellation reason.');
            return;
        }

        setProcessing(true);

        if (selectedReason === 'change_delivery_address') {
            router.post(route('my-orders.change-address-reorder', order.id), {}, {
                onSuccess: () => {
                    setProcessing(false);
                    onClose();
                },
                onError: (errors) => {
                    setProcessing(false);
                    setError(errors?.message || 'Failed to initiate address change.');
                },
                onFinish: () => {
                    setProcessing(false);
                }
            });
            return;
        }

        router.post(route('my-orders.cancel', order.id), {
            reason: selectedReason,
            details: details.trim() || null,
        }, {
            onSuccess: () => {
                setProcessing(false);
                onClose();
            },
            onError: (errors) => {
                setProcessing(false);
                setError(errors?.message || 'Failed to cancel order. Please try again.');
            },
            onFinish: () => {
                setProcessing(false);
            }
        });
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="lg">
            <div className="p-6 bg-white rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-stone-900">Cancel Order #{order.order_number}</h3>
                            <p className="text-xs text-stone-500 mt-0.5">Please tell us why you want to cancel</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Grace Period Notice */}
                {isGracePeriod && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold">Grace Period Active:</span> This order was recently accepted by the artisan and is eligible for cancellation before crafting/packing begins.
                        </div>
                    </div>
                )}

                {/* Refund & Payment Notice */}
                <div className="mt-4 p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-stone-800">
                        {isOnlinePaid ? (
                            <>
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                <span>Online Payment Refund</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-4 h-4 text-stone-600" />
                                <span>Payment Settlement</span>
                            </>
                        )}
                    </div>
                    <p className="text-stone-600 leading-relaxed">
                        {isOnlinePaid
                            ? `Your payment of ₱${order.total} will be processed for automatic refund back to your account.`
                            : 'No payment was charged for this order. Reserved stock will be restored immediately.'}
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                        {error}
                    </div>
                )}

                {/* Reasons Form */}
                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Select Cancellation Reason
                    </label>
                    <div className="space-y-2">
                        {CANCELLATION_REASONS.map((reason) => {
                            const isSelected = selectedReason === reason.id;
                            return (
                                <button
                                    key={reason.id}
                                    type="button"
                                    onClick={() => setSelectedReason(reason.id)}
                                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${
                                        isSelected
                                            ? 'bg-clay-50/60 border-clay-500 text-clay-900 ring-1 ring-clay-500'
                                            : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50/50'
                                    }`}
                                >
                                    <span>{reason.label}</span>
                                    {isSelected && (
                                        <div className="w-4 h-4 rounded-full bg-clay-600 text-white flex items-center justify-center shrink-0 ml-2">
                                            <Check className="w-2.5 h-2.5" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Change Address Guidance Banner */}
                    {selectedReason === 'change_delivery_address' && (
                        <div className="p-3.5 bg-clay-50/80 border border-clay-200 rounded-xl text-xs text-clay-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-clay-800">
                                <MapPin className="w-4 h-4 text-clay-600 shrink-0" />
                                <span>1-Click Address Change & Re-Order</span>
                            </div>
                            <p className="text-[11px] text-clay-700 leading-relaxed">
                                We will cancel this order, restore your items, and open the checkout screen so you can pick your new delivery address with updated courier distance and shipping fees.
                            </p>
                        </div>
                    )}

                    {/* Details Input for Other */}
                    {selectedReason === 'other' && (
                        <div className="pt-2">
                            <label className="block text-xs font-semibold text-stone-700 mb-1">
                                Please specify details <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                rows={3}
                                placeholder="Describe why you are cancelling..."
                                className="w-full text-xs rounded-xl border-stone-200 focus:border-clay-500 focus:ring-clay-500 p-2.5"
                                maxLength={300}
                                required
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 mt-6 border-t border-stone-100 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                        >
                            Keep Order
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 ${
                                selectedReason === 'change_delivery_address'
                                    ? 'bg-clay-600 hover:bg-clay-700 active:scale-95'
                                    : 'bg-red-600 hover:bg-red-700'
                            }`}
                        >
                            {processing ? (
                                'Processing...'
                            ) : selectedReason === 'change_delivery_address' ? (
                                <>
                                    <span>Proceed to Change Address</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </>
                            ) : (
                                'Confirm Cancellation'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
