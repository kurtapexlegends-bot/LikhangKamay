import React, { useState } from 'react';
import { ScanFace, CheckCircle2, RefreshCw, AlertTriangle, Info, Lock } from 'lucide-react';
import FaceCaptureModal from '@/Components/Common/FaceCaptureModal';
import { classifyMatchScore } from '@/lib/faceVerification';

export default function KycFaceAndIdCheckCard({
    selfieDataUrl,
    kycSelfieUrl,
    kycLivenessVerified,
    matchScore,
    idFaceDetected,
    hasValidId,
    flaggedByAdmin = false,
    isAddressed = false,
    isHighlighted = false,
    isVerifiedClean = false,
    adminNote = null,
    onSelfieCaptured,
    error = null,
}) {
    const [showScanner, setShowScanner] = useState(false);
    const [cameraSkipped, setCameraSkipped] = useState(false);

    const effectiveSelfieUrl = selfieDataUrl || kycSelfieUrl;
    const isVerified = Boolean(selfieDataUrl || kycLivenessVerified);
    const isLocked = Boolean(isVerifiedClean && isVerified && !flaggedByAdmin);
    const matchTier = classifyMatchScore(matchScore);

    const handleVerified = (payload) => {
        setShowScanner(false);
        setCameraSkipped(false);
        onSelfieCaptured?.(payload);
    };

    const flaggedAndAddressed = Boolean(flaggedByAdmin && isAddressed);

    return (
        <div
            id="face_verification"
            data-revision-target="face_verification"
            className={`scroll-mt-20 mt-6 rounded-2xl border p-4 sm:p-5 space-y-4 transition-all duration-300 ${
                flaggedAndAddressed
                    ? 'border-emerald-300 bg-emerald-50/35'
                    : flaggedByAdmin
                    ? 'border-amber-300 bg-amber-50/40'
                    : isLocked
                    ? 'border-stone-200 bg-stone-50/60'
                    : isVerified
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-stone-200 bg-stone-50/60'
            } ${isHighlighted ? 'ring-2 ring-clay-500 ring-offset-2' : ''}`}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isVerified
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-stone-200 text-clay-700'
                    }`}>
                        <ScanFace size={18} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                                Quick Face Check &amp; Identity Photo Match
                            </h3>
                            {flaggedAndAddressed ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                    <CheckCircle2 size={11} /> Updated
                                </span>
                            ) : flaggedByAdmin ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                    Needs Update
                                </span>
                            ) : isLocked ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    <Lock size={11} /> Approved
                                </span>
                            ) : isVerified ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                    <CheckCircle2 size={11} /> Face Check Completed
                                </span>
                            ) : null}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                            Take a quick live selfie to confirm you match your uploaded Valid Government ID.
                        </p>
                    </div>
                </div>

                {isVerified && !isLocked && !showScanner && (
                    <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 min-h-[38px] cursor-pointer"
                    >
                        <RefreshCw size={13} />
                        Retake Face Check
                    </button>
                )}
            </div>

            {flaggedByAdmin && adminNote && (
                <div className={`rounded-xl border px-3 py-2 text-xs font-medium flex items-start gap-2 transition-colors ${
                    flaggedAndAddressed
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-amber-300 bg-amber-100/70 text-amber-950'
                }`}>
                    {flaggedAndAddressed ? (
                        <CheckCircle2 size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                        <AlertTriangle size={14} className="text-amber-700 shrink-0 mt-0.5" />
                    )}
                    <span>{adminNote}</span>
                </div>
            )}

            {!isVerified && !cameraSkipped ? (
                <div className="rounded-xl border border-stone-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-stone-600 leading-relaxed">
                        Start a quick camera check after or while attaching your documents to automatically pair your live selfie with your Valid ID.
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shrink-0 min-h-[44px] cursor-pointer"
                    >
                        <ScanFace size={14} />
                        <span>Start Quick Face Check</span>
                    </button>
                </div>
            ) : cameraSkipped && !effectiveSelfieUrl ? (
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-2 text-xs text-stone-600">
                        <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>
                            Camera check skipped. Your application can still be submitted, and our verification team will review your documents manually.
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="px-3.5 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 min-h-[40px] shrink-0 cursor-pointer"
                    >
                        Try Camera Again
                    </button>
                </div>
            ) : effectiveSelfieUrl ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-stone-200 bg-white p-3.5">
                    <img
                        src={effectiveSelfieUrl}
                        alt="Captured selfie"
                        className="w-20 h-20 rounded-xl object-cover border border-stone-200 shrink-0"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/images/placeholder.svg';
                        }}
                    />
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <p className="text-xs font-bold text-stone-900">
                            Live Face Check Recorded
                        </p>
                        {hasValidId ? (
                            matchScore !== null && matchScore !== undefined ? (
                                <div className="space-y-1">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${matchTier.badgeClass}`}>
                                        Identity Photo Match: {matchScore}% • {matchTier.label}
                                    </span>
                                    {matchScore < 65 && !isLocked && (
                                        <p className="text-[11px] text-amber-800 leading-snug">
                                            Tip: Retake in brighter lighting or upload a clearer photo of your Valid ID front. Applications can still be submitted for team review.
                                        </p>
                                    )}
                                </div>
                            ) : idFaceDetected === false ? (
                                <p className="text-[11px] text-amber-800">
                                    Could not automatically spot a clear portrait on your uploaded ID. Ensure the front of your ID is well-lit — our reviewer will inspect it manually.
                                </p>
                            ) : (
                                <p className="text-[11px] text-stone-500">
                                    Your live selfie is saved and paired with your Valid Government ID.
                                </p>
                            )
                        ) : (
                            <p className="text-[11px] text-stone-500">
                                Upload your Valid Government ID above to automatically check your selfie against your ID portrait.
                            </p>
                        )}
                    </div>
                </div>
            ) : null}

            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

            <FaceCaptureModal
                show={showScanner}
                onClose={() => setShowScanner(false)}
                title="Quick Face Check & Identity Match"
                subtitle="Take a quick live selfie to confirm you match your uploaded Valid Government ID."
                computeDescriptor={true}
                onVerified={handleVerified}
                fallbackLabel="Camera unavailable — continue with manual review"
                onFallbackAction={() => {
                    setShowScanner(false);
                    setCameraSkipped(true);
                }}
            />
        </div>
    );
}
