import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';
import DocumentViewerModal from '@/Components/Seller/Approvals/DocumentViewerModal';
import { compareSelfieToId, computeDistance, distanceToMatchPercentage } from '@/lib/faceVerification';
import FileUploadField from '@/Pages/Auth/Partials/FileUploadField';
import KycFaceAndIdCheckCard from '@/Pages/Auth/Partials/KycFaceAndIdCheckCard';

export default function DocumentsStep({
    data = {},
    setData,
    errors = {},
    submit,
    processing,
    setStep,
    auth,
    existingDocuments,
    flaggedKeys = new Set(),
    revisionNotes = {},
    hasActiveRevision = false,
    kycSelfieUrl = null,
    kycLivenessVerified = false,
    kycVerificationMeta = null,
}) {
    const [viewingDoc, setViewingDoc] = useState(null);

    const handleSelfieCaptured = async (payload) => {
        const selfieDescriptor = payload?.descriptor || null;
        let nextScore = data?.face_match_score ?? kycVerificationMeta?.match_score ?? null;
        let nextIdDetected = data?.id_face_detected ?? kycVerificationMeta?.id_face_detected ?? null;
        let nextIdDescriptor = data?.id_face_descriptor || null;

        if (selfieDescriptor && nextIdDescriptor) {
            const dist = computeDistance(selfieDescriptor, nextIdDescriptor);
            nextScore = distanceToMatchPercentage(dist);
            nextIdDetected = true;
        } else if (selfieDescriptor && (existingDocuments?.valid_id_url || auth?.user?.valid_id_url)) {
            const idUrl = existingDocuments?.valid_id_url || auth?.user?.valid_id_url;
            if (!idUrl.toLowerCase().includes('.pdf')) {
                const res = await compareSelfieToId(idUrl, selfieDescriptor);
                nextScore = res.score;
                nextIdDetected = res.idFaceDetected;
                nextIdDescriptor = res.descriptor || null;
            }
        }

        setData?.((prev) => ({
            ...prev,
            selfie_data_url: payload?.photoData || null,
            face_descriptor: selfieDescriptor,
            id_face_descriptor: nextIdDescriptor,
            id_face_detected: nextIdDetected,
            face_match_score: nextScore,
        }));
    };

    const handleValidIdProcessed = (bioResult) => {
        if (!setData || !bioResult) return;
        setData((prev) => ({
            ...prev,
            id_face_descriptor: bioResult.descriptor || null,
            id_face_detected: bioResult.idFaceDetected,
            face_match_score: bioResult.score ?? prev.face_match_score,
            valid_id_camera_captured: Boolean(bioResult.cameraCaptured),
        }));
    };

    return (
        <>
            <form onSubmit={submit} className="p-4 sm:p-8 md:p-10">
                <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-clay-50 border border-clay-200 text-clay-700 shadow-xs shrink-0">
                            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">Verification Documents</h2>
                        </div>
                    </div>
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider sm:hidden">
                        Step 2 of 3
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    <FileUploadField
                        label="Business / Mayor's Permit"
                        description="or Barangay Micro-Business"
                        id="business_permit"
                        existingFileUrl={existingDocuments?.business_permit_url || auth?.user?.business_permit_url}
                        error={errors.business_permit}
                        isFlagged={hasActiveRevision && flaggedKeys.has('business_permit')}
                        revisionNote={revisionNotes.business_permit}
                        isVerifiedClean={hasActiveRevision && !flaggedKeys.has('business_permit')}
                        onView={(doc) => setViewingDoc(doc)}
                    />
                    <FileUploadField
                        label="DTI Registration Certificate"
                        id="dti_registration"
                        existingFileUrl={existingDocuments?.dti_registration_url || auth?.user?.dti_registration_url}
                        error={errors.dti_registration}
                        isFlagged={hasActiveRevision && flaggedKeys.has('dti_registration')}
                        revisionNote={revisionNotes.dti_registration}
                        isVerifiedClean={hasActiveRevision && !flaggedKeys.has('dti_registration')}
                        onView={(doc) => setViewingDoc(doc)}
                    />
                    <FileUploadField
                        label="Valid Government ID"
                        description="Front"
                        id="valid_id"
                        existingFileUrl={existingDocuments?.valid_id_url || auth?.user?.valid_id_url}
                        error={errors.valid_id}
                        enableCameraCapture
                        selfieDescriptor={data?.face_descriptor}
                        onBiometricAnalyzed={handleValidIdProcessed}
                        isFlagged={hasActiveRevision && flaggedKeys.has('valid_id')}
                        revisionNote={revisionNotes.valid_id}
                        isVerifiedClean={hasActiveRevision && !flaggedKeys.has('valid_id')}
                        onView={(doc) => setViewingDoc(doc)}
                    />
                    <FileUploadField
                        label="TIN / BIR Registration"
                        description="Form 2303 or TIN Card"
                        id="tin_id"
                        existingFileUrl={existingDocuments?.tin_id_url || auth?.user?.tin_id_url}
                        error={errors.tin_id}
                        isFlagged={hasActiveRevision && flaggedKeys.has('tin_id')}
                        revisionNote={revisionNotes.tin_id}
                        isVerifiedClean={hasActiveRevision && !flaggedKeys.has('tin_id')}
                        onView={(doc) => setViewingDoc(doc)}
                    />
                </div>

                <KycFaceAndIdCheckCard
                    selfieDataUrl={data?.selfie_data_url}
                    kycSelfieUrl={kycSelfieUrl}
                    kycLivenessVerified={kycLivenessVerified}
                    matchScore={data?.face_match_score ?? kycVerificationMeta?.match_score ?? null}
                    idFaceDetected={data?.id_face_detected ?? kycVerificationMeta?.id_face_detected ?? null}
                    hasValidId={Boolean(existingDocuments?.valid_id_url || auth?.user?.valid_id_url || data?.valid_id)}
                    flaggedByAdmin={hasActiveRevision && flaggedKeys.has('face_verification')}
                    adminNote={revisionNotes.face_verification}
                    onSelfieCaptured={handleSelfieCaptured}
                    error={errors.selfie_data_url}
                />

                <div className="mt-8 sm:mt-10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-stone-100 pt-5 sm:pt-6">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 cursor-pointer min-h-[44px]"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Shop Info</span>
                    </button>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-7 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-clay-700 active:bg-clay-800 disabled:opacity-50 cursor-pointer min-h-[44px]"
                    >
                        <span>{processing ? 'Saving...' : 'Continue to Payments'}</span>
                        <ArrowRight size={16} />
                    </button>
                </div>
            </form>

            {/* Document Viewer Modal */}
            <DocumentViewerModal
                isOpen={Boolean(viewingDoc)}
                onClose={() => setViewingDoc(null)}
                doc={viewingDoc}
            />
        </>
    );
}
