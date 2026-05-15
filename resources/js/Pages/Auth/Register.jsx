import { useEffect, useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Checkbox from '@/Components/Checkbox';
import LegalModal from '@/Components/LegalModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, Store, Mail, Lock, User } from 'lucide-react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        terms: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: 'terms' });
    const [isGuidingTermsAcceptance, setIsGuidingTermsAcceptance] = useState(false);
    const [acceptedLegalDocuments, setAcceptedLegalDocuments] = useState({
        terms: false,
        privacy: false,
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const [emailValidation, setEmailValidation] = useState({ isValid: null, message: '' });

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
        if (!documents.terms) {
            setLegalModal({ isOpen: true, type: 'terms' });
            return;
        }

        if (!documents.privacy) {
            setLegalModal({ isOpen: true, type: 'privacy' });
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

    const canEnableTermsCheckbox = acceptedLegalDocuments.terms && acceptedLegalDocuments.privacy;

    return (
        <GuestLayout quote="Join the community of art lovers and clay enthusiasts.">
            <Head title="Create Account" />

            <div className="mb-8 text-center sm:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-clay-100 to-amber-50 mb-4 shadow-inner">
                    <User className="text-clay-600" size={24} strokeWidth={2.5} />
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight mb-2">Create Account</h1>
                <p className="text-stone-500 text-sm sm:text-base">Sign up to discover unique local pottery.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors z-20">
                                <User size={18} />
                            </div>
                            <TextInput
                                id="first_name"
                                name="first_name"
                                value={data.first_name}
                                className="pl-10 mt-1 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 transition-all hover:border-stone-300"
                                autoComplete="given-name"
                                isFocused={true}
                                onChange={(e) => setData('first_name', e.target.value)}
                                required
                                floatingLabel="First Name"
                                withIcon={true}
                            />
                        </div>
                        <InputError message={errors.first_name} className="mt-2" />
                    </div>

                    <div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors z-20">
                                <User size={18} />
                            </div>
                            <TextInput
                                id="last_name"
                                name="last_name"
                                value={data.last_name}
                                className="pl-10 mt-1 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 transition-all hover:border-stone-300"
                                autoComplete="family-name"
                                onChange={(e) => setData('last_name', e.target.value)}
                                floatingLabel="Last Name"
                                withIcon={true}
                            />
                        </div>
                        <InputError message={errors.last_name} className="mt-2" />
                    </div>
                </div>

                <div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors z-20">
                            <Mail size={18} />
                        </div>
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="pl-10 mt-1 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 transition-all hover:border-stone-300"
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            floatingLabel="Email Address"
                            withIcon={true}
                        />
                        {emailValidation.isValid !== null && (
                            <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium px-1 animate-in fade-in slide-in-from-top-1 duration-300 ${emailValidation.isValid ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {emailValidation.isValid ? (
                                    <CheckCircle size={14} className="shrink-0" />
                                ) : (
                                    <AlertCircle size={14} className="shrink-0" />
                                )}
                                <span>{emailValidation.message}</span>
                            </div>
                        )}
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                {/* Split Password Fields with Toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors z-20">
                                <Lock size={18} />
                            </div>
                            <TextInput
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={data.password}
                                className="pl-10 mt-1 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 pr-10 transition-all hover:border-stone-300"
                                autoComplete="new-password"
                                onChange={(e) => setData('password', e.target.value)}
                                required
                                floatingLabel="Password"
                                withIcon={true}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 mt-1 pr-3.5 flex items-center text-stone-400 hover:text-clay-600 transition-colors z-20"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-clay-500 transition-colors z-20">
                                <Lock size={18} />
                            </div>
                            <TextInput
                                id="password_confirmation"
                                type={showPassword ? "text" : "password"}
                                name="password_confirmation"
                                value={data.password_confirmation}
                                className="pl-10 mt-1 block w-full rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 transition-all hover:border-stone-300"
                                autoComplete="new-password"
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required
                                floatingLabel="Confirm Password"
                                withIcon={true}
                            />
                        </div>
                    </div>
                </div>
                <InputError message={errors.password} className="mt-2" />

                {data.password && (
                    <div className="mt-2 p-3 bg-stone-50 rounded-xl border border-stone-100 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Password Strength</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                (data.password.length < 8) ? 'text-rose-500' : 
                                (data.password.length < 12) ? 'text-amber-500' : 'text-emerald-500'
                            }`}>
                                {data.password.length < 8 ? 'Weak' : data.password.length < 12 ? 'Fair' : 'Strong'}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden flex gap-0.5">
                            <div className={`h-full transition-all duration-500 ${data.password.length >= 4 ? (data.password.length < 8 ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                            <div className={`h-full transition-all duration-500 ${data.password.length >= 8 ? (data.password.length < 12 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                            <div className={`h-full transition-all duration-500 ${data.password.length >= 12 ? 'bg-emerald-500' : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                            <div className={`h-full transition-all duration-500 ${/[!@#$%^&*(),.?":{}|<>]/.test(data.password) && data.password.length >= 8 ? 'bg-emerald-500' : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                        </div>
                        <p className="mt-2 text-[10px] text-stone-500 leading-tight">
                            Use 8+ characters with a mix of letters, numbers & symbols for maximum security.
                        </p>
                    </div>
                )}

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
                                onClick={() => openLegalModal('terms')}
                                className="font-semibold text-clay-600 hover:text-clay-700 hover:underline transition-colors"
                            >
                                Terms of Service
                            </button>
                            {' '}and{' '}
                            <button 
                                type="button"
                                onClick={() => openLegalModal('privacy')}
                                className="font-semibold text-clay-600 hover:text-clay-700 hover:underline transition-colors"
                            >
                                Privacy Policy
                            </button>.
                        </span>
                    </div>
                    <InputError message={errors.terms} className="mt-2" />
                </div>

                <div className="pt-4">
                    <PrimaryButton 
                        className="relative w-full justify-center py-3.5 bg-gradient-to-r from-clay-600 to-clay-500 hover:from-clay-700 hover:to-clay-600 border-none rounded-xl text-base font-bold shadow-lg shadow-clay-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-clay-500/30 active:translate-y-0 active:shadow-md overflow-hidden group" 
                        disabled={processing}
                    >
                        {/* Shine effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"></div>
                        
                        <span className="relative flex items-center gap-2">
                            {processing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </span>
                    </PrimaryButton>
                </div>
            </form>

            {/* Social Login Section */}
            <div className="mt-8">
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-stone-400 text-xs font-semibold uppercase tracking-widest">Or sign up with</span>
                    </div>
                </div>

                <a 
                    href="/auth/google" 
                    className="w-full flex items-center justify-center gap-3 py-3 border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group"
                >
                    <img src="/images/google-icon.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                    <span className="text-sm font-semibold text-stone-600">Google</span>
                </a>
            </div>

            <div className="mt-8 pt-6 border-t border-stone-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <Link 
                        href={route('login')}
                        className="group flex items-center justify-center gap-2 text-[13px] font-bold text-stone-600 bg-stone-50 border border-stone-200 px-5 py-2.5 rounded-xl hover:bg-stone-100 hover:border-stone-300 transition-all duration-300 shadow-sm hover:shadow"
                    >
                        <User size={16} className="text-stone-400 group-hover:text-stone-600 transition-colors group-hover:scale-110" />
                        <span>Log in</span>
                    </Link>
                    
                    <Link 
                        href="/artisan/register" 
                        className="group flex items-center justify-center gap-2 text-[13px] font-bold text-clay-700 bg-clay-50 border border-clay-200 px-5 py-2.5 rounded-xl hover:bg-clay-100 hover:border-clay-300 transition-all duration-300 shadow-sm hover:shadow"
                    >
                        <Store size={16} className="text-clay-500 group-hover:text-clay-700 transition-colors group-hover:scale-110" />
                        <span>Become an Artisan</span>
                    </Link>
                </div>
            </div>

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

