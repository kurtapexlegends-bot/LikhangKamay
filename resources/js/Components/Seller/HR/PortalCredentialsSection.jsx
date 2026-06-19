import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Sparkles, Eye, EyeOff } from 'lucide-react';
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
    return (
        <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1.5">
                Seller Portal Credentials
            </h3>
            <div className="grid gap-5 md:grid-cols-2">
                {/* Email Address */}
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Email Address</label>
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
                            } min-h-[44px]`}
                            placeholder="maria@gmail.com"
                            value={data.email}
                            pattern="[a-zA-Z0-9._%+-]+@[gG][mM][aA][iI][lL]\.[cC][oO][mM]"
                            onChange={(e) => setData('email', e.target.value)}
                            required={showLinkedLoginUpdateFields}
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {data.email && isEmailGmail && !isEmailSaved && emailValidation && (
                                emailValidation.isValid === null ? (
                                    <Loader2 size={16} className="animate-spin text-stone-400" />
                                ) : emailValidation.isValid ? (
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                ) : (
                                    <AlertTriangle size={16} className="text-red-500" />
                                )
                            )}
                        </div>
                    </div>
                    {!isEmailGmail && data.email && (
                        <p className="mt-1 text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                            Email address should end with @gmail.com.
                        </p>
                    )}
                    {isEmailGmail && data.email && emailValidation && emailValidation.isValid === false && (
                        <p className="mt-1 text-[10px] font-bold text-red-600 uppercase tracking-tight">
                            {emailValidation.message}
                        </p>
                    )}
                    {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email}</p>}
                </div>

                {/* Password Input */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                            {hasLinkedLogin ? 'Reset Password (Optional)' : 'Initial Password'}
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
                                let generatedPassword = '';
                                for (let i = 0; i < 12; i++) {
                                    generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
                                }
                                setData('default_password', generatedPassword);
                                setShowPassword(true);
                            }}
                            className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-clay-600 hover:text-clay-800 transition"
                        >
                            <Sparkles size={11} /> Generate
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className={`${modalFieldWithIconClass} ${errors.default_password ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} min-h-[44px]`}
                            placeholder={hasLinkedLogin ? 'Leave blank to keep password' : 'Set temp password'}
                            value={data.default_password}
                            onChange={(e) => setData('default_password', e.target.value)}
                            required={!hasLinkedLogin && data.create_login_account}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-0.5 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-700 h-11 w-11 flex items-center justify-center"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {errors.default_password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.default_password}</p>}
                </div>
            </div>
        </div>
    );
}
