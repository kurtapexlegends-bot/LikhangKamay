import React from 'react';
import { formatMoney, formatDateTime } from '@/utils/accountingFormatters';

export default function OrderSettlementView({ item }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100 bg-[#FDFBF9]">
                <p className="text-[11px] font-bold uppercase tracking-widest text-stone-800">Financial Ledger Breakdown</p>
                <p className="mt-1 text-[11px] font-medium text-stone-500">Gross Sales - Platform Fees - Shipping - Tax = Net Payout</p>
            </div>
            <div className="p-5 bg-white space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Customer</p>
                        <p className="mt-1 font-bold text-stone-900 text-[14px]">{item.requester?.name || 'Guest'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Settled On</p>
                        <p className="mt-1 font-bold text-stone-900 text-[14px]">{formatDateTime(item.activity?.last_reviewed_at)}</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[320px]">
                        <tbody className="divide-y divide-stone-100 text-[12px] font-medium text-stone-700">
                            <tr>
                                <td className="py-2.5 text-stone-500">Gross Merchandise Sales</td>
                                <td className="py-2.5 text-right font-bold text-stone-900 whitespace-nowrap">{formatMoney(item.financials?.gross_sales)}</td>
                            </tr>
                            <tr>
                                <td className="py-2.5 text-stone-500">Shipping Fee Paid</td>
                                <td className="py-2.5 text-right font-bold text-stone-900 whitespace-nowrap">{formatMoney(item.financials?.shipping_fee)}</td>
                            </tr>
                            <tr>
                                <td className="py-2.5 text-rose-600">Platform Commission Fee</td>
                                <td className="py-2.5 text-right font-bold text-rose-600 whitespace-nowrap">- {formatMoney(item.financials?.platform_fee)}</td>
                            </tr>
                            <tr>
                                <td className="py-2.5 text-rose-600">Transaction & Convenience Fee</td>
                                <td className="py-2.5 text-right font-bold text-rose-600 whitespace-nowrap">- {formatMoney(item.financials?.convenience_fee)}</td>
                            </tr>
                            <tr className="bg-emerald-50/50">
                                <td className="py-3 font-bold text-emerald-800 pl-4 rounded-l-xl">Net Payout to Shop</td>
                                <td className="py-3 text-right font-bold text-emerald-700 text-base pr-4 rounded-r-xl whitespace-nowrap">{formatMoney(item.financials?.net_payout)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
