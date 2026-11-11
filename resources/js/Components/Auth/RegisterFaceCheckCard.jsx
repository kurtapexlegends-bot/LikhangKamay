import React, { useState } from 'react';
import { ScanFace, CheckCircle2 } from 'lucide-react';
import InputError from '@/Components/InputError';
import FaceCaptureModal from '@/Components/Common/FaceCaptureModal';

export default function RegisterFaceCheckCard({
    selfieDataUrl,
    faceCheckSkipped = false,
    error,
    onVerified,
    onSkipped,
    onResetSkip,
}) {
    const [showFaceScanner, setShowFaceScanner] = useState(false);

    return (
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                        selfieDataUrl
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-stone-200 text-clay-700'
                    }`}>
                        <ScanFace size={16} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-stone-900">Quick Account Face Check</p>
                        <p className="text-[11px] text-stone-500 leading-snug mt-0.5">
                            {selfieDataUrl
                                ? 'Face check passed. Your first order checkout is ready.'
                                : faceCheckSkipped
                                ? 'Skipped for now — we will ask once before your first checkout.'
                                : 'Verify once now so future checkouts go straight through.'}
                        </p>
                    </div>
                </div>

                {selfieDataUrl && (
                    <button
                        type="button"
                        onClick={() => setShowFaceScanner(true)}
                        className="text-[11px] font-bold text-stone-600 hover:text-stone-900 underline shrink-0 cursor-pointer"
                    >
                        Retake
                    </button>
                )}
            </div>

            {selfieDataUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                    <img
                        src={selfieDataUrl}
                        alt="Captured verification selfie"
                        className="w-11 h-11 rounded-lg object-cover border border-emerald-200 shrink-0"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/images/placeholder.svg';
                        }}
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>Quick Face Check Verified</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            onResetSkip?.();
                            setShowFaceScanner(true);
                        }}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-white border border-stone-200 hover:border-clay-300 text-xs font-bold text-stone-800 transition cursor-pointer"
                    >
                        {faceCheckSkipped ? 'Turn On Camera' : 'Start Quick Face Check'}
                    </button>
                    {!faceCheckSkipped && (
                        <button
                            type="button"
                            onClick={() => onSkipped?.()}
                            className="min-h-[44px] px-3 py-2 rounded-xl text-[11px] font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer"
                        >
                            Skip until first order
                        </button>
                    )}
                </div>
            )}

            <InputError message={error} />

            <FaceCaptureModal
                show={showFaceScanner}
                onClose={() => setShowFaceScanner(false)}
                title="Quick Account Face Check"
                subtitle="Complete this one-time check now so your future checkouts go straight through."
                computeDescriptor={true}
                onVerified={(payload) => {
                    setShowFaceScanner(false);
                    onVerified?.(payload);
                }}
                fallbackLabel="No camera? Skip for now"
                onFallbackAction={() => {
                    setShowFaceScanner(false);
                    onSkipped?.();
                }}
                footerNote="No camera on this device? You can skip now and verify once before your first checkout."
            />
        </div>
    );
}
