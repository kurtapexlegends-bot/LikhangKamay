import React from 'react';
import { CreditCard, ArrowLeft, CheckCircle2, Wallet, Building2, Store, MapPin, ShieldCheck, Phone } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import TextInput from '@/Components/TextInput';

export default function PaymentStep({
    data,
    setData,
    errors,
    submit,
    processing,
    setStep,
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

    const methods = [
        {
            id: 'GCash',
            name: 'GCash',
            badge: 'E-Wallet',
            description: 'Instant payouts to your registered 11-digit mobile number.',
            colorClass: 'text-blue-600',
        },
        {
            id: 'Maya',
            name: 'Maya',
            badge: 'E-Wallet',
            description: 'Direct deposits to your Maya digital wallet account.',
            colorClass: 'text-emerald-600',
        },
        {
            id: 'Bank Transfer',
            name: 'Direct Bank Transfer',
            badge: 'Coming Soon',
            description: 'Direct BDO, BPI, UnionBank deposits.',
            disabled: true,
        },
    ];

    const maskAccountNumber = (num) => {
        if (!num) return '';
        const clean = String(num).trim();
        if (clean.length < 7) return clean;
        return clean.substring(0, 4) + ' •••• ' + clean.substring(clean.length - 3);
    };

    return (
        <form onSubmit={submit} className="p-6 sm:p-10">
            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-50 border border-clay-200 text-clay-700 shadow-xs">
                        <CreditCard size={22} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-900 tracking-tight">Payout Details</h2>
                        <p className="text-sm text-stone-500">Select where your sales revenue and order earnings will be deposited.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <InputLabel value="Select Payout Method *" className="mb-2" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {methods.map((method) => {
                            const isSelected = data.payout_method === method.id;
                            return (
                                <button
                                    key={method.id}
                                    type="button"
                                    disabled={method.disabled}
                                    onClick={() => setData('payout_method', method.id)}
                                    className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                                        method.disabled
                                            ? 'border-stone-200 bg-stone-50/50 opacity-60 cursor-not-allowed'
                                            : isSelected
                                                ? 'border-clay-600 bg-clay-50/30 ring-1 ring-clay-600 shadow-xs'
                                                : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/30 cursor-pointer'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {method.id === 'Bank Transfer' ? (
                                                <Building2 size={16} className="text-stone-400" />
                                            ) : (
                                                <Wallet size={16} className={isSelected ? 'text-clay-600' : 'text-stone-400'} />
                                            )}
                                            <span className="text-sm font-bold text-stone-900">{method.name}</span>
                                        </div>
                                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                            method.disabled
                                                ? 'bg-stone-100 text-stone-500'
                                                : isSelected
                                                    ? 'bg-clay-100 text-clay-800'
                                                    : 'bg-stone-100 text-stone-600'
                                        }`}>
                                            {method.badge}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-stone-500 leading-normal">{method.description}</p>
                                </button>
                            );
                        })}
                    </div>
                    <InputError message={errors.payout_method} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="payout_account_name" value="Account Holder Name *" />
                    <div className="mt-1">
                        <TextInput
                            id="payout_account_name"
                            value={data.payout_account_name}
                            onChange={(e) => setData('payout_account_name', e.target.value)}
                            placeholder="Full name matching your submitted ID / permit"
                        />
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500">Must match the legal name on your business documentation.</p>
                    <InputError message={errors.payout_account_name} className="mt-2" />
                </div>

                <div>
                    <InputLabel 
                        htmlFor="payout_account_number" 
                        value={
                            data.payout_method?.toLowerCase() === 'gcash' ? 'GCash Mobile Number *' :
                            data.payout_method?.toLowerCase() === 'maya' ? 'Maya Mobile / Account Number *' :
                            'Account Number *'
                        } 
                    />
                    <div className="mt-1">
                        <TextInput
                            id="payout_account_number"
                            value={data.payout_account_number}
                            onChange={(e) => setData('payout_account_number', e.target.value)}
                            placeholder={
                                data.payout_method?.toLowerCase() === 'gcash' || data.payout_method?.toLowerCase() === 'maya'
                                    ? '09XX XXX XXXX (11 digits)'
                                    : 'Account Number'
                            }
                            icon={Phone}
                        />
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500">Standard Philippine mobile numbers start with 09 (11 digits).</p>
                    <InputError message={errors.payout_account_number} className="mt-2" />
                </div>

                {/* Pre-submission Summary Review */}
                <div className="pt-2">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-3 flex items-center gap-2">
                            <ShieldCheck size={15} className="text-stone-400" /> Application Summary
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="flex items-start gap-2.5">
                                <Store size={14} className="mt-0.5 text-clay-600 shrink-0" />
                                <div>
                                    <span className="font-semibold text-stone-900">{data.shop_name || 'Shop Name'}</span>
                                    <p className="text-stone-500">{data.phone_number || 'No contact specified'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <MapPin size={14} className="mt-0.5 text-clay-600 shrink-0" />
                                <div>
                                    <span className="font-semibold text-stone-900">{data.city || 'Location'}</span>
                                    <p className="text-stone-500 truncate">{data.barangay ? `${data.barangay}, ` : ''}{data.region || 'Region'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <ShieldCheck size={14} className="mt-0.5 text-clay-600 shrink-0" />
                                <div>
                                    <span className="font-semibold text-stone-900">Verification Credentials</span>
                                    <p className="text-stone-500">Permit, DTI, Valid ID, and TIN ready</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CreditCard size={14} className="mt-0.5 text-clay-600 shrink-0" />
                                <div>
                                    <span className="font-semibold text-stone-900">{data.payout_method || 'GCash'} Payout</span>
                                    <p className="text-stone-500">{maskAccountNumber(data.payout_account_number) || 'Pending number'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-stone-100 pt-6">
                <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 cursor-pointer"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Documents</span>
                </button>

                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-7 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-clay-700 active:bg-clay-800 disabled:opacity-50 cursor-pointer"
                >
                    <span>{processing ? 'Submitting Application...' : 'Complete & Submit Application'}</span>
                    <CheckCircle2 size={16} />
                </button>
            </div>
        </form>
    );
}
