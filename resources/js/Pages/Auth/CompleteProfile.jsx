import { useState, useEffect } from 'react';
import axios from 'axios';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Checkbox from '@/Components/Checkbox';
import LegalModal from '@/Components/LegalModal';
import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, CheckCircle, Store, Mail, Lock, User, Briefcase, XCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CompleteProfile({ email, suggestedName, suggestedFirstName, suggestedLastName, provider, isArtisan = false }) {
    const suggestedNameParts = typeof suggestedName === 'string'
        ? suggestedName.trim().split(/\s+/).filter(Boolean)
        : [];

    const { data, setData, post, processing, errors } = useForm({
        first_name: suggestedFirstName || suggestedNameParts[0] || '',
        last_name: suggestedLastName || suggestedNameParts.slice(1).join(' ') || '',
        shop_name: '',
        password: '',
        password_confirmation: '',
        terms: false,
    });

    const [legalModal, setLegalModal] = useState({ isOpen: false, type: isArtisan ? 'seller' : 'terms' });
    const [isGuidingTermsAcceptance, setIsGuidingTermsAcceptance] = useState(false);
    const [acceptedLegalDocuments, setAcceptedLegalDocuments] = useState(
        isArtisan
            ? { seller: false, sellerPrivacy: false }
            : { terms: false, privacy: false }
    );

    // Real-time Shop Validation
    const [isShopNameTaken, setIsShopNameTaken] = useState(false);
    const [isValidatingShop, setIsValidatingShop] = useState(false);

    useEffect(() => {
        if (!isArtisan) return;
        
        const timeoutId = setTimeout(async () => {
            if (data.shop_name.trim().length > 2) {
                setIsValidatingShop(true);
                try {
                    // Simple slugification for validation
                    const slug = data.shop_name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    const response = await axios.post(route('admin.artisan.check-slug'), { slug });
                    setIsShopNameTaken(response.data.exists);
                } catch (e) {
                    console.error("Shop validation failed", e);
                } finally {
                    setIsValidatingShop(false);
                }
            } else {
                setIsShopNameTaken(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [data.shop_name, isArtisan]);

    const submit = (e) => {
        e.preventDefault();
        post(route('auth.complete-profile.store'));
    };

    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';
    const primaryLegalType = isArtisan ? 'seller' : 'terms';
    const secondaryLegalType = isArtisan ? 'sellerPrivacy' : 'privacy';
    const primaryLegalLabel = isArtisan ? 'Seller Agreement' : 'Terms of Service';
    const secondaryLegalLabel = isArtisan ? 'Data Privacy Policy' : 'Privacy Policy';
    const canEnableTermsCheckbox = acceptedLegalDocuments[primaryLegalType] && acceptedLegalDocuments[secondaryLegalType];

    const openLegalModal = (type) => {
        setLegalModal({ isOpen: true, type });
    };

    const closeLegalModal = () => {
        setLegalModal((previous) => ({ ...previous, isOpen: false }));
    };

    const openNextRequiredLegalModal = (documents = acceptedLegalDocuments) => {
        if (!documents[primaryLegalType]) {
            setLegalModal({ isOpen: true, type: primaryLegalType });
            return;
        }

        if (!documents[secondaryLegalType]) {
            setLegalModal({ isOpen: true, type: secondaryLegalType });
            return;
        }

        setIsGuidingTermsAcceptance(false);
        setLegalModal((previous) => ({ ...previous, isOpen: false }));
        setData('terms', true);
    };

    const handleLegalModalClose = (payload = {}) => {
        if (!payload.accepted) {
            setIsGuidingTermsAcceptance(false);
        }

        closeLegalModal();
    };

    const handleLegalAccept = () => {
        const updatedDocuments = {
            ...acceptedLegalDocuments,
            [legalModal.type]: true,
        };

        setAcceptedLegalDocuments(updatedDocuments);

        if (isGuidingTermsAcceptance) {
            openNextRequiredLegalModal(updatedDocuments);
            return false;
        }

        return true;
    };

    const handleTermsCheckboxChange = (e) => {
        if (!e.target.checked) {
            setData('terms', false);
            return;
        }

        if (canEnableTermsCheckbox) {
            setData('terms', true);
            return;
        }

        setData('terms', false);
        setIsGuidingTermsAcceptance(true);
        openNextRequiredLegalModal();
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
        <GuestLayout 
            quote={isArtisan 
                ? "Almost there! Complete your profile to start selling." 
                : "Almost there! Complete your profile to start shopping."
            }
        >
            <Head title="Complete Your Profile" />

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-5 pt-2"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="mb-8 text-left">
                    <div className="flex items-center gap-2 mb-3.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
                            <CheckCircle className="text-emerald-600 shrink-0" size={12} />
                        </div>
                        <span className="text-[10px] font-sans font-bold text-emerald-700 uppercase tracking-wider">
                            Connected via {providerLabel}
                        </span>
                    </div>

                    <span className="text-[9px] font-sans tracking-[0.25em] uppercase text-clay-600 font-bold mb-2 block">
                        {isArtisan ? 'Artisan Profile' : 'Buyer Profile'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-1.5">
                        Complete Your Profile
                    </h2>
                    <p className="text-stone-400 text-xs font-medium">
                        {isArtisan 
                            ? "Set your details and password to create your seller account."
                            : "Set your name and password to secure your account."
                        }
                    </p>
                </motion.div>

                {/* Form */}
                <motion.form 
                    variants={containerVariants}
                    onSubmit={submit} 
                    className="space-y-5"
                >
                    {/* Name Fields Grid */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <TextInput
                                id="first_name"
                                name="first_name"
                                value={data.first_name}
                                className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                                autoComplete="given-name"
                                isFocused={true}
                                onChange={(e) => setData('first_name', e.target.value)}
                                required
                                floatingLabel="First Name"
                                icon={User}
                            />
                            <InputError message={errors.first_name} className="mt-2" />
                        </div>

                        <div>
                            <TextInput
                                id="last_name"
                                name="last_name"
                                value={data.last_name}
                                className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                                autoComplete="family-name"
                                onChange={(e) => setData('last_name', e.target.value)}
                                required
                                floatingLabel="Last Name"
                                icon={User}
                            />
                            <InputError message={errors.last_name} className="mt-2" />
                        </div>
                    </motion.div>

                    {/* Shop Name Field (only for Artisans) */}
                    {isArtisan && (
                        <motion.div variants={itemVariants}>
                            <TextInput
                                id="shop_name"
                                name="shop_name"
                                value={data.shop_name}
                                className={`block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white ${
                                    isShopNameTaken ? 'border-rose-350 focus:border-rose-500' : 'border-stone-200/80'
                                }`}
                                autoComplete="organization"
                                onChange={(e) => setData('shop_name', e.target.value)}
                                required
                                floatingLabel="Shop Name"
                                icon={Briefcase}
                            />
                            
                            {isValidatingShop && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-stone-100 bg-stone-50 text-stone-500 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <Loader2 size={14} className="shrink-0 animate-spin text-stone-400" />
                                    <span>Checking shop availability...</span>
                                </div>
                            )}

                            {!isValidatingShop && data.shop_name.trim().length > 2 && (
                                <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-300 ${
                                    !isShopNameTaken 
                                        ? 'text-emerald-700 bg-emerald-50 border-emerald-100/60' 
                                        : 'text-rose-700 bg-rose-50 border-rose-100/60'
                                }`}>
                                    {!isShopNameTaken ? (
                                        <>
                                            <CheckCircle size={14} className="shrink-0 text-emerald-600" />
                                            <span>Shop name is available.</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle size={14} className="shrink-0 text-rose-500" />
                                            <span>This shop name is already taken.</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <InputError message={errors.shop_name} className="mt-2" />
                        </motion.div>
                    )}

                    {/* Email Field (Read-only, pre-verified) */}
                    <motion.div variants={itemVariants}>
                        <TextInput
                            id="email"
                            type="email"
                            value={email}
                            className="block w-full bg-stone-100 hover:bg-stone-100 text-stone-500 border-stone-200/80 cursor-not-allowed"
                            disabled
                            floatingLabel="Verified Email Address"
                            icon={Mail}
                        />
                        <p className="text-[10px] text-stone-400 mt-1.5 px-1 font-semibold uppercase tracking-wider">
                            Verified securely via {providerLabel}
                        </p>
                    </motion.div>

                    {/* Password Fields */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                                autoComplete="new-password"
                                onChange={(e) => setData('password', e.target.value)}
                                required
                                floatingLabel="Password"
                                icon={Lock}
                            />
                        </div>
                        <div>
                            <TextInput
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                                autoComplete="new-password"
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required
                                floatingLabel="Confirm Password"
                                icon={Lock}
                            />
                        </div>
                    </motion.div>
                    <InputError message={errors.password} className="mt-2" />

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
                                I agree to the{' '}
                                <button
                                    type="button"
                                    onClick={() => openLegalModal(primaryLegalType)}
                                    className="font-bold text-clay-600 hover:text-clay-700 hover:underline transition-colors uppercase tracking-wider text-[10px]"
                                >
                                    {primaryLegalLabel}
                                </button>
                                {' '}and{' '}
                                <button
                                    type="button"
                                    onClick={() => openLegalModal(secondaryLegalType)}
                                    className="font-bold text-clay-600 hover:text-clay-700 hover:underline transition-colors uppercase tracking-wider text-[10px]"
                                >
                                    {secondaryLegalLabel}
                                </button>.
                            </span>
                        </div>
                        <InputError message={errors.terms} className="mt-2" />
                    </motion.div>

                    {/* Complete Submit Button */}
                    <motion.div variants={itemVariants}>
                        <PrimaryButton 
                            className="relative w-full justify-center py-3 bg-stone-900 hover:bg-stone-850 border-stone-900 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md overflow-hidden group" 
                            disabled={processing || (isArtisan && isShopNameTaken)}
                        >
                            <span className="relative flex items-center gap-2">
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : isArtisan ? (
                                    'Continue to Shop Setup'
                                ) : (
                                    'Complete Registration'
                                )}
                            </span>
                        </PrimaryButton>
                    </motion.div>
                </motion.form>
            </motion.div>

            {/* Legal Modal */}
            <LegalModal
                isOpen={legalModal.isOpen}
                onClose={handleLegalModalClose}
                onAccept={handleLegalAccept}
                type={legalModal.type}
            />
        </GuestLayout>
    );
}
