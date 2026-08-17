import { useEffect, useMemo } from 'react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import AddressSelect from '@/Components/Address/AddressSelect';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import {
    CAVITE_CITY_OPTIONS,
    CAVITE_REGION,
    getCaviteBarangaysForCity,
    normalizeCaviteAddressText,
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
    const field = (name) => fieldNames[name] || `${prefix}${name}`;
    const rawValue = (name) => data[field(name)] ?? '';

    // Match canonical Cavite city from options if value exists
    const matchedCity = useMemo(() => {
        const current = normalizeValue(rawValue('city'));
        if (!current) return '';
        const found = CAVITE_CITY_OPTIONS.find(
            (opt) => normalizeValue(opt) === current || normalizeValue(opt).replace(/\s+city$/i, '') === current.replace(/\s+city$/i, '')
        );
        return found || rawValue('city');
    }, [data[field('city')]]);

    const currentBarangays = useMemo(
        () => getCaviteBarangaysForCity(matchedCity),
        [matchedCity],
    );

    const formattedAddress = useMemo(
        () =>
            formatStructuredAddress({
                street_address: rawValue('street_address'),
                barangay: rawValue('barangay'),
                city: matchedCity || rawValue('city'),
                region: CAVITE_REGION,
                postal_code: rawValue('postal_code'),
            }),
        [data, prefix, matchedCity],
    );

    // Ensure region is always set to Cavite
    useEffect(() => {
        if (normalizeValue(rawValue('region')) !== normalizeValue(CAVITE_REGION)) {
            setData(field('region'), CAVITE_REGION);
        }
    }, [data[field('region')]]);

    const updateField = (name, nextValue) => {
        setData(field(name), nextValue);
    };

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
