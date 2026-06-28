import React from 'react';
import { MapPin, Store, Phone, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
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
    return (
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
                    {shopNameValidation.isValid !== null && (
                        <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium px-1 animate-in fade-in slide-in-from-top-1 duration-300 ${shopNameValidation.isValid ? 'text-emerald-600' : 'text-rose-500'}`}>
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
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-clay-600 to-clay-700 px-8 py-3.5 font-bold text-white shadow-lg shadow-clay-200 transition hover:from-clay-700 hover:to-clay-800 disabled:opacity-50 active:scale-95"
                >
                    Continue to Documents <ArrowRight size={18} />
                </button>
            </div>
        </form>
    );
}
