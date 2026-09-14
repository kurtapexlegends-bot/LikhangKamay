import React, { useState } from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import UserAvatar from '@/Components/UserAvatar';
import { 
    Banknote, User, ShoppingBag, Tag, AlertCircle, 
    FileText, Clock, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';
import ApprovalActionFooter from './ApprovalActionFooter';
import ApprovalDomainBreakdown from './ApprovalDomainBreakdown';

const DOMAIN_CONFIG = {
    hr_payroll: {
        label: 'Payroll Run',
        icon: Banknote,
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    },
    staff_rate: {
        label: 'Salary & Rate Update',
        icon: User,
        badgeClass: 'bg-clay-50 text-clay-800 border-clay-200/80',
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

export default function ApprovalDetailsDrawer({
    isOpen,
    onClose,
    approval,
    onApprove,
    onReject,
    processing = false,
}) {
    const [selectedDoc, setSelectedDoc] = useState(null);

    if (!approval) return null;

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

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <SlideOverDrawer
                show={isOpen}
                onClose={onClose}
                title={null}
                footer={
                    <ApprovalActionFooter
                        approval={approval}
                        isPending={isPending}
                        processing={processing}
                        onClose={onClose}
                        onApprove={onApprove}
                        onReject={onReject}
                    />
                }
                widthClass="max-w-xl"
                position="bottom"
            >
                <div className="space-y-6">
                    {/* Header Meta */}
                    <div>
                        <div className="flex items-center justify-between gap-3 mb-2.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${domainInfo.badgeClass}`}>
                                <IconComponent size={14} />
                                {domainInfo.label}
                            </span>

                            <div>
                                {isPending && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        <Clock size={12} /> Awaiting Review
                                    </span>
                                )}
                                {isApproved && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <CheckCircle2 size={12} /> Approved
                                    </span>
                                )}
                                {isRejected && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                        <XCircle size={12} /> Declined
                                    </span>
                                )}
                            </div>
                        </div>

                        <h3 className="text-lg font-black text-stone-900 tracking-tight">
                            {approval.title}
                        </h3>
                        {approval.summary && (
                            <p className="text-xs text-stone-600 mt-1 leading-relaxed font-medium">
                                {approval.summary}
                            </p>
                        )}
                    </div>

                    {/* Requester & Submission Timestamp */}
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar user={approval.requester} className="w-8 h-8 rounded-xl shadow-2xs shrink-0" />
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-stone-400 block">Submitted By</span>
                                <span className="text-xs font-bold text-stone-800 truncate block">
                                    {approval.requester?.name || 'Staff Member'}
                                </span>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">Date Submitted</span>
                            <span className="text-xs font-medium text-stone-600">
                                {formatDate(approval.created_at)}
                            </span>
                        </div>
                    </div>

                    {/* Rejection Note (If Rejected) */}
                    {isRejected && approval.rejection_reason && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                                <AlertTriangle size={14} className="text-rose-600" />
                                <span>Reason for Declining:</span>
                            </div>
                            <p className="leading-relaxed pl-5 font-medium">{approval.rejection_reason}</p>
                        </div>
                    )}

                    {/* Domain Specific Data */}
                    <div>
                        <ApprovalDomainBreakdown
                            approval={approval}
                            payload={payload}
                            onViewDocument={(doc) => setSelectedDoc(doc)}
                        />
                    </div>
                </div>
            </SlideOverDrawer>

            {/* Document / Evidence Photo Lightbox Modal */}
            <DocumentViewerModal
                isOpen={!!selectedDoc}
                onClose={() => setSelectedDoc(null)}
                doc={selectedDoc}
            />
        </>
    );
}
