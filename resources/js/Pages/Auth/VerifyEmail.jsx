import PrimaryButton from '@/Components/PrimaryButton';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Mail, RefreshCw, LogOut, CheckCircle, Clock } from 'lucide-react';

export default function VerifyEmail({ status, verification }) {
    const verifyForm = useForm({ code: '' });
    const resendForm = useForm({});
    const { flash = {} } = usePage().props;
    const [resendCountdown, setResendCountdown] = useState(verification?.resendAvailableInSeconds ?? 0);

    useEffect(() => {
        setResendCountdown(verification?.resendAvailableInSeconds ?? 0);
    }, [verification?.resendAvailableInSeconds]);

    useEffect(() => {
        if (resendCountdown <= 0) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            setResendCountdown((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);

                    return 0;
                }

                return current - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [resendCountdown]);

    const submitCode = (e) => {
        e.preventDefault();
        verifyForm.post(route('verification.code'));
    };

    const resendCode = (e) => {
        e.preventDefault();
        resendForm.post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verify Your Email" />

            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 pt-6">
                        {/* Icon & Header */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-clay-500 to-clay-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-clay-200">
                                <Mail size={32} className="text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
                            <p className="text-gray-500 text-sm">One more step to get started!</p>
                        </div>
                        
                        {/* Success Message */}
                        {status === 'verification-code-sent' && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                                <CheckCircle size={20} className="text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-green-800">Code Sent</p>
                                    <p className="text-xs text-green-700 mt-1">
                                        A verification code has been sent to {verification?.email}.
                                    </p>
                                </div>
                            </div>
                        )}

                        {flash.error && (
                            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                                <p className="text-sm font-bold text-red-800">Unable to continue verification</p>
                                <p className="mt-1 text-xs text-red-700">{flash.error}</p>
                            </div>
                        )}

                        {/* Instructions */}
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                            <Clock size={20} className="text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">Check Your Inbox</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    {verification?.hasActiveCode
                                        ? 'We sent a 6-digit verification code to your email. Enter it below to verify your account and continue.'
                                        : verification?.expiresAt
                                            ? 'Your previous verification code has expired. Request a new code to continue.'
                                            : 'Request a verification code, then enter it below to verify your account and continue.'}
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 text-center mb-6">
                            Didn't receive the code? Check your spam folder or request another one.
                        </p>

                        <form onSubmit={submitCode} className="space-y-4">
                            <div>
                                <label htmlFor="code" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                                    Verification Code
                                </label>
                                <input
                                    id="code"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={verifyForm.data.code}
                                    onChange={(e) => verifyForm.setData('code', e.target.value.replace(/\D/g, ''))}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-gray-900 shadow-sm outline-none transition focus:border-clay-500 focus:ring-2 focus:ring-clay-200"
                                    placeholder="000000"
                                    autoComplete="one-time-code"
                                />
                                {verifyForm.errors.code && (
                                    <p className="mt-2 text-sm font-medium text-red-600">{verifyForm.errors.code}</p>
                                )}
                                {verification?.hasActiveCode && verification?.expiresAt && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        Current code expires at {new Date(verification.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
                                    </p>
                                )}
                            </div>

                            <PrimaryButton
                                type="submit"
                                disabled={verifyForm.processing || verifyForm.data.code.length !== 6}
                                className="w-full justify-center"
                            >
                                {verifyForm.processing ? 'Verifying...' : 'Verify Code'}
                            </PrimaryButton>
                        </form>

                        <form onSubmit={resendCode} className="mt-3">
                            <button
                                type="submit"
                                disabled={resendForm.processing || resendCountdown > 0}
                                className="w-full flex items-center justify-center gap-2 bg-clay-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-clay-700 transition-all shadow-lg shadow-clay-200 disabled:opacity-50"
                            >
                                {resendForm.processing ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={16} />
                                        {resendCountdown > 0
                                            ? `Resend Available in ${resendCountdown}s`
                                            : 'Send New Verification Code'}
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                            <WorkspaceLogoutLink
                                variant="button"
                                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
                            >
                                <LogOut size={14} />
                                Sign out and use different email
                            </WorkspaceLogoutLink>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 mt-6">
                        Need help? Contact us at support@likhangkamay.ph
                    </p>
                </div>
            </div>
        </GuestLayout>
    );
}
