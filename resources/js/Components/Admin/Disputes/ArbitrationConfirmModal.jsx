import React from 'react';
import Modal from '@/Components/Modal';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function ArbitrationConfirmModal({
    isOpen,
    onClose,
    decision,
    dispute,
    isSubmitting,
    onConfirm
}) {
    if (!isOpen || !dispute) return null;

    const buyerName = dispute.order?.user?.name || dispute.order?.customer_name || 'the buyer';
    const shopName = dispute.order?.artisan?.shop_name || 'the artisan';
    const totalAmount = Number(dispute.order?.total_amount || 0);

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6 bg-white rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${
                        decision === 'refund' 
                            ? 'bg-clay-50 text-clay-700 border-clay-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {decision === 'refund' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900">
                            {decision === 'refund' ? 'Confirm Full Refund to Buyer' : 'Confirm Release Funds to Seller'}
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                            Dispute #{dispute.id} · Order #{dispute.order?.order_number || dispute.order_id}
                        </p>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 leading-relaxed space-y-2">
                    {decision === 'refund' ? (
                        <p>
                            You are about to <strong className="text-stone-900">approve a full refund</strong> of{' '}
                            <strong className="text-clay-800">₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>{' '}
                            to <strong className="text-stone-900">{buyerName}</strong>. 
                            Funds held in escrow will be refunded to the customer.
                        </p>
                    ) : (
                        <p>
                            You are about to <strong className="text-stone-900">decline this refund request</strong>. 
                            The dispute will be closed and order funds will be released to{' '}
                            <strong className="text-stone-900">{shopName}</strong>.
                        </p>
                    )}
                    <p className="text-[11px] text-stone-500 italic pt-1 border-t border-stone-200/60">
                        Resolution notes will be recorded permanently in audit logs and sent to both parties.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition cursor-pointer disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-50 ${
                            decision === 'refund'
                                ? 'bg-clay-700 hover:bg-clay-800'
                                : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                    >
                        {isSubmitting && <Loader2 size={13} className="animate-spin text-white" />}
                        <span>{decision === 'refund' ? 'Confirm Refund' : 'Confirm Release'}</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
}
