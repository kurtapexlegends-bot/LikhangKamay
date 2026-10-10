import React from 'react';
import Modal from '@/Components/Modal';
import { CheckCircle2, Store, Loader2, Scale } from 'lucide-react';

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
    const halfAmount = totalAmount / 2;

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6 bg-white rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${
                        decision === 'refund' 
                            ? 'bg-clay-50 text-clay-700 border-clay-200' 
                            : decision === 'partial_refund'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}>
                        {decision === 'refund' ? (
                            <CheckCircle2 size={20} />
                        ) : decision === 'partial_refund' ? (
                            <Scale size={20} />
                        ) : (
                            <Store size={20} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900">
                            {decision === 'refund' 
                                ? 'Confirm Full Refund to Buyer' 
                                : decision === 'partial_refund'
                                ? 'Confirm Partial Refund (50% Split)'
                                : 'Confirm Release Escrow to Artisan'}
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
                    ) : decision === 'partial_refund' ? (
                        <p>
                            You are about to <strong className="text-stone-900">split the order total 50/50</strong>. 
                            <strong className="text-amber-900"> ₱{halfAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong> will be refunded to{' '}
                            <strong className="text-stone-900">{buyerName}</strong>, and the remaining{' '}
                            <strong className="text-stone-900">₱{halfAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong> will be released to{' '}
                            <strong className="text-stone-900">{shopName}</strong>.
                        </p>
                    ) : (
                        <p>
                            You are about to <strong className="text-stone-900">resolve this dispute in the artisan's favor</strong>. 
                            The dispute will be closed and escrowed order funds will be released to{' '}
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
                                : decision === 'partial_refund'
                                ? 'bg-amber-750 hover:bg-amber-850'
                                : 'bg-stone-800 hover:bg-stone-900'
                        }`}
                    >
                        {isSubmitting && <Loader2 size={13} className="animate-spin text-white" />}
                        <span>
                            {decision === 'refund' 
                                ? 'Confirm Full Refund' 
                                : decision === 'partial_refund'
                                ? 'Confirm 50% Refund' 
                                : 'Confirm Release Escrow to Artisan'}
                        </span>
                    </button>
                </div>
            </div>
        </Modal>
    );
}
