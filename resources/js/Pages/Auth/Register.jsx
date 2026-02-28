import { useEffect, useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Checkbox from '@/Components/Checkbox';
import LegalModal from '@/Components/LegalModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, Store } from 'lucide-react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        terms: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: 'terms' });

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

    const handleLegalAccept = () => {
        setData('terms', true);
    };

    return (
        <GuestLayout quote="Join the community of art lovers and clay enthusiasts.">
            <Head title="Create Account" />

            <div className="mb-6">
                <h1 className="font-serif text-2xl font-bold text-gray-900 tracking-tight">Create Account</h1>
                <p className="text-gray-500 mt-1 text-sm">Sign up to discover unique local pottery.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="name" value="Full Name" className="text-gray-700 font-bold mb-1.5" />
                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-1 block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 transition-all"
                        autoComplete="name"
                        isFocused={true}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        placeholder="Juan Dela Cruz"
                    />
                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-gray-700 font-bold mb-1.5" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 transition-all"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        placeholder="juan@example.com"
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                {/* Split Password Fields with Toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel htmlFor="password" value="Password" className="text-gray-700 font-bold mb-1.5" />
                        <div className="relative">
                            <TextInput
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={data.password}
                                className="mt-1 block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 pr-10 transition-all"
                                autoComplete="new-password"
                                onChange={(e) => setData('password', e.target.value)}
                                required
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 mt-1 pr-3 flex items-center text-gray-400 hover:text-clay-600 transition"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirm" className="text-gray-700 font-bold mb-1.5" />
                        <TextInput
                            id="password_confirmation"
                            type={showPassword ? "text" : "password"}
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="mt-1 block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 transition-all"
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                <InputError message={errors.password} className="mt-2" />

                <div className="block mt-4">
                    <div className="flex items-start">
                        <Checkbox
                            name="terms"
                            checked={data.terms}
                            onChange={(e) => setData('terms', e.target.checked)}
                            className="mt-1 text-clay-600 focus:ring-clay-500 rounded border-gray-300 hover:border-clay-400 transition cursor-pointer"
                        />
                        <span className="ms-2 text-sm text-gray-600">
                            I agree to the{' '}
                            <button 
                                type="button"
                                onClick={() => openLegalModal('terms')}
                                className="font-bold text-clay-700 hover:underline"
                            >
                                Terms of Service
                            </button>
                            {' '}and{' '}
                            <button 
                                type="button"
                                onClick={() => openLegalModal('privacy')}
                                className="font-bold text-clay-700 hover:underline"
                            >
                                Privacy Policy
                            </button>.
                        </span>
                    </div>
                    <InputError message={errors.terms} className="mt-2" />
                </div>

                <div className="pt-2">
                    <PrimaryButton 
                        className="w-full justify-center py-3.5 bg-clay-600 hover:bg-clay-700 rounded-xl text-base font-bold shadow-lg shadow-clay-500/20 transition-all hover:-translate-y-0.5" 
                        disabled={processing}
                    >
                        {processing ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            'Create Account'
                        )}
                    </PrimaryButton>
                </div>
            </form>

            {/* Social Login Section */}
            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-400 text-xs font-bold uppercase tracking-wider">Or sign up with</span>
                    </div>
                </div>

                <div className="mt-4">
                    <a 
                        href="/auth/google" 
                        className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition bg-white hover:shadow-sm"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                        <span className="text-sm font-bold text-gray-600">Sign up with Google</span>
                    </a>
                </div>
            </div>

            <div className="mt-6 text-center border-t border-gray-100 pt-6 flex flex-col items-center gap-3">
                <p className="text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href={route('login')} className="font-bold text-clay-700 hover:underline">
                        Log in
                    </Link>
                </p>
                
                <Link 
                    href="/artisan/register" 
                    className="flex items-center gap-2 text-xs font-bold text-clay-600 bg-clay-50 px-3 py-1.5 rounded-full hover:bg-clay-100 transition"
                >
                    <Store size={12} />
                    Register as an Artisan
                </Link>
            </div>

            {/* Legal Modal */}
            <LegalModal 
                isOpen={legalModal.isOpen} 
                onClose={closeLegalModal} 
                onAccept={handleLegalAccept}
                type={legalModal.type} 
            />
        </GuestLayout>
    );
}