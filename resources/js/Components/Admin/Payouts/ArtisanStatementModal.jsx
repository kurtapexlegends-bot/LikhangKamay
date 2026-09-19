import React from 'react';
import Modal from '@/Components/Modal';
import { X, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from './PayoutBalancesTable';

export default function ArtisanStatementModal({
    artisan,
    onClose,
    onDisburse,
}) {
    if (!artisan) return null;

    const recentOrders = artisan.recent_orders || [];

    return (
        <Modal show={true} onClose={onClose} maxWidth="2xl">
            <div className="p-6 bg-[#FCFBF9]">
                <div className="flex items-start justify-between pb-4 border-b border-stone-200">
                    <div>
                        <h3 className="text-base font-bold text-stone-900">{artisan.shop_name} — Settlement Statement</h3>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">Owner: {artisan.name} • {artisan.email}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                    <div className="p-3 rounded-xl bg-white border border-stone-200">
                        <p className="text-[10px] font-bold uppercase text-stone-400">Completed Sales</p>
                        <p className="text-sm font-bold text-stone-900 mt-0.5">{formatCurrency(artisan.gross_sales)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-stone-200">
                        <p className="text-[10px] font-bold uppercase text-stone-400">Commission</p>
                        <p className="text-sm font-bold text-stone-500 mt-0.5">- {formatCurrency(artisan.platform_fees)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-stone-200">
                        <p className="text-[10px] font-bold uppercase text-stone-400">Total Paid Out</p>
                        <p className="text-sm font-bold text-stone-500 mt-0.5">{formatCurrency(artisan.payouts)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <p className="text-[10px] font-extrabold uppercase text-emerald-800">Ready for Payout</p>
                        <p className="text-sm font-black text-emerald-700 mt-0.5">{formatCurrency(artisan.balance)}</p>
                    </div>
                </div>

                {/* Active in progress / holds notice */}
                {(artisan.orders_in_progress > 0 || artisan.held_for_dispute > 0) && (
                    <div className="mb-4 flex flex-wrap gap-2 text-xs">
                        {artisan.orders_in_progress > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Orders in Progress: {formatCurrency(artisan.orders_in_progress)} (in delivery/crafting)
                            </span>
                        )}
                        {artisan.held_for_dispute > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Return/Dispute Hold: {formatCurrency(artisan.held_for_dispute)}
                            </span>
                        )}
                    </div>
                )}

                {/* Completed Orders List */}
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Recent Completed Orders</h4>
                <div className="rounded-xl border border-stone-200 overflow-hidden bg-white max-h-64 overflow-y-auto">
                    {recentOrders.length === 0 ? (
                        <div className="p-8 text-center text-xs text-stone-400 font-medium">
                            No completed orders recorded yet.
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <table className="hidden sm:table w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold uppercase text-stone-500">
                                        <th className="py-2.5 px-4">Order #</th>
                                        <th className="py-2.5 px-4">Customer</th>
                                        <th className="py-2.5 px-4 text-right">Gross</th>
                                        <th className="py-2.5 px-4 text-right">Fee</th>
                                        <th className="py-2.5 px-4 text-right">Seller Net</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {recentOrders.map((o) => (
                                        <tr key={o.id} className="hover:bg-stone-50/50">
                                            <td className="py-2.5 px-4 font-mono font-bold text-stone-900">#{o.order_number}</td>
                                            <td className="py-2.5 px-4 text-stone-600">{o.customer_name}</td>
                                            <td className="py-2.5 px-4 text-right font-medium text-stone-700">{formatCurrency(o.gross)}</td>
                                            <td className="py-2.5 px-4 text-right font-medium text-stone-400">- {formatCurrency(o.fee)}</td>
                                            <td className="py-2.5 px-4 text-right font-bold text-emerald-700">{formatCurrency(o.net)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Mobile Card List View (< sm) */}
                            <div className="sm:hidden divide-y divide-stone-100">
                                {recentOrders.map((o) => (
                                    <div key={o.id} className="p-3 space-y-1.5 hover:bg-stone-50/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-xs text-stone-900">#{o.order_number}</span>
                                            <span className="font-extrabold text-xs text-emerald-700">{formatCurrency(o.net)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                                            <span className="truncate max-w-[140px] font-medium">{o.customer_name}</span>
                                            <span className="text-[10px] text-stone-400 font-mono">
                                                {formatCurrency(o.gross)} <span className="text-rose-400">(-{formatCurrency(o.fee)})</span>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs text-stone-500 font-medium">
                        Destination: <strong className="text-stone-800">{artisan.payout_method || 'GCash'}</strong> ({artisan.payout_account_number || 'No account configured'})
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                        >
                            Close
                        </button>
                        {artisan.balance > 0 && (
                            <button
                                type="button"
                                onClick={() => onDisburse(artisan)}
                                className="flex items-center gap-1.5 rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white hover:bg-clay-700 transition shadow-sm cursor-pointer"
                            >
                                <ArrowUpRight size={13} />
                                Disburse {formatCurrency(artisan.balance)}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
