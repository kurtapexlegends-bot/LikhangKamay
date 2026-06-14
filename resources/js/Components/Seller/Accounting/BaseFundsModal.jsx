import React from 'react';
import { Building2, X, LoaderCircle } from 'lucide-react';
import Modal from '@/Components/Modal';
import WorkspaceLoadingState from '@/Components/WorkspaceLoadingState';

export default function BaseFundsModal({ show, onClose, baseFundsValue, setBaseFundsValue, onSubmit, processing }) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <form onSubmit={onSubmit} className="flex max-h-[85vh] flex-col">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5 shrink-0 bg-[#FDFBF9]">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 shrink-0">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-stone-900 tracking-tight">Edit Starting Balance</h2>
                            <p className="mt-1 text-[12px] leading-normal text-stone-500">
                                Set the initial business capital used in the finance balance.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={processing}
                        onClick={onClose}
                        className="inline-flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-stone-200 text-stone-400 transition hover:border-stone-300 hover:text-stone-700 min-h-[44px] min-w-[44px] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto px-6 py-6 flex-1">
                    <p className="mb-6 text-[12px] leading-relaxed text-stone-500">
                        Available Funds will be calculated as:
                        <br />
                        <span className="mt-2 inline-block rounded-lg border border-stone-150 bg-stone-50 px-2.5 py-1 text-[11px] font-bold text-stone-800">
                            Base Funds + Revenue - Expenses
                        </span>
                    </p>

                    <div className="mb-4 relative">
                        <label className="text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-2 block">
                            Base Funds Amount (PHP)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            value={baseFundsValue}
                            onChange={(event) => setBaseFundsValue(event.target.value)}
                            className="w-full rounded-xl border-stone-300 px-4 py-3 font-bold text-stone-900 transition focus:border-clay-500 focus:ring-clay-500"
                            required
                            disabled={processing}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap justify-end items-center gap-2 border-t border-stone-100 px-6 py-4 shrink-0 bg-stone-50/50">
                    {processing && (
                        <WorkspaceLoadingState
                            label="Saving balance"
                            detail="Updating accounting base funds"
                            className="mr-auto"
                        />
                    )}
                    <button
                        type="button"
                        disabled={processing}
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-xs font-bold text-stone-500 transition hover:bg-stone-100 min-h-[44px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-clay-700 min-h-[44px] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {processing && <LoaderCircle size={14} className="animate-spin" />}
                        {processing ? 'Saving...' : 'Save Balance'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
