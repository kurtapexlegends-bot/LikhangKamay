import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Sparkles, Eye, EyeOff, KeyRound } from 'lucide-react';
import InputError from '@/Components/InputError';
import { modalFieldWithIconClass } from '@/utils/hrHelpers';

export default function PortalCredentialsSection({
    data,
    setData,
    errors,
    mode,
    showLinkedLoginUpdateFields,
    emailValidation,
    isEmailGmail,
    isEmailSaved,
    showPassword,
    setShowPassword,
    hasLinkedLogin
}) {
    const handleGeneratePassword = () => {
        const lower = 'abcdefghjkmnpqrstuvwxyz';
        const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const numbers = '23456789';
        const symbols = '!@#$%^&*';
        const all = lower + upper + numbers + symbols;

        const chars = [
            lower[Math.floor(Math.random() * lower.length)],
            upper[Math.floor(Math.random() * upper.length)],
            numbers[Math.floor(Math.random() * numbers.length)],
            symbols[Math.floor(Math.random() * symbols.length)],
        ];

        for (let i = 4; i < 12; i++) {
            chars.push(all[Math.floor(Math.random() * all.length)]);
        }

        for (let i = chars.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }

        setData('default_password', chars.join(''));
        setShowPassword(true);
    };

    return (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                <KeyRound size={14} className="text-indigo-600" />
                <span>Portal Login Credentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Email Address */}
                <div>
                    <label className="mb-1 block text-[11px] font-bold text-stone-700">
                        Gmail Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            id={mode === 'add' ? 'staff_email_add' : 'staff_email_edit'}
                            type="email"
                            className={`${modalFieldWithIconClass} ${
                                errors.email || (emailValidation && emailValidation.isValid === false)
                                    ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' 
                                    : !isEmailGmail && data.email
                                        ? 'border-amber-300 bg-amber-50/10 focus:ring-amber-500 focus:border-amber-500' 
                                        : ''
                            } h-9.5 text-xs`}
                            placeholder="staff.name@gmail.com"
                            value={data.email}
                            pattern="[a-zA-Z0-9._%+-]+@[gG][mM][aA][iI][lL]\.[cC][oO][mM]"
                            onChange={(e) => setData('email', e.target.value)}
                            required={showLinkedLoginUpdateFields}
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {data.email && isEmailGmail && !isEmailSaved && emailValidation && (
                                emailValidation.isValid === null ? (
                                    <Loader2 size={14} className="animate-spin text-stone-400" />
                                ) : emailValidation.isValid ? (
                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                ) : (
                                    <AlertTriangle size={14} className="text-rose-500" />
                                )
                            )}
                        </div>
                    </div>
                    {!isEmailGmail && data.email && (
                        <p className="mt-1 text-[11px] font-semibold text-amber-600">
                            Must end with @gmail.com
                        </p>
                    )}
                    {isEmailGmail && data.email && emailValidation && emailValidation.isValid === false && (
                        <p className="mt-1 text-[11px] font-semibold text-rose-600">
                            {emailValidation.message}
                        </p>
                    )}
                    {errors.email && <InputError message={errors.email} className="mt-1" />}
                </div>

                {/* Password Input */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-stone-700">
                            {hasLinkedLogin ? 'Reset Password' : 'Initial Password'} {!hasLinkedLogin && <span className="text-rose-500">*</span>}
                        </label>
                        <button
                            type="button"
                            onClick={handleGeneratePassword}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-clay-700 hover:text-clay-900 transition hover:underline"
                        >
                            <Sparkles size={11} /> Generate
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className={`${modalFieldWithIconClass} ${errors.default_password ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} h-9.5 text-xs`}
                            placeholder={hasLinkedLogin ? 'Leave blank to keep current' : 'Temporary password (min. 12 characters)'}
                            value={data.default_password}
                            onChange={(e) => setData('default_password', e.target.value)}
                            required={!hasLinkedLogin && data.create_login_account}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-700 h-9 w-9 flex items-center justify-center"
                        >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                    {data.default_password && data.default_password.length < 12 && !errors.default_password && (
                        <p className="mt-1 text-[11px] font-semibold text-amber-600">
                            Password must be at least 12 characters ({data.default_password.length}/12).
                        </p>
                    )}
                    {errors.default_password && <InputError message={errors.default_password} className="mt-1" />}
                </div>
            </div>
        </div>
    );
}
