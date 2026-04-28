import React, { useRef, useCallback } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    UploadCloud,
    CheckCircle2,
    FileText,
    ShieldCheck,
    MapPin,
    ArrowLeft,
    FileCheck,
    Store,
    Phone,
    Clock,
    Sparkles,
    ArrowRight,
    LogOut,
    AlertTriangle,
    ChevronDown,
} from 'lucide-react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import StructuredAddressFields from '@/Components/Address/StructuredAddressFields';
import { CAVITE_REGION, normalizeCaviteAddressText } from '@/lib/caviteAddresses';

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
    });

    const submit = (event) => {
        event.preventDefault();

        transform((current) => ({
            ...current,
            current_step: step,
        }));

        post(route('artisan.setup.store'), {
            forceFormData: true,
            onSuccess: () => {
                if (step < 2) {
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
                        {step === 1 && (
                            <form onSubmit={submit} className="p-6 sm:p-10">
                                <div className="mb-8">
                                    <div className="mb-1 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-100">
                                            <MapPin size={20} className="text-clay-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Business Details</h2>
                                            <p className="text-sm text-gray-500">Tell us about your artisan shop</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <InputLabel htmlFor="shop_name" value="Shop Name *" />
                                        <div className="relative mt-1">
                                            <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <TextInput
                                                id="shop_name"
                                                value={data.shop_name}
                                                onChange={(event) => setData('shop_name', event.target.value)}
                                                className="w-full rounded-xl py-3 pl-12"
                                                placeholder="e.g. Silang Pottery Works"
                                            />
                                        </div>
                                        <InputError message={errors.shop_name} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="phone_number" value="Contact Number *" />
                                        <div className="relative mt-1">
                                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <TextInput
                                                id="phone_number"
                                                value={data.phone_number}
                                                onChange={(event) => setData('phone_number', event.target.value)}
                                                className="w-full rounded-xl py-3 pl-12"
                                                placeholder="09XX XXX XXXX"
                                            />
                                        </div>
                                        <InputError message={errors.phone_number} className="mt-2" />
                                    </div>

                                    <StructuredAddressFields
                                        key="artisan-setup-address"
                                        data={data}
                                        setData={setData}
                                        errors={errors}
                                        fieldNames={{ postal_code: 'zip_code' }}
                                        required
                                        helperText="This becomes your default pickup address."
                                        previewLabel="Shop Address"
                                    />
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-clay-600 to-clay-700 px-8 py-3.5 font-bold text-white shadow-lg shadow-clay-200 transition hover:from-clay-700 hover:to-clay-800 disabled:opacity-50"
                                    >
                                        Continue to Documents <ArrowRight size={18} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={submit} className="p-6 sm:p-10">
                                <div className="mb-8">
                                    <div className="mb-1 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                                            <FileText size={20} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Legal Verification</h2>
                                            <p className="text-sm text-gray-500">Upload clear photos or scans of your documents</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="text-sm text-amber-800">
                                        <strong>Why do we need these?</strong> To protect buyers and ensure authenticity of all artisan sellers on our platform.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FileUploadField
                                        label="Business Permit (Mayor's Permit)"
                                        id="business_permit"
                                        file={data.business_permit}
                                        existingFile={!!auth.user.business_permit}
                                        onFileSelect={(file) => handleFileChange(file, 'business_permit')}
                                        error={errors.business_permit}
                                    />
                                    <FileUploadField
                                        label="DTI Registration"
                                        id="dti_registration"
                                        file={data.dti_registration}
                                        existingFile={!!auth.user.dti_registration}
                                        onFileSelect={(file) => handleFileChange(file, 'dti_registration')}
                                        error={errors.dti_registration}
                                    />
                                    <FileUploadField
                                        label="Valid Government ID (Front)"
                                        id="valid_id"
                                        file={data.valid_id}
                                        existingFile={!!auth.user.valid_id}
                                        onFileSelect={(file) => handleFileChange(file, 'valid_id')}
                                        error={errors.valid_id}
                                    />
                                    <FileUploadField
                                        label="TIN ID / Registration"
                                        id="tin_id"
                                        file={data.tin_id}
                                        existingFile={!!auth.user.tin_id}
                                        onFileSelect={(file) => handleFileChange(file, 'tin_id')}
                                        error={errors.tin_id}
                                    />
                                </div>

                                <div className="mt-8 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex items-center gap-2 font-medium text-gray-500 transition hover:text-gray-700"
                                    >
                                        <ArrowLeft size={16} /> Back
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-8 py-3.5 font-bold text-white shadow-lg shadow-green-200 transition hover:from-green-700 hover:to-green-800 disabled:opacity-50"
                                    >
                                        {processing ? 'Uploading...' : 'Submit for Review'} <CheckCircle2 size={18} />
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>
                            By submitting, you agree to our{' '}
                            <Link href="/seller-agreement" className="text-clay-600 underline">
                                Seller Agreement
                            </Link>{' '}
                            and{' '}
                            <Link href="/seller-privacy" className="text-clay-600 underline">
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

function StepPill({ number, icon, label, active, current }) {
    return (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-all duration-300 ${
            current ? 'bg-clay-600 text-white shadow-md shadow-clay-200 scale-105' : active ? 'bg-clay-100 text-clay-700' : 'text-gray-400'
        }`}>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                current ? 'bg-white text-clay-600 animate-pulse' : active ? 'bg-clay-200 text-clay-700' : 'bg-gray-100'
            }`}>
                {icon || number}
            </div>
            <span className="hidden text-sm font-medium sm:block">{label}</span>
        </div>
    );
}

const FileUploadField = React.memo(({ label, id, onFileSelect, error, file, existingFile }) => {
    const inputRef = useRef(null);

    return (
        <div>
            <InputLabel htmlFor={id} value={label} />
            <div
                onClick={() => inputRef.current?.click()}
                className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 hover:shadow-md ${
                    file ? 'border-clay-400 bg-clay-50/50' : existingFile ? 'border-clay-300 bg-clay-50/30' : 'border-gray-200 bg-white/50 backdrop-blur-sm hover:border-clay-300 hover:bg-white'
                }`}
            >
                {file ? (
                    <>
                        <FileCheck size={32} className="mb-2 text-clay-600" />
                        <p className="max-w-full truncate text-sm font-medium text-clay-800">{file.name}</p>
                        <p className="text-xs text-clay-600">Click to change</p>
                    </>
                ) : existingFile ? (
                    <>
                        <CheckCircle2 size={32} className="mb-2 text-clay-600" />
                        <p className="text-sm font-bold text-clay-800">Document on File</p>
                        <p className="text-xs text-clay-600">Click to replace</p>
                    </>
                ) : (
                    <>
                        <UploadCloud size={32} className="mb-2 text-gray-400" />
                        <p className="text-sm font-medium text-gray-600">Click to upload</p>
                        <p className="text-xs text-gray-400">PNG, JPG, PDF up to 5MB</p>
                    </>
                )}
                <input
                    ref={inputRef}
                    id={id}
                    name={id}
                    type="file"
                    className="hidden"
                    onChange={(event) => event.target.files?.[0] && onFileSelect(event.target.files[0])}
                    accept="image/*,.pdf"
                />
            </div>
            <InputError message={error} className="mt-2" />
        </div>
    );
});
