import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import UserAvatar from '@/Components/UserAvatar';
import { useToast } from '@/Components/ToastContext';
import {
    RotateCcw, ShieldAlert, Clock, User, Store, FileText, Camera,
    Check, X, ExternalLink, ChevronRight, Info, CheckCircle2,
    XCircle, AlertTriangle, Loader2, ArrowLeft
} from 'lucide-react';

export default function DisputeEscalationDashboard({ disputes = [] }) {
    const { addToast } = useToast();
    const [selectedId, setSelectedId] = useState(disputes.length > 0 ? disputes[0].id : null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    const selectedDispute = disputes.find(d => d.id === selectedId);

    const handleSelectDispute = (dispute) => {
        setSelectedId(dispute.id);
        setNotes('');
        setError('');
        setShowMobileDetail(true);
    };

    const handleArbitrate = (decision) => {
        if (!selectedDispute) return;
        if (!notes.trim()) {
            setError('Arbitration internal notes are required to resolve a dispute.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        router.post(
            route('admin.disputes.arbitrate', selectedDispute.id),
            {
                decision,
                admin_notes: notes.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    addToast(`Dispute resolved successfully: ${decision === 'refund' ? 'Full Refund Ruled' : 'Claim Rejected'}.`, 'success');
                    setNotes('');
                    setShowMobileDetail(false);
                    // Select another dispute if any
                    const remaining = disputes.filter(d => d.id !== selectedDispute.id);
                    if (remaining.length > 0) {
                        setSelectedId(remaining[0].id);
                    } else {
                        setSelectedId(null);
                    }
                },
                onError: (errs) => {
                    setError(errs.message || errs.admin_notes || 'Failed to submit arbitration ruling.');
                },
                onFinish: () => {
                    setIsSubmitting(false);
                }
            }
        );
    };

    return (
        <>
            <Head title="Dispute Arbitration Dashboard" />

            <div className="space-y-6">
                {disputes.length === 0 ? (
                    <WorkspaceEmptyState
                        icon={CheckCircle2}
                        title="All disputes resolved"
                        description="There are currently no active escalated disputes awaiting arbitration."
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* LEFT COLUMN: Queue list */}
                        <div className={`lg:col-span-4 bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm h-[70vh] flex flex-col ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
                            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Escalation Queue</span>
                                {disputes.length > 0 && (
                                    <span className="bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                                        {disputes.length} Active
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 custom-scrollbar">
                                {disputes.map((dispute) => {
                                    const isActive = dispute.id === selectedId;
                                    const buyerName = dispute.order?.user?.name || dispute.order?.customer_name || 'Buyer';
                                    const shopName = dispute.order?.artisan?.shop_name || 'Artisan';
                                    
                                    return (
                                        <button
                                            key={dispute.id}
                                            onClick={() => handleSelectDispute(dispute)}
                                            className={`w-full text-left p-4 transition-colors flex items-start gap-3 relative hover:bg-stone-50 ${isActive ? 'bg-clay-50/40' : ''}`}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-clay-600 rounded-r" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="font-mono text-[10px] font-bold text-stone-500 uppercase">
                                                        Order #{dispute.order?.order_number || dispute.order_id}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-stone-400">
                                                        {dispute.order?.created_at ? new Date(dispute.order.created_at).toLocaleDateString() : ''}
                                                    </span>
                                                </div>
                                                <h4 className="text-xs font-bold text-stone-900 truncate">
                                                    {buyerName} vs {shopName}
                                                </h4>
                                                <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-normal">
                                                    {dispute.reason}
                                                </p>
                                            </div>
                                            <ChevronRight size={14} className="text-stone-400 shrink-0 self-center" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Selected Detail & Action */}
                        <div className={`lg:col-span-8 space-y-6 ${showMobileDetail ? 'block' : 'hidden lg:block'}`}>
                            {selectedDispute ? (
                                <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                                    {/* Mobile Back Button */}
                                    {showMobileDetail && (
                                        <button
                                            onClick={() => setShowMobileDetail(false)}
                                            className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl transition-all shadow-sm mb-4 min-h-[44px]"
                                        >
                                            <ArrowLeft size={14} />
                                            Back to Queue
                                        </button>
                                    )}

                                    {/* Detail Header */}
                                    <div className="border-b border-stone-100 pb-5 flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                                                    Order ID: {selectedDispute.order?.order_number || selectedDispute.order_id}
                                                </span>
                                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 shadow-sm">
                                                    <ShieldAlert size={10} />
                                                    Escalated
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-stone-900 mt-2">
                                                Arbitration Case #{selectedDispute.id}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Side-by-Side Comparison */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-stone-100 pb-6">
                                        {/* Buyer Claim */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                                <User size={14} className="text-stone-400" />
                                                Buyer Claim Details
                                            </h4>
                                            
                                            <div className="bg-stone-50/50 rounded-2xl border border-stone-200/60 p-4 space-y-3.5">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={selectedDispute.order?.user} className="h-9 w-9 border border-stone-200" />
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                                            Buyer Profile
                                                        </span>
                                                        <p className="text-xs font-bold text-stone-900">
                                                            {selectedDispute.order?.user?.name || selectedDispute.order?.customer_name || 'Buyer'}
                                                        </p>
                                                        <p className="text-[10px] text-stone-500 font-medium">
                                                            {selectedDispute.order?.user?.email || ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                                                        Claim Reason
                                                    </span>
                                                    <p className="text-xs text-stone-700 leading-relaxed font-medium whitespace-pre-wrap">
                                                        {selectedDispute.reason}
                                                    </p>
                                                </div>

                                                {selectedDispute.escalation_reason && (
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                                                            Escalation Statement
                                                        </span>
                                                        <p className="text-xs text-stone-700 leading-relaxed font-medium whitespace-pre-wrap italic bg-white border border-stone-200/60 p-3 rounded-xl">
                                                            "{selectedDispute.escalation_reason}"
                                                        </p>
                                                    </div>
                                                )}

                                                <div>
                                                    <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                                                        Proof Photos
                                                    </span>
                                                    {selectedDispute.proof_photos && selectedDispute.proof_photos.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedDispute.proof_photos.map((photo, pIdx) => {
                                                                const photoUrl = photo.startsWith('http') || photo.startsWith('/storage') ? photo : `/storage/${photo}`;
                                                                return (
                                                                    <a
                                                                        key={pIdx}
                                                                        href={photoUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="relative group border border-stone-200 bg-white rounded-lg overflow-hidden h-14 w-14 shadow-sm hover:ring-2 hover:ring-clay-500 transition-all shrink-0"
                                                                    >
                                                                        <img src={photoUrl} className="h-full w-full object-cover" alt={`Proof ${pIdx + 1}`} />
                                                                        <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-stone-900/30 transition-colors" />
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-stone-400 font-medium">No proof photo attached.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Seller Defense */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                                <Store size={14} className="text-stone-400" />
                                                Seller Counter/Defense
                                            </h4>
                                            
                                            <div className="bg-stone-50/50 rounded-2xl border border-stone-200/60 p-4 space-y-3.5">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={selectedDispute.order?.artisan} className="h-9 w-9 border border-stone-200" />
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                                            Seller Shop Name
                                                        </span>
                                                        <p className="text-xs font-bold text-stone-900">
                                                            {selectedDispute.order?.artisan?.shop_name || 'Artisan Shop'}
                                                        </p>
                                                        <p className="text-[10px] text-stone-500 font-medium">
                                                            Owner: {selectedDispute.order?.artisan?.name || ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                                                        Response Type
                                                    </span>
                                                    <span className="inline-flex rounded-md border border-stone-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-stone-700 shadow-sm">
                                                        {selectedDispute.seller_response_type || 'No counter offered'}
                                                    </span>
                                                </div>

                                                {selectedDispute.seller_proposed_description && (
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                                                            Proposed Replacement Counter
                                                        </span>
                                                        <p className="text-xs text-stone-700 leading-relaxed font-medium whitespace-pre-wrap bg-white border border-stone-200/60 p-3 rounded-xl">
                                                            {selectedDispute.seller_proposed_description}
                                                        </p>
                                                    </div>
                                                )}

                                                {selectedDispute.seller_explanation && (
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                                                            Rejection Reasoning
                                                        </span>
                                                        <p className="text-xs text-stone-700 leading-relaxed font-medium whitespace-pre-wrap bg-white border border-stone-200/60 p-3 rounded-xl">
                                                            {selectedDispute.seller_explanation}
                                                        </p>
                                                    </div>
                                                )}

                                                {!selectedDispute.seller_proposed_description && !selectedDispute.seller_explanation && (
                                                    <p className="text-xs text-stone-400 font-medium italic">
                                                        Seller did not counter or explain their rejection response.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Arbitration Action Panel */}
                                    <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 sm:p-6 space-y-4">
                                        <div className="flex items-center gap-2 text-stone-900 font-bold text-xs sm:text-sm">
                                            <Info size={16} className="text-stone-500" />
                                            <span>Arbitration Ruling Panel</span>
                                        </div>
                                        <p className="text-xs text-stone-500 font-medium leading-relaxed">
                                            Carefully evaluate both statements and proof photos. Approving the refund reverses the transaction and returns payment to the buyer. Rejecting the claim retains the funds for the seller and sets the order back to completed status.
                                        </p>

                                        <div>
                                            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                                                Internal Moderation Notes / Ruling Explanation
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={notes}
                                                onChange={(e) => {
                                                    setNotes(e.target.value);
                                                    setError('');
                                                }}
                                                placeholder="Document the final decision reasoning, findings, and evidence references. This will be permanently recorded in the platform's audit logs..."
                                                className="w-full border-stone-200 rounded-xl focus:border-clay-500 focus:ring-0 shadow-sm text-xs font-medium resize-none"
                                            />
                                            {error && (
                                                <p className="mt-1 text-xs font-bold text-rose-600">
                                                    {error}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                            <button
                                                onClick={() => handleArbitrate('reject')}
                                                disabled={isSubmitting}
                                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition shadow-sm active:scale-95 disabled:opacity-50 min-h-[44px]"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 size={14} className="animate-spin text-stone-500" />
                                                ) : (
                                                    <XCircle size={14} className="text-rose-500" />
                                                )}
                                                Reject Claim (Rule for Seller)
                                            </button>
                                            <button
                                                onClick={() => handleArbitrate('refund')}
                                                disabled={isSubmitting}
                                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-clay-700 transition shadow-md active:scale-95 disabled:opacity-50 min-h-[44px]"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 size={14} className="animate-spin text-white" />
                                                ) : (
                                                    <CheckCircle2 size={14} className="text-white" />
                                                )}
                                                Approve Refund (Rule for Buyer)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <WorkspaceEmptyState
                                    icon={Info}
                                    title="No dispute selected"
                                    description="Choose a dispute from the queue list on the left to review details."
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

DisputeEscalationDashboard.layout = (page) => (
    <AdminLayout title="Escalated Disputes">{page}</AdminLayout>
);
