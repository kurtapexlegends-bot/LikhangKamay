import React, { useMemo } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, LogOut, AlertTriangle, ChevronDown, Store, ShieldCheck, CreditCard } from 'lucide-react';
import axios from 'axios';
import { CAVITE_REGION, normalizeCaviteAddressText } from '@/lib/caviteAddresses';
import StepPill from '@/Pages/Auth/Partials/StepPill';
import ShopDetailsStep from '@/Pages/Auth/Partials/ShopDetailsStep';
import DocumentsStep from '@/Pages/Auth/Partials/DocumentsStep';
import PaymentStep from '@/Pages/Auth/Partials/PaymentStep';

export default function ArtisanSetup({ auth, rejectionReason }) {
    const [step, setStep] = React.useState(1);
    const [showRejection, setShowRejection] = React.useState(true);
    const isRejected = auth.user.artisan_status === 'rejected';
    const effectiveRejectionReason = rejectionReason || auth.user.artisan_rejection_reason;
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
    }, [data.shop_name, auth.user.id]);

    const submit = (event) => {
        event.preventDefault();

        transform((current) => ({
            ...current,
            current_step: step,
        }));

        post(route('artisan.setup.store'), {
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

    const stepProgressPercent = useMemo(() => {
        if (step === 1) return 33;
        if (step === 2) return 66;
        return 100;
    }, [step]);

    const stepTitles = [
        'Shop Information',
        'Verification Documents',
        'Payout Details',
    ];

    return (
        <>
            <Head title="Setup Your Artisan Shop" />

            <div className="min-h-screen bg-stone-50 text-stone-900">
                <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-md">
                    <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
                        <div className="flex items-center gap-3">
                            <img
                                src="/images/logo.png"
                                alt="LikhangKamay"
                                className="h-9 w-9 object-contain"
                            />
                            <div>
                                <h1 className="text-base font-bold text-stone-900 leading-tight">LikhangKamay</h1>
                                <p className="text-[11px] font-medium text-stone-500">Seller Onboarding</p>
                            </div>
                        </div>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 hover:text-stone-900 cursor-pointer"
                        >
                            <LogOut size={14} />
                            <span>Sign Out</span>
                        </Link>
                    </div>
                </header>

                <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
                    {/* Header Context */}
                    <div className="mb-8 text-center">
                        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-clay-200 bg-clay-50 px-3 py-1 text-xs font-semibold text-clay-800">
                            <ShieldCheck size={14} className="text-clay-600" />
                            <span>Artisan Verification</span>
                        </div>
                        <h1 className="mb-2 font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
                            Setup Your Artisan Shop
                        </h1>
                        <p className="mx-auto max-w-lg text-sm text-stone-500">
                            Complete your shop profile and credentials to begin selling your handcrafted creations to buyers nationwide.
                        </p>
                    </div>

                    {/* Responsive Stepper */}
                    <div className="mb-8">
                        {/* Mobile Stepper Progress Bar */}
                        <div className="sm:hidden mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-stone-800">
                                    Step {step} of 3: {stepTitles[step - 1]}
                                </span>
                                <span className="text-xs font-semibold text-clay-700">
                                    {stepProgressPercent}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                                <div
                                    className="h-full bg-clay-600 transition-all duration-300"
                                    style={{ width: `${stepProgressPercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Desktop Step Pills */}
                        <div className="hidden sm:flex justify-center">
                            <div className="inline-flex items-center gap-1 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xs">
                                <StepPill
                                    number={1}
                                    icon={<Store size={14} />}
                                    label="Shop Info"
                                    active={step >= 1}
                                    current={step === 1}
                                    onClick={step > 1 ? () => setStep(1) : undefined}
                                />
                                <div className={`h-0.5 w-6 ${step >= 2 ? 'bg-clay-600' : 'bg-stone-200'}`} />
                                <StepPill
                                    number={2}
                                    icon={<ShieldCheck size={14} />}
                                    label="Documents"
                                    active={step >= 2}
                                    current={step === 2}
                                    onClick={step > 2 ? () => setStep(2) : undefined}
                                />
                                <div className={`h-0.5 w-6 ${step >= 3 ? 'bg-clay-600' : 'bg-stone-200'}`} />
                                <StepPill
                                    number={3}
                                    icon={<CreditCard size={14} />}
                                    label="Payouts"
                                    active={step >= 3}
                                    current={step === 3}
                                />
                                <div className="h-0.5 w-6 bg-stone-200" />
                                <StepPill
                                    icon={<Clock size={14} />}
                                    label="Review"
                                    active={false}
                                    current={false}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main Wizard Container */}
                    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs">
                        {isRejected && (
                            <div className="border-b border-rose-200 bg-rose-50/70 transition-all duration-300">
                                <button
                                    type="button"
                                    onClick={() => setShowRejection(!showRejection)}
                                    className="flex w-full items-center justify-between px-6 py-4 sm:px-10 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle size={20} className="shrink-0 text-rose-600" />
                                        <div>
                                            <h3 className="text-sm font-bold text-rose-900">Application Needs Revisions</h3>
                                            <p className="text-xs text-rose-700">Please review reviewer remarks and update your details.</p>
                                        </div>
                                    </div>
                                    <ChevronDown
                                        size={18}
                                        className={`text-rose-500 transition-transform duration-300 ${showRejection ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                
                                {showRejection && (
                                    <div className="px-6 pb-6 sm:px-10 sm:pb-8">
                                        <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-xs">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-rose-800 mb-1">Reviewer Feedback:</p>
                                            <p className="text-sm font-medium text-stone-800">
                                                {effectiveRejectionReason || 'Please verify that your uploaded documents are legible and business credentials match your shop name.'}
                                            </p>
                                        </div>
                                        <p className="mt-2.5 text-xs font-medium text-rose-700">
                                            Make the requested updates below and resubmit for verification.
                                        </p>

                                        <div className="mt-4 pt-4 border-t border-rose-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-bold text-stone-800">Prefer to shop instead?</p>
                                                <p className="text-[11px] text-stone-500">You can convert your account to a standard customer account.</p>
                                            </div>
                                            <Link
                                                href={route('artisan.convert-to-buyer')}
                                                method="post"
                                                as="button"
                                                className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-800 whitespace-nowrap shadow-xs cursor-pointer"
                                            >
                                                Convert to Buyer Account
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18, ease: 'easeInOut' }}
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
                                        errors={errors}
                                        submit={submit}
                                        processing={processing}
                                        setStep={setStep}
                                        auth={auth}
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

                    {/* Legal Footer */}
                    <div className="mt-8 text-center text-xs text-stone-500">
                        <p>
                            By submitting your application, you agree to our{' '}
                            <Link href="/seller-agreement?from=register" className="font-semibold text-clay-700 underline hover:text-clay-800">
                                Seller Agreement
                            </Link>{' '}
                            and{' '}
                            <Link href="/seller-privacy?from=register" className="font-semibold text-clay-700 underline hover:text-clay-800">
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


