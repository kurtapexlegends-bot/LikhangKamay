/* global route */
import React from 'react';
import {
    Store,
    ExternalLink,
    Copy,
    Check,
    AlertCircle,
    ArrowUpRight,
    FileText,
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(amount || 0);
};

export const formatDisplayAccount = (method, number) => {
    if (!number) return '—';
    const clean = String(number).replace(/\D/g, '');
    const isEWallet = (method || '').toLowerCase().includes('gcash') || (method || '').toLowerCase().includes('maya');
    if (isEWallet && clean.length === 11 && clean.startsWith('09')) {
        return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7, 11)}`;
    }
    return number;
};

export default function PayoutBalancesTable({
    artisans = [],
    searchQuery = '',
    statusFilter = 'all',
    onDisburse,
    onViewStatement,
    copiedKey,
    handleCopy,
}) {
    if (artisans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-center">
                <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 mb-3 shadow-sm">
                    <Store size={22} />
                </div>
                <h3 className="text-sm font-bold text-stone-900">No artisans found</h3>
                <p className="text-xs font-medium text-stone-500 mt-1 max-w-sm">
                    {searchQuery || statusFilter !== 'all'
                        ? "No artisan shops match your current search or filter criteria."
                        : "There are no approved artisan shops registered in the system."}
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Mobile & Tablet Card View (lg:hidden) */}
            <div className="block lg:hidden bg-stone-50/30 p-3 sm:p-4 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                {artisans.map((artisan) => {
                    const isOwed = artisan.balance > 0;
                    const copyKey = `artisan-card-${artisan.id}`;
                    const isCopied = copiedKey === copyKey;
                    const hasAccount = Boolean(artisan.payout_account_number);

                    return (
                        <div key={artisan.id} className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <UserAvatar user={artisan} className="h-10 w-10 shrink-0 border border-stone-200/70" />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="font-bold text-stone-900 text-sm truncate">{artisan.shop_name}</h4>
                                            {artisan.shop_slug && (
                                                <a
                                                    href={route('shop.seller', artisan.shop_slug)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-stone-400 hover:text-stone-600 transition shrink-0"
                                                    title="View Storefront"
                                                >
                                                    <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">
                                            {artisan.name !== artisan.shop_name ? `${artisan.name} • ` : ''}{artisan.email}
                                        </p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase shrink-0 border ${
                                    isOwed ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                    {isOwed ? 'Ready for Payout' : 'Settled'}
                                </span>
                            </div>

                            {/* Payout Destination */}
                            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 text-xs">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 block mb-1">Destination</span>
                                {hasAccount ? (
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                                                (artisan.payout_method || '').toLowerCase().includes('gcash')
                                                    ? 'bg-sky-50 text-sky-700 border-sky-200/70'
                                                    : (artisan.payout_method || '').toLowerCase().includes('maya')
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                                    : 'bg-stone-100 text-stone-700 border-stone-200'
                                            }`}>
                                                {artisan.payout_method || 'GCash'}
                                            </span>
                                            <span className="font-bold text-stone-800 text-xs truncate">
                                                {artisan.payout_account_name || '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="font-mono text-[11px] font-semibold text-stone-600">
                                                {formatDisplayAccount(artisan.payout_method, artisan.payout_account_number)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(artisan.payout_account_number, copyKey)}
                                                className="p-1 rounded text-stone-400 hover:text-stone-700 transition"
                                                title="Copy account number"
                                            >
                                                {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-amber-700 text-[11px] font-medium">
                                        <AlertCircle size={12} />
                                        <span>No payout account linked</span>
                                    </div>
                                )}
                            </div>

                            {/* Financial Breakdown */}
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-100">
                                <div>
                                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Completed Sales</span>
                                    <span className="font-bold text-stone-800">{formatCurrency(artisan.gross_sales ?? artisan.revenue)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Ready for Payout</span>
                                    <span className={`font-black text-sm ${isOwed ? 'text-amber-700' : 'text-stone-400'}`}>
                                        {formatCurrency(artisan.balance)}
                                    </span>
                                </div>
                            </div>

                            {/* Action Row */}
                            <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                                {isOwed ? (
                                    <button
                                        type="button"
                                        onClick={() => onDisburse(artisan)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white px-3 py-2 text-xs font-bold transition shadow-xs active:scale-95 min-h-[40px]"
                                    >
                                        <ArrowUpRight size={13} />
                                        <span>Log Payout</span>
                                    </button>
                                ) : (
                                    <span className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-3 py-2 rounded-xl min-h-[40px]">
                                        <Check size={13} />
                                        Settled
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onViewStatement(artisan)}
                                    title="View completed orders statement"
                                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-stone-200/80 bg-white text-stone-600 hover:bg-stone-50 transition shadow-2xs min-h-[40px] text-xs font-bold"
                                >
                                    <FileText size={14} />
                                    <span>Statement</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table View (hidden below lg) */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[960px]">
                    <thead>
                        <tr className="bg-[#FDFBF9] border-b border-stone-200/80 text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                            <th className="py-3 px-5">Shop &amp; Artisan</th>
                            <th className="py-3 px-5">Payout Destination</th>
                            <th className="py-3 px-5 text-right">Completed Sales</th>
                            <th className="py-3 px-5 text-right">Platform Fee</th>
                            <th className="py-3 px-5 text-right">Total Paid Out</th>
                            <th className="py-3 px-5 text-right">Ready for Payout</th>
                            <th className="py-3 px-5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-xs">
                        {artisans.map((artisan) => {
                            const isOwed = artisan.balance > 0;
                            const copyKey = `artisan-${artisan.id}`;
                            const isCopied = copiedKey === copyKey;
                            const hasAccount = Boolean(artisan.payout_account_number);

                            return (
                                <tr key={artisan.id} className="hover:bg-stone-50/50 transition-colors">
                                    {/* Shop & Artisan */}
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={artisan} className="h-8 w-8 shrink-0 border border-stone-200/70" />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-bold text-stone-900 text-xs truncate">
                                                        {artisan.shop_name}
                                                    </p>
                                                    {artisan.shop_slug && (
                                                        <a
                                                            href={route('shop.seller', artisan.shop_slug)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-stone-400 hover:text-stone-600 transition"
                                                            title="View Storefront"
                                                        >
                                                            <ExternalLink size={11} />
                                                        </a>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">
                                                    {artisan.name !== artisan.shop_name ? `${artisan.name} • ` : ''}{artisan.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Payout Account */}
                                    <td className="py-3.5 px-5">
                                        {hasAccount ? (
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${
                                                        (artisan.payout_method || '').toLowerCase().includes('gcash')
                                                            ? 'bg-sky-50 text-sky-700 border-sky-200/70'
                                                            : (artisan.payout_method || '').toLowerCase().includes('maya')
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                                            : 'bg-stone-100 text-stone-700 border-stone-200'
                                                    }`}>
                                                        {artisan.payout_method || 'GCash'}
                                                    </span>
                                                    <span className="font-bold text-stone-800 text-xs truncate max-w-[140px]">
                                                        {artisan.payout_account_name || '—'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="font-mono text-[10px] font-semibold text-stone-500 tracking-wider">
                                                        {formatDisplayAccount(artisan.payout_method, artisan.payout_account_number)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(artisan.payout_account_number, copyKey)}
                                                        className="p-0.5 rounded text-stone-400 hover:text-stone-700 transition cursor-pointer"
                                                        title="Copy account number"
                                                    >
                                                        {isCopied ? (
                                                            <Check size={11} className="text-emerald-600" />
                                                        ) : (
                                                            <Copy size={11} />
                                                        )}
                                                    </button>
                                                    {isCopied && (
                                                        <span className="text-[9px] font-bold text-emerald-600">Copied</span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                                    <AlertCircle size={10} />
                                                    Needs Setup
                                                </span>
                                                <span className="text-stone-400 text-[11px] italic">
                                                    No account linked
                                                </span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Completed Sales (Gross) */}
                                    <td className="py-3.5 px-5 text-right font-semibold text-stone-900">
                                        {formatCurrency(artisan.gross_sales ?? artisan.revenue)}
                                    </td>

                                    {/* Platform Fee */}
                                    <td className="py-3.5 px-5 text-right font-medium text-stone-400">
                                        {(artisan.platform_fees ?? 0) > 0 ? `- ${formatCurrency(artisan.platform_fees)}` : '₱0.00'}
                                    </td>

                                    {/* Paid Out */}
                                    <td className="py-3.5 px-5 text-right font-medium text-stone-400">
                                        {formatCurrency(artisan.payouts)}
                                    </td>

                                    {/* Net Ready for Payout */}
                                    <td className="py-3.5 px-5 text-right">
                                        <span className={`font-black text-xs ${isOwed ? 'text-amber-700' : 'text-stone-400'}`}>
                                            {formatCurrency(artisan.balance)}
                                        </span>
                                    </td>

                                    {/* Action */}
                                    <td className="py-3.5 px-5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {isOwed ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onDisburse(artisan)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
                                                >
                                                    <ArrowUpRight size={12} />
                                                    <span>Log Payout</span>
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-lg mr-1">
                                                    <Check size={12} />
                                                    Settled
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => onViewStatement(artisan)}
                                                title="View completed orders statement"
                                                className="p-1.5 rounded-xl border border-stone-200/80 bg-white text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
                                            >
                                                <FileText size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}
