import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, ScanFace, AlertTriangle, CheckCircle2, Camera, Maximize2 } from 'lucide-react';
import DocumentMagnifierModal from '@/Components/Common/DocumentMagnifierModal';

export default function KycVerificationSummaryCard({ artisan, onInspectPhoto = null }) {
    const [localPreview, setLocalPreview] = useState(null);

    if (!artisan) return null;

    const handleExpandPhoto = (e, payload) => {
        e.stopPropagation();
        if (!payload?.url) return;
        if (onInspectPhoto) {
            onInspectPhoto(payload);
            return;
        }
        setLocalPreview(payload);
    };

    const meta = artisan.kyc_verification_meta || null;
    const selfieUrl = artisan.kyc_selfie_url || null;
    const validIdUrl = artisan.valid_id || null;

    const score = meta?.confidence_score ?? null;
    const band = meta?.band || 'manual_review';

    const bandTheme =
        band === 'strong'
            ? {
                  badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  bar: 'bg-emerald-500',
                  icon: <ShieldCheck size={16} className="text-emerald-600 shrink-0" />,
              }
            : band === 'high_risk'
            ? {
                  badge: 'bg-rose-50 text-rose-800 border-rose-200',
                  bar: 'bg-rose-500',
                  icon: <ShieldAlert size={16} className="text-rose-600 shrink-0" />,
              }
            : {
                  badge: 'bg-amber-50 text-amber-800 border-amber-200',
                  bar: 'bg-amber-500',
                  icon: <ScanFace size={16} className="text-amber-600 shrink-0" />,
              };

    const matchScore = meta?.match_score ?? null;
    const signals = Array.isArray(meta?.signals) ? meta.signals : [];
    const livenessPassed = Boolean(meta?.liveness_passed || artisan.kyc_liveness_verified_at);

    return (
        <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {bandTheme.icon}
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                        Identity &amp; Photo Verification
                    </h4>
                </div>

                {score !== null && (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${bandTheme.badge}`}>
                        <span>{score}/100</span>
                        <span>•</span>
                        <span>{meta?.band_label || 'Review Needed'}</span>
                    </span>
                )}
            </div>

            {score !== null && (
                <div className="h-1 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div
                        className={`h-full transition-all ${bandTheme.bar}`}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    />
                </div>
            )}

            {/* Side-by-Side Live Selfie vs Valid ID Comparison */}
            <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-stone-200 bg-stone-50/70 p-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Live Face Check
                        </span>
                        {livenessPassed && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                <CheckCircle2 size={9} /> Passed
                            </span>
                        )}
                    </div>
                    {selfieUrl ? (
                        <button
                            type="button"
                            onClick={(e) => handleExpandPhoto(e, {
                                key: 'kyc_selfie',
                                label: 'Live Face Check Selfie',
                                subtitle: 'Face Check & ID Photo Inspection Magnifier',
                                url: selfieUrl,
                            })}
                            aria-label="Expand live face check photo"
                            className="group relative h-24 sm:h-28 w-full overflow-hidden rounded-md border border-stone-200 bg-white flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40"
                        >
                            <img
                                src={selfieUrl}
                                alt="Live applicant selfie"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/images/placeholder.svg';
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/20 group-hover:opacity-100 transition duration-150">
                                <span className="p-1.5 rounded-full bg-stone-900/75 text-white shadow-sm">
                                    <Maximize2 size={13} />
                                </span>
                            </div>
                        </button>
                    ) : (
                        <div className="h-24 sm:h-28 w-full overflow-hidden rounded-md border border-stone-200 bg-white flex items-center justify-center">
                            <div className="text-center px-2 text-[11px] text-stone-400 font-medium">
                                No live selfie captured
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-lg border border-stone-200 bg-stone-50/70 p-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Valid ID Portrait
                        </span>
                        {meta?.camera_captured && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-stone-700 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
                                <Camera size={9} /> Camera
                            </span>
                        )}
                    </div>
                    {validIdUrl ? (
                        <button
                            type="button"
                            onClick={(e) => handleExpandPhoto(e, {
                                key: 'valid_id',
                                label: 'Valid Government ID (Front)',
                                subtitle: 'Face Check & ID Photo Inspection Magnifier',
                                url: validIdUrl,
                            })}
                            aria-label="Expand valid ID portrait"
                            className="group relative h-24 sm:h-28 w-full overflow-hidden rounded-md border border-stone-200 bg-white flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40"
                        >
                            {String(validIdUrl).toLowerCase().split('?')[0].endsWith('.pdf') ? (
                                <div className="text-center px-2 text-[11px] text-stone-500 font-semibold">
                                    Uploaded as PDF (Open Preview)
                                </div>
                            ) : (
                                <img
                                    src={validIdUrl}
                                    alt="Valid government ID"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/images/placeholder.svg';
                                    }}
                                />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/20 group-hover:opacity-100 transition duration-150">
                                <span className="p-1.5 rounded-full bg-stone-900/75 text-white shadow-sm">
                                    <Maximize2 size={13} />
                                </span>
                            </div>
                        </button>
                    ) : (
                        <div className="h-24 sm:h-28 w-full overflow-hidden rounded-md border border-stone-200 bg-white flex items-center justify-center">
                            <div className="text-center px-2 text-[11px] text-stone-400 font-medium">
                                No Valid ID uploaded
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Calibrated Criteria Matrix Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                <div className="rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-1.5">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">Face Check</span>
                    <span className={`font-bold ${livenessPassed ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {livenessPassed ? 'Verified Live' : 'Pending'}
                    </span>
                </div>
                <div className="rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-1.5">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">Photo Match</span>
                    <span className={`font-bold ${matchScore === null ? 'text-stone-600' : matchScore >= 65 ? 'text-emerald-700' : matchScore >= 45 ? 'text-amber-700' : 'text-rose-700'}`}>
                        {matchScore !== null ? `${matchScore}%` : 'Needs Visual Check'}
                    </span>
                </div>
                <div className="rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-1.5">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">Photo Details</span>
                    <span className={`font-bold capitalize ${
                        meta?.forensics_status === 'high_risk'
                            ? 'text-rose-700'
                            : meta?.forensics_status === 'review_flagged'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                    }`}>
                        {meta?.forensics_status ? String(meta.forensics_status).replace(/_/g, ' ') : 'Normal'}
                    </span>
                </div>
                <div className="rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-1.5">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">Prior Records</span>
                    <span className={`font-bold ${meta?.banned_face_match ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {meta?.banned_face_match ? 'Match Flagged' : 'Clear'}
                    </span>
                </div>
            </div>

            {signals.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                        <span>Notes for Your Visual Inspection</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-900/90">
                        {signals.map((sig, i) => (
                            <li key={i}>{sig}</li>
                        ))}
                    </ul>
                </div>
            )}
            {!onInspectPhoto && (
                <DocumentMagnifierModal
                    viewingDoc={localPreview}
                    onClose={() => setLocalPreview(null)}
                />
            )}
        </div>
    );
}
