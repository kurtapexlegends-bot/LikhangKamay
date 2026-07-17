import React, { useCallback } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Sparkles, LogOut, AlertTriangle, ChevronDown } from 'lucide-react';
import { CAVITE_REGION, normalizeCaviteAddressText } from '@/lib/caviteAddresses';
import StepPill from '@/Pages/Auth/Partials/StepPill';
import ShopDetailsStep from '@/Pages/Auth/Partials/ShopDetailsStep';
import DocumentsStep from '@/Pages/Auth/Partials/DocumentsStep';
import PaymentStep from '@/Pages/Auth/Partials/PaymentStep';

export default function ArtisanSetup({ auth }) {
    const [step, setStep] = React.useState(1);
    const [showRejection, setShowRejection] = React.useState(false);
    const isRejected = auth.user.artisan_status === 'rejected';
    const defaultRegion = auth.user.region || CAVITE_REGION;
    const defaultCity = auth.user.city
        ? normalizeCaviteAddressText(auth.user.city)
        : defaultRegion === CAVITE_REGION
            ? 'Dasmarinas City'
            : '';

    const { data, setData, post, processing, errors, transform } = useForm({
        current_step: 1,
        shop_name: auth.user.shop_name || '',
        phone_number: auth.user.phone_number || '',
        street_address: auth.user.street_address || '',
        city: defaultCity,
        barangay: normalizeCaviteAddressText(auth.user.barangay || ''),
        region: defaultRegion,
        zip_code: auth.user.zip_code || '',
        business_permit: null,
        dti_registration: null,
        valid_id: null,
        tin_id: null,
        payout_method: auth.user.payout_method || 'GCash',
        payout_account_name: auth.user.payout_account_name || '',
        payout_account_number: auth.user.payout_account_number || '',
    });

    const [shopNameValidation, setShopNameValidation] = React.useState({ isValid: null, message: '' });

    React.useEffect(() => {
        if (!data.shop_name || data.shop_name.length < 3) {
            setShopNameValidation({ isValid: null, message: '' });
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await axios.post(route('api.validate-constraint'), {
                    type: 'shop_name_availability',
                    value: data.shop_name,
                    context: { user_id: auth.user.id }
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

    const submit = (event) => {
        event.preventDefault();

        transform((current) => ({
            ...current,
            current_step: step,
        }));

        post(route('artisan.setup.store'), {
            forceFormData: true,
            onSuccess: () => {
                if (step < 3) {
                    setStep(step + 1);
                    return;
                }

                window.location.href = '/artisan/pending';
            },
            onError: (payload) => console.error('Submission Errors:', payload),
        });
    };

    const handleFileChange = useCallback((file, field) => {
        setData(field, file);
    }, [setData]);

    return (
        <>
            <Head title="Setup Your Shop" />

            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
                <header className="sticky top-0 z-50 border-b border-amber-100 bg-white/80 backdrop-blur-lg">
                    <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
                        <div className="flex items-center gap-3">
                            <img
                                src="/images/logo.png"
                                alt="LikhangKamay"
                                className="h-10 w-10 object-contain"
                            />
                            <div>
                                <h1 className="font-bold text-gray-900">LikhangKamay</h1>
                                <p className="text-xs text-gray-500">Seller Onboarding</p>
                            </div>
                        </div>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-700"
                        >
                            <LogOut size={16} /> Sign Out
                        </Link>
                    </div>
                </header>

                <main className="mx-auto max-w-4xl px-4 py-8">

                    <div className="mb-8 text-center">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
                            <Sparkles size={16} /> Become a Verified Seller
                        </div>
                        <h1 className="mb-2 font-serif text-3xl font-bold text-gray-900 sm:text-4xl">
                            Setup Your Artisan Shop
                        </h1>
                        <p className="mx-auto max-w-md text-gray-500">
                            Complete your profile to start selling your handcrafted products to customers across the Philippines.
                        </p>
                    </div>

                    <div className="mb-8 flex justify-center">
                        <div className="flex items-center gap-0 rounded-2xl border border-gray-100 bg-white p-1 shadow-lg">
                            <StepPill number={1} label="Shop Info" active={step >= 1} current={step === 1} />
                            <div className={`h-0.5 w-8 ${step >= 2 ? 'bg-clay-500' : 'bg-gray-200'}`} />
                            <StepPill number={2} label="Documents" active={step >= 2} current={step === 2} />
                            <div className={`h-0.5 w-8 ${step >= 3 ? 'bg-clay-500' : 'bg-gray-200'}`} />
                            <StepPill number={3} label="Payments" active={step >= 3} current={step === 3} />
                            <div className="h-0.5 w-8 bg-gray-200" />
                            <StepPill icon={<Clock size={14} />} label="Review" active={false} current={false} />
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
                        {isRejected && (
                            <div className="border-b border-red-100 bg-red-50/50 transition-all duration-300">
                                <button
                                    type="button"
                                    onClick={() => setShowRejection(!showRejection)}
                                    className="flex w-full items-center justify-between px-6 py-4 sm:px-10 hover:bg-red-50/80 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle size={20} className="text-red-600" />
                                        <h3 className="text-sm font-bold text-red-900">Application Needs Revisions</h3>
                                    </div>
                                    <ChevronDown
                                        size={20}
                                        className={`text-red-400 transition-transform duration-300 ${showRejection ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                
                                {showRejection && (
                                    <div className="px-6 pb-6 sm:px-10 sm:pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <p className="text-sm text-red-700">Your previous application could not be approved due to the following reason:</p>
                                        <div className="mt-3 rounded-xl bg-white p-4 border border-red-100 shadow-sm">
                                            <p className="text-sm font-medium text-red-800">{auth.user.artisan_rejection_reason}</p>
                                        </div>
                                        <p className="mt-3 text-xs font-medium text-red-600">Please review the reason above, update your details below, and resubmit.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -15 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                            >
                                {step === 1 && (
                                    <ShopDetailsStep
                                        data={data}
                                        setData={setData}
                                        errors={errors}
                                        submit={submit}
                                        processing={processing}
                                        shopNameValidation={shopNameValidation}
                                    />
                                )}

                                {step === 2 && (
                                    <DocumentsStep
                                        data={data}
                                        setData={setData}
                                        errors={errors}
                                        submit={submit}
                                        processing={processing}
                                        setStep={setStep}
                                        auth={auth}
                                        handleFileChange={handleFileChange}
                                    />
                                )}

                                {step === 3 && (
                                    <PaymentStep
                                        data={data}
                                        setData={setData}
                                        errors={errors}
                                        submit={submit}
                                        processing={processing}
                                        setStep={setStep}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>
                            By submitting, you agree to our{' '}
                            <Link href="/seller-agreement?from=register" className="text-clay-600 underline">
                                Seller Agreement
                            </Link>{' '}
                            and{' '}
                            <Link href="/seller-privacy?from=register" className="text-clay-600 underline">
                                Data Privacy Policy
                            </Link>
                            .
                        </p>
                    </div>
                </main>
            </div>
        </>
    );
}


