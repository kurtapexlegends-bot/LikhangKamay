import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { CheckCircle2, Loader2, Check } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import InputError from '@/Components/InputError';

/**
 * Format 9 to 14 digit Philippine TIN into standard 000-000-000-000 format
 */
function formatPhilippineTIN(val) {
    if (!val) return '';
    const digits = String(val).replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 14)}`;
}

export default function TaxProfileCard({ seller = {}, canEdit = true }) {
    const { addToast } = useToast();
    const [saved, setSaved] = useState(false);

    const form = useForm({
        tin: formatPhilippineTIN(seller?.tin || ''),
        tax_business_name: seller?.tax_business_name || '',
        is_vat_registered: Boolean(seller?.is_vat_registered),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(route('seller.settings.tax'), {
            preserveScroll: true,
            onSuccess: () => {
                setSaved(true);
                if (addToast) addToast('Tax settings saved.', 'success');
                setTimeout(() => setSaved(false), 3000);
            },
            onError: (errs) => {
                const firstError = Object.values(errs || {})[0];
                if (addToast && firstError) addToast(firstError, 'error');
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900">Tax Information</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                    Official BIR tax details used when printing sales receipts for your buyers.
                </p>
            </div>

            {saved && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} /> Tax settings saved successfully!
                </div>
            )}

            {/* Tax Status Selection */}
            <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Tax Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                        onClick={() => canEdit && form.setData('is_vat_registered', false)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                            !form.data.is_vat_registered
                                ? 'border-clay-700 bg-clay-50/20 ring-1 ring-clay-600/30 shadow-2xs'
                                : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-stone-900">Non-VAT (Standard)</span>
                            {!form.data.is_vat_registered && (
                                <span className="w-4 h-4 rounded-full bg-clay-700 text-white flex items-center justify-center shrink-0">
                                    <Check size={11} strokeWidth={3} />
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                            For small workshops and individual craft creators. Your prices have no added VAT, and buyer receipts are marked VAT-Exempt.
                        </p>
                    </div>

                    <div
                        onClick={() => canEdit && form.setData('is_vat_registered', true)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                            form.data.is_vat_registered
                                ? 'border-clay-700 bg-clay-50/20 ring-1 ring-clay-600/30 shadow-2xs'
                                : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-stone-900">VAT-Registered (12% VAT)</span>
                            {form.data.is_vat_registered && (
                                <span className="w-4 h-4 rounded-full bg-clay-700 text-white flex items-center justify-center shrink-0">
                                    <Check size={11} strokeWidth={3} />
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                            For businesses registered with the BIR to collect 12% VAT. Buyer receipts will automatically show the 12% VAT breakdown.
                        </p>
                    </div>
                </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        BIR Tax ID (TIN) <span className="text-stone-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={form.data.tin}
                        onChange={(e) => form.setData('tin', formatPhilippineTIN(e.target.value))}
                        placeholder="000-000-000-000"
                        disabled={!canEdit || form.processing}
                        className="w-full rounded-xl border-stone-200 text-sm font-mono tracking-wider focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px]"
                    />
                    <InputError message={form.errors.tin} className="mt-1" />
                    <p className="text-[11px] text-stone-400 mt-1 font-sans">
                        Enter your 9 or 12-digit TIN if registered with the BIR. Leave blank if you don't have one yet.
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Registered Business Name <span className="text-stone-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={form.data.tax_business_name}
                        onChange={(e) => form.setData('tax_business_name', e.target.value)}
                        placeholder={seller?.shop_name || 'Legal business name'}
                        disabled={!canEdit || form.processing}
                        className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px]"
                    />
                    <InputError message={form.errors.tax_business_name} className="mt-1" />
                    <p className="text-[11px] text-stone-400 mt-1">
                        The legal name on your BIR certificate. Leave blank to use your shop name.
                    </p>
                </div>
            </div>

            {canEdit && (
                <div className="flex justify-end pt-2 border-t border-stone-100">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 min-h-[40px] cursor-pointer"
                    >
                        {form.processing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        <span>{form.processing ? 'Saving...' : 'Save Tax Settings'}</span>
                    </button>
                </div>
            )}
        </form>
    );
}
