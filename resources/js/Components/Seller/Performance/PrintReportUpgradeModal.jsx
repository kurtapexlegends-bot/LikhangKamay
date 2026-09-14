/* global route */
import React from 'react';
import Modal from '@/Components/Modal';
import { Link } from '@inertiajs/react';
import { Crown, Download, FileSpreadsheet, X } from 'lucide-react';

export default function PrintReportUpgradeModal({
    isOpen,
    onClose,
}) {
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6 text-center select-none bg-white rounded-2xl relative">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
                >
                    <X size={18} />
                </button>

                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200/80 shadow-2xs">
                    <Crown size={26} className="text-amber-700" />
                </div>

                <h2 className="text-lg font-bold text-stone-900 mb-1.5">
                    Executive Print Reports
                </h2>

                <p className="text-xs text-stone-600 mb-5 max-w-sm mx-auto leading-relaxed">
                    Official branded PDF statements with letterhead, vector charts, and verification stamps are reserved for <span className="font-bold text-stone-900">Premium &amp; Elite</span> shops.
                </p>

                <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 mb-5 text-left flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-stone-200 text-clay-700">
                        <FileSpreadsheet size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-stone-900">Free Baseline Alternative</p>
                        <p className="text-[11px] text-stone-500">
                            You can still download all raw sales, orders, and revenue data anytime using Export CSV for free.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                    <a
                        href={route('analytics.export')}
                        onClick={onClose}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold transition min-h-[42px]"
                    >
                        <Download size={14} />
                        <span>Export Raw CSV</span>
                    </a>
                    <Link
                        href={route('seller.subscription')}
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-sm active:scale-[0.98] transition min-h-[42px]"
                    >
                        <Crown size={14} />
                        <span>View Plan Upgrades</span>
                    </Link>
                </div>
            </div>
        </Modal>
    );
}
