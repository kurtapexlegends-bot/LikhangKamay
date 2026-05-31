import { useState, useEffect, useRef } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Checkbox from '@/Components/Checkbox';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Store, Loader2, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

    const emailRef = useRef(null);
    const passwordRef = useRef(null);

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    const handleEmailKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            passwordRef.current?.focus();
        }
    };

    const handleGoogleClick = () => {
        setIsGoogleSigningIn(true);
    };

    const socialLoginHref = `/auth/google${data.remember ? '?remember=1' : ''}`;

    // Staggered animation configurations
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.06
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
        <GuestLayout quote="Every piece tells a story. Log in to continue yours.">
            <Head title="Log in" />

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6 pt-4"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="mb-8 text-left">
                    <span className="text-[9px] font-sans tracking-[0.25em] uppercase text-clay-600 font-bold mb-2 block">Access Portal</span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-1.5">Welcome Back</h2>
                    <p className="text-stone-400 text-xs font-medium">Sign in to continue your artisanal journey.</p>
                </motion.div>

                {status && (
                    <motion.div 
                        variants={itemVariants}
                        className="mb-6 font-medium text-xs text-green-700 bg-green-50/80 p-3.5 rounded-xl border border-green-100/50 text-center shadow-sm"
                    >
                        {status}
                    </motion.div>
                )}

                {/* Form */}
                <motion.form 
                    variants={containerVariants}
                    onSubmit={submit} 
                    className="space-y-5"
                >
                    
                    {/* Email Field */}
                    <motion.div variants={itemVariants}>
                        <TextInput
                            ref={emailRef}
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                            autoComplete="username"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                            onKeyDown={handleEmailKeyDown}
                            floatingLabel="Email Address"
                            icon={Mail}
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </motion.div>

                    {/* Password Field */}
                    <motion.div variants={itemVariants}>
                        <TextInput
                            ref={passwordRef}
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="block w-full"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                            floatingLabel="Password"
                            icon={Lock}
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </motion.div>

                    {/* Controls Row */}
                    <motion.div 
                        variants={itemVariants}
                        className="flex items-center justify-between py-1"
                    >
                        {/* Remember Me */}
                        <label className="flex items-center cursor-pointer group py-1 select-none">
                            <Checkbox
                                name="remember"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="text-clay-600 focus:ring-clay-500 rounded border-stone-300 group-hover:border-clay-400 transition-all duration-300"
                            />
                            <span className="ms-2.5 text-[10px] text-stone-500 group-hover:text-stone-900 transition-colors duration-300 font-bold uppercase tracking-wider select-none">Remember me</span>
                        </label>

                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-[10px] text-clay-600 hover:text-clay-800 font-bold hover:underline hover:underline-offset-4 transition-all uppercase tracking-wider"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div variants={itemVariants}>
                        <PrimaryButton 
                            className="w-full justify-center py-3 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-bold uppercase tracking-widest border border-stone-900 shadow-md transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden relative group" 
                            disabled={processing}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Signing In...</span>
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </span>
                        </PrimaryButton>
                    </motion.div>
                </motion.form>

                {/* Social Login Section */}
                <motion.div variants={itemVariants} className="mt-8 flex flex-col items-center">
                    <div className="relative w-full mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-px bg-stone-200/60"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-4 bg-white text-stone-400 font-bold uppercase tracking-widest text-[9px]">Or continue with</span>
                        </div>
                    </div>

                    <a 
                        href={socialLoginHref}
                        onClick={handleGoogleClick}
                        className="group flex items-center justify-center gap-3 px-6 py-2.5 border border-stone-200/80 rounded-full bg-white hover:bg-stone-50 hover:border-stone-400 transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow"
                    >
                        {isGoogleSigningIn ? (
                            <>
                                <Loader2 size={14} className="animate-spin text-stone-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Connecting...</span>
                            </>
                        ) : (
                            <>
                                <img src="/images/google-icon.svg" className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" alt="Google" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 group-hover:text-stone-900 transition-colors">Google Account</span>
                            </>
                        )}
                    </a>
                </motion.div>

                {/* Footer Links */}
                <motion.div 
                    variants={itemVariants}
                    className="mt-10 pt-6 border-t border-stone-100 flex flex-col items-center gap-4 text-center"
                >
                    <p className="text-sm text-stone-500 font-medium">
                        Don't have an account?{' '}
                        <Link href={route('register')} className="font-bold text-clay-600 hover:text-clay-800 hover:underline hover:underline-offset-4 transition-all">
                            Create Account
                        </Link>
                    </p>
                    
                    <Link 
                        href="/artisan/register" 
                        className="group flex items-center gap-2 text-[11px] font-bold text-stone-600 bg-stone-50 border border-stone-200/80 px-5 py-3 rounded-full hover:bg-clay-50 hover:text-clay-700 hover:border-clay-200 transition-all duration-300 shadow-sm hover:shadow uppercase tracking-wider"
                    >
                        <Store size={14} className="text-stone-400 group-hover:text-clay-500 transition-colors" />
                        <span>Register as an Artisan</span>
                    </Link>
                </motion.div>
            </motion.div>

        </GuestLayout>
    );
}
