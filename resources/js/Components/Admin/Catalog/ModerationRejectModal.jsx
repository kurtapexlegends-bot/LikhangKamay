import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import { AlertTriangle, XCircle, ShieldAlert, X } from 'lucide-react';
import RevisionChecklistSelector from '@/Components/Common/RevisionChecklistSelector';

const POLICY_PRESETS = [
    { label: 'Prohibited Item', text: 'This item violates marketplace terms regarding prohibited or restricted craft categories.' },
    { label: 'IP Infringement', text: 'Listing contains potential copyright, trademark, or artisan intellectual property infringements.' },
    { label: 'Misleading Info', text: 'Product description, pricing, or specifications appear inaccurate or misleading.' },
    { label: 'Image Standards', text: 'Cover photo does not meet clarity and authentic craft presentation guidelines.' },
];

export default function ModerationRejectModal({
    isOpen,
    onClose,
    product,
    actionType = 'reject', // 'reject' | 'flag'
    onConfirm,
    isProcessing = false,
}) {
    const [reason, setReason] = useState('');
    const [revisionItems, setRevisionItems] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setReason('');
            setRevisionItems([]);
            setError('');
        }
    }, [isOpen, product?.id]);

    if (!isOpen || !product) return null;

    const isFlag = actionType === 'flag';
    const title = isFlag ? 'Flag Product Listing' : 'Request Listing Revision';
    const actionVerb = isFlag ? 'Flag Listing' : 'Send Revision Request';

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = reason.trim();
        if (!trimmed && revisionItems.length === 0) {
            setError('Select at least one revision item or enter feedback so the seller knows what to update.');
            return;
        }
        setError('');
        onConfirm(product.id, actionType, trimmed, revisionItems);
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="xl">
            <div className="p-5 sm:p-6 bg-[#FDFBF9]">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isFlag ? 'bg-rose-50 text-rose-700' : 'bg-red-50 text-red-700'}`}>
                            {isFlag ? <ShieldAlert size={20} /> : <XCircle size={20} />}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-stone-900 tracking-tight">{title}</h3>
                            <p className="text-xs text-stone-500 font-medium">
                                Listing: <span className="text-stone-800 font-bold">{product.name}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="rounded-lg border border-stone-200 bg-white p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-50 min-h-[38px] min-w-[38px] flex items-center justify-center transition cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {/* Policy Presets */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                            Quick Policy Note Presets
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {POLICY_PRESETS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setReason(preset.text)}
                                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-clay-50 hover:text-clay-800 border border-stone-200 text-[11px] font-semibold text-stone-700 transition"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <RevisionChecklistSelector
                        schemaKey="product"
                        selectedItems={revisionItems}
                        onChangeItems={(items) => {
                            setRevisionItems(items);
                            if (error) setError('');
                        }}
                        reason={reason}
                        onChangeReason={(val) => {
                            setReason(val);
                            if (error) setError('');
                        }}
                        reasonLabel="Moderator Feedback & Reason"
                        reasonPlaceholder="Explain why this listing is being returned or flagged..."
                        error={error}
                        compact
                    />

                    {/* Policy Notice */}
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-600 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>This feedback will be sent directly to the artisan seller. They will be notified and given the opportunity to edit and resubmit their listing.</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-stone-200/80">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-bold hover:bg-stone-50 transition min-h-[44px] cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px] cursor-pointer ${
                                isFlag ? 'bg-rose-700 hover:bg-rose-800' : 'bg-red-700 hover:bg-red-800'
                            }`}
                        >
                            {isProcessing ? 'Processing...' : actionVerb}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
