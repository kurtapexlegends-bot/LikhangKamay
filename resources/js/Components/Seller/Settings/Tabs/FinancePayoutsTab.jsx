import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Banknote, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import InputError from '@/Components/InputError';

/**
 * Format Philippine mobile number into standard 09XX XXX XXXX format
 * automatically stripping non-digits, negatives, spaces, letters, and symbols.
 */
function formatPhilippineMobileNumber(val) {
    if (!val) return '';
    let digits = String(val).replace(/\D/g, '');
    
    // Normalize +63 / 63 prefix to 09
    if (digits.startsWith('639')) {
        digits = '0' + digits.slice(2);
    } else if (digits.startsWith('9')) {
        digits = '0' + digits;
    }
    
    digits = digits.slice(0, 11);
    
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

/**
 * Clean and format bank account numbers (allow digits only, max 20)
 */
function formatBankAccountNumber(val) {
    if (!val) return '';
    return String(val).replace(/\D/g, '').slice(0, 20);
}

export default function FinancePayoutsTab({ sellerOwner = {}, permissions = {} }) {
    const { addToast } = useToast();
    const canEdit = permissions?.can_edit_shop_settings || permissions?.can_edit_accounting;

    // Detect initial disbursement method
    const existingMethod = (sellerOwner.payout_method || 'GCash').toLowerCase();
    const isMaya = existingMethod.includes('maya');
    const isGcash = existingMethod.includes('gcash');
    const isBank = !isMaya && !isGcash && Boolean(sellerOwner.payout_method);

    const initialMethod = isMaya ? 'maya' : isBank ? 'bank' : 'gcash';
    const initialBankName = isBank ? sellerOwner.payout_method : 'BDO Unibank';
    const rawAccountNumber = sellerOwner.payout_account_number || '';
    const initialAccountNumber = initialMethod === 'bank'
        ? rawAccountNumber
        : formatPhilippineMobileNumber(rawAccountNumber);

    const [saved, setSaved] = useState(false);

    const form = useForm({
        disbursement_method: initialMethod,
        account_name: sellerOwner.payout_account_name || sellerOwner.name || '',
        account_number: initialAccountNumber,
        bank_name: initialBankName,
    });

    const handleNumberChange = (e) => {
        const inputVal = e.target.value;
        if (form.data.disbursement_method === 'bank') {
            form.setData('account_number', formatBankAccountNumber(inputVal));
        } else {
            form.setData('account_number', formatPhilippineMobileNumber(inputVal));
        }
    };

    const handleMethodChange = (val) => {
        form.setData((d) => ({
            ...d,
            disbursement_method: val,
            bank_name: val === 'gcash' ? 'GCash' : val === 'maya' ? 'Maya' : (d.bank_name || 'BDO Unibank'),
            account_number: val === 'bank'
                ? formatBankAccountNumber(d.account_number)
                : formatPhilippineMobileNumber(d.account_number),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(route('seller.settings.payout'), {
            preserveScroll: true,
            onSuccess: () => {
                setSaved(true);
                if (addToast) {
                    addToast('Settlement account details updated successfully.', 'success');
                }
                setTimeout(() => setSaved(false), 4000);
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
                    <Banknote size={20} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-stone-900">Finance &amp; Payout Settlement</h3>
                    <p className="text-xs text-stone-500">Configure bank accounts and GCash / Maya details for weekly earnings disbursements.</p>
                </div>
            </div>

            {/* Security Banner */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 flex items-start gap-3">
                <ShieldCheck size={20} className="text-emerald-700 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold text-emerald-900">Encrypted Settlement Gateway</h4>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                        Earnings from completed customer orders are disbursed directly to your designated account by the platform every week.
                    </p>
                </div>
            </div>

            {/* Saved Notification */}
            {saved && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    Settlement account details updated successfully!
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Disbursement Type
                    </label>
                    <div className="relative">
                        <select
                            value={form.data.disbursement_method}
                            onChange={(e) => handleMethodChange(e.target.value)}
                            disabled={!canEdit || form.processing}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px] cursor-pointer"
                        >
                            <option value="gcash">GCash</option>
                            <option value="maya">Maya</option>
                            <option value="bank">Bank Transfer (InstaPay / PESONet)</option>
                        </select>
                    </div>
                    <InputError message={form.errors.disbursement_method} className="mt-1" />
                </div>

                {form.data.disbursement_method === 'bank' && (
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                            Select Bank
                        </label>
                        <select
                            value={form.data.bank_name}
                            onChange={(e) => form.setData('bank_name', e.target.value)}
                            disabled={!canEdit || form.processing}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px] cursor-pointer"
                        >
                            <option value="BDO Unibank">BDO Unibank</option>
                            <option value="BPI">BPI (Bank of the Philippine Islands)</option>
                            <option value="UnionBank">UnionBank of the Philippines</option>
                            <option value="Metrobank">Metrobank</option>
                            <option value="Landbank">Landbank of the Philippines</option>
                            <option value="Security Bank">Security Bank</option>
                            <option value="RCBC">RCBC (Rizal Commercial Banking Corp)</option>
                            <option value="PNB">PNB (Philippine National Bank)</option>
                        </select>
                        <InputError message={form.errors.bank_name} className="mt-1" />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Account Holder Name
                    </label>
                    <input
                        type="text"
                        value={form.data.account_name}
                        onChange={(e) => form.setData('account_name', e.target.value)}
                        placeholder="Registered Account Name (e.g. Juan Dela Cruz)"
                        disabled={!canEdit || form.processing}
                        className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px]"
                        required
                    />
                    <InputError message={form.errors.account_name} className="mt-1" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        {form.data.disbursement_method === 'bank' ? 'Bank Account Number' : 'Mobile Number (09XX XXX XXXX)'}
                    </label>
                    <input
                        type="text"
                        value={form.data.account_number}
                        onChange={handleNumberChange}
                        placeholder={form.data.disbursement_method === 'bank' ? 'e.g. 109238475612' : '0917 123 4567'}
                        disabled={!canEdit || form.processing}
                        className="w-full rounded-xl border-stone-200 text-sm font-mono tracking-wider focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px]"
                        required
                    />
                    <InputError message={form.errors.account_number} className="mt-1" />
                    <p className="text-[11px] text-stone-400 mt-1 font-sans">
                        {form.data.disbursement_method === 'bank'
                            ? 'Enter 8 to 20 digit bank account number.'
                            : 'Accepts 09XX, +639, or spaces. Automatically formatted to 11 digits.'}
                    </p>
                </div>
            </div>

            {canEdit && (
                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 min-h-[40px] cursor-pointer"
                    >
                        {form.processing ? (
                            <Loader2 size={15} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={15} />
                        )}
                        <span>{form.processing ? 'Saving...' : 'Save Settlement Details'}</span>
                    </button>
                </div>
            )}
        </form>
    );
}
