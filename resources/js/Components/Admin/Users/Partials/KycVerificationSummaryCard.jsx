import React from 'react';
import { ShieldCheck, ShieldAlert, ScanFace, AlertTriangle, CheckCircle2, Camera } from 'lucide-react';

export default function KycVerificationSummaryCard({ artisan }) {
    if (!artisan) return null;

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
        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {bandTheme.icon}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                            Identity &amp; Photo Verification
                        </h4>
                        <p className="text-[11px] text-stone-500">
                            Side-by-side live selfie comparison and document photo check
                        </p>
                    </div>
                </div>

                {score !== null && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${bandTheme.badge}`}>
                        <span>{score}/100</span>
                        <span>•</span>
                        <span>{meta?.band_label || 'Review Needed'}</span>
                    </span>
                )}
            </div>

            {score !== null && (
                <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div
                        className={`h-full transition-all ${bandTheme.bar}`}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    />
                </div>
            )}

            {/* Side-by-Side Live Selfie vs Valid ID Comparison */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Live Face Check
                        </span>
                        {livenessPassed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                <CheckCircle2 size={10} /> Passed
                            </span>
                        )}
                    </div>
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-stone-200 bg-white flex items-center justify-center">
                        {selfieUrl ? (
                            <img
                                src={selfieUrl}
                                alt="Live applicant selfie"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/images/placeholder.svg';
                                }}
                            />
                        ) : (
                            <div className="text-center px-2 text-[11px] text-stone-400 font-medium">
                                No live selfie captured
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Valid ID Portrait
                        </span>
                        {meta?.camera_captured && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-700 bg-white border border-stone-200 px-1.5 py-0.5 rounded-md">
                                <Camera size={10} /> Live Camera
                            </span>
                        )}
                    </div>
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-stone-200 bg-white flex items-center justify-center">
                        {validIdUrl ? (
                            validIdUrl.endsWith('.pdf') ? (
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
                            )
                        ) : (
                            <div className="text-center px-2 text-[11px] text-stone-400 font-medium">
                                No Valid ID uploaded
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Calibrated Criteria Matrix Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-2">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">Face Check</span>
                    <span className={`font-bold ${livenessPassed ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {livenessPassed ? 'Verified Live' : 'Pending'}
                    </span>
                </div>
                <div className="rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-2">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">Photo Match</span>
                    <span className={`font-bold ${matchScore === null ? 'text-stone-600' : matchScore >= 65 ? 'text-emerald-700' : matchScore >= 45 ? 'text-amber-700' : 'text-rose-700'}`}>
                        {matchScore !== null ? `${matchScore}%` : 'Needs Visual Check'}
                    </span>
                </div>
                <div className="rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-2">
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
                <div className="rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-2">
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
        </div>
    );
}
