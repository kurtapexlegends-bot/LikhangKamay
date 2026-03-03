import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { KeyRound, Mail, ArrowLeft, Loader2, CheckCircle, Send } from 'lucide-react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout quote="Don't worry, we'll help you get back in.">
            <Head title="Reset Password" />

            <div className="mb-8 text-center sm:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-clay-100 to-amber-50 mb-4 shadow-inner">
                    <KeyRound className="text-clay-600" size={24} strokeWidth={2.5} />
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight mb-2">
                    Forgot Password?
                </h1>
                <p className="text-stone-500 text-sm sm:text-base">
                    No problem! Enter your email and we'll send you a reset link.
                </p>
            </div>

            {/* Success Message */}
            {status && (
                <div className="mb-8 p-4 bg-green-50/80 border border-green-200 rounded-xl flex items-start gap-3 backdrop-blur-sm">
                    <CheckCircle size={20} className="text-green-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-green-800">Email Sent!</p>
                        <p className="text-xs text-green-700 mt-1 leading-relaxed">
                            Check your inbox for a password reset link. If you don't see it, check your spam folder.
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-stone-700 font-bold mb-1.5" />
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors">
                            <Mail size={18} />
                        </div>
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="pl-10 mt-1 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 py-3 transition-all hover:border-stone-300"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="pt-2">
                    <PrimaryButton 
                        className="relative w-full justify-center py-3.5 bg-gradient-to-r from-clay-600 to-clay-500 hover:from-clay-700 hover:to-clay-600 border-none rounded-xl text-base font-bold shadow-lg shadow-clay-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-clay-500/30 active:translate-y-0 active:shadow-md overflow-hidden group" 
                        disabled={processing}
                    >
                        {/* Shine effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"></div>
                        
                        <span className="relative flex items-center justify-center gap-2 w-full">
                            {processing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={18} className="mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    Send Reset Link
                                </>
                            )}
                        </span>
                    </PrimaryButton>
                </div>
            </form>

            <div className="mt-8 text-center border-t border-stone-100 pt-6">
                <Link 
                    href={route('login')} 
                    className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-clay-700 transition font-semibold group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                </Link>
            </div>
        </GuestLayout>
    );
}
