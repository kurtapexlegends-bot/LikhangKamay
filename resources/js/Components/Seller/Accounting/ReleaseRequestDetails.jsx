import React from 'react';
import { Users, FileText, Banknote, Download, LoaderCircle } from 'lucide-react';
import {
    formatMoney,
    formatDate,
    formatDateTime,
    formatRole,
    statusTone
} from '@/utils/accountingFormatters';
import OrderSettlementView from '@/Components/Seller/Accounting/OrderSettlementView';
import PayrollReviewDetails from '@/Components/Seller/Accounting/PayrollReviewDetails';

function DetailTile({ label, value }) {
    return (
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm px-3.5 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
            <p className="mt-0.5 text-[13px] font-bold text-stone-900">{value ?? 'N/A'}</p>
        </div>
    );
}

function AuditSheet({ title, rows }) {
    return (
        <div className="px-3.5 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{title}</p>
            <div className="mt-2 divide-y divide-stone-100">
                {rows.map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mt-0.5">{label}</span>
                        <span className="max-w-[70%] text-right text-[12px] font-medium text-stone-900 whitespace-nowrap">{value ?? 'N/A'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ReleaseRequestDetails({
    item,
    source,
    canEditAccounting,
    rejectReason,
    setRejectReason,
    onApprove,
    onReject,
    reviewProcessing,
    onClose,
    inline = false
}) {
    if (!item) return null;

    const isPayroll = item.type === 'payroll';
    const isSale = item.type === 'sale';
    const isPendingReview = source === 'pending';

    const handlePrintStatement = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Financial Statement - ${item.order_number || item.id}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1c1917; max-width: 800px; margin: 0 auto; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e7e5e4; padding-bottom: 20px; margin-bottom: 30px; }
                        h1 { margin: 0; font-size: 24px; }
                        .text-muted { color: #78716c; font-size: 14px; }
                        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        .table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f5f5f4; }
                        .table th { background: #fafaf9; font-size: 12px; text-transform: uppercase; color: #57534e; font-weight: bold; }
                        .text-right { text-align: right !important; }
                        .total-row { font-weight: bold; background: #fdfaf8; font-size: 16px; }
                        .total-row td { border-top: 2px solid #e7e5e4; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>Financial Settlement Statement</h1>
                            <p class="text-muted">Statement generated on ${new Date().toLocaleDateString()}</p>
                        </div>
                        <div class="text-right">
                            <h2 style="margin:0;font-size:18px;">${item.order_number || ('Request #' + item.id)}</h2>
                            <p class="text-muted">Settlement Date: ${new Date(item.updated_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <div class="info-grid">
                        <div>
                            <strong>Customer Name</strong>
                            <p>${item.requester?.name || 'Guest'}</p>
                        </div>
                        <div>
                            <strong>Status</strong>
                            <p>Settled & Payout Complete</p>
                        </div>
                    </div>

                    <table class="table">
                        <thead>
                            <tr>
                                <th>Ledger Entry</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Gross Merchandise Sales</td>
                                <td class="text-right">PHP ${Number(item.financials?.gross_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                                <td>Shipping Paid by Customer</td>
                                <td class="text-right">PHP ${Number(item.financials?.shipping_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                                <td style="color:#ef4444;">Platform Commission Fee</td>
                                <td class="text-right" style="color:#ef4444;">- PHP ${Number(item.financials?.platform_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                                <td style="color:#ef4444;">Transaction / Convenience Fee</td>
                                <td class="text-right" style="color:#ef4444;">- PHP ${Number(item.financials?.convenience_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr class="total-row">
                                <td>Net Payout to Shop</td>
                                <td class="text-right" style="color:#059669;">PHP ${Number(item.financials?.net_payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    // Header Content
    const headerContent = (
        <div className="flex flex-col sm:flex-row w-full gap-4 justify-between border-b border-stone-200 pb-4">
            <div className="flex items-start gap-4">
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    isPayroll
                        ? 'border-stone-200 bg-stone-50 text-stone-500'
                        : isSale
                        ? 'border-teal-200 bg-teal-50 text-teal-600'
                        : 'border-clay-200 bg-[#FCF7F2] text-clay-600'
                }`}>
                    {isPayroll ? (
                        <Users size={18} strokeWidth={2.5} />
                    ) : isSale ? (
                        <Banknote size={18} strokeWidth={2.5} />
                    ) : (
                        <FileText size={18} strokeWidth={2.5} />
                    )}
                </div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                            isPayroll
                                ? 'bg-stone-100 text-stone-700 border-stone-200'
                                : isSale
                                ? 'bg-teal-50 text-teal-700 border-teal-100'
                                : 'bg-[#FCF7F2] text-clay-700 border-[#E7D8C9]'
                        }`}>
                            {isPayroll ? 'Payroll Review' : isSale ? 'Settlement Review' : 'Inventory Review'}
                        </span>
                        {item.status && (
                            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${statusTone(item.status)}`}>
                                {String(item.status).replace(/_/g, ' ')}
                            </span>
                        )}
                    </div>
                    <h2 className="mt-1.5 text-[15px] font-bold leading-tight text-stone-900 sm:text-base">
                        {isPayroll
                            ? `Payroll Review for ${item.month || ''}`
                            : isSale
                            ? `Order Settlement Breakdown`
                            : `Stock Request #${item.id || ''}`}
                    </h2>
                    <p className="mt-1 text-[11px] font-medium text-stone-500 sm:text-[12px]">
                        {isSale
                            ? `Breakdown for ${item.order_number}`
                            : isPendingReview
                            ? 'Review the breakdown before approving or rejecting.'
                            : 'Review the stored breakdown.'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 self-center sm:ml-auto pr-2">
                {isPayroll && (
                    <div className="rounded-[1.25rem] border border-[#E7D8C9] bg-[#FCF7F2] px-4 py-2 text-right hidden sm:block">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-clay-500">Requested Amount</p>
                        <p className="mt-0.5 text-lg font-bold tracking-tight text-clay-900 whitespace-nowrap">{formatMoney(item.amount)}</p>
                    </div>
                )}
            </div>
        </div>
    );

    // Footer actions
    const footerActions = isPendingReview ? (
        <div className="flex flex-col gap-4 border-t border-stone-200 pt-4 mt-6">
            <div className="w-full">
                <input
                    type="text"
                    disabled={!canEditAccounting || !!reviewProcessing}
                    className="w-full rounded-xl border-stone-200 py-2.5 px-4 text-[12px] font-medium transition focus:border-clay-500 focus:ring-clay-500 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 shadow-sm min-h-[44px]"
                    placeholder="Add note to enable rejection..."
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    title="A note is required to reject this release."
                />
            </div>
            <div className="flex items-center justify-end gap-2 shrink-0 w-full">

                <button
                    type="button"
                    onClick={onReject}
                    disabled={!canEditAccounting || !rejectReason.trim() || !!reviewProcessing}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest transition shadow-sm min-h-[44px] ${
                        canEditAccounting && rejectReason.trim() && !reviewProcessing
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                            : 'cursor-not-allowed border border-stone-200 bg-stone-50 text-stone-400'
                    }`}
                >
                    {reviewProcessing === 'reject' && <LoaderCircle size={14} className="animate-spin" />}
                    Reject
                </button>
                <button
                    type="button"
                    onClick={onApprove}
                    disabled={!canEditAccounting || !!reviewProcessing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm transition hover:bg-clay-700 min-h-[44px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {reviewProcessing === 'approve' && <LoaderCircle size={14} className="animate-spin" />}
                    {reviewProcessing === 'approve' ? 'Wait...' : 'Approve'}
                </button>
            </div>
        </div>
    ) : (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end w-full gap-3 border-t border-stone-200 pt-4 mt-6">
            {isSale && (
                <button
                    type="button"
                    onClick={handlePrintStatement}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-clay-100/50 bg-clay-50/50 px-4 py-2.5 text-xs font-bold text-clay-700 hover:bg-clay-100 hover:text-clay-800 transition-all duration-200 min-h-[44px] w-full sm:w-auto shrink-0"
                >
                    <Download size={14} strokeWidth={2.5} /> Download PDF
                </button>
            )}

        </div>
    );

    const bodyContent = (
        <div className="space-y-3 mt-3">
            {/* Mobile Requested Amount Callout */}
            {isPayroll && (
                <div className="rounded-xl border border-[#E7D8C9] bg-[#FCF7F2] p-3 text-center sm:hidden">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-clay-500">Requested Amount</p>
                    <p className="mt-0.5 text-xl font-bold tracking-tight text-clay-900 whitespace-nowrap">{formatMoney(item.amount)}</p>
                </div>
            )}

            {/* 1. Inventory stock request review layout */}
            {!isPayroll && !isSale && (
                <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm">
                    <div className="grid divide-y divide-stone-100 md:grid-cols-2 md:divide-x md:divide-y-0">
                        <AuditSheet
                            title="Request & Supply"
                            rows={[
                                {
                                    label: 'Requester',
                                    value: (
                                        <div className="text-right">
                                            <div className="font-bold text-stone-900 text-[13px]">{item.requester?.name || 'Seller owner'}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">{formatRole(item.requester?.role)}</div>
                                        </div>
                                    )
                                },
                                { label: 'Submitted', value: formatDate(item.created_at) },
                                { label: 'Supply', value: item.supply?.name },
                                { label: 'Category', value: item.supply?.category },
                                { label: 'Supplier', value: item.supply?.supplier || 'Not provided' },
                                { label: 'Unit', value: item.supply?.unit || 'N/A' }
                            ]}
                        />

                        <AuditSheet
                            title="Release & Inventory"
                            rows={[
                                { label: 'Requested', value: `${item.quantity} ${item.supply?.unit || ''}`.trim() },
                                { label: 'Unit Cost', value: formatMoney(item.supply?.unit_cost) },
                                { label: 'Total Cost', value: formatMoney(item.amount) },
                                {
                                    label: 'Funds',
                                    value: (
                                        <div className="text-right">
                                            <div className="font-bold text-stone-900 text-[13px]">{formatMoney(item.fund_snapshot?.available_balance)}</div>
                                            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${Number(item.fund_snapshot?.remaining_balance) < 0 ? 'text-rose-650' : 'text-emerald-650'}`}>
                                                New: {formatMoney(item.fund_snapshot?.remaining_balance)}
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    label: 'Stock',
                                    value: `Cur ${item.supply?.current_stock ?? 'N/A'} | Min ${item.supply?.min_stock ?? 'N/A'}`
                                },
                                { label: 'Capacity', value: item.supply?.available_capacity }
                            ]}
                        />
                    </div>
                </div>
            )}

            {/* 2. Order settlement layout */}
            {isSale && <OrderSettlementView item={item} />}

            {/* 3. Payroll review layout */}
            {isPayroll && <PayrollReviewDetails item={item} inline={inline} />}

            {/* Stored Rejection Reason */}
            {item.rejection_reason && (
                <div className="rounded-[1.25rem] border border-red-200/60 bg-red-50 px-5 py-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-red-500">Stored Rejection Reason</p>
                    <p className="mt-1 text-[13px] font-bold text-red-800">{item.rejection_reason}</p>
                </div>
            )}
        </div>
    );

    return (
        <div className={inline ? "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm h-full flex flex-col justify-between" : "flex flex-col h-full justify-between p-1"}>
            <div>
                {headerContent}
                {bodyContent}
            </div>
            {footerActions}
        </div>
    );
}
