import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import GuestLayout from '@/Layouts/GuestLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SellerTermsModal from '@/Components/SellerTermsModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { Loader2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import ArtisanBusinessStep from './Partials/ArtisanBusinessStep';
import ArtisanDocumentsStep from './Partials/ArtisanDocumentsStep';

export default function ArtisanRegister() {
    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        first_name: '',
        last_name: '',
        shop_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        terms: false,
    });

    const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: 'seller' });
    const [isGuidingTermsAcceptance, setIsGuidingTermsAcceptance] = useState(false);
    const [acceptedLegalDocuments, setAcceptedLegalDocuments] = useState({
        seller: false,
        sellerPrivacy: false,
    });

    const firstNameRef = useRef(null);
    const lastNameRef = useRef(null);
    const shopNameRef = useRef(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const confirmPasswordRef = useRef(null);

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const [emailValidation, setEmailValidation] = useState({ isValid: null, message: '' });
    const [shopNameValidation, setShopNameValidation] = useState({ isValid: null, message: '' });

    useEffect(() => {
        if (!data.email || data.email.length < 5) {
            setEmailValidation({ isValid: null, message: '' });
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await axios.post(route('api.validate-constraint'), {
                    type: 'email_availability',
                    value: data.email
                });
                setEmailValidation({ 
                    isValid: response.data.valid, 
                    message: response.data.message 
                });
            } catch (error) {
                console.error("Email validation failed", error);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [data.email]);

    useEffect(() => {
        if (!data.shop_name || data.shop_name.trim().length < 3) {
            setShopNameValidation({ isValid: null, message: '' });
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await axios.post(route('api.validate-constraint'), {
                    type: 'shop_name_availability',
                    value: data.shop_name
                });
                setShopNameValidation({ 
                    isValid: response.data.valid, 
                    message: response.data.message 
                });
            } catch (error) {
                console.error("Shop name validation failed", error);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [data.shop_name]);

    const submit = (e) => {
        e.preventDefault();
        
        // Client-side validation intercept
        const localErrors = {};
        let firstInvalidRef = null;

        if (!data.first_name || data.first_name.trim() === '') {
            localErrors.first_name = 'First name is required';
            if (!firstInvalidRef) firstInvalidRef = firstNameRef;
        }

        if (!data.shop_name || data.shop_name.trim() === '') {
            localErrors.shop_name = 'Shop name is required';
            if (!firstInvalidRef) firstInvalidRef = shopNameRef;
        } else if (shopNameValidation.isValid === false) {
            localErrors.shop_name = 'This shop name is already taken';
            if (!firstInvalidRef) firstInvalidRef = shopNameRef;
        }

        if (!data.email || data.email.trim() === '') {
            localErrors.email = 'Email address is required';
            if (!firstInvalidRef) firstInvalidRef = emailRef;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            localErrors.email = 'Please enter a valid email address';
            if (!firstInvalidRef) firstInvalidRef = emailRef;
        } else if (emailValidation.isValid === false) {
            localErrors.email = 'This email is already registered';
            if (!firstInvalidRef) firstInvalidRef = emailRef;
        }

        if (!data.password) {
            localErrors.password = 'Password is required';
            if (!firstInvalidRef) firstInvalidRef = passwordRef;
        } else if (data.password.length < 12) {
            localErrors.password = 'The password field must be at least 12 characters.';
            if (!firstInvalidRef) firstInvalidRef = passwordRef;
        }

        if (data.password !== data.password_confirmation) {
            localErrors.password_confirmation = 'Passwords do not match';
            if (!firstInvalidRef) firstInvalidRef = confirmPasswordRef;
        }

        if (!data.terms) {
            localErrors.terms = 'You must accept the terms and conditions';
        }

        if (Object.keys(localErrors).length > 0) {
            setError(localErrors);
            firstInvalidRef?.current?.focus();
            return;
        }

        clearErrors();
        post(route('register')); 
    };

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextRef?.current?.focus();
        }
    };

    const openLegalModal = (type) => {
        setLegalModal({ isOpen: true, type });
    };

    const closeLegalModal = () => {
        setLegalModal((previous) => ({ ...previous, isOpen: false }));
    };

    const openNextRequiredLegalModal = (documents = acceptedLegalDocuments) => {
        if (!documents.seller) {
            setLegalModal({ isOpen: true, type: 'seller' });
            return;
        }

        if (!documents.sellerPrivacy) {
            setLegalModal({ isOpen: true, type: 'sellerPrivacy' });
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
        const currentType = legalModal.type;
        const updatedDocuments = {
            ...acceptedLegalDocuments,
            [currentType]: true,
        };

        setAcceptedLegalDocuments(updatedDocuments);

        // If on seller agreement and seller privacy not yet accepted, advance smoothly to privacy
        if (currentType === 'seller' && !updatedDocuments.sellerPrivacy) {
            setLegalModal({ isOpen: true, type: 'sellerPrivacy' });
            return false;
        }

        // If on seller privacy and seller agreement not yet accepted, advance to seller
        if (currentType === 'sellerPrivacy' && !updatedDocuments.seller) {
            setLegalModal({ isOpen: true, type: 'seller' });
            return false;
        }

        // Both documents have been accepted
        setIsGuidingTermsAcceptance(false);
        setLegalModal((previous) => ({ ...previous, isOpen: false }));
        setData('terms', true);
        return true;
    };

    const handleLegalBack = () => {
        const previousType = legalModal.type === 'seller' ? 'sellerPrivacy' : 'seller';
        setLegalModal({ isOpen: true, type: previousType });
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

    const handleGoogleClick = () => {
        setIsGoogleSigningIn(true);
    };

    const canEnableTermsCheckbox = acceptedLegalDocuments.seller && acceptedLegalDocuments.sellerPrivacy;

    const isSellerAgreed = Boolean(acceptedLegalDocuments.seller);
    const isPrivacyAgreed = Boolean(acceptedLegalDocuments.sellerPrivacy);
    const isBothAgreed = isSellerAgreed && isPrivacyAgreed;
    const currentDocAccepted = Boolean(acceptedLegalDocuments[legalModal.type]);
    const counterpartAccepted = legalModal.type === 'seller' ? isPrivacyAgreed : isSellerAgreed;

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
            quote="LikhangKamay helps local artisans reach a global audience."
        >
            <Head title="Become a Seller" />

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-5 pt-2"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="mb-8 text-left">
                    <span className="text-[9px] font-sans tracking-[0.25em] uppercase text-clay-600 font-bold mb-2 block">Artisan Access</span>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-1.5">Start Your Journey</h1>
                    <p className="text-stone-400 text-xs font-medium">Create your artisan account to start selling.</p>
                </motion.div>

                {/* Form */}
                <motion.form 
                    variants={containerVariants}
                    onSubmit={submit} 
                    className="space-y-5"
                >
                    {/* Personal and Business Details */}
                    <ArtisanBusinessStep
                        data={data}
                        setData={setData}
                        errors={errors}
                        handleKeyDown={handleKeyDown}
                        firstNameRef={firstNameRef}
                        lastNameRef={lastNameRef}
                        shopNameRef={shopNameRef}
                        emailRef={emailRef}
                        passwordRef={passwordRef}
                        shopNameValidation={shopNameValidation}
                        emailValidation={emailValidation}
                        itemVariants={itemVariants}
                    />

                    {/* Credentials and Legal Consent */}
                    <ArtisanDocumentsStep
                        data={data}
                        setData={setData}
                        errors={errors}
                        clearErrors={clearErrors}
                        handleKeyDown={handleKeyDown}
                        passwordRef={passwordRef}
                        confirmPasswordRef={confirmPasswordRef}
                        handleTermsCheckboxChange={handleTermsCheckboxChange}
                        onChange={handleTermsCheckboxChange}
                        openLegalModal={openLegalModal}
                        itemVariants={itemVariants}
                    />

                    {/* Launch Your Studio Submit Button */}
                    <motion.div variants={itemVariants}>
                        <PrimaryButton 
                            className="relative w-full justify-center py-3 bg-stone-900 hover:bg-stone-850 border-stone-900 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md overflow-hidden group" 
                            disabled={processing}
                        >
                            <span className="relative flex items-center gap-2">
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    'Launch Your Studio'
                                )}
                            </span>
                        </PrimaryButton>
                    </motion.div>
                </motion.form>

                {/* Social Signup Section */}
                <motion.div variants={itemVariants} className="mt-8 flex flex-col items-center">
                    <div className="relative w-full mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-px bg-stone-200/60"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-4 bg-[#FAF7F2] text-stone-400 font-bold uppercase tracking-widest text-[9px]">Or continue with</span>
                        </div>
                    </div>

                    <a 
                        href="/auth/google/artisan" 
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
                                <img src="/images/google-icon.svg" className="w-4 h-4 group-hover:scale-110 transition-transform" alt="Google" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 group-hover:text-stone-900 transition-colors">Google Account</span>
                            </>
                        )}
                    </a>
                </motion.div>

                {/* Footer Navigation */}
                <motion.div 
                    variants={itemVariants}
                    className="mt-10 pt-6 border-t border-stone-100"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        <Link 
                            href={route('login')}
                            className="group flex items-center justify-center gap-2 text-xs font-bold text-stone-600 bg-stone-50 border border-stone-200 px-5 py-3 rounded-full hover:bg-stone-100 hover:border-stone-300 transition-all duration-300 shadow-sm hover:shadow uppercase tracking-wider"
                        >
                            <User size={14} className="text-stone-400 group-hover:text-stone-600 transition-colors group-hover:scale-110" />
                            <span>Log in</span>
                        </Link>
                        
                        <Link 
                            href={route('register')}
                            className="group flex items-center justify-center gap-2 text-xs font-bold text-clay-700 bg-clay-50 border border-clay-200 px-5 py-3 rounded-full hover:bg-clay-100 hover:border-clay-300 transition-all duration-300 shadow-sm hover:shadow uppercase tracking-wider"
                        >
                            <User size={14} className="text-clay-500 group-hover:text-clay-700 transition-colors group-hover:scale-110" />
                            <span>Create Buyer Account</span>
                        </Link>
                    </div>
                </motion.div>
            </motion.div>

            {/* Legal Modal */}
            <SellerTermsModal
                show={legalModal.isOpen}
                type={legalModal.type}
                step={modalStep}
                totalSteps={modalTotalSteps}
                hasNextStep={modalHasNextStep}
                onClose={() => handleLegalModalClose({ accepted: false })}
                onAccept={handleLegalAccept}
                onBack={modalStep === 2 ? handleLegalBack : undefined}
            />
        </GuestLayout>
    );
}
