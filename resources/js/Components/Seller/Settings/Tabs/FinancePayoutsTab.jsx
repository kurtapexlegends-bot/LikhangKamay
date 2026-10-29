import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { 
    Smartphone, 
    CreditCard, 
    CheckCircle2, 
    Loader2, 
    Pencil, 
    Check
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import InputError from '@/Components/InputError';
import TaxProfileCard from './TaxProfileCard';

function formatPhilippineMobileNumber(val) {
    if (!val) return '';
    let digits = String(val).replace(/\D/g, '');
    if (digits.startsWith('639')) digits = '0' + digits.slice(2);
    else if (digits.startsWith('9')) digits = '0' + digits;
    digits = digits.slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

function maskMobileNumber(number) {
    if (!number) return '•••• •••• ••••';
    const clean = String(number).replace(/\s+/g, '');
    if (clean.length >= 11) {
        return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`;
    }
    return clean;
}

export default function FinancePayoutsTab({ sellerOwner = {}, permissions = {} }) {
    const { addToast } = useToast();
    const canEdit = Boolean(permissions?.can_edit_shop_settings || permissions?.can_edit_accounting);

    const existingMethod = (sellerOwner.payout_method || 'GCash').toLowerCase();
    const isMaya = existingMethod.includes('maya');
    const initialMethod = isMaya ? 'maya' : 'gcash';

    const rawAccountNumber = sellerOwner.payout_account_number || '';
    const initialAccountNumber = formatPhilippineMobileNumber(rawAccountNumber);

    const [isEditing, setIsEditing] = useState(!rawAccountNumber);
    const [saved, setSaved] = useState(false);

    const form = useForm({
        disbursement_method: initialMethod,
        account_name: sellerOwner.payout_account_name || sellerOwner.name || '',
        account_number: initialAccountNumber,
    });

    const handleNumberChange = (e) => {
        form.setData('account_number', formatPhilippineMobileNumber(e.target.value));
    };

    const handleMethodChange = (val) => {
        form.setData((d) => ({
            ...d,
            disbursement_method: val,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(route('seller.settings.payout'), {
            preserveScroll: true,
            onSuccess: () => {
                setSaved(true);
                setIsEditing(false);
                if (addToast) addToast('Payout account updated successfully.', 'success');
                setTimeout(() => setSaved(false), 3500);
            },
            onError: (errs) => {
                const firstError = Object.values(errs || {})[0];
                if (addToast && firstError) addToast(firstError, 'error');
            },
        });
    };

    const displayChannelName = initialMethod === 'maya' ? 'Maya' : 'GCash';
    const ActiveIcon = initialMethod === 'maya' ? CreditCard : Smartphone;

    return (
        <div className="max-w-4xl space-y-6">
            {/* 1. Payout Account Card */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                        <h3 className="text-sm font-bold text-stone-900">Payout Account</h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                            Your shop earnings are sent directly to this e-wallet once customer orders are completed.
                        </p>
                    </div>

                    {!isEditing && rawAccountNumber && canEdit && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                        >
                            <Pencil size={13} />
                            <span>Change Account</span>
                        </button>
                    )}
                </div>

                {saved && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 size={15} /> Payout account saved!
                    </div>
                )}

                {/* View State: Clean Connected Account Card */}
                {!isEditing && rawAccountNumber ? (
                    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-white border border-stone-200/90 flex items-center justify-center text-stone-700 shrink-0 shadow-2xs">
                                <ActiveIcon size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-stone-900">
                                        {displayChannelName}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                        Active
                                    </span>
                                </div>
                                <p className="text-xs text-stone-600 mt-0.5 font-medium truncate">
                                    {sellerOwner.payout_account_name || sellerOwner.name}
                                </p>
                                <p className="text-xs font-mono text-stone-500 mt-0.5">
                                    {maskMobileNumber(rawAccountNumber)}
                                </p>
                            </div>
                        </div>

                        <div className="text-left sm:text-right border-t sm:border-t-0 border-stone-200/60 pt-3 sm:pt-0">
                            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                                Transfer Method
                            </span>
                            <span className="text-xs font-bold text-stone-800 mt-0.5 block">
                                Direct E-Wallet Transfer
                            </span>
                            <span className="text-[11px] text-emerald-700 font-medium">
                                No transfer fees
                            </span>
                        </div>
                    </div>
                ) : (
                    /* Edit State: Clean Form */
                    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                Payout Method
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { id: 'gcash', name: 'GCash', sub: 'Send payouts to your GCash number', icon: Smartphone },
                                    { id: 'maya', name: 'Maya', sub: 'Send payouts to your Maya number', icon: CreditCard },
                                ].map((channel) => {
                                    const isSelected = form.data.disbursement_method === channel.id;
                                    const ChannelIcon = channel.icon;
                                    return (
                                        <button
                                            key={channel.id}
                                            type="button"
                                            onClick={() => handleMethodChange(channel.id)}
                                            disabled={!canEdit || form.processing}
                                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                                isSelected
                                                    ? 'border-clay-700 bg-clay-50/20 ring-1 ring-clay-600/30 shadow-2xs'
                                                    : 'border-stone-200 hover:border-stone-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <ChannelIcon size={18} className={isSelected ? 'text-clay-700' : 'text-stone-500'} />
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-stone-900 block truncate">
                                                        {channel.name}
                                                    </span>
                                                    <span className="text-[11px] text-stone-400 block truncate mt-0.5">
                                                        {channel.sub}
                                                    </span>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <span className="w-4 h-4 rounded-full bg-clay-700 text-white flex items-center justify-center shrink-0 ml-1">
                                                    <Check size={11} strokeWidth={3} />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <InputError message={form.errors.disbursement_method} className="mt-1" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                                    Account Name
                                </label>
                                <input
                                    type="text"
                                    value={form.data.account_name}
                                    onChange={(e) => form.setData('account_name', e.target.value)}
                                    placeholder={sellerOwner.name || 'e.g. Juan Dela Cruz'}
                                    disabled={!canEdit || form.processing}
                                    className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px]"
                                    required
                                />
                                <InputError message={form.errors.account_name} className="mt-1" />
                                <p className="text-[11px] text-stone-400 mt-1">
                                    The full name registered on your {form.data.disbursement_method === 'maya' ? 'Maya' : 'GCash'} account.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                                    Mobile Number
                                </label>
                                <input
                                    type="text"
                                    value={form.data.account_number}
                                    onChange={handleNumberChange}
                                    placeholder="0917 123 4567"
                                    disabled={!canEdit || form.processing}
                                    className="w-full rounded-xl border-stone-200 text-sm font-mono tracking-wider focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px]"
                                    required
                                />
                                <InputError message={form.errors.account_number} className="mt-1" />
                                <p className="text-[11px] text-stone-400 mt-1 font-sans">
                                    11-digit mobile number starting with 09.
                                </p>
                            </div>
                        </div>

                        {canEdit && (
                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
                                {rawAccountNumber && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition min-h-[38px] cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 min-h-[40px] cursor-pointer"
                                >
                                    {form.processing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                    <span>{form.processing ? 'Saving...' : 'Save Account'}</span>
                                </button>
                            </div>
                        )}
                    </form>
                )}
            </div>

            {/* 2. Tax Settings Card */}
            <TaxProfileCard seller={sellerOwner} canEdit={canEdit} />
        </div>
    );
}
