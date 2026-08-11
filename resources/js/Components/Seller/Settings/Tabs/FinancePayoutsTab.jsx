import React from 'react';
import { Banknote, ShieldCheck, CheckCircle2, CreditCard } from 'lucide-react';

export default function FinancePayoutsTab({ sellerOwner, permissions }) {
    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                    <Banknote size={20} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-stone-900">Finance & Payout Settlement</h3>
                    <p className="text-xs text-stone-500">Configure bank accounts and GCash e-wallet details for automatic earnings disbursement.</p>
                </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-start gap-3">
                <ShieldCheck size={20} className="text-emerald-700 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold text-emerald-900">Encrypted Settlement Provider</h4>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                        Payout disbursements are processed via Paymongo API. Funds from released orders are transferred to your designated account on schedule.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Disbursement Method
                    </label>
                    <select className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500">
                        <option value="gcash">GCash E-Wallet</option>
                        <option value="bank">Direct Bank Transfer (PESONet / InstaPay)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Account / Mobile Number
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. 0917 123 4567 or Bank Account #"
                        className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 text-white text-xs font-bold hover:bg-clay-700 transition min-h-[40px]"
                >
                    <CheckCircle2 size={15} />
                    Save Settlement Details
                </button>
            </div>
        </div>
    );
}
