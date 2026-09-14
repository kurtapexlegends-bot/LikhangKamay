import React from 'react';
import { Eye, ShieldCheck, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';

export default function LivenessChallengePrompt({
    scanPhase,
    isInsideOval,
    faceDetected,
    currentStep,
    step1Passed,
    currentChallenge,
    onRestart,
}) {
    const ChallengeIcon = currentChallenge?.icon || Sparkles;

    return (
        <div className="mt-3 w-full max-w-[310px] space-y-2">
            {scanPhase === 'align' && (
                <div className={`rounded-xl border py-2 px-3 flex items-center justify-center gap-2 text-center transition ${
                    isInsideOval
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900 font-bold text-xs'
                        : faceDetected
                        ? 'border-amber-200 bg-amber-50 text-amber-900 font-medium text-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 font-medium text-xs'
                }`}>
                    <Eye size={15} className={isInsideOval ? 'text-emerald-700' : 'text-stone-500'} />
                    <span>{isInsideOval ? 'Face aligned! Getting ready...' : 'Fit your face inside the oval'}</span>
                </div>
            )}

            {(scanPhase === 'challenge' || scanPhase === 'calibrating') && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-3 space-y-2 shadow-2xs animate-fade-in">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                            <ShieldCheck size={12} className="text-amber-700" />
                            Face Check Step {currentStep + 1} of 2
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full transition-all ${step1Passed ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-amber-600'}`} />
                            <span className={`w-2 h-2 rounded-full transition-all ${currentStep >= 2 ? 'bg-emerald-600' : 'bg-stone-300'}`} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-white/80 rounded-lg p-2 border border-amber-200/80">
                        <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center shrink-0 shadow-2xs transition-colors ${
                            scanPhase === 'calibrating' ? 'bg-stone-600 animate-pulse' : 'bg-amber-500'
                        }`}>
                            <ChallengeIcon size={18} />
                        </div>
                        <div className="text-left">
                            <h5 className="text-xs font-black text-stone-900 leading-tight">
                                {scanPhase === 'calibrating' ? `Get ready for Step ${currentStep + 1}...` : currentChallenge?.label}
                            </h5>
                            <p className="text-[10px] text-stone-500 font-medium">
                                {currentChallenge?.instruction}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {scanPhase === 'completed' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 px-3 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-700" />
                        <div>
                            <h6 className="text-xs font-bold text-emerald-950">Face Check Completed</h6>
                            <p className="text-[10px] text-emerald-700 font-medium">Photo ready for clock-in</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onRestart}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-stone-800 cursor-pointer bg-white px-2 py-1 rounded-lg border border-stone-200"
                    >
                        <RefreshCw size={11} /> Retake
                    </button>
                </div>
            )}
        </div>
    );
}
