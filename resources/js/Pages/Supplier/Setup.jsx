/* global route, CustomEvent */
import React, { useState, useRef, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MapPin, Upload, FileCheck, AlertCircle, 
    CheckCircle2, ChevronRight, ChevronLeft, 
    Loader2, LogOut, X, FileText, ShieldCheck, Truck, Clock, Phone, Compass, AlertTriangle, Eye
} from 'lucide-react';
import axios from 'axios';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import StepPill from '@/Pages/Auth/Partials/StepPill';
import AddressSelect from '@/Components/Address/AddressSelect';
import DocumentViewerModal from '@/Components/Seller/Approvals/DocumentViewerModal';
import { compressImage } from '@/utils/imageCompressor';
import { 
    CAVITE_BARANGAYS, 
    normalizeCaviteAddressText, 
    resolveCanonicalCaviteCity, 
    getCaviteBarangaysForCity 
} from '@/lib/caviteAddresses';

const AddressLocationPicker = lazy(() => import('@/Components/Address/AddressLocationPicker'));

// Bounding box for Cavite and Greater Manila Area (NCR, Laguna, Rizal, Bulacan, Batangas)
const REGIONAL_SUPPLIER_BOUNDS = [
    [13.50, 120.45], // South-West (Batangas / Coast)
    [15.30, 121.65], // North-East (Bulacan / Rizal border)
];

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB Client-side Vercel serverless limit guard

const DOCUMENT_DEFINITIONS = [
    {
        id: 'business_permit',
        label: "Mayor's / Business Permit",
        badge: 'Required',
        badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
        description: "Official LGU business permit or operating license for commercial wholesale operations.",
        required: true,
        existingKey: 'has_permit',
        urlKey: 'business_permit_url',
    },
    {
        id: 'dti_registration',
        label: "DTI or SEC Certificate",
        badge: 'Required',
        badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
        description: "DTI Certificate of Business Name (Sole Prop) or SEC Registration (Corporation/Partnership).",
        required: true,
        existingKey: 'has_dti',
        urlKey: 'dti_registration_url',
    },
    {
        id: 'valid_id',
        label: "Owner / Representative Valid ID",
        badge: 'Required',
        badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
        description: "Government-issued ID of authorized company officer (Passport, UMID, Driver's License, PhilSys).",
        required: true,
        existingKey: 'has_valid_id',
        urlKey: 'valid_id_url',
    },
    {
        id: 'tin_id',
        label: "BIR Certificate of Registration (Form 2303)",
        badge: 'Recommended',
        badgeColor: 'text-stone-700 bg-stone-100 border-stone-200',
        description: "BIR Form 2303 certificate for official wholesale tax receipts and studio bulk invoicing.",
        required: false,
        existingKey: 'has_tin_id',
        urlKey: 'tin_id_url',
    },
];

