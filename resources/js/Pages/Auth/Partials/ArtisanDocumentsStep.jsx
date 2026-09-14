import React from 'react';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import Checkbox from '@/Components/Checkbox';
import PasswordStrengthIndicator from '@/Components/PasswordStrengthIndicator';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArtisanDocumentsStep({
    data,
    setData,
    errors,
    clearErrors,
    handleKeyDown,
    passwordRef,
    confirmPasswordRef,
    handleTermsCheckboxChange,
    openLegalModal,
    itemVariants,
}) {
    return (
        <>
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
                        onChange={(e) => {
                            setData('password', e.target.value);
                            if (errors.password) clearErrors('password');
                        }}
                        onKeyDown={(e) => handleKeyDown(e, confirmPasswordRef)}
                        hasError={!!errors.password}
                        required
                        floatingLabel="Password"
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
                        onChange={(e) => {
                            setData('password_confirmation', e.target.value);
                            if (errors.password_confirmation) clearErrors('password_confirmation');
                        }}
                        hasError={!!errors.password_confirmation}
                        required
                        floatingLabel="Confirm Password"
                        icon={Lock}
                    />
                </div>
            </motion.div>
            <InputError message={errors.password} className="mt-2" />

            {/* Real-time Password Matching status indicator */}
            {data.password && data.password_confirmation && (
                <motion.div 
                    variants={itemVariants}
                    className={`flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl border transition-all duration-300 ${
                        data.password === data.password_confirmation
                            ? 'text-emerald-700 bg-emerald-50/80 border-emerald-100/60 shadow-sm shadow-emerald-500/5'
                            : 'text-amber-700 bg-amber-50/80 border-amber-100/60 shadow-sm shadow-amber-500/5'
                    }`}
                >
                    {data.password === data.password_confirmation ? (
                        <>
                            <CheckCircle2 size={15} className="shrink-0 text-emerald-600 animate-pulse" />
                            <span>Passwords match successfully.</span>
                        </>
                    ) : (
                        <>
                            <AlertCircle size={15} className="shrink-0 text-amber-600 animate-pulse" />
                            <span>Passwords do not match yet.</span>
                        </>
                    )}
                </motion.div>
            )}

            {/* Password Strength Indicator */}
            {data.password && (
                <motion.div variants={itemVariants}>
                    <PasswordStrengthIndicator password={data.password} />
                </motion.div>
            )}

            {/* Terms Checkbox Row */}
            <motion.div 
                variants={itemVariants}
                className="block"
            >
                <div className="flex items-start bg-stone-50/60 p-4 rounded-xl border border-stone-100/80">
                    <Checkbox
                        name="terms"
                        checked={data.terms}
                        onChange={handleTermsCheckboxChange}
                        className="mt-0.5 text-clay-600 focus:ring-clay-500 rounded border-stone-300 hover:border-clay-400 transition cursor-pointer"
                    />
                    <span className="ms-3 text-xs text-stone-500 leading-relaxed select-none">
                        I accept the{' '}
                        <button 
                            type="button"
                            onClick={() => openLegalModal('seller')}
                            className="font-bold text-clay-600 hover:text-clay-700 hover:underline transition-colors uppercase tracking-wider text-[10px]"
                        >
                            Seller Agreement
                        </button>
                        {' '}and{' '}
                        <button 
                            type="button"
                            onClick={() => openLegalModal('sellerPrivacy')}
                            className="font-bold text-clay-600 hover:text-clay-700 hover:underline transition-colors uppercase tracking-wider text-[10px]"
                        >
                            Data Privacy Policy
                        </button>.
                    </span>
                </div>
                <InputError message={errors.terms} className="mt-2" />
            </motion.div>
        </>
    );
}
