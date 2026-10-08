import React, { lazy, Suspense } from 'react';
import { Camera, Mail, Send, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ErrorBoundary from '@/Components/ErrorBoundary';

const LivenessFaceScanner = lazy(() => import('../LivenessFaceScanner'));

export default function ClockInIdentityCard({
    activeMobileTab,
    setActiveMobileTab,
    useOtpFallback,
    setUseOtpFallback,
    otpCode,
    setOtpCode,
    isSendingOtp,
    otpSent,
    otpError,
    otpCooldown,
    maskedEmail,
    handleRequestOtp,
    isOpen,
    capturedPhoto,
    setCapturedPhoto,
    setCameraError,
}) {
    return (
        <div className={`flex flex-col space-y-2.5 ${
            activeMobileTab === 'selfie' ? 'block' : 'hidden md:flex'
        }`}>
            <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    {useOtpFallback ? <Mail size={14} className="text-amber-600" /> : <Camera size={14} className="text-clay-600" />}
                    {useOtpFallback ? 'Email Security Code' : 'Quick Face Photo'}
                </span>
                <span className="text-[10px] font-semibold text-stone-400">Step 1 of 2</span>
            </div>

            {useOtpFallback ? (
                <div className="rounded-2xl bg-amber-50/60 border border-amber-200/80 p-4 sm:p-5 flex flex-col items-center justify-center text-center space-y-3 min-h-[240px] sm:min-h-[270px] md:min-h-[290px]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
                        <Mail size={22} className="text-amber-700" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900">Email Security Code</h4>
                        <p className="text-[11px] text-stone-600 font-medium max-w-xs leading-relaxed">
                            We will send a 6-digit verification code to your registered email address.
                        </p>
                        {maskedEmail && (
                            <span className="inline-block text-[11px] font-mono font-bold text-stone-800 bg-white px-2.5 py-0.5 rounded-full border border-stone-200 shadow-2xs mt-1">
                                {maskedEmail}
                            </span>
                        )}
                    </div>

                    {/* Send / Resend OTP Action */}
                    <div className="pt-0.5">
                        <button
                            type="button"
                            onClick={handleRequestOtp}
                            disabled={isSendingOtp || otpCooldown > 0}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-200 disabled:text-stone-500 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isSendingOtp ? (
                                <>
                                    <Loader2 size={13} className="animate-spin" />
                                    Sending Code...
                                </>
                            ) : otpCooldown > 0 ? (
                                <>
                                    <Mail size={13} />
                                    Resend Code ({otpCooldown}s)
                                </>
                            ) : (
                                <>
                                    <Send size={13} />
                                    {otpSent ? 'Resend Code' : 'Send Security Code'}
                                </>
                            )}
                        </button>
                    </div>

                    {/* OTP Input Form */}
                    <div className="space-y-1.5 w-full max-w-[200px]">
                        <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="0 0 0 0 0 0"
                            className="w-full text-center text-xl font-mono font-black tracking-[0.25em] px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white shadow-2xs text-stone-900"
                        />
                        {otpError && (
                            <p className="text-[10px] text-red-600 font-bold">{otpError}</p>
                        )}
                        {otpSent && !otpError && (
                            <p className="text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                                <CheckCircle2 size={11} /> Code sent! Please check your email.
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-stone-50/70 border border-stone-200/80 min-h-[290px]">
                    <ErrorBoundary
                        resetKey={isOpen}
                        fallback={({ retry }) => (
                            <div className="flex flex-col items-center justify-center p-6 text-center min-h-[290px] w-full gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-stone-800">Face check unavailable</p>
                                    <p className="text-xs text-stone-500 mt-1 max-w-xs">
                                        Unable to load the camera scanner. You can use your email security code to clock in.
                                    </p>
                                </div>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUseOtpFallback(true);
                                            if (!otpSent) handleRequestOtp();
                                        }}
                                        className="px-3.5 py-2 text-xs font-bold text-white bg-clay-600 hover:bg-clay-700 rounded-xl transition shadow-2xs"
                                    >
                                        Use Email Security Code
                                    </button>
                                    <button
                                        type="button"
                                        onClick={retry}
                                        className="px-3.5 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )}
                    >
                        <Suspense fallback={
                            <div className="flex flex-col items-center justify-center p-8 gap-3 min-h-[290px] w-full">
                                <Loader2 className="animate-spin text-clay-600" size={32} />
                                <span className="text-xs text-stone-500 font-medium">Loading camera & face check...</span>
                            </div>
                        }>
                            <LivenessFaceScanner
                                onVerified={({ photoData }) => {
                                    setCapturedPhoto(photoData);
                                    setActiveMobileTab('geofence');
                                }}
                                onError={(err) => {
                                    setCameraError(err);
                                }}
                            />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            )}

            <button
                type="button"
                onClick={() => {
                    const nextVal = !useOtpFallback;
                    setUseOtpFallback(nextVal);
                    setCapturedPhoto(null);
                    if (nextVal && !otpSent) {
                        handleRequestOtp();
                    }
                }}
                className="text-[10px] text-stone-500 hover:text-stone-800 font-bold underline text-center pt-0.5"
            >
                {useOtpFallback ? 'Switch back to Face Camera' : 'Camera not working? Use Email Security Code instead'}
            </button>

            {/* Mobile-Only CTA to advance to Step 2 */}
            <div className="pt-1 md:hidden">
                {capturedPhoto ? (
                    <button
                        type="button"
                        onClick={() => setActiveMobileTab('geofence')}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                        <span>Proceed to Store Location</span>
                        <CheckCircle2 size={14} />
                    </button>
                ) : (
                    <p className="text-[10px] text-stone-400 font-medium text-center">
                        Complete photo check to continue to location check.
                    </p>
                )}
            </div>
        </div>
    );
}
