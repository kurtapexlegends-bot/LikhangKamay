import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import LivenessFaceScanner from '@/Components/Staff/Dashboard/LivenessFaceScanner';
import { ScanFace, X, Loader2, ShieldCheck } from 'lucide-react';
import { router } from '@inertiajs/react';

export default function CheckoutFaceCheckModal({
    show,
    onClose,
    onCompleted,
}) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleVerified = ({ photoData, descriptor }) => {
        setErrorMsg('');
        setSubmitting(true);

        router.post(
            route('profile.verify-face'),
            {
                selfie_data_url: photoData,
                face_descriptor: descriptor,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onCompleted?.();
                },
                onError: (errors) => {
                    setErrorMsg(
                        errors?.face_verification ||
                            errors?.selfie_data_url ||
                            'We could not complete your face check. Please try again.'
                    );
                },
                onFinish: () => {
                    setSubmitting(false);
                },
            }
        );
    };

    return (
        <Modal show={show} onClose={submitting ? () => {} : onClose} maxWidth="md" bottomSheet>
            <div className="p-5 sm:p-6 bg-[#FDFBF9] space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-clay-50 border border-clay-200 text-clay-700 flex items-center justify-center shrink-0">
                            <ScanFace size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-stone-900">One-Time Quick Face Check</h3>
                            <p className="text-xs text-stone-500 mt-0.5 leading-snug">
                                Complete this quick safety check before your first order. You will not be asked again on future checkouts.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {errorMsg && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                        {errorMsg}
                    </div>
                )}

                {submitting ? (
                    <div className="rounded-2xl border border-stone-200 bg-white py-12 flex flex-col items-center justify-center text-center space-y-3">
                        <Loader2 size={28} className="animate-spin text-clay-600" />
                        <div>
                            <p className="text-sm font-bold text-stone-900">Completing Verification...</p>
                            <p className="text-xs text-stone-500 mt-0.5">Proceeding directly to place your order.</p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-stone-200 bg-white p-4">
                        <LivenessFaceScanner
                            computeDescriptor={true}
                            onVerified={handleVerified}
                            fallbackLabel="Cancel"
                            onFallbackAction={onClose}
                        />
                    </div>
                )}

                <div className="flex items-center gap-2 text-[11px] text-stone-500 pt-1">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                    <span>Protects your account across Cash on Delivery, Store Pick-Up, GCash, and Maya orders.</span>
                </div>
            </div>
        </Modal>
    );
}
