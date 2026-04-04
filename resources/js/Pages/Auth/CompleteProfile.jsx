import { useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Checkbox from '@/Components/Checkbox';
import LegalModal from '@/Components/LegalModal';
import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, CheckCircle, Store, Mail, Lock, User, Briefcase } from 'lucide-react';

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

    const [showPassword, setShowPassword] = useState(false);
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: isArtisan ? 'seller' : 'terms' });
    const [isGuidingTermsAcceptance, setIsGuidingTermsAcceptance] = useState(false);
    const [acceptedLegalDocuments, setAcceptedLegalDocuments] = useState(
        isArtisan
            ? { seller: false, sellerPrivacy: false }
            : { terms: false, privacy: false }
    );

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

    return (
        <GuestLayout 
            quote={isArtisan 
                ? "Almost there! Complete your profile to start selling." 
                : "Almost there! Complete your profile to start shopping."
            }
        >
            <Head title="Complete Your Profile" />

            <div className="mb-8 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 mb-4 sm:justify-start">
                    <CheckCircle className="text-green-500" size={22} />
                    <span className="text-sm font-medium text-green-600">
                        Connected via {providerLabel}
                    </span>
                </div>

                {isArtisan && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-stone-800 to-stone-900 text-amber-50 rounded-full text-xs font-bold uppercase tracking-widest mb-6 shadow-md shadow-stone-900/20">
                        <Store size={14} /> Artisan Account
                    </div>
                )}

                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight mb-2">
                    Complete Your Profile
                </h2>
                <p className="text-stone-500 text-sm sm:text-base">
                    {isArtisan 
                        ? "Set your details and password to create your seller account."
                        : "Set your name and password to secure your account."
                    }
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">

                {isArtisan ? (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="first_name" value="First Name" className="text-stone-700 font-bold mb-1.5" />
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <TextInput
                                    id="first_name"
                                    name="first_name"
                                    value={data.first_name}
                                    className="pl-10 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 py-3 transition-all hover:border-stone-300"
                                    autoComplete="given-name"
                                    isFocused={true}
                                    onChange={(e) => setData('first_name', e.target.value)}
                                    placeholder="John"
                                />
                            </div>
                            <InputError message={errors.first_name} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="last_name" value="Last Name" className="text-stone-700 font-bold mb-1.5" />
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <TextInput
                                    id="last_name"
                                    name="last_name"
                                    value={data.last_name}
                                    className="pl-10 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 py-3 transition-all hover:border-stone-300"
                                    autoComplete="family-name"
                                    onChange={(e) => setData('last_name', e.target.value)}
                                    placeholder="Doe"
                                />
                            </div>
                            <InputError message={errors.last_name} className="mt-2" />
                        </div>
                    </div>
                    <div>
                        <InputLabel htmlFor="shop_name" value="Shop Name" className="text-stone-700 font-bold mb-1.5" />
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors">
                                <Briefcase size={18} />
                            </div>
                            <TextInput
                                id="shop_name"
                                name="shop_name"
                                value={data.shop_name}
                                className="pl-10 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 py-3 transition-all hover:border-stone-300"
                                autoComplete="organization"
                                onChange={(e) => setData('shop_name', e.target.value)}
                                placeholder="e.g. Silang Pottery"
                            />
                        </div>
                        <InputError message={errors.shop_name} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="email" value="Business Email" className="text-stone-700 font-bold mb-1.5" />
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                                <Mail size={18} />
                            </div>
                            <TextInput
                                id="email"
                                type="email"
                                value={email}
                                className="pl-10 block w-full rounded-xl border-stone-200 bg-stone-100 text-stone-500 py-3 cursor-not-allowed"
                                disabled
                            />
                        </div>
                        <p className="text-xs text-stone-400 mt-1">Verified via {providerLabel}</p>
                    </div>
                    </>
                ) : (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="first_name" value="First Name" className="text-stone-700 font-bold mb-1.5" />
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <TextInput
                                    id="first_name"
                                    name="first_name"
                                    value={data.first_name}
                                    className="pl-10 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 py-3 transition-all hover:border-stone-300"
                                    autoComplete="given-name"
                                    isFocused={true}
                                    onChange={(e) => setData('first_name', e.target.value)}
                                    placeholder="John"
                                />
                            </div>
                            <InputError message={errors.first_name} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="last_name" value="Last Name" className="text-stone-700 font-bold mb-1.5" />
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <TextInput
                                    id="last_name"
                                    name="last_name"
                                    value={data.last_name}
                                    className="pl-10 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 py-3 transition-all hover:border-stone-300"
                                    autoComplete="family-name"
                                    onChange={(e) => setData('last_name', e.target.value)}
                                    placeholder="Doe"
                                />
                            </div>
                            <InputError message={errors.last_name} className="mt-2" />
                        </div>
                    </div>
                    <div>
                        <InputLabel htmlFor="email" value="Email Address" className="text-stone-700 font-bold mb-1.5" />
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                                <Mail size={18} />
                            </div>
                            <TextInput
                                id="email"
                                type="email"
                                value={email}
                                className="pl-10 block w-full rounded-xl border-stone-200 bg-stone-100 text-stone-500 py-3 cursor-not-allowed"
                                disabled
                            />
                        </div>
                        <p className="text-xs text-stone-400 mt-1">Verified via {providerLabel}</p>
                    </div>
                    </>
                )}

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel htmlFor="password" value="Password" className="text-stone-700 font-bold mb-1.5" />
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors">
                                <Lock size={18} />
                            </div>
                            <TextInput
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={data.password}
                                className="pl-10 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 py-3 pr-10 transition-all hover:border-stone-300"
                                autoComplete="new-password"
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="********"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-clay-600 transition"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirm" className="text-stone-700 font-bold mb-1.5" />
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors">
                                <Lock size={18} />
                            </div>
                            <TextInput
                                id="password_confirmation"
                                type={showPassword ? "text" : "password"}
                                name="password_confirmation"
                                value={data.password_confirmation}
                                className="pl-10 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 py-3 transition-all hover:border-stone-300"
                                autoComplete="new-password"
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="********"
                            />
                        </div>
                    </div>
                </div>
                <InputError message={errors.password} className="mt-2" />

                <div className="block mt-4">
                    <div className="flex items-start bg-stone-50/50 p-4 rounded-xl border border-stone-100">
                        <Checkbox
                            name="terms"
                            checked={data.terms}
                            onChange={handleTermsCheckboxChange}
                            className="mt-0.5 text-clay-600 focus:ring-clay-500 rounded border-stone-300 hover:border-clay-400 transition cursor-pointer"
                        />
                        <span className="ms-3 text-sm text-stone-600 leading-snug">
                            I agree to the{' '}
                            <button
                                type="button"
                                onClick={() => openLegalModal(primaryLegalType)}
                                className="font-semibold text-clay-600 hover:text-clay-700 hover:underline transition-colors"
                            >
                                {primaryLegalLabel}
                            </button>
                            {' '}and{' '}
                            <button
                                type="button"
                                onClick={() => openLegalModal(secondaryLegalType)}
                                className="font-semibold text-clay-600 hover:text-clay-700 hover:underline transition-colors"
                            >
                                {secondaryLegalLabel}
                            </button>.
                        </span>
                    </div>
                    <InputError message={errors.terms} className="mt-2" />
                </div>

                <div className="pt-4">
                    <PrimaryButton 
                        className={`relative w-full justify-center py-3.5 rounded-xl text-base font-bold shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden group ${
                            isArtisan 
                                ? 'bg-gradient-to-r from-stone-800 to-stone-900 hover:from-stone-900 hover:to-black shadow-stone-900/25' 
                                : 'bg-gradient-to-r from-clay-600 to-clay-500 hover:from-clay-700 hover:to-clay-600 shadow-clay-500/25'
                        }`}
                        disabled={processing}
                    >
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"></div>
                        <span className={`relative flex items-center gap-2 ${isArtisan ? 'text-amber-50' : 'text-white'}`}>
                            {processing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : isArtisan ? (
                                'Continue to Shop Setup'
                            ) : (
                                'Complete Registration'
                            )}
                        </span>
                    </PrimaryButton>
                </div>
            </form>

            <LegalModal
                isOpen={legalModal.isOpen}
                onClose={handleLegalModalClose}
                onAccept={handleLegalAccept}
                type={legalModal.type}
            />
        </GuestLayout>
    );
}
