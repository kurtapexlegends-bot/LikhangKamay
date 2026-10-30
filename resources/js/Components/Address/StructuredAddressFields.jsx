import React, { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { AlertTriangle } from 'lucide-react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import AddressSelect from '@/Components/Address/AddressSelect';
import { formatStructuredAddress } from '@/lib/addressFormatting';

const AddressLocationPicker = lazy(() => import('@/Components/Address/AddressLocationPicker'));
import {
    CAVITE_CITY_OPTIONS,
    CAVITE_REGION,
    getCaviteBarangaysForCity,
    normalizeCaviteAddressText,
    resolveCanonicalCaviteCity,
} from '@/lib/caviteAddresses';

const normalizeValue = (value) => normalizeCaviteAddressText(value || '');

export default function StructuredAddressFields({
    data,
    setData,
    errors = {},
    prefix = '',
    fieldNames = {},
    required = false,
    helperText = 'LikhangKamay operations and deliveries are strictly within the Province of Cavite.',
    previewLabel = 'Address Preview',
    readOnly = false,
    showPreview = true,
    streetRef = null,
    cityRef = null,
    barangayRef = null,
    postalCodeRef = null,
    regionRef = null,
}) {
    const field = useCallback((name) => fieldNames[name] || `${prefix}${name}`, [fieldNames, prefix]);
    const rawValue = useCallback((name) => data[field(name)] ?? '', [data, field]);
    const cityValue = data[field('city')];

    // Match canonical Cavite city from options if value exists
    const matchedCity = useMemo(() => {
        const current = normalizeValue(cityValue ?? '');
        if (!current) return '';
        const found = CAVITE_CITY_OPTIONS.find(
            (opt) => normalizeValue(opt) === current || normalizeValue(opt).replace(/\s+city$/i, '') === current.replace(/\s+city$/i, '')
        );
        return found || (cityValue ?? '');
    }, [cityValue]);

    const currentBarangays = useMemo(
        () => getCaviteBarangaysForCity(matchedCity),
        [matchedCity],
    );

    const formattedAddress = useMemo(
        () =>
            formatStructuredAddress({
                street_address: rawValue('street_address'),
                barangay: rawValue('barangay'),
                city: matchedCity || cityValue || '',
                region: CAVITE_REGION,
                postal_code: rawValue('postal_code'),
            }),
        [rawValue, matchedCity, cityValue],
    );

    const [locationNotice, setLocationNotice] = useState(null);

    // Ensure region is always set to Cavite
    useEffect(() => {
        if (normalizeValue(rawValue('region')) !== normalizeValue(CAVITE_REGION)) {
            setData(field('region'), CAVITE_REGION);
        }
    }, [data[field('region')]]);

    const updateField = (name, nextValue) => {
        setData(field(name), nextValue);
    };

    const updateMultipleFields = useCallback((fieldsToUpdate) => {
        if (typeof setData !== 'function') return;

        let updaterCalled = false;
        try {
            setData((current) => {
                if (typeof current === 'object' && current !== null) {
                    updaterCalled = true;
                    const next = { ...current };
                    Object.entries(fieldsToUpdate).forEach(([k, v]) => {
                        next[field(k)] = v;
                        if (prefix && (k === 'latitude' || k === 'longitude') && k in current) {
                            next[k] = v;
                        }
                    });
                    return next;
                }
                return current;
            });
        } catch {
            // Fall back to key-value updates
        }

        if (!updaterCalled) {
            Object.entries(fieldsToUpdate).forEach(([k, v]) => {
                setData(field(k), v);
                if (prefix && (k === 'latitude' || k === 'longitude')) {
                    setData(k, v);
                }
            });
        }
    }, [field, prefix, setData]);

    const handleLocationSelect = useCallback(({ latitude, longitude, addressDetails = null }) => {
        const fieldsToUpdate = {
            latitude,
            longitude,
        };

        if (addressDetails) {
            if (!addressDetails.is_within_cavite) {
                const noticeMsg = addressDetails.warning || 'The detected location is outside Cavite. Deliveries and workshops are strictly Cavite-only.';
                setLocationNotice({
                    type: 'warning',
                    title: 'Location Outside Cavite',
                    message: noticeMsg,
                });

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('app-toast', {
                        detail: {
                            type: 'warning',
                            message: 'Pinned location is outside Cavite. LikhangKamay operations and deliveries are Cavite-only.',
                        }
                    }));
                }
            } else {
                setLocationNotice(null);

                let resolvedCity = '';
                let resolvedBrgy = '';

                if (addressDetails.city) {
                    const canonicalCity = resolveCanonicalCaviteCity(addressDetails.city) || addressDetails.city;
                    const prevCity = rawValue('city');

                    resolvedCity = canonicalCity;
                    fieldsToUpdate.city = canonicalCity;

                    if (addressDetails.barangay) {
                        const availableBarangays = getCaviteBarangaysForCity(canonicalCity);
                        const normalizeBrgyCompare = (val) => {
                            if (!val) return '';
                            return normalizeValue(val)
                                .toLowerCase()
                                .replace(/^(?:barangay|brgy\.?|bgy\.?)\s+/i, '')
                                .replace(/\bviii\b/g, '8')
                                .replace(/\bvii\b/g, '7')
                                .replace(/\bvi\b/g, '6')
                                .replace(/\biv\b/g, '4')
                                .replace(/\bv\b/g, '5')
                                .replace(/\biii\b/g, '3')
                                .replace(/\bii\b/g, '2')
                                .replace(/\bi\b/g, '1')
                                .replace(/[^a-z0-9]/g, '');
                        };
                        const targetNorm = normalizeBrgyCompare(addressDetails.barangay);
                        const matchedBrgy = availableBarangays.find(
                            (b) => normalizeValue(b) === normalizeValue(addressDetails.barangay) ||
                                   normalizeBrgyCompare(b) === targetNorm
                        ) || addressDetails.barangay;
                        resolvedBrgy = matchedBrgy;
                        fieldsToUpdate.barangay = matchedBrgy;
                    } else if (canonicalCity !== prevCity) {
                        fieldsToUpdate.barangay = '';
                    }
                }

                if (addressDetails.street_address) {
                    fieldsToUpdate.street_address = addressDetails.street_address;
                }

                if (addressDetails.postal_code) {
                    fieldsToUpdate.postal_code = addressDetails.postal_code;
                }

                fieldsToUpdate.region = CAVITE_REGION;

                const formatted = formatStructuredAddress({
                    street_address: fieldsToUpdate.street_address || rawValue('street_address'),
                    barangay: fieldsToUpdate.barangay || rawValue('barangay'),
                    city: fieldsToUpdate.city || matchedCity || cityValue || '',
                    region: CAVITE_REGION,
                    postal_code: fieldsToUpdate.postal_code || rawValue('postal_code'),
                });

                if (formatted) {
                    fieldsToUpdate.full_address = formatted;
                    if (prefix === 'shipping_') {
                        fieldsToUpdate.shipping_address = formatted;
                    }
                }

                if (typeof window !== 'undefined') {
                    const placeHint = [resolvedCity, resolvedBrgy].filter(Boolean).join(' - ');
                    window.dispatchEvent(new CustomEvent('app-toast', {
                        detail: {
                            type: 'info',
                            message: placeHint ? `Address detected: ${placeHint}` : 'Address auto-filled from pinned location.',
                            duration: 3500,
                        }
                    }));
                }
            }
        }

        updateMultipleFields(fieldsToUpdate);
    }, [cityValue, matchedCity, prefix, rawValue, updateMultipleFields]);

    const labelSuffix = required ? ' *' : '';

    return (
        <div className="space-y-4">
            {helperText && (
                <div className="flex items-center gap-2 rounded-lg bg-stone-50 border border-stone-200/80 px-3 py-2 text-xs text-stone-600">
                    <span className="inline-block w-2 h-2 rounded-full bg-clay-500 shrink-0" />
                    <span>{helperText}</span>
                </div>
            )}

            <div>
                <InputLabel htmlFor={field('street_address')} value={`Street / Block / Lot / Unit${labelSuffix}`} />
                <TextInput
                    ref={streetRef}
                    id={field('street_address')}
                    className={`mt-1 block w-full ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    value={rawValue('street_address')}
                    onChange={(event) => updateField('street_address', event.target.value)}
                    placeholder="e.g. Blk 35 Lot 18, Acacia St."
                    required={required}
                    disabled={readOnly}
                    hasError={!!errors[field('street_address')]}
                />
                <InputError className="mt-2" message={errors[field('street_address')]} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor={field('city')} value={`City / Municipality${labelSuffix}`} />
                    <AddressSelect
                        id={field('city')}
                        value={matchedCity}
                        onChange={(nextCity) => {
                            updateField('city', nextCity);
                            updateField('region', CAVITE_REGION);
                            updateField('barangay', '');
                        }}
                        options={CAVITE_CITY_OPTIONS}
                        placeholder="Select city or municipality"
                        disabled={readOnly}
                        hasError={!!errors[field('city')]}
                        buttonRef={cityRef}
                    />
                    <InputError className="mt-2" message={errors[field('city')]} />
                </div>
                <div>
                    <InputLabel htmlFor={field('barangay')} value={`Barangay${labelSuffix}`} />
                    <AddressSelect
                        id={field('barangay')}
                        value={rawValue('barangay')}
                        onChange={(nextBarangay) => updateField('barangay', nextBarangay)}
                        options={currentBarangays}
                        placeholder={matchedCity ? 'Select barangay' : 'Choose a city first'}
                        disabled={readOnly || !matchedCity}
                        hasError={!!errors[field('barangay')]}
                        buttonRef={barangayRef}
                    />
                    <InputError className="mt-2" message={errors[field('barangay')]} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor={field('region')} value="Province" />
                    <TextInput
                        ref={regionRef}
                        id={field('region')}
                        className="mt-1 block w-full bg-stone-100 text-stone-600 font-medium cursor-not-allowed"
                        value={CAVITE_REGION}
                        disabled
                    />
                </div>
                <div>
                    <InputLabel htmlFor={field('postal_code')} value="Postal Code" />
                    <TextInput
                        ref={postalCodeRef}
                        id={field('postal_code')}
                        className={`mt-1 block w-full ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                        value={rawValue('postal_code')}
                        onChange={(event) => updateField('postal_code', event.target.value)}
                        placeholder="e.g. 4114"
                        disabled={readOnly}
                        hasError={!!errors[field('postal_code')]}
                    />
                    <InputError className="mt-2" message={errors[field('postal_code')]} />
                </div>
            </div>

            <Suspense fallback={
                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 animate-pulse space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="h-4 w-32 bg-stone-200 rounded-lg" />
                        <div className="h-6 w-20 bg-stone-200 rounded-md" />
                    </div>
                    <div className="h-44 w-full bg-stone-200/70 rounded-xl" />
                </div>
            }>
                <AddressLocationPicker
                    latitude={rawValue('latitude')}
                    longitude={rawValue('longitude')}
                    city={matchedCity || rawValue('city')}
                    barangay={rawValue('barangay')}
                    onLocationSelect={handleLocationSelect}
                    readOnly={readOnly}
                />
            </Suspense>

            {locationNotice && (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold">{locationNotice.title}</p>
                        <p className="mt-0.5 text-amber-700 leading-relaxed">{locationNotice.message}</p>
                    </div>
                </div>
            )}

            {showPreview && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{previewLabel}</p>
                    <p className="mt-1 text-sm font-medium text-stone-700">
                        {formattedAddress || 'Complete the address fields.'}
                    </p>
                    <InputError className="mt-2" message={errors[field('full_address')]} />
                </div>
            )}
        </div>
    );
}
