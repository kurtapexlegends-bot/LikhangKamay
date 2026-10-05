import React from 'react';
import { Store, Phone, CheckCircle2, AlertTriangle, ArrowRight, MapPin } from 'lucide-react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import StructuredAddressFields from '@/Components/Address/StructuredAddressFields';

export default function ShopDetailsStep({
    data,
    setData,
    errors,
    submit,
    processing,
    shopNameValidation,
}) {
    React.useEffect(() => {
        const errorKeys = Object.keys(errors);
        if (errorKeys.length > 0) {
            for (const key of errorKeys) {
                const element = document.getElementById(key) || document.getElementsByName(key)[0];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.focus();
                    break;
                }
            }
        }
    }, [errors]);

    const charCount = (data.shop_name || '').length;
    const isCharCountValid = charCount >= 3 && charCount <= 30;

    return (
        <form onSubmit={submit} className="p-6 sm:p-10">
            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-50 border border-clay-200 text-clay-700 shadow-xs">
                        <Store size={22} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-900 tracking-tight">Shop Information</h2>
                        <p className="text-sm text-stone-500">Provide your public brand name and workshop pickup address.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <InputLabel htmlFor="shop_name" value="Shop Name *" />
                        <span className={`text-[11px] font-semibold tracking-wide ${isCharCountValid ? 'text-stone-500' : 'text-amber-700'}`}>
                            {charCount} / 30 chars (Min 3)
                        </span>
                    </div>
                    <TextInput
                        id="shop_name"
                        value={data.shop_name}
                        onChange={(event) => setData('shop_name', event.target.value)}
                        placeholder="e.g. Silang Pottery Works"
                        maxLength={30}
                        icon={Store}
                    />
                    {shopNameValidation.isValid !== null && (
                        <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold px-1 ${
                            shopNameValidation.isValid ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                            {shopNameValidation.isValid ? (
                                <CheckCircle2 size={14} className="shrink-0" />
                            ) : (
                                <AlertTriangle size={14} className="shrink-0" />
                            )}
                            <span>{shopNameValidation.message}</span>
                        </div>
                    )}
                    <InputError message={errors.shop_name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="phone_number" value="Contact Number *" />
                    <div className="mt-1">
                        <TextInput
                            id="phone_number"
                            value={data.phone_number}
                            onChange={(event) => setData('phone_number', event.target.value)}
                            placeholder="09XX XXX XXXX"
                            icon={Phone}
                        />
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500">Used for pickup coordination and account alerts.</p>
                    <InputError message={errors.phone_number} className="mt-2" />
                </div>

                <div className="pt-2">
                    <div className="mb-3 flex items-center gap-2">
                        <MapPin size={16} className="text-stone-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">Primary Workshop Location</h3>
                    </div>
                    <StructuredAddressFields
                        key="artisan-setup-address"
                        data={data}
                        setData={setData}
                        errors={errors}
                        fieldNames={{ postal_code: 'zip_code' }}
                        required
                        helperText="Courier riders will collect packages from this location."
                        previewLabel="Pickup Address"
                    />
                </div>
            </div>

            <div className="mt-10 flex items-center justify-end border-t border-stone-100 pt-6">
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-7 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-clay-700 active:bg-clay-800 disabled:opacity-50 cursor-pointer"
                >
                    <span>{processing ? 'Saving...' : 'Continue to Documents'}</span>
                    <ArrowRight size={16} />
                </button>
            </div>
        </form>
    );
}
