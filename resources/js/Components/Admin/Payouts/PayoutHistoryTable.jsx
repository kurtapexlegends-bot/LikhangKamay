import React from 'react';
import {
    History,
    Calendar,
    Copy,
    Check,
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import CompactPagination from '@/Components/CompactPagination';
import { formatCurrency, formatDisplayAccount } from './PayoutBalancesTable';

export default function PayoutHistoryTable({
    history = [],
    pagination = {},
    searchQuery = '',
    copiedKey,
    handleCopy,
}) {
    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-center">
                <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 mb-3 shadow-sm">
                    <History size={22} />
                </div>
                <h3 className="text-sm font-bold text-stone-900">No payout history</h3>
                <p className="text-xs font-medium text-stone-500 mt-1 max-w-sm">
                    {searchQuery
                        ? "No completed disbursements match your search query."
                        : "There are no logged payout disbursements in the system ledger yet."}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {/* Mobile & Tablet Card View (lg:hidden) */}
            <div className="block lg:hidden bg-stone-50/30 p-3 sm:p-4 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                {history.map((payout) => {
                    const refCopyKey = `ref-card-${payout.id}`;
                    const isRefCopied = copiedKey === refCopyKey;

                    return (
                        <div key={payout.id} className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <UserAvatar user={payout.user} className="h-9 w-9 shrink-0 border border-stone-200/60" />
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-stone-900 text-xs truncate">{payout.shop_name}</h4>
                                        <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">Owner: {payout.artisan_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] font-medium text-stone-500 shrink-0">
                                    <Calendar size={12} className="text-stone-400" />
                                    <span>{payout.created_at}</span>
                                </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 text-xs space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-stone-100 text-stone-700 border border-stone-200">
                                            {payout.payout_method || 'GCash'}
                                        </span>
                                        <span className="font-bold text-stone-800 text-xs truncate">
                                            {payout.payout_account_name}
                                        </span>
                                    </div>
                                    <span className="font-mono text-[11px] font-semibold text-stone-600 shrink-0">
                                        {formatDisplayAccount(payout.payout_method, payout.payout_account_number)}
                                    </span>
                                </div>
                                {payout.reference_number && (
                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/40">
                                        <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Ref / Txn</span>
                                        <div className="flex items-center gap-1">
                                            <span className="font-mono text-xs font-bold text-stone-900">{payout.reference_number}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(payout.reference_number, refCopyKey)}
                                                className="p-0.5 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                                                title="Copy reference number"
                                            >
                                                {isRefCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Amount Paid</span>
                                <span className="font-black text-base text-emerald-700">{formatCurrency(payout.amount)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table View (hidden below lg) */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[960px]">
                    <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                            <th className="py-3.5 px-5">Disbursement Date</th>
                            <th className="py-3.5 px-5">Artisan Shop</th>
                            <th className="py-3.5 px-5">Payout Destination</th>
                            <th className="py-3.5 px-5">Reference / Txn ID</th>
                            <th className="py-3.5 px-5 text-right">Amount Paid</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-xs">
                        {history.map((payout) => {
                            const refCopyKey = `ref-${payout.id}`;
                            const isRefCopied = copiedKey === refCopyKey;

                            return (
                                <tr key={payout.id} className="hover:bg-stone-50/40 transition-colors">
                                    {/* Date */}
                                    <td className="py-4 px-5 font-medium text-stone-600">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} className="text-stone-400 shrink-0" />
                                            <span>{payout.created_at}</span>
                                        </div>
                                    </td>

                                    {/* Artisan Shop */}
                                    <td className="py-4 px-5">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={payout.user} className="h-8 w-8 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-bold text-stone-900 text-xs truncate">
                                                    {payout.shop_name}
                                                </p>
                                                <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">
                                                    Owner: {payout.artisan_name}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Payout Destination */}
                                    <td className="py-4 px-5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-flex px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-stone-100 text-stone-700 border border-stone-200">
                                                {payout.payout_method || 'GCash'}
                                            </span>
                                            <span className="font-bold text-stone-850 text-xs truncate max-w-[140px]">
                                                {payout.payout_account_name}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-mono font-semibold text-stone-500 tracking-wider mt-0.5">
                                            {formatDisplayAccount(payout.payout_method, payout.payout_account_number)}
                                        </p>
                                    </td>

                                    {/* Reference / Txn ID */}
                                    <td className="py-4 px-5">
                                        {payout.reference_number ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-xs font-bold text-stone-900">
                                                    {payout.reference_number}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(payout.reference_number, refCopyKey)}
                                                    className="p-0.5 rounded text-stone-400 hover:text-stone-700 transition cursor-pointer"
                                                    title="Copy reference number"
                                                >
                                                    {isRefCopied ? (
                                                        <Check size={11} className="text-emerald-600" />
                                                    ) : (
                                                        <Copy size={11} />
                                                    )}
                                                </button>
                                                {isRefCopied && (
                                                    <span className="text-[9px] font-bold text-emerald-600">Copied</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-stone-400 italic text-[11px]">None</span>
                                        )}
                                    </td>

                                    {/* Amount Paid */}
                                    <td className="py-4 px-5 text-right font-black text-sm text-emerald-700">
                                        {formatCurrency(payout.amount)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {pagination.last_page > 1 && (
                <div className="p-4 border-t border-stone-100 flex justify-end">
                    <CompactPagination links={pagination.links} />
                </div>
            )}
        </div>
    );
}
