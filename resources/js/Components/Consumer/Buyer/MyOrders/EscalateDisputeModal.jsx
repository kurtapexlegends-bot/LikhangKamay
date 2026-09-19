import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function EscalateDisputeModal({ isOpen, onClose, disputeId }) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        action: 'escalate',
        escalation_reason: '',
    });

    const isMobileOrTablet = useMediaQuery('(max-width: 1023px)');

    useEffect(() => {
        if (!isOpen) {
            reset();
            clearErrors();
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('disputes.react', disputeId), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    if (!disputeId) return null;

    const renderFormContent = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Reason for Support Help</label>
                <textarea
                    className="w-full border-stone-300 rounded-xl focus:ring-amber-500 focus:border-amber-500 shadow-sm text-sm"
                    rows="4"
                    placeholder="Explain the situation clearly (e.g., seller proposed replacement but I prefer refund, or item arrived damaged)..."
                    value={data.escalation_reason}
                    onChange={(e) => setData('escalation_reason', e.target.value)}
                    required
                ></textarea>
                {errors.escalation_reason && <p className="text-red-500 text-xs mt-1">{errors.escalation_reason}</p>}
            </div>

            <div className="flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2 font-bold text-stone-700 transition hover:bg-stone-50 min-h-[44px] sm:min-h-[38px] flex items-center justify-center"
                    disabled={processing}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={processing}
                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-2 font-bold text-white shadow-lg shadow-amber-200 transition hover:bg-amber-700 disabled:opacity-50 min-h-[44px] sm:min-h-[38px]"
                >
                    {processing ? 'Submitting...' : 'Ask Support'}
                </button>
            </div>
        </form>
    );

    if (isMobileOrTablet) {
        return (
            <SlideOverDrawer
                show={isOpen}
                onClose={onClose}
                title="Ask Support"
                widthClass="max-w-md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-stone-500">Explain what happened so our team can help resolve this fairly.</p>
                    {renderFormContent()}
                </div>
            </SlideOverDrawer>
        );
    }

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-900">Ask Support</h2>
                        <p className="text-sm text-stone-500">Explain what happened so our team can help resolve this fairly.</p>
                    </div>
                </div>
                {renderFormContent()}
            </div>
        </Modal>
    );
}
