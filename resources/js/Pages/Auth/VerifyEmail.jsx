import PrimaryButton from '@/Components/PrimaryButton';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Mail, RefreshCw, LogOut, CheckCircle, Clock } from 'lucide-react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});
    const { flash = {} } = usePage().props;

    const submit = (e) => {
        e.preventDefault();
        post(route('verification.send'));
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
                        {status === 'verification-link-sent' && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                                <CheckCircle size={20} className="text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-green-800">Email Sent</p>
                                    <p className="text-xs text-green-700 mt-1">
                                        A verification link has been sent to your email address.
                                    </p>
                                </div>
                            </div>
                        )}

                        {flash.error && (
                            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                                <p className="text-sm font-bold text-red-800">Unable to send email</p>
                                <p className="mt-1 text-xs text-red-700">{flash.error}</p>
                            </div>
                        )}

                        {/* Instructions */}
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                            <Clock size={20} className="text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">Check Your Inbox</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    We sent a verification link to your email. Click the link once it arrives to verify your account and start using LikhangKamay.
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 text-center mb-6">
                            Didn't receive the email? Check your spam folder or click below to resend.
                        </p>

                        {/* Actions */}
                        <form onSubmit={submit}>
                            <button 
                                type="submit"
                                disabled={processing}
                                className="w-full flex items-center justify-center gap-2 bg-clay-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-clay-700 transition-all shadow-lg shadow-clay-200 disabled:opacity-50"
                            >
                                {processing ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={16} />
                                        Resend Verification Email
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
