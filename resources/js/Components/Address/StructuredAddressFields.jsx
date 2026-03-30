import { useEffect, useMemo, useState } from 'react';
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
    helperText = 'Use a complete address.',
    previewLabel = 'Address Preview',
    readOnly = false,
    showPreview = true,
}) {
    const field = (name) => fieldNames[name] || `${prefix}${name}`;
    const value = (name) => data[field(name)] ?? '';
    const [mode, setMode] = useState(() => {
        const region = normalizeValue(value('region'));
        const city = normalizeValue(value('city'));
        const street = String(value('street_address') || '');

        if (!region && !city && street.includes(',')) {
            return 'manual';
        }

        if (region && region !== normalizeValue(CAVITE_REGION)) {
            return 'manual';
        }

        if (city && !CAVITE_CITY_OPTIONS.some((option) => normalizeValue(option) === city)) {
            return 'manual';
        }

        return 'cavite';
    });

    const currentCity = value('city');
    const currentBarangays = useMemo(
        () => getCaviteBarangaysForCity(currentCity),
        [currentCity],
    );

    const formattedAddress = useMemo(
        () =>
            formatStructuredAddress({
                street_address: value('street_address'),
                barangay: value('barangay'),
                city: value('city'),
                region: value('region'),
                postal_code: value('postal_code'),
            }),
        [data, prefix],
    );

    useEffect(() => {
        if (mode === 'cavite' && normalizeValue(value('region')) !== normalizeValue(CAVITE_REGION)) {
            setData(field('region'), CAVITE_REGION);
        }
    }, [mode]);

    const updateField = (name, nextValue) => {
        setData(field(name), nextValue);
    };

    const labelSuffix = required ? ' *' : '';

    const switchToCavite = () => {
        setMode('cavite');
        updateField('region', CAVITE_REGION);

        if (!CAVITE_CITY_OPTIONS.some((option) => normalizeValue(option) === normalizeValue(value('city')))) {
            updateField('city', '');
            updateField('barangay', '');
        }
    };

    const switchToManual = () => {
        setMode('manual');

        if (normalizeValue(value('region')) === normalizeValue(CAVITE_REGION)) {
            updateField('region', '');
        }

        if (CAVITE_CITY_OPTIONS.some((option) => normalizeValue(option) === normalizeValue(value('city')))) {
            updateField('city', '');
            updateField('barangay', '');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {helperText ? <p className="text-xs text-gray-500">{helperText}</p> : <span />}
                {!readOnly && (
                    <div className="inline-grid grid-cols-2 gap-1 rounded-lg border border-gray-200 bg-white p-1">
                        <button
                            type="button"
                            onClick={switchToCavite}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                mode === 'cavite'
                                    ? 'bg-clay-50 text-clay-700'
                                    : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            Cavite
                        </button>
                        <button
                            type="button"
                            onClick={switchToManual}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                mode === 'manual'
                                    ? 'bg-clay-50 text-clay-700'
                                    : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            Other Province
                        </button>
                    </div>
                )}
            </div>

            <div>
                <InputLabel htmlFor={field('street_address')} value={`Street / Block / Lot / Unit${labelSuffix}`} />
                <TextInput
                    id={field('street_address')}
                    className={`mt-1 block w-full ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    value={value('street_address')}
                    onChange={(event) => updateField('street_address', event.target.value)}
                    placeholder="e.g. Blk 35 Lot 18, Sampaloc 1"
                    required={required}
                    disabled={readOnly}
                />
                <InputError className="mt-2" message={errors[field('street_address')]} />
            </div>

            {mode === 'cavite' ? (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor={field('city')} value={`City / Municipality${labelSuffix}`} />
                            <AddressSelect
                                id={field('city')}
                                value={value('city')}
                                onChange={(nextCity) => {
                                    updateField('city', nextCity);
                                    updateField('region', CAVITE_REGION);
                                    updateField('barangay', '');
                                }}
                                options={CAVITE_CITY_OPTIONS}
                                placeholder="Select city or municipality"
                                disabled={readOnly}
                            />
                            <InputError className="mt-2" message={errors[field('city')]} />
                        </div>
                        <div>
                            <InputLabel htmlFor={field('barangay')} value={`Barangay${labelSuffix}`} />
                            <AddressSelect
                                id={field('barangay')}
                                value={value('barangay')}
                                onChange={(nextBarangay) => updateField('barangay', nextBarangay)}
                                options={currentBarangays}
                                placeholder={currentCity ? 'Select barangay' : 'Choose a city first'}
                                disabled={readOnly}
                            />
                            <InputError className="mt-2" message={errors[field('barangay')]} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor={field('region')} value="Province" />
                            <TextInput
                                id={field('region')}
                                className="mt-1 block w-full bg-gray-100 text-gray-500"
                                value={CAVITE_REGION}
                                disabled
                            />
                        </div>
                        <div>
                            <InputLabel htmlFor={field('postal_code')} value="Postal Code" />
                            <TextInput
                                id={field('postal_code')}
                                className={`mt-1 block w-full ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                value={value('postal_code')}
                                onChange={(event) => updateField('postal_code', event.target.value)}
                                placeholder="e.g. 4114"
                                disabled={readOnly}
                            />
                            <InputError className="mt-2" message={errors[field('postal_code')]} />
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor={field('region')} value={`Province${labelSuffix}`} />
                            <TextInput
                                id={field('region')}
                                className={`mt-1 block w-full ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                value={value('region')}
                                onChange={(event) => updateField('region', event.target.value)}
                                placeholder="e.g. Cavite"
                                required={required}
                                disabled={readOnly}
                            />
                            <InputError className="mt-2" message={errors[field('region')]} />
                        </div>
                        <div>
                            <InputLabel htmlFor={field('city')} value={`City / Municipality${labelSuffix}`} />
                            <TextInput
                                id={field('city')}
                                className={`mt-1 block w-full ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                value={value('city')}
                                onChange={(event) => updateField('city', event.target.value)}
                                placeholder="e.g. Dasmarinas City"
                                required={required}
                                disabled={readOnly}
                            />
                            <InputError className="mt-2" message={errors[field('city')]} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor={field('barangay')} value={`Barangay${labelSuffix}`} />
                            <TextInput
                                id={field('barangay')}
                                className={`mt-1 block w-full ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                value={value('barangay')}
                                onChange={(event) => updateField('barangay', event.target.value)}
                                placeholder="e.g. Sampaloc 1"
                                required={required}
                                disabled={readOnly}
                            />
                            <InputError className="mt-2" message={errors[field('barangay')]} />
                        </div>
                        <div>
                            <InputLabel htmlFor={field('postal_code')} value="Postal Code" />
                            <TextInput
                                id={field('postal_code')}
                                className={`mt-1 block w-full ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                value={value('postal_code')}
                                onChange={(event) => updateField('postal_code', event.target.value)}
                                placeholder="e.g. 4114"
                                disabled={readOnly}
                            />
                            <InputError className="mt-2" message={errors[field('postal_code')]} />
                        </div>
                    </div>
                </>
            )}

            {showPreview && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">{previewLabel}</p>
                    <p className="mt-1 text-sm text-gray-700">
                        {formattedAddress || 'Complete the address fields.'}
                    </p>
                    <InputError className="mt-2" message={errors[field('full_address')]} />
                </div>
            )}
        </div>
    );
}
