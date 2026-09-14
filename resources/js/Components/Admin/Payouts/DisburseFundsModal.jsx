/* global route */
import React from 'react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import { ArrowUpRight, Loader2, Copy, Check } from 'lucide-react';
import { formatCurrency, formatDisplayAccount } from './PayoutBalancesTable';

export default function DisburseFundsModal({
    artisan,
    onClose,
    handleCopy,
    copiedKey,
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: artisan?.id || '',
        amount: artisan?.balance || 0,
        payout_method: artisan?.payout_method || 'GCash',
        payout_account_name: artisan?.payout_account_name || '',
        payout_account_number: artisan?.payout_account_number || '',
        reference_number: '',
    });

    if (!artisan) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.payouts.store'), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Modal show={true} onClose={onClose} maxWidth="md">
            <form onSubmit={handleSubmit} className="p-6 bg-[#FCFBF9]">
                <h3 className="text-base font-bold text-stone-900 mb-1">Transfer Earnings to Artisan</h3>
                <p className="text-xs font-semibold text-stone-500 mb-5">Record a payout disbursement to the artisan&apos;s account.</p>

                <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-4 mb-5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-semibold">Artisan Shop</span>
                        <span className="font-bold text-stone-900">{artisan.shop_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-semibold">Ready for Payout</span>
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(artisan.balance)}</span>
                            <button
                                type="button"
                                onClick={() => handleCopy(artisan.balance?.toString(), `modal-amount-${artisan.id}`)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 text-[10px] font-bold transition shadow-2xs cursor-pointer"
                                title="Copy exact amount to clipboard"
                            >
                                {copiedKey === `modal-amount-${artisan.id}` ? (
                                    <>
                                        <Check size={11} className="text-emerald-600" />
                                        <span className="text-emerald-600 font-bold">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={11} />
                                        <span>Copy Amount</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-between items-start text-xs pt-2.5 border-t border-stone-200/70">
                        <span className="text-stone-500 font-semibold mt-0.5">Payout Destination</span>
                        <div className="text-right space-y-1">
                            <div className="flex items-center justify-end gap-1.5">
                                <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${
                                    (artisan.payout_method || '').toLowerCase().includes('gcash')
                                        ? 'bg-sky-50 text-sky-700 border-sky-200/70'
                                        : (artisan.payout_method || '').toLowerCase().includes('maya')
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                        : 'bg-stone-100 text-stone-700 border-stone-200'
                                }`}>
                                    {artisan.payout_method || 'GCash'}
                                </span>
                                <span className="font-bold text-stone-800 text-xs">{artisan.payout_account_name || '—'}</span>
                            </div>
                            {artisan.payout_account_number ? (
                                <div className="flex items-center justify-end gap-1.5">
                                    <span className="text-stone-600 font-mono font-semibold tracking-wider text-xs bg-white px-2 py-0.5 rounded-md border border-stone-200/60">
                                        {formatDisplayAccount(artisan.payout_method, artisan.payout_account_number)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(artisan.payout_account_number, `modal-acc-${artisan.id}`)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 text-[10px] font-bold transition shadow-2xs cursor-pointer"
                                        title="Copy account number to clipboard"
                                    >
                                        {copiedKey === `modal-acc-${artisan.id}` ? (
                                            <>
                                                <Check size={11} className="text-emerald-600" />
                                                <span className="text-emerald-600 font-bold">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={11} />
                                                <span>Copy Number</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[11px] text-amber-700 font-bold mt-1">No account configured</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <InputLabel htmlFor="amount" value="Disbursement Amount (PHP) *" />
                            <button
                                type="button"
                                onClick={() => setData('amount', artisan.balance)}
                                className="text-[10px] font-bold text-clay-700 hover:text-clay-800 underline decoration-dotted cursor-pointer"
                            >
                                Full Amount ({formatCurrency(artisan.balance)})
                            </button>
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            id="amount"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            className="mt-1 block w-full rounded-xl border-stone-250 text-sm focus:border-clay-500 focus:ring-clay-500 bg-white"
                            required
                        />
                        <InputError message={errors.amount} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="reference_number" value="GCash / Bank Reference Number *" />
                        <input
                            type="text"
                            id="reference_number"
                            placeholder="e.g. Ref No. 1009283741"
                            value={data.reference_number}
                            onChange={(e) => setData('reference_number', e.target.value)}
                            className="mt-1 block w-full rounded-xl border-stone-250 text-sm focus:border-clay-500 focus:ring-clay-500 bg-white font-mono"
                            required
                        />
                        <InputError message={errors.reference_number} className="mt-1" />
                        <p className="text-[10px] text-stone-400 mt-1">This will be attached to the artisan&apos;s email receipt and ledger statement.</p>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-1.5 rounded-xl bg-clay-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-clay-200 transition hover:bg-clay-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        {processing ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <ArrowUpRight size={14} />
                        )}
                        Confirm Transfer
                    </button>
                </div>
            </form>
        </Modal>
    );
}
