import { useEffect, useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Checkbox from '@/Components/Checkbox';
import LegalModal from '@/Components/LegalModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { Store, Eye, EyeOff, Loader2, Mail, Lock, User, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArtisanRegister() {
    const { data, setData, post, processing, errors, reset } = useForm({
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

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('register')); 
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
                                floatingLabel="Last Name"
                                icon={User}
                            />
                            <InputError message={errors.last_name} className="mt-2" />
                        </div>
                    </motion.div>

                    {/* Shop Name Field */}
                    <motion.div variants={itemVariants}>
                        <TextInput
                            id="shop_name"
                            name="shop_name"
                            value={data.shop_name}
                            className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                            autoComplete="organization"
                            onChange={(e) => setData('shop_name', e.target.value)}
                            required
                            floatingLabel="Shop Name"
                            icon={Briefcase}
                        />
                        <InputError message={errors.shop_name} className="mt-2" />
                    </motion.div>

                    {/* Email Field */}
                    <motion.div variants={itemVariants}>
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            floatingLabel="Business Email"
                            icon={Mail}
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </motion.div>

                    {/* Password Fields */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="block w-full"
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
                                className="block w-full"
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
                            <span className="px-4 bg-white text-stone-400 font-bold uppercase tracking-widest text-[9px]">Or continue with</span>
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
            <LegalModal 
                isOpen={legalModal.isOpen} 
                onClose={handleLegalModalClose} 
                onAccept={handleLegalAccept}
                type={legalModal.type} 
            />
        </GuestLayout>
    );
}
