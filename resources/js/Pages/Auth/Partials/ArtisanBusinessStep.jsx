import React from 'react';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { User, Briefcase, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArtisanBusinessStep({
    data,
    setData,
    errors,
    handleKeyDown,
    firstNameRef,
    lastNameRef,
    shopNameRef,
    emailRef,
    passwordRef,
    shopNameValidation,
    emailValidation,
    itemVariants,
}) {
    return (
        <>
            {/* Name Fields Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <TextInput
                        ref={firstNameRef}
                        id="first_name"
                        name="first_name"
                        value={data.first_name}
                        className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                        autoComplete="given-name"
                        isFocused={true}
                        onChange={(e) => setData('first_name', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, lastNameRef)}
                        hasError={!!errors.first_name}
                        required
                        floatingLabel="First Name"
                        icon={User}
                    />
                    <InputError message={errors.first_name} className="mt-2" />
                </div>

                <div>
                    <TextInput
                        ref={lastNameRef}
                        id="last_name"
                        name="last_name"
                        value={data.last_name}
                        className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                        autoComplete="family-name"
                        onChange={(e) => setData('last_name', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, shopNameRef)}
                        hasError={!!errors.last_name}
                        floatingLabel="Last Name"
                        icon={User}
                    />
                    <InputError message={errors.last_name} className="mt-2" />
                </div>
            </motion.div>

            {/* Shop Name Field */}
            <motion.div variants={itemVariants}>
                <TextInput
                    ref={shopNameRef}
                    id="shop_name"
                    name="shop_name"
                    value={data.shop_name}
                    className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                    autoComplete="organization"
                    onChange={(e) => setData('shop_name', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, emailRef)}
                    hasError={!!errors.shop_name}
                    required
                    floatingLabel="Shop Name"
                    icon={Briefcase}
                />
                {shopNameValidation.isValid !== null && (
                    <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-300 ${
                        shopNameValidation.isValid 
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-100/60' 
                            : 'text-rose-700 bg-rose-50 border-rose-100/60'
                    }`}>
                        {shopNameValidation.isValid ? (
                            <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                        ) : (
                            <AlertCircle size={14} className="shrink-0 text-rose-500" />
                        )}
                        <span>{shopNameValidation.message}</span>
                    </div>
                )}
                <InputError message={errors.shop_name} className="mt-2" />
            </motion.div>

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
                    onChange={(e) => setData('email', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, passwordRef)}
                    hasError={!!errors.email}
                    required
                    floatingLabel="Business Email"
                    icon={Mail}
                />
                {emailValidation.isValid !== null && (
                    <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-300 ${
                        emailValidation.isValid 
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-100/60' 
                            : 'text-rose-700 bg-rose-50 border-rose-100/60'
                    }`}>
                        {emailValidation.isValid ? (
                            <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                        ) : (
                            <AlertCircle size={14} className="shrink-0 text-rose-500" />
                        )}
                        <span>{emailValidation.message}</span>
                    </div>
                )}
                <InputError message={errors.email} className="mt-2" />
            </motion.div>
        </>
    );
}
