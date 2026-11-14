import React, { useState } from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import UserAvatar from '@/Components/UserAvatar';
import { 
    Banknote, User, ShoppingBag, Tag, AlertCircle, 
    FileText, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';
import ApprovalActionFooter from './ApprovalActionFooter';
import ApprovalDomainBreakdown from './ApprovalDomainBreakdown';
import RevisionFeedbackBanner from '@/Components/Common/RevisionFeedbackBanner';

const DOMAIN_CONFIG = {
    hr_payroll: {
        label: 'Payroll Run',
        icon: Banknote,
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        ownerOnly: true,
    },
    staff_rate: {
        label: 'Pay Rate Update',
        icon: User,
        badgeClass: 'bg-clay-50 text-clay-800 border-clay-200/80',
        ownerOnly: true,
    },
    procurement: {
        label: 'Materials & Restock',
        icon: ShoppingBag,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        ownerOnly: true,
    },
    discount: {
        label: 'Promo & Voucher',
        icon: Tag,
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
        ownerOnly: false,
    },
    refund: {
        label: 'Cash Refund',
        icon: AlertCircle,
        badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80',
        ownerOnly: true,
    },
    product_draft: {
        label: 'Product Draft',
        icon: FileText,
        badgeClass: 'bg-stone-100 text-stone-800 border-stone-200/80',
        ownerOnly: false,
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
                        <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shrink-0 ${domainInfo.badgeClass}`}>
                                    <IconComponent size={14} className="shrink-0" />
                                    <span>{domainInfo.label}</span>
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap shrink-0 ${
                                    domainInfo.ownerOnly
                                        ? 'bg-stone-900 text-white border-stone-900'
                                        : 'bg-white text-stone-600 border-stone-200'
                                }`}>
                                    {domainInfo.ownerOnly ? 'Owner Only' : 'Owner / Manager'}
                                </span>
                            </div>

                            <div>
                                {isPending && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                        <Clock size={12} className="shrink-0" /> Awaiting Review
                                    </span>
                                )}
                                {isApproved && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                                        <CheckCircle2 size={12} className="shrink-0" /> Approved
                                    </span>
                                )}
                                {isRejected && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
                                        <XCircle size={12} className="shrink-0" /> Declined
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

                    {/* Requester & Reviewer Attribution */}
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
                        <div className="flex items-center justify-between gap-3">
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

                        {!isPending && (approval.reviewer || approval.reviewed_at) && (
                            <div className="pt-2.5 border-t border-stone-200/70 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <UserAvatar user={approval.reviewer} className="w-7 h-7 rounded-lg shadow-2xs shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Reviewed By</span>
                                        <span className="text-xs font-bold text-stone-800 truncate block">
                                            {approval.reviewer?.name || 'Shop Reviewer'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Decision Date</span>
                                    <span className="text-xs font-medium text-stone-600">
                                        {formatDate(approval.reviewed_at || approval.updated_at)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rejection Note (If Rejected) */}
                    {isRejected && (approval.active_revision || approval.rejection_reason) && (
                        <RevisionFeedbackBanner
                            revision={approval.active_revision}
                            fallbackReason={approval.rejection_reason}
                            title="Reason for Declining"
                            variant="rose"
                        />
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
