/* global route */
import React, { useState } from 'react';
import { ScanFace, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { router } from '@inertiajs/react';
import FaceCaptureModal from '@/Components/Common/FaceCaptureModal';

export default function AccountFaceCheckCard({ user, requiresCheckoutFaceCheck = false }) {
    const [showScanner, setShowScanner] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    const isVerified = Boolean(user?.kyc_liveness_verified_at) && !requiresCheckoutFaceCheck;

    const handleVerified = ({ photoData, descriptor }) => {
        setErrorMessage(null);
        setStatusMessage(null);
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
                    setShowScanner(false);
                    setStatusMessage('Quick face check saved. Your future checkouts are unlocked.');
                },
                onError: (errors) => {
                    setErrorMessage(errors?.face_verification || errors?.selfie_data_url || 'Verification failed. Please try again.');
                },
                onFinish: () => setSubmitting(false),
            }
        );
    };

    return (
        <div className="mt-8 pt-8 border-t border-stone-200 max-w-2xl space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                        isVerified
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                        <ScanFace size={20} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-stone-900">Quick Face Check</h3>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                                isVerified
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}>
                                {isVerified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                {isVerified ? 'Verified' : 'Required Before First Order'}
                            </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                            {isVerified
                                ? 'Your account identity is confirmed for seamless checkout across all payment methods.'
                                : 'Complete this one-time check now so you can place orders smoothly without interruptions at checkout.'}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-800 hover:bg-stone-50 transition min-h-[42px] cursor-pointer"
                >
                    <RefreshCw size={13} />
                    {isVerified ? 'Update Face Photo' : 'Complete Face Check Now'}
                </button>
            </div>

            {statusMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
                    {statusMessage}
                </div>
            )}

            {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                    {errorMessage}
                </div>
            )}

            {isVerified && user?.kyc_selfie_url && (
                <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
                    <img
                        src={user.kyc_selfie_url}
                        alt="Verified account selfie"
                        className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/images/placeholder.svg';
                        }}
                    />
                    <p className="text-xs text-stone-600 font-medium">
                        Face check confirmed on file. No extra verification needed at checkout.
                    </p>
                </div>
            )}

            <FaceCaptureModal
                show={showScanner}
                onClose={() => setShowScanner(false)}
                title={isVerified ? 'Update Account Face Photo' : 'Complete Quick Face Check'}
                subtitle="Position your face inside the frame and follow the prompt to verify your account."
                computeDescriptor={true}
                onVerified={handleVerified}
                fallbackLabel="Cancel"
                onFallbackAction={() => setShowScanner(false)}
                submitting={submitting}
                errorMessage={errorMessage || ''}
            />
        </div>
    );
}
