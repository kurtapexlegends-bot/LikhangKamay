import { useState, useRef } from 'react';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { KeyRound, Mail, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const passwordRef = useRef(null);
    const confirmPasswordRef = useRef(null);

    const submit = (e) => {
        e.preventDefault();
        
        const localErrors = {};
        let firstInvalidRef = null;

        if (!data.password || data.password === '') {
            localErrors.password = 'Password is required';
            if (!firstInvalidRef) firstInvalidRef = passwordRef;
        } else if (data.password.length < 8) {
            localErrors.password = 'Password must be at least 8 characters';
            if (!firstInvalidRef) firstInvalidRef = passwordRef;
        }

        if (data.password !== data.password_confirmation) {
            localErrors.password_confirmation = 'Passwords do not match';
            if (!firstInvalidRef) firstInvalidRef = confirmPasswordRef;
        }

        if (Object.keys(localErrors).length > 0) {
            setError(localErrors);
            firstInvalidRef?.current?.focus();
            return;
        }

        clearErrors();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
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
        <GuestLayout quote="Create a strong password to secure your account.">
            <Head title="Reset Password" />

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6 pt-4"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="text-left mb-8">
                    <span className="text-[9px] font-sans tracking-[0.25em] uppercase text-clay-600 font-bold mb-2 block">Security Portal</span>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-1.5 font-serif">
                        Create New Password
                    </h1>
                    <p className="text-stone-400 text-xs font-medium">
                        Choose a strong password with at least 8 characters.
                    </p>
                </motion.div>

                {/* Form */}
                <motion.form 
                    variants={containerVariants}
                    onSubmit={submit} 
                    className="space-y-5"
                >
                    {/* Email (Read-only, pre-filled) */}
                    <motion.div variants={itemVariants}>
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full bg-stone-100 hover:bg-stone-100 text-stone-500 border-stone-200/80 cursor-not-allowed"
                            disabled
                            floatingLabel="Email Address"
                            icon={Mail}
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </motion.div>

                    {/* Password Fields */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <TextInput
                                ref={passwordRef}
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="block w-full"
                                autoComplete="new-password"
                                isFocused={true}
                                onChange={(e) => setData('password', e.target.value)}
                                hasError={!!errors.password}
                                required
                                floatingLabel="New Password"
                                icon={Lock}
                            />
                        </div>
                        <div>
                            <TextInput
                                ref={confirmPasswordRef}
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                className="block w-full"
                                autoComplete="new-password"
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                hasError={!!errors.password_confirmation}
                                required
                                floatingLabel="Confirm Password"
                                icon={Lock}
                            />
                        </div>
                    </motion.div>
                    <InputError message={errors.password} className="mt-2" />
                    <InputError message={errors.password_confirmation} className="mt-2" />

                    {/* Submit Button */}
                    <motion.div variants={itemVariants}>
                        <PrimaryButton 
                            className="relative w-full justify-center py-3 bg-stone-900 hover:bg-stone-850 border-stone-900 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md overflow-hidden group" 
                            disabled={processing}
                        >
                            <span className="relative flex items-center justify-center gap-2">
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <KeyRound size={14} className="text-stone-300" />
                                        <span>Reset Password</span>
                                    </>
                                )}
                            </span>
                        </PrimaryButton>
                    </motion.div>
                </motion.form>

                {/* Footer Notice */}
                <motion.p 
                    variants={itemVariants}
                    className="text-center text-[10px] text-stone-400 font-semibold uppercase tracking-wider mt-6"
                >
                    Your password will be updated immediately upon submission.
                </motion.p>
            </motion.div>
        </GuestLayout>
    );
}
