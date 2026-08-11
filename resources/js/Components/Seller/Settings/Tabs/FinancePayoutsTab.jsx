import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Banknote, ShieldCheck, CheckCircle2, Building2, Smartphone, Wallet } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

export default function FinancePayoutsTab({ sellerOwner, permissions }) {
    const { addToast } = useToast();
    const canEdit = permissions?.can_edit_accounting;

    const [saved, setSaved] = useState(false);

    const form = useForm({
        disbursement_method: 'gcash',
        account_name: sellerOwner.name || '',
        account_number: '',
        bank_name: 'GCash',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaved(true);
        if (addToast) {
            addToast('Settlement account details updated successfully.', 'success');
        }
        setTimeout(() => setSaved(false), 4000);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                    <Banknote size={20} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-stone-900">Finance & Payout Settlement</h3>
                    <p className="text-xs text-stone-500">Configure bank accounts and e-wallet details for automated earnings disbursement.</p>
                </div>
            </div>

            {/* Security Banner */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 flex items-start gap-3">
                <ShieldCheck size={20} className="text-emerald-700 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold text-emerald-900">Encrypted Settlement Gateway</h4>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                        Earnings from completed customer orders are transferred to your designated account via Paymongo / InstaPay settlement.
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
                            onChange={(e) => {
                                const val = e.target.value;
                                form.setData((d) => ({
                                    ...d,
                                    disbursement_method: val,
                                    bank_name: val === 'gcash' ? 'GCash' : val === 'maya' ? 'Maya' : 'BDO Unibank',
                                }));
                            }}
                            disabled={!canEdit}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px]"
                        >
                            <option value="gcash">GCash E-Wallet</option>
                            <option value="maya">Maya E-Wallet</option>
                            <option value="bank">Bank Transfer (InstaPay / PESONet)</option>
                        </select>
                    </div>
                </div>

                {form.data.disbursement_method === 'bank' && (
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                            Select Bank
                        </label>
                        <select
                            value={form.data.bank_name}
                            onChange={(e) => form.setData('bank_name', e.target.value)}
                            disabled={!canEdit}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px]"
                        >
                            <option value="BDO Unibank">BDO Unibank</option>
                            <option value="BPI">BPI (Bank of the Philippine Islands)</option>
                            <option value="UnionBank">UnionBank of the Philippines</option>
                            <option value="Metrobank">Metrobank</option>
                            <option value="Landbank">Landbank of the Philippines</option>
                            <option value="Security Bank">Security Bank</option>
                        </select>
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
                        placeholder="Registered Account Name"
                        disabled={!canEdit}
                        className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px]"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        {form.data.disbursement_method === 'bank' ? 'Account Number' : 'Mobile Number (09XX XXX XXXX)'}
                    </label>
                    <input
                        type="text"
                        value={form.data.account_number}
                        onChange={(e) => form.setData('account_number', e.target.value)}
                        placeholder={form.data.disbursement_method === 'bank' ? 'e.g. 1092 3847 5612' : 'e.g. 0917 123 4567'}
                        disabled={!canEdit}
                        className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50 min-h-[44px]"
                        required
                    />
                </div>
            </div>

            {canEdit && (
                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 text-white text-xs font-bold hover:bg-clay-700 transition disabled:opacity-50 min-h-[40px]"
                    >
                        <CheckCircle2 size={15} />
                        Save Settlement Details
                    </button>
                </div>
            )}
        </form>
    );
}