export default function SupplierSetup({
    auth = {},
    supportedProvinces = [],
    regionalCities = {},
    existingData = {},
    rejectionReason = null,
}) {
    const user = auth?.user || {};
    const [currentStep, setCurrentStep] = useState(1);
    const [locationNotice, setLocationNotice] = useState(null);
    const [viewingDoc, setViewingDoc] = useState(null);

    // Document upload state per document key
    const [docFiles, setDocFiles] = useState({
        business_permit: null,
        dti_registration: null,
        valid_id: null,
        tin_id: null,
    });

    const [docPreviews, setDocPreviews] = useState({
        business_permit: null,
        dti_registration: null,
        valid_id: null,
        tin_id: null,
    });

    const [docErrors, setDocErrors] = useState({});
    const [uploadingDoc, setUploadingDoc] = useState({});

    const initialProvince = existingData.province || supportedProvinces[0] || 'Cavite';

    const { data, setData, post, processing, errors, clearErrors, setError } = useForm({
        phone_number: existingData.phone_number ? existingData.phone_number.replace(/\D/g, '').slice(0, 11) : '',
        province: initialProvince,
        city: existingData.city || '',
        barangay: existingData.barangay || '',
        postal_code: existingData.postal_code ? existingData.postal_code.replace(/\D/g, '').slice(0, 4) : '',
        street_address: existingData.street_address || '',
        latitude: existingData.latitude ? Number(existingData.latitude) : null,
        longitude: existingData.longitude ? Number(existingData.longitude) : null,
        business_permit: null,
        dti_registration: null,
        valid_id: null,
        tin_id: null,
        tin_number: existingData.tin_number || '',
    });

    // Cleanup object URLs on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            Object.values(docPreviews).forEach((url) => {
                if (url && String(url).startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [docPreviews]);

    const availableCities = useMemo(() => {
        return regionalCities[data.province] || [];
    }, [regionalCities, data.province]);

    // Available barangays if selected province is Cavite
    const availableBarangays = useMemo(() => {
        if (data.province !== 'Cavite' || !data.city) return null;
        const normalized = normalizeCaviteAddressText(data.city);
        return CAVITE_BARANGAYS[normalized] || null;
    }, [data.province, data.city]);

    const handleProvinceChange = (newProvince) => {
        setData((prev) => ({
            ...prev,
            province: newProvince,
            city: '',
            barangay: '',
        }));
        setLocationNotice(null);
        clearErrors(['province', 'city', 'barangay']);
    };

    const handleCityChange = (newCity) => {
        setData((prev) => ({
            ...prev,
            city: newCity,
            barangay: '',
        }));
        setLocationNotice(null);
        clearErrors(['city', 'barangay']);
    };

    const handlePhoneNumberChange = (e) => {
        const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 11);
        setData('phone_number', rawDigits);
        if (errors.phone_number) clearErrors('phone_number');
    };

    const handlePostalCodeChange = (e) => {
        const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 4);
        setData('postal_code', rawDigits);
        if (errors.postal_code) clearErrors('postal_code');
    };

    const handleTinChange = (e) => {
        const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 12);
        const parts = rawDigits.match(/.{1,3}/g) || [];
        setData('tin_number', parts.join('-'));
        if (errors.tin_number) clearErrors('tin_number');
    };

    const handleLocationSelect = useCallback(({ latitude, longitude, addressDetails = null }) => {
        const numLat = Number(latitude);
        const numLng = Number(longitude);

        const isWithinRegionalBounds =
            numLat >= REGIONAL_SUPPLIER_BOUNDS[0][0] && numLat <= REGIONAL_SUPPLIER_BOUNDS[1][0] &&
            numLng >= REGIONAL_SUPPLIER_BOUNDS[0][1] && numLng <= REGIONAL_SUPPLIER_BOUNDS[1][1];

        if (!isWithinRegionalBounds) {
            setLocationNotice({
                type: 'error',
                title: 'Location Outside Scope',
                message: 'Pinned location is outside the supported operating area. Supplier fulfillment warehouses must be located within Cavite or Greater Manila Area (NCR, Laguna, Rizal, Bulacan, Batangas).',
            });
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('app-toast', {
                    detail: {
                        type: 'warning',
                        message: 'Pinned location is outside the supported supplier region (Cavite & GMA).',
                    }
                }));
            }
            return;
        }

        setData((prev) => {
            const next = {
                ...prev,
                latitude: Number(numLat.toFixed(7)),
                longitude: Number(numLng.toFixed(7)),
            };

            if (addressDetails) {
                let detectedProvince = null;
                if (addressDetails.is_within_cavite) {
                    detectedProvince = 'Cavite';
                } else {
                    const candidateProvince = (addressDetails.province || addressDetails.region || '').trim().toLowerCase();
                    detectedProvince = supportedProvinces.find((p) => {
                        const pLower = p.toLowerCase();
                        return pLower === candidateProvince ||
                               candidateProvince.includes(pLower) ||
                               pLower.includes(candidateProvince);
                    }) || null;
                }

                if (!detectedProvince || !supportedProvinces.includes(detectedProvince)) {
                    setLocationNotice({
                        type: 'error',
                        title: 'Location Outside Supported Region',
                        message: `The detected location (${[addressDetails.city, addressDetails.province || addressDetails.region].filter(Boolean).join(', ')}) is outside our supported operating regions (Cavite & GMA).`,
                    });
                    return prev;
                }

                setLocationNotice(null);
                next.province = detectedProvince;

                const provinceCities = regionalCities[detectedProvince] || [];
                let resolvedCity = '';

                if (detectedProvince === 'Cavite' && addressDetails.city) {
                    resolvedCity = resolveCanonicalCaviteCity(addressDetails.city) || addressDetails.city;
                } else if (addressDetails.city) {
                    const candCity = addressDetails.city.trim().toLowerCase();
                    resolvedCity = provinceCities.find((c) => {
                        const cLower = c.toLowerCase();
                        const cNoCity = cLower.replace(/\s+city$/i, '');
                        return cLower === candCity ||
                               cNoCity === candCity.replace(/\s+city$/i, '') ||
                               candCity.includes(cNoCity);
                    }) || addressDetails.city;
                }

                if (resolvedCity) {
                    next.city = resolvedCity;
                }

                if (addressDetails.barangay) {
                    if (detectedProvince === 'Cavite' && resolvedCity) {
                        const caviteBrgyList = getCaviteBarangaysForCity(resolvedCity);
                        const cleanDetected = normalizeCaviteAddressText(addressDetails.barangay)
                            .toLowerCase()
                            .replace(/^(?:barangay|brgy\.?|bgy\.?)\s+/i, '');

                        const matchedBrgy = caviteBrgyList.find((b) => {
                            const bNorm = normalizeCaviteAddressText(b).toLowerCase();
                            return bNorm === cleanDetected ||
                                   bNorm.replace(/^(?:barangay|brgy\.?|bgy\.?)\s+/i, '') === cleanDetected;
                        }) || addressDetails.barangay;

                        next.barangay = matchedBrgy;
                    } else {
                        next.barangay = addressDetails.barangay;
                    }
                }

                if (addressDetails.postal_code) {
                    const cleanPostal = String(addressDetails.postal_code).replace(/\D/g, '').slice(0, 4);
                    if (cleanPostal.length === 4) {
                        next.postal_code = cleanPostal;
                    }
                }

                if (addressDetails.street_address) {
                    next.street_address = addressDetails.street_address;
                }

                if (typeof window !== 'undefined') {
                    const hint = [next.street_address, next.barangay, next.city].filter(Boolean).join(', ');
                    window.dispatchEvent(new CustomEvent('app-toast', {
                        detail: {
                            type: 'info',
                            message: hint ? `Address auto-filled: ${hint}` : 'Address auto-filled from pinned location.',
                            duration: 3500,
                        }
                    }));
                }
            }

            return next;
        });

        clearErrors(['latitude', 'longitude', 'province', 'city', 'barangay', 'postal_code', 'street_address']);
    }, [supportedProvinces, regionalCities, clearErrors, setData]);

    const handleClearCoordinates = () => {
        setData((prev) => ({
            ...prev,
            latitude: null,
            longitude: null,
        }));
        setLocationNotice(null);
    };

    // Client-side file processing pipeline: Compression -> Vercel limit check -> Presigned upload for heavy files
    const processDocumentFile = async (docKey, rawFile) => {
        if (!rawFile) return;

        setDocErrors((prev) => ({ ...prev, [docKey]: '' }));
        setUploadingDoc((prev) => ({ ...prev, [docKey]: true }));

        try {
            const isPdf = rawFile.type === 'application/pdf' || rawFile.name.toLowerCase().endsWith('.pdf');
            let fileToProcess = rawFile;

            // 1. Canvas Image Compression for images (<400KB target)
            if (!isPdf && rawFile.type.startsWith('image/')) {
                fileToProcess = await compressImage(rawFile, 1600, 1600, 0.85);
            }

            // 2. Strict Vercel 4.5MB payload limit early guard
            if (fileToProcess.size > MAX_UPLOAD_BYTES) {
                setDocErrors((prev) => ({
                    ...prev,
                    [docKey]: 'File exceeds 4MB serverless payload limit. Please upload a smaller document.',
                }));
                setUploadingDoc((prev) => ({ ...prev, [docKey]: false }));
                return;
            }

            // 3. Create blob preview URL (safely revoked on replace/remove)
            if (docPreviews[docKey] && String(docPreviews[docKey]).startsWith('blob:')) {
                URL.revokeObjectURL(docPreviews[docKey]);
            }
            const localPreview = URL.createObjectURL(fileToProcess);
            setDocPreviews((prev) => ({ ...prev, [docKey]: localPreview }));
            setDocFiles((prev) => ({ ...prev, [docKey]: fileToProcess }));

            // 4. Presigned Direct Cloud Upload (Supabase/S3/R2) for PDFs or files >1MB to prevent Vercel body limits
            if (isPdf || fileToProcess.size > 1024 * 1024) {
                const presignRes = await axios.post(route('api.uploads.presign'), {
                    folder: 'legal_docs',
                    filename: fileToProcess.name,
                    contentType: isPdf ? 'application/pdf' : (fileToProcess.type || 'image/jpeg'),
                });

                const { url, key, contentType } = presignRes.data;

                const uploadRes = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': contentType },
                    body: fileToProcess,
                });

                if (!uploadRes.ok) {
                    throw new Error('Direct cloud storage upload failed.');
                }

                // Set stored cloud key string into Inertia form data
                setData(docKey, key);
            } else {
                // For small compressed files (<1MB), pass the compressed File directly
                setData(docKey, fileToProcess);
            }

            if (errors[docKey]) clearErrors(docKey);
        } catch (err) {
            console.error(`Document upload failed for ${docKey}:`, err);
            setDocErrors((prev) => ({
                ...prev,
                [docKey]: 'Upload failed. Please try again with a valid document.',
            }));
        } finally {
            setUploadingDoc((prev) => ({ ...prev, [docKey]: false }));
        }
    };

    const handleRemoveDocument = (docKey) => {
        if (docPreviews[docKey] && String(docPreviews[docKey]).startsWith('blob:')) {
            URL.revokeObjectURL(docPreviews[docKey]);
        }
        setDocFiles((prev) => ({ ...prev, [docKey]: null }));
        setDocPreviews((prev) => ({ ...prev, [docKey]: null }));
        setDocErrors((prev) => ({ ...prev, [docKey]: '' }));
        setData(docKey, null);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const validateStepOne = () => {
        const stepErrors = {};

        if (locationNotice?.type === 'error') {
            stepErrors.latitude = locationNotice.message;
            setError(stepErrors);
            return false;
        }

        if (!data.phone_number.trim()) {
            stepErrors.phone_number = 'A mobile phone number is required.';
        } else if (!/^09\d{9}$/.test(data.phone_number)) {
            stepErrors.phone_number = 'Please enter a valid 11-digit mobile number starting with 09 (e.g. 09171234567).';
        }

        if (!data.province) {
            stepErrors.province = 'Please select a province.';
        } else if (!supportedProvinces.includes(data.province)) {
            stepErrors.province = 'Please select a supported province in Cavite or Greater Manila Area.';
        }

        if (!data.city) {
            stepErrors.city = 'Please select a city or municipality.';
        }

        if (!data.barangay.trim()) {
            stepErrors.barangay = 'Barangay name is required.';
        }

        if (!data.postal_code.trim()) {
            stepErrors.postal_code = 'Postal code is required.';
        } else if (!/^\d{4}$/.test(data.postal_code)) {
            stepErrors.postal_code = 'Postal code must be exactly 4 digits (e.g. 4114).';
        }

        if (!data.street_address.trim()) {
            stepErrors.street_address = 'Street address or warehouse compound is required.';
        } else if (data.street_address.trim().length < 5) {
            stepErrors.street_address = 'Street address must be at least 5 characters.';
        }

        if (data.latitude !== null && data.longitude !== null) {
            const numLat = Number(data.latitude);
            const numLng = Number(data.longitude);
            const isWithinRegionalBounds =
                numLat >= REGIONAL_SUPPLIER_BOUNDS[0][0] && numLat <= REGIONAL_SUPPLIER_BOUNDS[1][0] &&
                numLng >= REGIONAL_SUPPLIER_BOUNDS[0][1] && numLng <= REGIONAL_SUPPLIER_BOUNDS[1][1];

            if (!isWithinRegionalBounds) {
                stepErrors.latitude = 'GPS coordinates are outside the supported operating area (Cavite & GMA).';
            }
        }

        if (Object.keys(stepErrors).length > 0) {
            setError(stepErrors);
            return false;
        }

        clearErrors();
        return true;
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        if (validateStepOne()) {
            setCurrentStep(2);
        }
    };

    const validateStepTwo = () => {
        const stepErrors = {};

        // Required documents check: Business Permit, DTI/SEC, and Valid ID
        if (!data.business_permit && !existingData.has_permit) {
            stepErrors.business_permit = "Mayor's Permit or Business License is required for verification.";
        }

        if (!data.dti_registration && !existingData.has_dti) {
            stepErrors.dti_registration = "DTI Registration or SEC Certificate is required for wholesale supplier verification.";
        }

        if (!data.valid_id && !existingData.has_valid_id) {
            stepErrors.valid_id = "Authorized Representative Valid ID is required for verification.";
        }

        if (Object.keys(stepErrors).length > 0) {
            setError(stepErrors);
            return false;
        }

        return true;
    };

    const submit = (e) => {
        e.preventDefault();

        if (!validateStepOne()) {
            setCurrentStep(1);
            return;
        }

        if (!validateStepTwo()) {
            return;
        }

        // Calculate aggregate bytes across attached raw File instances (<4MB Vercel protection)
        let totalRawBytes = 0;
        Object.values(docFiles).forEach((f) => {
            if (f instanceof File) {
                totalRawBytes += f.size;
            }
        });

        if (totalRawBytes > MAX_UPLOAD_BYTES) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('app-toast', {
                    detail: {
                        type: 'error',
                        message: 'Total upload size exceeds 4MB. Some documents are still processing.',
                    }
                }));
            }
            return;
        }

        post(route('supplier.setup.store'), {
            preserveScroll: true,
        });
    };

    const isStepOneValid = Boolean(
        /^09\d{9}$/.test(data.phone_number) &&
        data.province && 
        supportedProvinces.includes(data.province) &&
        data.city && 
        data.barangay.trim() && 
        /^\d{4}$/.test(data.postal_code) && 
        data.street_address.trim().length >= 5 &&
        !locationNotice
    );

    const hasCoreDocuments = Boolean(
        (data.business_permit || existingData.has_permit) &&
        (data.dti_registration || existingData.has_dti) &&
        (data.valid_id || existingData.has_valid_id)
    );

    const formattedAddressPreview = [
        data.street_address,
        data.barangay,
        data.city,
        data.province,
        data.postal_code,
    ].filter(Boolean).join(', ');

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between selection:bg-stone-800 selection:text-white">
            <Head title="Supplier Setup - LikhangKamay" />

            {/* Navigation Header */}
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
                            <p className="text-[11px] font-medium text-stone-500">Supplier Onboarding</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="hidden sm:inline-block text-xs text-stone-500 font-medium">
                            Logged in as <strong className="text-stone-800">{user.shop_name || user.name}</strong>
                        </span>

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
                </div>
            </header>

            {/* Main Content Area */}
            <main className="mx-auto max-w-4xl w-full px-3 sm:px-6 py-4 sm:py-8 md:py-10 flex-1">
                {/* Rejection Notice Banner if revising */}
                {rejectionReason && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 shadow-xs"
                    >
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs">
                            <h4 className="font-bold text-rose-900 mb-1">Application Revision Requested</h4>
                            <p className="text-rose-700 leading-relaxed">{rejectionReason}</p>
                        </div>
                    </motion.div>
                )}

                {/* Hero Header */}
                <div className="mb-6 sm:mb-8 text-center">
                    <div className="mb-2 sm:mb-3 inline-flex items-center gap-1.5 rounded-full border border-clay-200 bg-clay-50 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold text-clay-800">
                        <Truck size={13} className="text-clay-600" />
                        <span>Supplier Verification</span>
                    </div>
                    <h1 className="mb-1 sm:mb-2 font-serif text-xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                        Setup Your Supply Hub
                    </h1>
                    <p className="mx-auto max-w-lg text-xs sm:text-sm text-stone-500 hidden sm:block">
                        Configure your dispatch warehouse, doorstep GPS coordinates, and business credentials to supply pottery studios.
                    </p>
                </div>

                {/* Responsive Stepper */}
                <div className="mb-6 sm:mb-8">
                    {/* Mobile Segmented Progress Bar */}
                    <div className="sm:hidden">
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { num: 1, label: 'Warehouse', icon: MapPin },
                                { num: 2, label: 'Documents', icon: ShieldCheck },
                            ].map((s) => {
                                const isCurrent = currentStep === s.num;
                                const isPast = currentStep > s.num;
                                const canNavigate = isPast || (s.num === 2 && isStepOneValid);
                                const isDone = s.num === 1 ? isStepOneValid : hasCoreDocuments;

                                return (
                                    <button
                                        key={s.num}
                                        type="button"
                                        disabled={!canNavigate}
                                        onClick={canNavigate ? () => setCurrentStep(s.num) : undefined}
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
                                                        isDone
                                                            ? 'bg-emerald-600 text-white'
                                                            : isCurrent
                                                                ? 'bg-clay-600 text-white'
                                                                : 'bg-stone-200 text-stone-600'
                                                    }`}
                                                >
                                                    {isDone ? '✓' : s.num}
                                                </span>
                                                <span
                                                    className={`text-xs font-bold truncate ${
                                                        isCurrent ? 'text-clay-900' : 'text-stone-800'
                                                    }`}
                                                >
                                                    {s.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1 w-full rounded-full bg-stone-200/80 overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    isDone || isPast
                                                        ? 'bg-emerald-600 w-full'
                                                        : isCurrent
                                                            ? 'bg-clay-600 w-full'
                                                            : 'w-0'
                                                }`}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Desktop Step Pills */}
                    <div className="hidden sm:flex justify-center">
                        <div className="inline-flex items-center gap-1 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xs">
                            <StepPill
                                number={1}
                                icon={<MapPin size={14} />}
                                label="Warehouse Location"
                                active={currentStep >= 1}
                                current={currentStep === 1}
                                stepResolved={isStepOneValid}
                                onClick={currentStep > 1 ? () => setCurrentStep(1) : undefined}
                            />
                            <div className={`h-0.5 w-8 shrink-0 transition-colors ${currentStep >= 2 ? 'bg-clay-600' : 'bg-stone-200'}`} />
                            <StepPill
                                number={2}
                                icon={<ShieldCheck size={14} />}
                                label="Business Documents"
                                active={currentStep >= 2}
                                current={currentStep === 2}
                                stepResolved={hasCoreDocuments}
                                onClick={isStepOneValid && currentStep !== 2 ? () => setCurrentStep(2) : undefined}
                            />
                            <div className="h-0.5 w-8 shrink-0 bg-stone-200" />
                            <StepPill
                                icon={<Clock size={14} />}
                                label="Verification Review"
                                active={false}
                                current={false}
                            />
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200 bg-white shadow-xs">
                    <form onSubmit={submit} encType="multipart/form-data" className="p-4 sm:p-8 md:p-10">
                        {/* Step Card Inner Header */}
                        <div className="mb-6 flex items-center justify-between gap-3 border-b border-stone-100 pb-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-50 border border-clay-200 text-clay-700 shadow-xs shrink-0">
                                    {currentStep === 1 ? (
                                        <Truck className="w-5 h-5" strokeWidth={2} />
                                    ) : (
                                        <ShieldCheck className="w-5 h-5" strokeWidth={2} />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                                        {currentStep === 1 ? 'Warehouse & Dispatch Hub' : 'Wholesale Business Verification'}
                                    </h2>
                                    <p className="text-xs text-stone-500 hidden sm:block">
                                        {currentStep === 1 
                                            ? 'Primary fulfillment location and GPS pin for studio raw material dispatches' 
                                            : 'Official business credentials and tax documentation for verified wholesale status'}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                                Step {currentStep} of 2
                            </span>
                        </div>

                        <AnimatePresence mode="wait">
                            {currentStep === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="space-y-5"
                                >
                                    {/* Mobile Contact Phone */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <InputLabel htmlFor="phone_number" value="Mobile Contact Number *" />
                                            <span className="text-[11px] font-medium text-stone-400">11 digits (09XX)</span>
                                        </div>
                                        <TextInput
                                            id="phone_number"
                                            type="tel"
                                            inputMode="numeric"
                                            value={data.phone_number}
                                            icon={Phone}
                                            onChange={handlePhoneNumberChange}
                                            className="mt-1 block w-full"
                                            placeholder="09171234567"
                                            maxLength={11}
                                            hasError={Boolean(errors.phone_number)}
                                        />
                                        <InputError message={errors.phone_number} className="mt-1.5" />
                                    </div>

                                    {/* Province & City Selection */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                        <div>
                                            <InputLabel htmlFor="province" value="Province / Region *" />
                                            <AddressSelect
                                                id="province"
                                                value={data.province}
                                                options={supportedProvinces}
                                                onChange={handleProvinceChange}
                                                placeholder="Select Province"
                                                hasError={Boolean(errors.province)}
                                            />
                                            <InputError message={errors.province} className="mt-1.5" />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="city" value="City / Municipality *" />
                                            <AddressSelect
                                                id="city"
                                                value={data.city}
                                                options={availableCities}
                                                onChange={handleCityChange}
                                                placeholder={data.province ? 'Select City / Municipality' : 'Select province first'}
                                                disabled={!data.province}
                                                hasError={Boolean(errors.city)}
                                            />
                                            <InputError message={errors.city} className="mt-1.5" />
                                        </div>
                                    </div>

                                    {/* Barangay & Postal Code Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                        <div>
                                            <InputLabel htmlFor="barangay" value="Barangay *" />
                                            {availableBarangays ? (
                                                <AddressSelect
                                                    id="barangay"
                                                    value={data.barangay}
                                                    options={availableBarangays}
                                                    onChange={(val) => {
                                                        setData('barangay', val);
                                                        if (errors.barangay) clearErrors('barangay');
                                                    }}
                                                    placeholder="Select Barangay"
                                                    hasError={Boolean(errors.barangay)}
                                                />
                                            ) : (
                                                <TextInput
                                                    id="barangay"
                                                    value={data.barangay}
                                                    onChange={(e) => {
                                                        setData('barangay', e.target.value);
                                                        if (errors.barangay) clearErrors('barangay');
                                                    }}
                                                    className="mt-1 block w-full"
                                                    placeholder="e.g. Salitran II, San Vicente"
                                                    hasError={Boolean(errors.barangay)}
                                                />
                                            )}
                                            <InputError message={errors.barangay} className="mt-1.5" />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <InputLabel htmlFor="postal_code" value="Postal Code *" />
                                                <span className="text-[11px] font-medium text-stone-400">4 digits</span>
                                            </div>
                                            <TextInput
                                                id="postal_code"
                                                type="text"
                                                inputMode="numeric"
                                                value={data.postal_code}
                                                onChange={handlePostalCodeChange}
                                                className="mt-1 block w-full"
                                                placeholder="e.g. 4114"
                                                maxLength={4}
                                                hasError={Boolean(errors.postal_code)}
                                            />
                                            <InputError message={errors.postal_code} className="mt-1.5" />
                                        </div>
                                    </div>

                                    {/* Street Address / Warehouse Unit */}
                                    <div>
                                        <InputLabel htmlFor="street_address" value="Street Address / Warehouse Unit *" />
                                        <TextInput
                                            id="street_address"
                                            value={data.street_address}
                                            onChange={(e) => {
                                                setData('street_address', e.target.value);
                                                if (errors.street_address) clearErrors('street_address');
                                            }}
                                            className="mt-1 block w-full"
                                            placeholder="e.g. Lot 4 Industrial Compound, Governor's Drive"
                                            hasError={Boolean(errors.street_address)}
                                        />
                                        <InputError message={errors.street_address} className="mt-1.5" />
                                    </div>

                                    {/* Interactive GPS Doorstep Location Picker */}
                                    <div className="pt-2">
                                        <div className="mb-2 flex items-center justify-between">
                                            <InputLabel value="Warehouse Doorstep GPS Pin" />
                                            {data.latitude && data.longitude ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                        <CheckCircle2 size={12} className="text-emerald-600" />
                                                        GPS Pinned ({Number(data.latitude).toFixed(4)}, {Number(data.longitude).toFixed(4)})
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleClearCoordinates}
                                                        className="text-[11px] font-semibold text-stone-400 hover:text-rose-600 transition cursor-pointer"
                                                    >
                                                        Clear Pin
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-medium text-stone-400">
                                                    Drag pin or tap map to auto-fill address
                                                </span>
                                            )}
                                        </div>

                                        <Suspense fallback={
                                            <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 animate-pulse space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="h-4 w-32 bg-stone-200 rounded-lg" />
                                                    <div className="h-6 w-20 bg-stone-200 rounded-md" />
                                                </div>
                                                <div className="h-44 w-full bg-stone-200/70 rounded-xl" />
                                            </div>
                                        }>
                                            <AddressLocationPicker
                                                latitude={data.latitude}
                                                longitude={data.longitude}
                                                city={data.city}
                                                onLocationSelect={handleLocationSelect}
                                                maxBounds={REGIONAL_SUPPLIER_BOUNDS}
                                                height="240px"
                                            />
                                        </Suspense>

                                        {/* Out of Scope Warning Banner */}
                                        {locationNotice && (
                                            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-800">
                                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="font-bold">{locationNotice.title}</p>
                                                    <p className="mt-0.5 text-amber-700 leading-relaxed">{locationNotice.message}</p>
                                                </div>
                                            </div>
                                        )}

                                        <InputError message={errors.latitude || errors.longitude} className="mt-1.5" />
                                    </div>

                                    {/* Address Preview Strip */}
                                    {formattedAddressPreview && (
                                        <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5 flex items-start gap-3">
                                            <MapPin className="w-4 h-4 text-clay-600 shrink-0 mt-0.5" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                                                    Dispatch Address Preview
                                                </p>
                                                <p className="text-xs font-semibold text-stone-800 mt-0.5 truncate">
                                                    {formattedAddressPreview}
                                                </p>
                                            </div>
                                            {data.latitude && data.longitude && (
                                                <div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-clay-700 bg-clay-100/60 px-2 py-0.5 rounded-md border border-clay-200/80">
                                                    <Compass size={12} />
                                                    <span>GPS Set</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Next Step Action */}
                                    <div className="pt-6 flex justify-end border-t border-stone-100">
                                        <button
                                            type="button"
                                            onClick={handleNextStep}
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow transition-all duration-200 active:scale-[0.99] cursor-pointer"
                                        >
                                            <span>Continue to Documents</span>
                                            <ChevronRight size={15} />
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="space-y-6"
                                >
                                    {/* 4 Core Verification Documents Suite */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {DOCUMENT_DEFINITIONS.map((docDef) => {
                                            const docKey = docDef.id;
                                            const localFile = docFiles[docKey];
                                            const localPreview = docPreviews[docKey];
                                            const hasExisting = Boolean(existingData[docDef.existingKey]);
                                            const existingUrl = existingData[docDef.urlKey];
                                            const isUploading = Boolean(uploadingDoc[docKey]);
                                            const docError = docErrors[docKey] || errors[docKey];
                                            const effectiveUrl = localPreview || existingUrl;

                                            return (
                                                <div 
                                                    key={docKey}
                                                    className="rounded-2xl border border-stone-200 bg-stone-50/40 p-4 sm:p-5 flex flex-col justify-between space-y-3.5"
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <h3 className="text-xs font-bold text-stone-900">
                                                                {docDef.label} {docDef.required && <span className="text-rose-500">*</span>}
                                                            </h3>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${docDef.badgeColor}`}>
                                                                {docDef.badge}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-stone-500 leading-relaxed">
                                                            {docDef.description}
                                                        </p>
                                                    </div>

                                                    {/* Error Alert */}
                                                    {docError && (
                                                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
                                                            <AlertCircle size={14} className="shrink-0" />
                                                            <span>{docError}</span>
                                                        </div>
                                                    )}

                                                    {/* Hidden File Input */}
                                                    <input
                                                        type="file"
                                                        id={`file_${docKey}`}
                                                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) processDocumentFile(docKey, file);
                                                            e.target.value = '';
                                                        }}
                                                    />

                                                    {/* State A: Upload in progress */}
                                                    {isUploading ? (
                                                        <div className="p-5 rounded-xl border border-stone-200 bg-white flex flex-col items-center justify-center space-y-2 text-center">
                                                            <Loader2 size={22} className="animate-spin text-clay-600" />
                                                            <p className="text-xs font-bold text-stone-800">
                                                                Optimizing & Uploading...
                                                            </p>
                                                            <p className="text-[10px] text-stone-400">
                                                                Compressing on canvas & presigned storage PUT
                                                            </p>
                                                        </div>
                                                    ) : localFile ? (
                                                        /* State B: Local file ready */
                                                        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-2 shadow-2xs">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                                                                    <FileCheck size={18} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-stone-900 truncate">
                                                                        {localFile.name}
                                                                    </p>
                                                                    <p className="text-[10px] text-stone-500">
                                                                        {formatFileSize(localFile.size)} • Ready for submission
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {effectiveUrl && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setViewingDoc({ url: effectiveUrl, title: docDef.label })}
                                                                        className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg transition"
                                                                        title="Preview Document"
                                                                    >
                                                                        <Eye size={15} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveDocument(docKey)}
                                                                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                                    title="Remove Document"
                                                                >
                                                                    <X size={15} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : hasExisting ? (
                                                        /* State C: Document already on file */
                                                        <div className="p-3.5 rounded-xl border border-stone-200 bg-white flex items-center justify-between gap-2 shadow-2xs">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="p-2 rounded-lg bg-stone-100 text-stone-700 shrink-0">
                                                                    <FileText size={18} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-stone-800">
                                                                        Document on File
                                                                    </p>
                                                                    <p className="text-[10px] text-stone-500">
                                                                        Previously verified or recorded
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {existingUrl && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setViewingDoc({ url: existingUrl, title: docDef.label })}
                                                                        className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
                                                                        title="View Existing Document"
                                                                    >
                                                                        <Eye size={15} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const el = document.getElementById(`file_${docKey}`);
                                                                        if (el) el.click();
                                                                    }}
                                                                    className="px-2.5 py-1 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-[11px] font-semibold transition"
                                                                >
                                                                    Replace
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* State D: Empty dropzone */
                                                        <div
                                                            onClick={() => {
                                                                const el = document.getElementById(`file_${docKey}`);
                                                                if (el) el.click();
                                                            }}
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                const file = e.dataTransfer.files?.[0];
                                                                if (file) processDocumentFile(docKey, file);
                                                            }}
                                                            className="p-4 sm:p-5 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-300 hover:bg-stone-50/60 bg-white transition text-center cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                                                        >
                                                            <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500">
                                                                <Upload size={16} />
                                                            </div>
                                                            <p className="text-xs font-bold text-stone-800">
                                                                Upload or Drag Document
                                                            </p>
                                                            <p className="text-[10px] text-stone-400">
                                                                PDF, JPG, PNG or WEBP (Max 4MB)
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Tax Identification Number (TIN) Text Input */}
                                    <div className="pt-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <InputLabel htmlFor="tin_number" value="Official Tax Identification Number (TIN)" />
                                            <span className="text-[11px] font-medium text-stone-400">Numbers only • Optional</span>
                                        </div>
                                        <TextInput
                                            id="tin_number"
                                            type="text"
                                            inputMode="numeric"
                                            value={data.tin_number}
                                            onChange={handleTinChange}
                                            className="block w-full"
                                            placeholder="123-456-789-000"
                                            maxLength={15}
                                            hasError={Boolean(errors.tin_number)}
                                        />
                                        <InputError message={errors.tin_number} className="mt-1.5" />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-6 flex items-center justify-between border-t border-stone-100">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(1)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 text-xs font-bold transition cursor-pointer"
                                        >
                                            <ChevronLeft size={15} />
                                            <span>Back to Warehouse</span>
                                        </button>

                                        <PrimaryButton
                                            className="py-3 px-6 bg-stone-900 hover:bg-stone-800 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow transition-all duration-200 active:scale-[0.99]"
                                            disabled={processing}
                                        >
                                            <span className="flex items-center gap-2">
                                                {processing ? (
                                                    <>
                                                        <Loader2 size={15} className="animate-spin" />
                                                        <span>Submitting Application...</span>
                                                    </>
                                                ) : (
                                                    'Complete Setup & Submit'
                                                )}
                                            </span>
                                        </PrimaryButton>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </div>
            </main>

            {/* Document Lightbox Modal */}
            <DocumentViewerModal
                isOpen={Boolean(viewingDoc)}
                onClose={() => setViewingDoc(null)}
                doc={viewingDoc}
            />

            {/* Footer */}
            <footer className="border-t border-stone-200/80 bg-white/60 py-4 text-center text-xs text-stone-400">
                <p>&copy; {new Date().getFullYear()} LikhangKamay Platform • Cavite & Regional Supply Hub</p>
            </footer>
        </div>
    );
}
