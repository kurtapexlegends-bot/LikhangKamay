import { useState } from 'react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { KeyRound, Mail, Eye, EyeOff, Loader2, Shield } from 'lucide-react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout quote="Create a strong password to secure your account.">
            <Head title="Reset Password" />

            <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
                    <Shield size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight text-center">
                    Create New Password
                </h1>
                <p className="text-gray-500 mt-2 text-sm text-center">
                    Choose a strong password with at least 8 characters.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                {/* Email (Read-only) */}
                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-gray-700 font-bold mb-1.5" />
                    <div className="relative">
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full rounded-xl border-gray-200 bg-gray-100 text-gray-500 py-3 pl-11 cursor-not-allowed"
                            disabled
                        />
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel htmlFor="password" value="New Password" className="text-gray-700 font-bold mb-1.5" />
                        <div className="relative">
                            <TextInput
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={data.password}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 pr-10 transition-all"
                                autoComplete="new-password"
                                isFocused={true}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Min. 8 characters"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-clay-600 transition"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <InputError message={errors.password} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirm Password" className="text-gray-700 font-bold mb-1.5" />
                        <TextInput
                            id="password_confirmation"
                            type={showPassword ? "text" : "password"}
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 transition-all"
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            placeholder="Confirm password"
                        />
                        <InputError message={errors.password_confirmation} className="mt-2" />
                    </div>
                </div>

                <PrimaryButton 
                    className="w-full justify-center py-3.5 bg-green-600 hover:bg-green-700 rounded-xl text-base font-bold shadow-lg shadow-green-500/20 transition-all hover:-translate-y-0.5" 
                    disabled={processing}
                >
                    {processing ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <>
                            <KeyRound size={18} className="mr-2" />
                            Reset Password
                        </>
                    )}
                </PrimaryButton>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
                Your password will be updated immediately after submission.
            </p>
        </GuestLayout>
    );
}
