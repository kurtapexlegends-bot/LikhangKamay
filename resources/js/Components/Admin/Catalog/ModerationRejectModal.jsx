import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import { AlertTriangle, XCircle, ShieldAlert, X } from 'lucide-react';

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
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setReason('');
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
        if (!trimmed) {
            setError(`Please provide feedback so the seller knows what to update in their listing.`);
            return;
        }
        setError('');
        onConfirm(product.id, actionType, trimmed);
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="lg">
            <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-xl">
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
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                    >
                        <X size={18} />
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

                    {/* Textarea */}
                    <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                            Moderator Feedback &amp; Reason <span className="text-rose-600">*</span>
                        </label>
                        <textarea
                            rows={4}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Explain why this listing is being returned or flagged..."
                            className={`w-full rounded-xl text-xs p-3 border transition ${
                                error ? 'border-rose-400 ring-1 ring-rose-300' : 'border-stone-200 focus:border-clay-500 focus:ring-1 focus:ring-clay-500'
                            }`}
                        />
                        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
                    </div>

                    {/* Policy Notice */}
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-600 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>This feedback will be sent directly to the artisan seller. They will be notified and given the opportunity to edit and resubmit their listing.</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-4 py-2 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-bold hover:bg-stone-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 ${
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
