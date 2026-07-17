import { useEffect, useState, useRef } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Checkbox from '@/Components/Checkbox';
import LegalModal from '@/Components/LegalModal';
import SellerTermsModal from '@/Components/SellerTermsModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { Store, Eye, EyeOff, Loader2, Mail, Lock, User, Briefcase, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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
        } else if (data.password.length < 8) {
            localErrors.password = 'Password must be at least 8 characters';
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

    const handleKeyDown = (nextRef) => (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextRef.current?.focus();
        }
    };

    const openLegalModal = (type) => {
        setLegalModal({ isOpen: true, type });
    };

    const closeLegalModal = () => {
        setLegalModal({ isOpen: false, type: legalModal.type });
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

    const handleGoogleClick = () => {
        setIsGoogleSigningIn(true);
    };

    const canEnableTermsCheckbox = acceptedLegalDocuments.seller && acceptedLegalDocuments.sellerPrivacy;

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
                                onKeyDown={handleKeyDown(lastNameRef)}
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
                                onKeyDown={handleKeyDown(shopNameRef)}
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
                            onKeyDown={handleKeyDown(emailRef)}
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
                            onKeyDown={handleKeyDown(passwordRef)}
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
                                onChange={(e) => setData('password', e.target.value)}
                                onKeyDown={handleKeyDown(confirmPasswordRef)}
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
                                onChange={(e) => setData('password_confirmation', e.target.value)}
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
                        <motion.div 
                            variants={itemVariants}
                            className="mt-1.5 px-1 space-y-1.5 animate-in fade-in duration-300"
                        >
                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                                <span className="text-stone-400">Strength</span>
                                <span className={
                                    data.password.length < 12 ? 'text-rose-500' : 
                                    data.password.length < 15 ? 'text-amber-500' : 'text-emerald-500'
                                }>
                                    {data.password.length < 12 ? 'Weak' : data.password.length < 15 ? 'Fair' : 'Strong'}
                                </span>
                            </div>
                            <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden flex gap-0.5">
                                <div className={`h-full transition-all duration-500 ${data.password.length >= 6 ? (data.password.length < 12 ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                                <div className={`h-full transition-all duration-500 ${data.password.length >= 12 ? (data.password.length < 15 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                                <div className={`h-full transition-all duration-500 ${data.password.length >= 15 ? 'bg-emerald-500' : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                                <div className={`h-full transition-all duration-500 ${/[!@#$%^&*(),.?":{}|<>]/.test(data.password) && /\d/.test(data.password) && data.password.length >= 12 ? 'bg-emerald-500' : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                            </div>
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
            {legalModal.isOpen && legalModal.type === 'seller' ? (
                <SellerTermsModal
                    show={true}
                    onClose={() => handleLegalModalClose({ accepted: false })}
                    onAccept={() => {
                        handleLegalAccept();
                        handleLegalModalClose({ accepted: true });
                    }}
                />
            ) : (
                <LegalModal 
                    isOpen={legalModal.isOpen} 
                    onClose={handleLegalModalClose} 
                    onAccept={handleLegalAccept}
                    type={legalModal.type} 
                />
            )}
        </GuestLayout>
    );
}
