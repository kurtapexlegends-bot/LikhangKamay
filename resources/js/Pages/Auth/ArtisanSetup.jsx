/* global route */
import React, { useMemo } from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, LogOut, Store, ShieldCheck, CreditCard } from 'lucide-react';
import axios from 'axios';
import { CAVITE_REGION, normalizeCaviteAddressText } from '@/lib/caviteAddresses';
import StepPill from '@/Pages/Auth/Partials/StepPill';
import ShopDetailsStep from '@/Pages/Auth/Partials/ShopDetailsStep';
import DocumentsStep from '@/Pages/Auth/Partials/DocumentsStep';
import PaymentStep from '@/Pages/Auth/Partials/PaymentStep';
import RevisionFeedbackBanner from '@/Components/Common/RevisionFeedbackBanner';
import useArtisanRevisionProgress from '@/Pages/Auth/Partials/useArtisanRevisionProgress';

export default function ArtisanSetup({
    auth,
    rejectionReason,
    activeRevision = null,
    existingDocuments,
    existingPayoutAccountNumber,
    kycSelfieUrl = null,
    kycLivenessVerified = false,
    kycVerificationMeta = null,
}) {
    const user = auth?.user || {};
    const isRejected = user.artisan_status === 'rejected';
    const effectiveRejectionReason = rejectionReason || user.artisan_rejection_reason;

    const revisionItems = React.useMemo(
        () => (Array.isArray(activeRevision?.items) ? activeRevision.items : []),
        [activeRevision]
    );
    const initialStep = React.useMemo(() => {
        if (!isRejected || revisionItems.length === 0) return 1;
        const keys = revisionItems.map((i) => i.key);
        if (keys.some((k) => k === 'shop_details' || k === 'shop_address')) return 1;
        if (keys.some((k) => ['business_permit', 'dti_registration', 'valid_id', 'tin_id', 'face_verification'].includes(k))) return 2;
        if (keys.includes('payout_info')) return 3;
        return 1;
    }, [isRejected, revisionItems]);

    const [step, setStep] = React.useState(initialStep);
    const defaultRegion = user.region || CAVITE_REGION;
    const defaultCity = user.city
        ? normalizeCaviteAddressText(user.city)
        : defaultRegion === CAVITE_REGION
            ? 'Dasmarinas City'
            : '';

    const flaggedKeys = React.useMemo(
        () => new Set(revisionItems.map((item) => item.key)),
        [revisionItems]
    );

    const activeStepKeys = React.useMemo(() => {
        if (step === 1) return new Set(['shop_details', 'shop_address']);
        if (step === 2) return new Set(['business_permit', 'dti_registration', 'valid_id', 'tin_id', 'face_verification']);
        return new Set(['payout_info']);
    }, [step]);

    const revisionNotesMap = React.useMemo(() => {
        const map = {};
        revisionItems.forEach((item) => {
            if (item.key) map[item.key] = item.note || '';
        });
        return map;
    }, [revisionItems]);

    const { data, setData, post, processing, errors, transform } = useForm({
        current_step: 1,
        shop_name: user.shop_name || '',
        phone_number: user.phone_number || '',
        street_address: user.street_address || '',
        city: defaultCity,
        barangay: normalizeCaviteAddressText(user.barangay || ''),
        region: defaultRegion,
        zip_code: user.zip_code || '',
        latitude: user.latitude || null,
        longitude: user.longitude || null,
        business_permit: null,
        dti_registration: null,
        valid_id: null,
        tin_id: null,
        selfie_data_url: null,
        face_descriptor: null,
        id_face_descriptor: null,
        id_face_detected: kycVerificationMeta?.id_face_detected ?? null,
        face_match_score: kycVerificationMeta?.match_score ?? null,
        valid_id_camera_captured: false,
        payout_method: user.payout_method || 'GCash',
        payout_account_name: user.payout_account_name || '',
        payout_account_number: existingPayoutAccountNumber || user.payout_account_number || '',
    });

    const initialUserSnapshot = React.useMemo(() => ({
        shop_name: user.shop_name,
        phone_number: user.phone_number,
        street_address: user.street_address,
        city: defaultCity,
        barangay: user.barangay,
        zip_code: user.zip_code,
        latitude: user.latitude,
        longitude: user.longitude,
        payout_method: user.payout_method,
        payout_account_name: user.payout_account_name,
        payout_account_number: existingPayoutAccountNumber || user.payout_account_number,
    }), [
        user.shop_name,
        user.phone_number,
        user.street_address,
        defaultCity,
        user.barangay,
        user.zip_code,
        user.latitude,
        user.longitude,
        user.payout_method,
        user.payout_account_name,
        existingPayoutAccountNumber,
        user.payout_account_number,
    ]);

    const {
        addressedKeys,
        stepTotalCounts,
        stepRemainingCounts,
        highlightedKey,
        handleGoToField,
        handleDocumentUploaded,
        handleDocumentRemoved,
    } = useArtisanRevisionProgress({
        userId: user.id,
        activeRevision,
        revisionItems,
        isRejected,
        step,
        setStep,
        data,
        existingDocuments,
        kycSelfieUrl,
        initialUserSnapshot,
    });

    const [shopNameValidation, setShopNameValidation] = React.useState({ isValid: null, message: '' });

    React.useEffect(() => {
        if (!data.shop_name || data.shop_name.length < 3 || !user.id) {
            setShopNameValidation({ isValid: null, message: '' });
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await axios.post(route('api.validate-constraint'), {
                    type: 'shop_name_availability',
                    value: data.shop_name,
                    context: { user_id: user.id }
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
    }, [data.shop_name, user.id]);

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

                router.visit(route('artisan.pending'));
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
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
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

                <main className="mx-auto max-w-4xl px-3 sm:px-6 py-4 sm:py-8 md:py-10">
                    {/* Header Context */}
                    <div className="mb-4 sm:mb-8 text-center">
                        <div className="mb-2 sm:mb-3 inline-flex items-center gap-1.5 rounded-full border border-clay-200 bg-clay-50 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold text-clay-800">
                            <ShieldCheck size={13} className="text-clay-600" />
                            <span>Artisan Verification</span>
                        </div>
                        <h1 className="mb-1 sm:mb-2 font-serif text-xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                            Setup Your Artisan Shop
                        </h1>
                        <p className="mx-auto max-w-lg text-xs sm:text-sm text-stone-500 hidden sm:block">
                            Complete your shop profile and credentials to begin selling your handcrafted creations to buyers nationwide.
                        </p>
                    </div>

                    {/* Responsive Stepper */}
                    <div className="mb-4 sm:mb-8">
                        {/* Mobile Segmented Step Indicators */}
                        <div className="sm:hidden">
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { num: 1, label: 'Shop', icon: Store },
                                    { num: 2, label: 'Documents', icon: ShieldCheck },
                                    { num: 3, label: 'Payout', icon: CreditCard },
                                ].map((s) => {
                                    const isPast = step > s.num;
                                    const isCurrent = step === s.num;
                                    const canNavigate = isRejected || isPast;
                                    const remainingCount = stepRemainingCounts[s.num] || 0;
                                    const stepDone = (stepTotalCounts[s.num] || 0) > 0 && remainingCount === 0;
                                    return (
                                        <button
                                            key={s.num}
                                            type="button"
                                            disabled={!canNavigate}
                                            onClick={canNavigate ? () => setStep(s.num) : undefined}
                                            className={`flex flex-col gap-1.5 p-2 rounded-xl border text-left transition-all ${
                                                isCurrent
                                                    ? 'bg-clay-50/90 border-clay-300 ring-1 ring-clay-300/40 shadow-2xs'
                                                    : canNavigate
                                                        ? 'bg-white border-stone-200 hover:bg-stone-50 cursor-pointer shadow-2xs'
                                                        : 'bg-stone-50/50 border-stone-200/60 opacity-60 cursor-default'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span
                                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                                            isCurrent
                                                                ? 'bg-clay-600 text-white'
                                                                : isPast
                                                                    ? 'bg-emerald-600 text-white'
                                                                    : 'bg-stone-200 text-stone-600'
                                                        }`}
                                                    >
                                                        {isPast && remainingCount === 0 ? '✓' : s.num}
                                                    </span>
                                                    <span
                                                        className={`text-xs font-bold truncate ${
                                                            isCurrent
                                                                ? 'text-clay-900'
                                                                : canNavigate
                                                                    ? 'text-stone-800'
                                                                    : 'text-stone-500'
                                                        }`}
                                                    >
                                                        {s.label}
                                                    </span>
                                                </div>
                                                {remainingCount > 0 ? (
                                                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-100 px-1 text-[9px] font-bold text-rose-700 shrink-0">
                                                        {remainingCount}
                                                    </span>
                                                ) : stepDone ? (
                                                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700 shrink-0">
                                                        ✓
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="h-1 w-full rounded-full bg-stone-200/80 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-300 ${
                                                        isCurrent
                                                            ? 'bg-clay-600 w-full'
                                                            : isPast
                                                                ? 'bg-emerald-600 w-full'
                                                                : 'w-0'
                                                    }`}
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Desktop & Tablet Step Pills */}
                        <div className="hidden sm:flex justify-center">
                            <div className="inline-flex items-center gap-1 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xs max-w-full overflow-x-auto no-scrollbar">
                                <StepPill
                                    number={1}
                                    icon={<Store size={14} />}
                                    label="Shop Info"
                                    active={step >= 1 || isRejected}
                                    current={step === 1}
                                    badgeCount={stepRemainingCounts[1]}
                                    stepResolved={stepTotalCounts[1] > 0 && stepRemainingCounts[1] === 0}
                                    onClick={(step > 1 || isRejected) && step !== 1 ? () => setStep(1) : undefined}
                                />
                                <div className={`h-0.5 w-6 shrink-0 ${step >= 2 ? 'bg-clay-600' : 'bg-stone-200'}`} />
                                <StepPill
                                    number={2}
                                    icon={<ShieldCheck size={14} />}
                                    label="Documents"
                                    active={step >= 2 || isRejected}
                                    current={step === 2}
                                    badgeCount={stepRemainingCounts[2]}
                                    stepResolved={stepTotalCounts[2] > 0 && stepRemainingCounts[2] === 0}
                                    onClick={(step > 2 || isRejected) && step !== 2 ? () => setStep(2) : undefined}
                                />
                                <div className={`h-0.5 w-6 shrink-0 ${step >= 3 ? 'bg-clay-600' : 'bg-stone-200'}`} />
                                <StepPill
                                    number={3}
                                    icon={<CreditCard size={14} />}
                                    label="Payouts"
                                    active={step >= 3 || isRejected}
                                    current={step === 3}
                                    badgeCount={stepRemainingCounts[3]}
                                    stepResolved={stepTotalCounts[3] > 0 && stepRemainingCounts[3] === 0}
                                    onClick={isRejected && step !== 3 ? () => setStep(3) : undefined}
                                />
                                <div className="h-0.5 w-6 shrink-0 bg-stone-200" />
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
                    <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200 bg-white shadow-xs">
                        {isRejected && (
                            <RevisionFeedbackBanner
                                revision={activeRevision}
                                fallbackReason={effectiveRejectionReason || 'Please verify that your uploaded documents are legible and business credentials match your shop name.'}
                                title="Application Needs Revisions"
                                onGoToField={handleGoToField}
                                activeKeys={activeStepKeys}
                                addressedKeys={addressedKeys}
                                variant="rose"
                                embedded
                            />
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
                                        flaggedKeys={flaggedKeys}
                                        addressedKeys={addressedKeys}
                                        highlightedKey={highlightedKey}
                                        revisionNotes={revisionNotesMap}
                                        hasActiveRevision={Boolean(activeRevision)}
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
                                        existingDocuments={existingDocuments}
                                        flaggedKeys={flaggedKeys}
                                        addressedKeys={addressedKeys}
                                        highlightedKey={highlightedKey}
                                        revisionNotes={revisionNotesMap}
                                        hasActiveRevision={Boolean(activeRevision)}
                                        onDocumentUploaded={handleDocumentUploaded}
                                        onDocumentRemoved={handleDocumentRemoved}
                                        kycSelfieUrl={kycSelfieUrl}
                                        kycLivenessVerified={kycLivenessVerified}
                                        kycVerificationMeta={kycVerificationMeta}
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
                                        flaggedKeys={flaggedKeys}
                                        addressedKeys={addressedKeys}
                                        highlightedKey={highlightedKey}
                                        revisionNotes={revisionNotesMap}
                                        hasActiveRevision={Boolean(activeRevision)}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {isRejected && (
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-stone-500">
                            <span>Prefer to shop as a customer instead?</span>
                            <Link
                                href={route('artisan.convert-to-buyer')}
                                method="post"
                                as="button"
                                className="font-semibold text-stone-700 underline underline-offset-2 hover:text-stone-900 transition cursor-pointer"
                            >
                                Convert to Buyer Account
                            </Link>
                        </div>
                    )}

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


