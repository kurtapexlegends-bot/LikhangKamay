import PrimaryButton from '@/Components/PrimaryButton';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Mail, RefreshCw, LogOut, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

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

    // Staggered animation configurations
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { 
            opacity: 1, 
            y: 0, 
            transition: { type: "spring", stiffness: 260, damping: 22 } 
        }
    };

    return (
        <GuestLayout quote="Complete verification to claim your artisan studio.">
            <Head title="Verify Your Email" />

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6 pt-4"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="text-left">
                    <span className="text-[9px] font-sans tracking-[0.25em] uppercase text-clay-600 font-bold mb-2 block">Security Check</span>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-1.5">Verify Your Email</h1>
                    <p className="text-stone-400 text-xs font-medium">Enter the security code to access your studio.</p>
                </motion.div>
                
                {/* Success Message */}
                {status === 'verification-code-sent' && (
                    <motion.div 
                        variants={itemVariants}
                        className="mb-4 p-4 bg-emerald-50/80 border border-emerald-100/60 rounded-xl flex items-start gap-3"
                    >
                        <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Code Sent</p>
                            <p className="text-xs text-emerald-700 mt-1">
                                A verification code has been sent to {verification?.email}.
                            </p>
                        </div>
                    </motion.div>
                )}

                {flash.error && (
                    <motion.div 
                        variants={itemVariants}
                        className="mb-4 rounded-xl border border-rose-200 bg-rose-50/85 p-4"
                    >
                        <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Verification Failed</p>
                        <p className="mt-1 text-xs text-rose-700">{flash.error}</p>
                    </motion.div>
                )}

                {/* Instructions */}
                <motion.div 
                    variants={itemVariants}
                    className="mb-4 p-4 bg-amber-50/80 border border-amber-100/60 rounded-xl flex items-start gap-3"
                >
                    <Clock size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Check Your Inbox</p>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                            {verification?.hasActiveCode
                                ? 'We sent a 6-digit verification code to your email. Enter it below to verify.'
                                : verification?.expiresAt
                                    ? 'Your verification code has expired. Request a new code to continue.'
                                    : 'Request a verification code, then enter it below to continue.'}
                        </p>
                    </div>
                </motion.div>

                {/* Verification Code Form */}
                <motion.form 
                    variants={containerVariants}
                    onSubmit={submitCode} 
                    className="space-y-4"
                >
                    <motion.div variants={itemVariants}>
                        <label htmlFor="code" className="mb-2 block text-[9px] font-bold uppercase tracking-[0.25em] text-stone-500">
                            Verification Code
                        </label>
                        <input
                            id="code"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={verifyForm.data.code}
                            onChange={(e) => verifyForm.setData('code', e.target.value.replace(/\D/g, ''))}
                            className="w-full rounded-xl border border-stone-200 bg-stone-50/30 px-4 py-3.5 text-center text-3xl font-serif font-semibold tracking-[0.4em] text-stone-900 shadow-inner outline-none transition focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 focus:bg-white"
                            placeholder="000000"
                            autoComplete="one-time-code"
                        />
                        {verifyForm.errors.code && (
                            <p className="mt-2 text-xs font-medium text-rose-600">{verifyForm.errors.code}</p>
                        )}
                        {verification?.hasActiveCode && verification?.expiresAt && (
                            <p className="mt-2 text-[10px] text-stone-400">
                                Code expires at {new Date(verification.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
                            </p>
                        )}
                    </motion.div>

                    <motion.div variants={itemVariants} className="pt-2">
                        <PrimaryButton
                            type="submit"
                            disabled={verifyForm.processing || verifyForm.data.code.length !== 6}
                            className="w-full justify-center py-3 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-bold uppercase tracking-widest border border-stone-900 shadow-md transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
                        >
                            {verifyForm.processing ? 'Verifying...' : 'Verify Code'}
                        </PrimaryButton>
                    </motion.div>
                </motion.form>

                {/* Resend Action Form */}
                <motion.form 
                    variants={itemVariants}
                    onSubmit={resendCode} 
                    className="mt-3"
                >
                    <button
                        type="submit"
                        disabled={resendForm.processing || resendCountdown > 0}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-stone-200/80 text-stone-600 py-3 rounded-xl font-bold text-xs hover:bg-stone-50 hover:border-stone-400 hover:text-stone-900 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest"
                    >
                        {resendForm.processing ? (
                            <>
                                <RefreshCw size={14} className="animate-spin text-stone-400" />
                                <span>Sending...</span>
                            </>
                        ) : (
                            <>
                                <Mail size={14} className="text-stone-400" />
                                <span>
                                    {resendCountdown > 0
                                        ? `Resend Available in ${resendCountdown}s`
                                        : 'Send New Code'}
                                </span>
                            </>
                        )}
                    </button>
                </motion.form>

                {/* Logout Link Footer */}
                <motion.div 
                    variants={itemVariants}
                    className="mt-8 pt-6 border-t border-stone-100 text-center"
                >
                    <WorkspaceLogoutLink
                        variant="button"
                        className="inline-flex items-center gap-2 text-xs text-stone-400 hover:text-clay-700 transition uppercase tracking-wider font-bold"
                    >
                        <LogOut size={14} className="text-stone-400" />
                        <span>Sign Out</span>
                    </WorkspaceLogoutLink>
                </motion.div>

                {/* Support Footnote */}
                <motion.p 
                    variants={itemVariants}
                    className="text-center text-[10px] text-stone-400 font-medium"
                >
                    Need assistance? Contact likhangkamaybusiness@gmail.com
                </motion.p>
            </motion.div>
        </GuestLayout>
    );
}
