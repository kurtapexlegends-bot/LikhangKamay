/* global route */
import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import GuestLayout from '@/Layouts/GuestLayout';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import Checkbox from '@/Components/Checkbox';
import PrimaryButton from '@/Components/PrimaryButton';
import PasswordStrengthIndicator from '@/Components/PasswordStrengthIndicator';
import SellerTermsModal from '@/Components/SellerTermsModal';
import useEmailAvailability from '@/Components/Auth/hooks/useEmailAvailability';
import { 
    User, Building2, Mail, Lock, 
    CheckCircle2, AlertCircle, Loader2, Store,
    Truck, Package, ShieldCheck
} from 'lucide-react';

export default function SupplierRegister({ legalPolicies = null }) {
    const { flash } = usePage().props;

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        terms: false,
    });

    const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: 'supplier' });
    const [acceptedLegalDocuments, setAcceptedLegalDocuments] = useState({
        supplier: false,
        supplierPrivacy: false,
    });

    const firstNameRef = useRef(null);
    const lastNameRef = useRef(null);
    const companyRef = useRef(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const confirmPasswordRef = useRef(null);

    const emailValidation = useEmailAvailability(data.email);

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextRef?.current?.focus();
        }
    };

    const handleGoogleClick = () => {
        setIsGoogleSigningIn(true);
    };

    const openLegalModal = (type) => {
        setLegalModal({ isOpen: true, type });
    };

    const closeLegalModal = () => {
        setLegalModal((prev) => ({ ...prev, isOpen: false }));
    };

    const handleLegalAccept = () => {
        const currentType = legalModal.type;
        const updated = {
            ...acceptedLegalDocuments,
            [currentType]: true,
        };
        setAcceptedLegalDocuments(updated);

        if (currentType === 'supplier' && !updated.supplierPrivacy) {
            setLegalModal({ isOpen: true, type: 'supplierPrivacy' });
            return false;
        }

        if (currentType === 'supplierPrivacy' && !updated.supplier) {
            setLegalModal({ isOpen: true, type: 'supplier' });
            return false;
        }

        setLegalModal((prev) => ({ ...prev, isOpen: false }));
        setData('terms', true);
        return true;
    };

    const handleLegalBack = () => {
        const previousType = legalModal.type === 'supplier' ? 'supplierPrivacy' : 'supplier';
        setLegalModal({ isOpen: true, type: previousType });
    };

    const handleTermsCheckboxChange = (e) => {
        if (!e.target.checked) {
            setData('terms', false);
            return;
        }

        if (acceptedLegalDocuments.supplier && acceptedLegalDocuments.supplierPrivacy) {
            setData('terms', true);
            return;
        }

        setData('terms', false);
        openLegalModal('supplier');
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('supplier.register.store'), {
            preserveScroll: true,
            onError: () => {
                reset('password', 'password_confirmation');
            },
        });
    };

    const isBothAgreed = acceptedLegalDocuments.supplier && acceptedLegalDocuments.supplierPrivacy;
    const currentDocAccepted = Boolean(acceptedLegalDocuments[legalModal.type]);
    const counterpartAccepted = legalModal.type === 'supplier' 
        ? Boolean(acceptedLegalDocuments.supplierPrivacy) 
        : Boolean(acceptedLegalDocuments.supplier);

    let modalStep = null;
    let modalTotalSteps = null;
    let modalHasNextStep = false;

    if (!isBothAgreed) {
        modalTotalSteps = 2;
        if (!counterpartAccepted && !currentDocAccepted) {
            modalStep = 1;
            modalHasNextStep = true;
        } else if (counterpartAccepted && !currentDocAccepted) {
            modalStep = 2;
            modalHasNextStep = false;
        } else {
            modalStep = 1;
            modalHasNextStep = true;
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 12 },
        show: { 
            opacity: 1, 
            y: 0, 
            transition: { type: 'spring', stiffness: 260, damping: 22 }, 
        },
    };

    return (
        <GuestLayout 
            eyebrow="Wholesale Supply Network"
            title={
                <>
                    Powering Cavite's Studios <br/>
                    from the Source.
                </>
            }
            quote="Supplying certified bulk clay, glazes, kiln equipment, and tools directly to local pottery workshops."
            quoteAuthor="B2B Supply Hub"
        >
            <Head title="Register as Wholesale Supplier" />

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-4 pt-1"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="text-left">
                    <span className="text-[9px] font-sans tracking-[0.25em] uppercase text-amber-800/80 font-bold mb-2 block">Supplier Access</span>

                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-1">
                        Become a Supplier
                    </h1>
                    <p className="text-stone-400 text-xs font-medium">
                        Provide raw materials and equipment to local studios.
                    </p>
                </motion.div>

                {/* 3-Pillar Trust Highlights */}
                <motion.div 
                    variants={itemVariants}
                    className="flex items-center justify-between text-[11px] text-stone-500 py-1.5 px-0.5 border-b border-stone-200/50"
                >
                    <div className="flex items-center gap-1.5">
                        <Truck size={12} className="text-stone-400 shrink-0" />
                        <span className="font-medium text-stone-600">Regional Dispatch</span>
                    </div>
                    <span className="text-stone-300">•</span>
                    <div className="flex items-center gap-1.5">
                        <Package size={12} className="text-stone-400 shrink-0" />
                        <span className="font-medium text-stone-600">Bulk Orders</span>
                    </div>
                    <span className="text-stone-300">•</span>
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck size={12} className="text-stone-400 shrink-0" />
                        <span className="font-medium text-stone-600">Protected Payouts</span>
                    </div>
                </motion.div>

                {flash?.error && (
                    <motion.div 
                        variants={itemVariants}
                        className="mb-3 font-medium text-xs text-rose-700 bg-rose-50/80 p-3 rounded-xl border border-rose-200/60 flex items-center justify-center gap-2 shadow-sm text-center"
                    >
                        <AlertCircle size={15} className="shrink-0 text-rose-600" />
                        <span>{flash.error}</span>
                    </motion.div>
                )}

                {/* Registration Form */}
                <motion.form 
                    variants={containerVariants}
                    onSubmit={submit} 
                    className="space-y-4"
                >
                    {/* ROW 1: Primary Contact (First Name & Last Name in 2 columns) */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <TextInput
                                ref={firstNameRef}
                                id="first_name"
                                name="first_name"
                                value={data.first_name}
                                className="block w-full"
                                placeholder="Enter first name"
                                floatingLabel="Contact First Name"
                                icon={User}
                                isFocused={true}
                                hasError={!!errors.first_name}
                                onChange={(e) => {
                                    setData('first_name', e.target.value);
                                    if (errors.first_name) clearErrors('first_name');
                                }}
                                onKeyDown={(e) => handleKeyDown(e, lastNameRef)}
                                aria-label="Contact First Name"
                            />
                            <InputError message={errors.first_name} className="mt-1" />
                        </div>

                        <div>
                            <TextInput
                                ref={lastNameRef}
                                id="last_name"
                                name="last_name"
                                value={data.last_name}
                                className="block w-full"
                                placeholder="Enter last name"
                                floatingLabel="Contact Last Name"
                                icon={User}
                                hasError={!!errors.last_name}
                                onChange={(e) => {
                                    setData('last_name', e.target.value);
                                    if (errors.last_name) clearErrors('last_name');
                                }}
                                onKeyDown={(e) => handleKeyDown(e, companyRef)}
                                aria-label="Contact Last Name"
                            />
                            <InputError message={errors.last_name} className="mt-1" />
                        </div>
                    </motion.div>

                    {/* ROW 2: Enterprise / Company Name (Full Width) */}
                    <motion.div variants={itemVariants}>
                        <TextInput
                            ref={companyRef}
                            id="company_name"
                            name="company_name"
                            value={data.company_name}
                            className="block w-full"
                            placeholder="e.g. Cavite Clay & Mineral Supplies Corp."
                            floatingLabel="Company / Enterprise Name"
                            icon={Building2}
                            hasError={!!errors.company_name}
                            onChange={(e) => {
                                setData('company_name', e.target.value);
                                if (errors.company_name) clearErrors('company_name');
                            }}
                            onKeyDown={(e) => handleKeyDown(e, emailRef)}
                            aria-label="Company or Enterprise Name"
                        />
                        <InputError message={errors.company_name} className="mt-1" />
                    </motion.div>

                    {/* ROW 3: Official Business Email (Full Width) */}
                    <motion.div variants={itemVariants} className="relative">
                        <TextInput
                            ref={emailRef}
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className={`block w-full ${
                                emailValidation.isValid === false ? 'border-rose-400 focus:border-rose-500' : ''
                            } ${emailValidation.isValid === true ? 'border-emerald-400 focus:border-emerald-500' : ''}`}
                            placeholder="e.g. wholesale@company.ph"
                            floatingLabel="Official Business Email"
                            icon={Mail}
                            hasError={!!errors.email || emailValidation.isValid === false}
                            onChange={(e) => {
                                setData('email', e.target.value);
                                if (errors.email) clearErrors('email');
                            }}
                            onKeyDown={(e) => handleKeyDown(e, passwordRef)}
                            aria-label="Official Business Email"
                        />

                        {emailValidation.isChecking && (
                            <div className="absolute right-3.5 top-[38px] flex items-center gap-1.5 text-stone-400 bg-white/90 px-1 py-0.5 rounded text-[11px] z-20">
                                <Loader2 size={12} className="animate-spin text-clay-600" />
                                <span className="text-[10px]">Checking...</span>
                            </div>
                        )}

                        {!emailValidation.isChecking && emailValidation.isValid === true && (
                            <div className="absolute right-3.5 top-[38px] flex items-center gap-1 text-emerald-600 bg-emerald-50/90 px-1.5 py-0.5 rounded text-[10px] font-medium border border-emerald-200/60 z-20">
                                <CheckCircle2 size={12} />
                                <span>Available</span>
                            </div>
                        )}

                        <InputError message={errors.email || (emailValidation.isValid === false ? emailValidation.message : '')} className="mt-1" />
                    </motion.div>

                    {/* ROW 4: Password & Confirm Password (2 columns) */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <TextInput
                                ref={passwordRef}
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="block w-full"
                                placeholder="Min. 8 characters"
                                floatingLabel="Password"
                                icon={Lock}
                                hasError={!!errors.password}
                                onChange={(e) => {
                                    setData('password', e.target.value);
                                    if (errors.password) clearErrors('password');
                                }}
                                onKeyDown={(e) => handleKeyDown(e, confirmPasswordRef)}
                                aria-label="Password"
                            />
                            <InputError message={errors.password} className="mt-1" />
                        </div>

                        <div>
                            <TextInput
                                ref={confirmPasswordRef}
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                className="block w-full"
                                placeholder="Confirm password"
                                floatingLabel="Confirm Password"
                                icon={Lock}
                                hasError={!!errors.password_confirmation}
                                onChange={(e) => {
                                    setData('password_confirmation', e.target.value);
                                    if (errors.password_confirmation) clearErrors('password_confirmation');
                                }}
                                aria-label="Confirm Password"
                            />
                            <InputError message={errors.password_confirmation} className="mt-1" />
                        </div>
                    </motion.div>

                    {/* Password Match Status Badge */}
                    {data.password && data.password_confirmation && (
                        <motion.div 
                            variants={itemVariants}
                            className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all duration-300 ${
                                data.password === data.password_confirmation
                                    ? 'text-emerald-700 bg-emerald-50/80 border-emerald-100/60'
                                    : 'text-amber-700 bg-amber-50/80 border-amber-100/60'
                            }`}
                        >
                            {data.password === data.password_confirmation ? (
                                <>
                                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                                    <span>Passwords match successfully.</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={14} className="shrink-0 text-amber-600" />
                                    <span>Passwords do not match yet.</span>
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* Password Strength Indicator */}
                    {data.password && (
                        <motion.div variants={itemVariants}>
                            <PasswordStrengthIndicator password={data.password} minLength={8} />
                        </motion.div>
                    )}

                    {/* Terms Checkbox */}
                    <motion.div variants={itemVariants} className="pt-0.5">
                        <div className="flex items-start bg-stone-50/60 p-3 rounded-xl border border-stone-100/80">
                            <Checkbox
                                name="terms"
                                checked={data.terms}
                                onChange={handleTermsCheckboxChange}
                                className="mt-0.5 text-amber-700 focus:ring-amber-600 rounded border-stone-300 hover:border-amber-500 transition cursor-pointer"
                            />
                            <span className="ms-3 text-xs text-stone-500 leading-relaxed select-none">
                                I accept the{' '}
                                <button 
                                    type="button"
                                    onClick={() => openLegalModal('supplier')}
                                    className="font-bold text-amber-800 hover:text-amber-900 hover:underline transition-colors uppercase tracking-wider text-[10px]"
                                >
                                    Supplier Agreement
                                </button>
                                {' '}and{' '}
                                <button 
                                    type="button"
                                    onClick={() => openLegalModal('supplierPrivacy')}
                                    className="font-bold text-amber-800 hover:text-amber-900 hover:underline transition-colors uppercase tracking-wider text-[10px]"
                                >
                                    Privacy Policy
                                </button>.
                            </span>
                        </div>
                        <InputError message={errors.terms} className="mt-1" />
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div variants={itemVariants} className="pt-1.5">
                        <PrimaryButton 
                            className="relative w-full justify-center py-3 bg-stone-900 hover:bg-stone-850 border-stone-900 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md overflow-hidden group" 
                            disabled={processing}
                        >
                            <span className="relative flex items-center justify-center gap-2">
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    <span>Register as Supplier</span>
                                )}
                            </span>
                        </PrimaryButton>
                    </motion.div>
                </motion.form>

                {/* Social Signup Section */}
                <motion.div variants={itemVariants} className="mt-6 flex flex-col items-center">
                    <div className="relative w-full mb-5">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-px bg-stone-200/60"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-4 bg-[#FAF7F2] text-stone-400 font-bold uppercase tracking-widest text-[9px]">Or continue with</span>
                        </div>
                    </div>

                    <a 
                        href="/auth/google/supplier" 
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
                                <img
                                    src="/images/google-icon.svg"
                                    className="w-4 h-4 group-hover:scale-110 transition-transform"
                                    alt="Google"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 group-hover:text-stone-900 transition-colors">Google Account</span>
                            </>
                        )}
                    </a>
                </motion.div>

                {/* Footer Navigation */}
                <motion.div 
                    variants={itemVariants}
                    className="mt-6 pt-5 border-t border-stone-100 space-y-3"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                        <Link 
                            href={route('login')}
                            className="group flex items-center justify-center gap-2 text-xs font-bold text-stone-600 bg-stone-50 border border-stone-200 px-5 py-3 rounded-xl hover:bg-stone-100 hover:border-stone-300 transition-all duration-300 shadow-sm hover:shadow uppercase tracking-wider whitespace-nowrap"
                        >
                            <User size={14} className="text-stone-400 group-hover:text-stone-600 transition-colors group-hover:scale-110" />
                            <span>Log in</span>
                        </Link>
                        
                        <Link 
                            href="/artisan/register" 
                            className="group flex items-center justify-center gap-2 text-xs font-bold text-clay-700 bg-clay-50 border border-clay-200 px-5 py-3 rounded-xl hover:bg-clay-100 hover:border-clay-300 transition-all duration-300 shadow-sm hover:shadow uppercase tracking-wider whitespace-nowrap"
                        >
                            <Store size={14} className="text-clay-500 group-hover:text-clay-700 transition-colors group-hover:scale-110" />
                            <span>Become an Artisan</span>
                        </Link>
                    </div>

                    <div className="text-center pt-1">
                        <Link
                            href={route('register')}
                            className="text-xs font-medium text-stone-400 hover:text-stone-600 transition"
                        >
                            Looking to shop retail? <span className="font-semibold text-stone-700 underline underline-offset-2">Create a buyer account</span>
                        </Link>
                    </div>
                </motion.div>
            </motion.div>

            {/* Seller Terms & Privacy Modal */}
            <SellerTermsModal 
                show={legalModal.isOpen} 
                onClose={closeLegalModal} 
                onAccept={handleLegalAccept}
                onBack={modalStep === 2 ? handleLegalBack : undefined}
                type={legalModal.type} 
                step={modalStep}
                totalSteps={modalTotalSteps}
                hasNextStep={modalHasNextStep}
                policies={legalPolicies}
            />
        </GuestLayout>
    );
}
