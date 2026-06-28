import React from 'react';
import { Banknote, ArrowLeft, CheckCircle2 } from 'lucide-react';
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

    return (
        <form onSubmit={submit} className="p-6 sm:p-10">
            <div className="mb-8">
                <div className="mb-1 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                        <Banknote size={20} className="text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
                        <p className="text-sm text-gray-500">How would you like to receive your earnings?</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <InputLabel htmlFor="payout_method" value="Preferred Payout Method *" />
                    <select
                        id="payout_method"
                        value={data.payout_method}
                        onChange={(e) => setData('payout_method', e.target.value)}
                        className="mt-1 block w-full rounded-xl border-gray-300 py-3 text-sm focus:border-clay-500 focus:ring-clay-500"
                    >
                        <option value="GCash">GCash</option>
                        <option value="Maya">Maya</option>
                        <option value="Bank Transfer">Bank Transfer (BDO, BPI, etc.)</option>
                        <option value="Palawan Express">Palawan Express</option>
                    </select>
                    <InputError message={errors.payout_method} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="payout_account_name" value="Account Name *" />
                    <TextInput
                        id="payout_account_name"
                        value={data.payout_account_name}
                        onChange={(e) => setData('payout_account_name', e.target.value)}
                        className="mt-1 block w-full rounded-xl py-3"
                        placeholder="Full name as shown in account"
                    />
                    <InputError message={errors.payout_account_name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="payout_account_number" value="Account/Phone Number *" />
                    <TextInput
                        id="payout_account_number"
                        value={data.payout_account_number}
                        onChange={(e) => setData('payout_account_number', e.target.value)}
                        className="mt-1 block w-full rounded-xl py-3"
                        placeholder="e.g. 0917 XXX XXXX or Bank Account No."
                    />
                    <InputError message={errors.payout_account_number} className="mt-2" />
                </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 font-medium text-gray-500 transition hover:text-gray-700 active:scale-95"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <button
                    type="submit"
                    disabled={processing}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-8 py-3.5 font-bold text-white shadow-lg shadow-green-200 transition hover:from-green-700 hover:to-green-800 disabled:opacity-50 active:scale-95"
                >
                    {processing ? 'Submitting...' : 'Complete Application'} <CheckCircle2 size={18} />
                </button>
            </div>
        </form>
    );
}
