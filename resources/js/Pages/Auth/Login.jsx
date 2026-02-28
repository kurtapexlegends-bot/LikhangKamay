import { useState, useEffect } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Checkbox from '@/Components/Checkbox';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Store, Loader2 } from 'lucide-react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    return (
        <GuestLayout quote="Every piece tells a story. Log in to continue yours.">
            <Head title="Log in" />

            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">Sign In</h2>
                <p className="text-gray-500 mt-1 text-sm">Enter your credentials to access your account.</p>
            </div>

            {status && (
                <div className="mb-4 font-medium text-sm text-green-600 bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                
                {/* Email Field */}
                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-gray-700 font-bold mb-1.5" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 transition-all"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="you@example.com"
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                {/* Password Field with Toggle */}
                <div className="relative">
                    <div className="mb-1.5">
                        <InputLabel htmlFor="password" value="Password" className="text-gray-700 font-bold" />
                    </div>
                    <div className="relative">
                        <TextInput
                            id="password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={data.password}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 pr-10 transition-all"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Enter your password"
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

                <div className="flex items-center justify-between">
                    {/* Remember Me */}
                    <label className="flex items-center cursor-pointer group">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="text-clay-600 focus:ring-clay-500 rounded border-gray-300 group-hover:border-clay-400 transition"
                        />
                        <span className="ms-2 text-sm text-gray-600 group-hover:text-gray-800 transition">Remember me</span>
                    </label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-sm mt-1 text-clay-600 hover:text-clay-800 font-medium hover:underline"
                        >
                            Forgot password?
                        </Link>
                    )}
                </div>

                {/* Submit Button with Loading State */}
                <PrimaryButton 
                    className="w-full justify-center py-3.5 bg-clay-600 hover:bg-clay-700 rounded-xl text-base font-bold shadow-lg shadow-clay-500/20 transition-all hover:-translate-y-0.5 active:scale-95" 
                    disabled={processing}
                >
                    {processing ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        'Sign In'
                    )}
                </PrimaryButton>
            </form>

            {/* Social Login Section */}
            <div className="mt-8">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-400 text-xs font-bold uppercase tracking-wider">Or continue with</span>
                    </div>
                </div>

                <div className="mt-6">
                    <a 
                        href="/auth/google" 
                        className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition bg-white hover:shadow-sm"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                        <span className="text-sm font-bold text-gray-600">Continue with Google</span>
                    </a>
                </div>
            </div>

            {/* Footer Links */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-2 text-center">
                <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link href={route('register')} className="font-bold text-clay-700 hover:text-clay-900 hover:underline">
                        Create Account
                    </Link>
                </p>
                
                <Link 
                    href="/artisan/register" 
                    className="flex items-center gap-2 text-xs font-bold text-clay-600 bg-clay-50 px-3 py-1.5 rounded-full hover:bg-clay-100 transition mt-1"
                >
                    <Store size={12} />
                    Register as an Artisan
                </Link>
            </div>

        </GuestLayout>
    );
}