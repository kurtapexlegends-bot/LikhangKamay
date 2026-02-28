import { useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, useForm, Link } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, CheckCircle, Store } from 'lucide-react';

export default function CompleteProfile({ email, suggestedName, provider, isArtisan = false }) {
    const { data, setData, post, processing, errors } = useForm({
        name: suggestedName || '',
        shop_name: '',
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('auth.complete-profile.store'));
    };

    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';

    return (
        <GuestLayout 
            quote={isArtisan 
                ? "Almost there! Complete your profile to start selling." 
                : "Almost there! Complete your profile to start shopping."
            }
        >
            <Head title="Complete Your Profile" />

            <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="text-green-500" size={24} />
                    <span className="text-sm font-medium text-green-600">
                        Connected via {providerLabel}
                    </span>
                </div>

                {isArtisan && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-clay-50 text-clay-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                        <Store size={14} /> Artisan Account
                    </div>
                )}

                <h2 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">
                    Complete Your Profile
                </h2>
                <p className="text-gray-500 mt-1 text-sm">
                    {isArtisan 
                        ? "Set your details and password to create your seller account."
                        : "Set your name and password to secure your account."
                    }
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                {/* Email (Read-only) */}
                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-gray-700 font-bold mb-1.5" />
                    <TextInput
                        id="email"
                        type="email"
                        value={email}
                        className="block w-full rounded-xl border-gray-200 bg-gray-100 text-gray-500 py-3 cursor-not-allowed"
                        disabled
                    />
                    <p className="text-xs text-gray-400 mt-1">Verified via {providerLabel}</p>
                </div>

                {isArtisan ? (
                    /* Artisan: Owner Name + Shop Name in 2 columns */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="name" value="Owner Name" className="text-gray-700 font-bold mb-1.5" />
                            <TextInput
                                id="name"
                                name="name"
                                value={data.name}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 transition-all"
                                autoComplete="name"
                                isFocused={true}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Full Name"
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="shop_name" value="Shop Name" className="text-gray-700 font-bold mb-1.5" />
                            <TextInput
                                id="shop_name"
                                name="shop_name"
                                value={data.shop_name}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 transition-all"
                                autoComplete="organization"
                                onChange={(e) => setData('shop_name', e.target.value)}
                                placeholder="e.g. Silang Pottery"
                            />
                            <InputError message={errors.shop_name} className="mt-2" />
                        </div>
                    </div>
                ) : (
                    /* Buyer: Just Full Name */
                    <div>
                        <InputLabel htmlFor="name" value="Full Name" className="text-gray-700 font-bold mb-1.5" />
                        <TextInput
                            id="name"
                            name="name"
                            value={data.name}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 transition-all"
                            autoComplete="name"
                            isFocused={true}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Juan Dela Cruz"
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>
                )}

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel htmlFor="password" value="Password" className="text-gray-700 font-bold mb-1.5" />
                        <div className="relative">
                            <TextInput
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={data.password}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 pr-10 transition-all"
                                autoComplete="new-password"
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Min. 8 characters"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-clay-600 transition"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirm Password" className="text-gray-700 font-bold mb-1.5" />
                        <TextInput
                            id="password_confirmation"
                            type={showPassword ? "text" : "password"}
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-clay-500 focus:ring-clay-500 py-3 transition-all"
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            placeholder="Confirm password"
                        />
                    </div>
                </div>
                <InputError message={errors.password} className="mt-2" />

                <div className="pt-2">
                    <PrimaryButton 
                        className={`w-full justify-center py-3.5 rounded-xl text-base font-bold shadow-lg transition-all hover:-translate-y-0.5 ${
                            isArtisan 
                                ? 'bg-gray-900 hover:bg-black shadow-gray-500/20' 
                                : 'bg-clay-600 hover:bg-clay-700 shadow-clay-500/20'
                        }`}
                        disabled={processing}
                    >
                        {processing ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : isArtisan ? (
                            'Continue to Shop Setup'
                        ) : (
                            'Complete Registration'
                        )}
                    </PrimaryButton>
                </div>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
                By completing registration, you agree to our{' '}
                <Link href={route('terms')} className="font-bold text-clay-700 hover:underline">
                    Terms of Service
                </Link>
                {' '}and{' '}
                <Link href={route('privacy')} className="font-bold text-clay-700 hover:underline">
                    Privacy Policy
                </Link>.
            </p>
        </GuestLayout>
    );
}
