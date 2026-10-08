import React from 'react';
import { ShieldCheck, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ClockInHeader({
    onClose,
    submitError,
    activeMobileTab,
    setActiveMobileTab,
    capturedPhoto,
    isLocationVerified,
    isWithinGeofence,
    locationStatus,
}) {
    return (
        <div className="border-b border-stone-100 pb-3 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/80 shadow-2xs">
                        <ShieldCheck size={18} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900 leading-tight">Clock In Verification</h3>
                        <p className="text-xs text-stone-500 font-medium">Photo Check & Store Location Required</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Submit Error Banner (e.g. Workshop Closed) */}
            {submitError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5 shadow-2xs">
                    <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs font-semibold leading-relaxed">
                        {submitError}
                    </div>
                </div>
            )}

            {/* 2-Step Verification Progress Bar (Acts as Interactive Tab Bar on Mobile) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                    type="button"
                    onClick={() => setActiveMobileTab('selfie')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all text-left ${
                        capturedPhoto 
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' 
                            : activeMobileTab === 'selfie'
                                ? 'bg-clay-50 border-clay-300 text-clay-900 shadow-2xs ring-1 ring-clay-400/30'
                                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                        capturedPhoto ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
                    }`}>
                        {capturedPhoto ? <CheckCircle2 size={10} /> : '1'}
                    </div>
                    <span className="truncate">1. Photo Check</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveMobileTab('geofence')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all text-left ${
                        isLocationVerified && isWithinGeofence
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' 
                            : isLocationVerified && !isWithinGeofence
                                ? 'bg-rose-50/90 border-rose-200 text-rose-800'
                                : activeMobileTab === 'geofence'
                                    ? 'bg-clay-50 border-clay-300 text-clay-900 shadow-2xs ring-1 ring-clay-400/30'
                                    : locationStatus === 'error'
                                        ? 'bg-amber-50/80 border-amber-200 text-amber-800'
                                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                        isLocationVerified && isWithinGeofence
                            ? 'bg-emerald-600 text-white' 
                            : isLocationVerified && !isWithinGeofence
                                ? 'bg-rose-600 text-white'
                                : locationStatus === 'error'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-stone-200 text-stone-600'
                    }`}>
                        {isLocationVerified && isWithinGeofence ? <CheckCircle2 size={10} /> : '2'}
                    </div>
                    <span className="truncate">2. Store Location</span>
                </button>
            </div>
        </div>
    );
}
