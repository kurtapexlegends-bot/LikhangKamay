import React from 'react';
import { 
    CheckCircle2, XCircle, Clock, User, ArrowRight, 
    AlertCircle, FileText, Banknote, ShoppingBag, Tag, 
    Calendar, Receipt, Box, Percent, Eye
} from 'lucide-react';

const DOMAIN_CONFIG = {
    hr_payroll: {
        label: 'Payroll Run',
        icon: Banknote,
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    },
    staff_rate: {
        label: 'Salary & Rate Update',
        icon: User,
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
    },
    procurement: {
        label: 'Materials & Supplies',
        icon: ShoppingBag,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    },
    discount: {
        label: 'Promotions & Discounts',
        icon: Tag,
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
    },
    refund: {
        label: 'Customer Dispute & Refund',
        icon: AlertCircle,
        badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80',
    },
    product_draft: {
        label: 'Product Listing',
        icon: FileText,
        badgeClass: 'bg-stone-100 text-stone-800 border-stone-200/80',
    },
};

export default function ApprovalDiffCard({ approval, onApprove, onReject, onInspect, processing = false }) {
    const domainInfo = DOMAIN_CONFIG[approval.domain] || {
        label: approval.domain,
        icon: FileText,
        badgeClass: 'bg-stone-100 text-stone-800 border-stone-200/80',
    };
    const IconComponent = domainInfo.icon;
    const isPending = approval.status === 'pending';
    const isApproved = approval.status === 'approved';
    const isRejected = approval.status === 'rejected';
    const payload = approval.changes_payload || {};

    return (
        <div className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
            isPending 
                ? 'border-stone-200 bg-white shadow-xs hover:border-clay-300' 
                : 'border-stone-200/70 bg-stone-50/70'
        }`}>
            {/* Main Header & Body */}
            <div className="p-4 sm:p-5 space-y-3.5">
                {/* Header Meta */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${domainInfo.badgeClass}`}>
                            <IconComponent size={13} />
                            {domainInfo.label}
                        </span>

                        <span className="text-xs text-stone-500 font-medium">
                            Requested by <strong className="text-stone-800 font-semibold">{approval.requester?.name || 'Staff Member'}</strong>
                        </span>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                        {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock size={11} /> Awaiting Review
                            </span>
                        )}
                        {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={11} /> Approved
                            </span>
                        )}
                        {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                <XCircle size={11} /> Declined
                            </span>
                        )}
                    </div>
                </div>

                {/* Title & Summary */}
                <div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight">
                        {approval.title}
                    </h3>
                    {approval.summary && (
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed font-medium">
                            {approval.summary}
                        </p>
                    )}
                </div>

                {/* Diff / Payload Breakdown */}
                {Object.keys(payload).length > 0 && (
                    <div className="rounded-xl bg-stone-100/80 border border-stone-200/70 p-3 text-xs space-y-2">
                        {/* Staff Rate Changes */}
                        {payload.employee_name && (
                            <div className="flex items-center justify-between text-stone-600">
                                <span className="font-medium">Staff Member:</span>
                                <strong className="text-stone-900 font-bold">{payload.employee_name}</strong>
                            </div>
                        )}
                        {payload.old_rate !== undefined && payload.new_rate !== undefined && (
                            <div className="flex items-center justify-between">
                                <span className="text-stone-500 font-medium">Daily Rate:</span>
                                <div className="flex items-center gap-2 font-semibold">
                                    <span className="text-stone-400 line-through">₱{Number(payload.old_rate).toLocaleString()}</span>
                                    <ArrowRight size={12} className="text-stone-400" />
                                    <span className="font-black text-emerald-700">₱{Number(payload.new_rate).toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        {/* Payroll Runs */}
                        {payload.period && (
                            <div className="flex items-center justify-between text-stone-600">
                                <span className="font-medium">Pay Period:</span>
                                <strong className="text-stone-900 font-semibold">{payload.period}</strong>
                            </div>
                        )}
                        {payload.staff_count !== undefined && (
                            <div className="flex items-center justify-between text-stone-600">
                                <span className="font-medium">Total Employees:</span>
                                <strong className="text-stone-900 font-semibold">{payload.staff_count} Employee{payload.staff_count === 1 ? '' : 's'}</strong>
                            </div>
                        )}
                        {payload.total_payout && (
                            <div className="flex items-center justify-between">
                                <span className="text-stone-500 font-medium">Total Net Payout:</span>
                                <span className="font-black text-emerald-700 text-sm">₱{Number(payload.total_payout).toLocaleString()}</span>
                            </div>
                        )}

                        {/* Materials & Restocks */}
                        {payload.materials && (
                            <div className="flex items-start justify-between gap-2 text-stone-600">
                                <span className="font-medium shrink-0">Items / Materials:</span>
                                <span className="text-stone-900 font-semibold text-right">{payload.materials}</span>
                            </div>
                        )}
                        {payload.supplier && (
                            <div className="flex items-center justify-between text-stone-600">
                                <span className="font-medium">Supplier:</span>
                                <strong className="text-stone-900 font-semibold">{payload.supplier}</strong>
                            </div>
                        )}
                        {payload.estimated_cost && (
                            <div className="flex items-center justify-between">
                                <span className="text-stone-500 font-medium">Estimated Restock Cost:</span>
                                <span className="font-black text-amber-700 text-sm">₱{Number(payload.estimated_cost).toLocaleString()}</span>
                            </div>
                        )}

                        {/* Promotions & Discounts */}
                        {payload.campaign_name && (
                            <div className="flex items-center justify-between text-stone-600">
                                <span className="font-medium">Campaign:</span>
                                <strong className="text-stone-900 font-bold">{payload.campaign_name}</strong>
                            </div>
                        )}
                        {payload.discount_rate && (
                            <div className="flex items-center justify-between text-stone-600">
                                <span className="font-medium">Promo Discount:</span>
                                <span className="font-black text-rose-700">{payload.discount_rate}</span>
                            </div>
                        )}
                        {payload.schedule && (
                            <div className="flex items-center justify-between text-stone-600">
                                <span className="font-medium">Promo Schedule:</span>
                                <span className="text-stone-900 font-semibold">{payload.schedule}</span>
                            </div>
                        )}

                        {/* Customer Disputes & Refunds */}
                        {payload.order_number && (
                            <div className="flex items-center justify-between text-stone-600">
                                <span className="font-medium">Order:</span>
                                <strong className="text-stone-900 font-bold">{payload.order_number}</strong>
                            </div>
                        )}
                        {payload.buyer_claim && (
                            <div className="flex items-start justify-between gap-2 text-stone-600">
                                <span className="font-medium shrink-0">Buyer Claim:</span>
                                <span className="text-stone-900 font-medium text-right">{payload.buyer_claim}</span>
                            </div>
                        )}
                        {payload.proposed_resolution && (
                            <div className="flex items-center justify-between">
                                <span className="text-stone-500 font-medium">Proposed Resolution:</span>
                                <span className="font-black text-orange-700">{payload.proposed_resolution}</span>
                            </div>
                        )}

                        {/* Product Listings / Drafts */}
                        {payload.product_name && (
                            <div className="flex items-center justify-between text-stone-600">
                                <span className="font-medium">Item Name:</span>
                                <strong className="text-stone-900 font-bold">{payload.product_name}</strong>
                            </div>
                        )}
                        {payload.proposed_price && (
                            <div className="flex items-center justify-between">
                                <span className="text-stone-500 font-medium">Proposed Price:</span>
                                <span className="font-black text-emerald-700 text-sm">₱{Number(payload.proposed_price).toLocaleString()}</span>
                            </div>
                        )}
                        {payload.cost_margin && (
                            <div className="flex items-center justify-between text-stone-600">
                                <span className="font-medium">Unit Cost &amp; Margin:</span>
                                <span className="text-stone-900 font-semibold">{payload.cost_margin}</span>
                            </div>
                        )}

                        {/* Notes / Remarks */}
                        {payload.notes && (
                            <div className="text-[11px] text-stone-600 border-t border-stone-200/60 pt-2 italic">
                                "{payload.notes}"
                            </div>
                        )}
                    </div>
                )}

                {/* Rejection / Reviewer Info */}
                {isRejected && approval.rejection_reason && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                        <span className="font-bold block mb-0.5">Reason for Declining:</span>
                        <p>{approval.rejection_reason}</p>
                    </div>
                )}
            </div>

            {/* Footer Actions & Timestamp */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-stone-50/50 border-t border-stone-100 rounded-b-2xl flex items-center justify-between gap-2.5 flex-wrap">
                <span className="text-[11px] font-medium text-stone-400">
                    {new Date(approval.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>

                <div className="flex items-center gap-2 ml-auto flex-wrap">
                    {onInspect && (
                        <button
                            type="button"
                            onClick={() => onInspect(approval)}
                            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-bold hover:bg-stone-50 hover:text-stone-900 transition active:scale-95 min-h-[36px] flex items-center gap-1.5"
                        >
                            <Eye size={13} /> Inspect
                        </button>
                    )}

                    {isPending ? (
                        <>
                            <button
                                type="button"
                                onClick={() => onReject(approval)}
                                disabled={processing}
                                className="px-3 py-1.5 rounded-xl border border-rose-200/80 bg-rose-50/50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition active:scale-95 disabled:opacity-50 min-h-[36px] flex items-center gap-1.5"
                            >
                                <XCircle size={14} /> Decline
                            </button>
                            <button
                                type="button"
                                onClick={() => onApprove(approval)}
                                disabled={processing}
                                className="px-3.5 py-1.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 min-h-[36px] flex items-center gap-1.5"
                            >
                                <CheckCircle2 size={14} /> Approve
                            </button>
                        </>
                    ) : (
                        <span className="text-[11px] font-medium text-stone-500">
                            {isApproved ? 'Approved' : 'Declined'} {approval.reviewed_at ? `on ${new Date(approval.reviewed_at).toLocaleDateString()}` : ''}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
