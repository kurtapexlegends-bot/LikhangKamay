import { useState, useEffect } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Checkbox from '@/Components/Checkbox';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Store, Loader2, Mail, Lock } from 'lucide-react';

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

    const socialLoginHref = `/auth/google${data.remember ? '?remember=1' : ''}`;

    return (
        <GuestLayout quote="Every piece tells a story. Log in to continue yours.">
            <Head title="Log in" />

            {/* Header */}
            <div className="mb-8 text-center pt-2">
                <div className="inline-block p-3.5 bg-clay-50 rounded-2xl mb-5 border border-clay-100 shadow-sm shadow-clay-500/5">
                    <Lock className="w-7 h-7 text-clay-600" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">Welcome Back</h2>
                <p className="text-stone-500 mt-2 text-sm font-medium">Sign in to continue your artisanal journey.</p>
            </div>

            {status && (
                <div className="mb-6 font-medium text-sm text-green-600 bg-green-50 p-4 rounded-xl border border-green-100/50 text-center shadow-sm">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                
                {/* Email Field */}
                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-stone-700 font-bold mb-1.5" />
                    <div className="relative group">
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 pl-11 transition-all duration-300 focus:shadow-md focus:shadow-clay-500/10"
                            autoComplete="username"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="you@example.com"
                        />
                        <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-clay-500 transition-colors duration-300" />
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                {/* Password Field with Toggle */}
                <div>
                    <InputLabel htmlFor="password" value="Password" className="text-stone-700 font-bold mb-1.5" />
                    <div className="relative group">
                        <TextInput
                            id="password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={data.password}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 pl-11 pr-10 transition-all duration-300 focus:shadow-md focus:shadow-clay-500/10"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Enter your password"
                        />
                        <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-clay-500 transition-colors duration-300" />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-clay-600 focus:outline-none transition-colors duration-300"
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
                            className="text-clay-600 focus:ring-clay-500 rounded border-gray-300 group-hover:border-clay-400 transition-all duration-300"
                        />
                        <span className="ms-2.5 text-sm text-stone-600 group-hover:text-stone-900 transition-colors duration-300 font-medium">Remember me</span>
                    </label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-[13px] text-clay-600 hover:text-clay-800 font-bold hover:underline hover:underline-offset-4 transition-all"
                        >
                            Forgot password?
                        </Link>
                    )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                    <PrimaryButton 
                        className="w-full justify-center py-3.5 bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 rounded-xl text-base font-bold shadow-lg shadow-clay-500/25 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] border border-transparent overflow-hidden relative group" 
                        disabled={processing}
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {processing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </span>
                    </PrimaryButton>
                </div>
            </form>

            {/* Social Login Section */}
            <div className="mt-8">
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-stone-400 text-[11px] font-bold uppercase tracking-widest">Or continue with</span>
                    </div>
                </div>

                <a 
                    href={socialLoginHref}
                    className="group w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl bg-white hover:bg-gray-50/80 hover:border-gray-300 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98]"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" alt="Google" />
                    <span className="text-sm font-bold text-stone-600 group-hover:text-stone-900 transition-colors">Google</span>
                </a>
            </div>

            {/* Footer Links */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-4 text-center">
                <p className="text-sm text-stone-500 font-medium">
                    Don't have an account?{' '}
                    <Link href={route('register')} className="font-bold text-clay-600 hover:text-clay-800 hover:underline hover:underline-offset-4 transition-all">
                        Create Account
                    </Link>
                </p>
                
                <Link 
                    href="/artisan/register" 
                    className="group flex items-center gap-2 text-[13px] font-bold text-stone-600 bg-stone-50 border border-stone-200 px-5 py-2.5 rounded-full hover:bg-clay-50 hover:text-clay-700 hover:border-clay-200 transition-all duration-300 shadow-sm hover:shadow"
                >
                    <Store size={15} className="text-stone-400 group-hover:text-clay-500 transition-colors" />
                    Register as an Artisan
                </Link>
            </div>

        </GuestLayout>
    );
}
