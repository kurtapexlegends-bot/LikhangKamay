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

            <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-clay-500 to-clay-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-clay-200">
                    <KeyRound size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight text-center">
                    Forgot Password?
                </h1>
                <p className="text-gray-500 mt-2 text-sm text-center">
                    No problem! Enter your email and we'll send you a reset link.
                </p>
            </div>

            {/* Success Message */}
            {status && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                    <CheckCircle size={20} className="text-green-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-green-800">Email Sent!</p>
                        <p className="text-xs text-green-700 mt-1">
                            Check your inbox for a password reset link. If you don't see it, check your spam folder.
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-gray-700 font-bold mb-1.5" />
                    <div className="relative">
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 pl-11 transition-all"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="you@example.com"
                        />
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <PrimaryButton 
                    className="w-full justify-center py-3.5 bg-clay-600 hover:bg-clay-700 rounded-xl text-base font-bold shadow-lg shadow-clay-500/20 transition-all hover:-translate-y-0.5" 
                    disabled={processing}
                >
                    {processing ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <>
                            <Send size={18} className="mr-2" />
                            Send Reset Link
                        </>
                    )}
                </PrimaryButton>
            </form>

            <div className="mt-8 text-center border-t border-gray-100 pt-6">
                <Link 
                    href={route('login')} 
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-clay-700 transition font-medium"
                >
                    <ArrowLeft size={16} />
                    Back to Login
                </Link>
            </div>
        </GuestLayout>
    );
}
