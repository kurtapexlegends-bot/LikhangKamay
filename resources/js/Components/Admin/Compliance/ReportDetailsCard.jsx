/* global route */
import React from 'react';
import { Link } from '@inertiajs/react';
import { 
    AlertTriangle, 
    Eye, 
    X, 
    ShieldOff, 
    UserX, 
    Package, 
    Store, 
    ExternalLink, 
    MessageSquare, 
    Star, 
    CheckCircle2, 
    Clock, 
    Check, 
    Trash2, 
    HelpCircle,
    ShieldAlert
} from 'lucide-react';

export default function ReportDetailsCard({ 
    selectedTicket, 
    handleFlagAction, 
    openDisputeActionModal,
    setDisputeDeleteState,
    isMobile = false 
}) {
    if (!selectedTicket) return null;

    const isDispute = selectedTicket.ticketType === 'dispute';
    const flag = !isDispute ? selectedTicket.raw : null;
    const dispute = isDispute ? selectedTicket.raw : null;

    const rawType = flag?.reportable_type ? flag.reportable_type.split('\\').pop() : (isDispute ? 'Review' : 'Content');
    const isProduct = rawType === 'Product' && flag?.reportable;
    const isUser = rawType === 'User' && flag?.reportable;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Pinned Lean Header */}
            <div className={`px-5 py-3.5 border-b border-stone-100 shrink-0 flex flex-wrap items-center justify-between gap-2.5 ${isMobile ? 'bg-white' : 'bg-[#FCFBF9]'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200/60">
                        {isDispute ? `Dispute #${selectedTicket.rawId}` : `Ticket #${selectedTicket.rawId}`}
                    </span>
                    <span className="text-[11px] font-medium text-stone-400">
                        {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="text-xs text-stone-500 font-medium">
                        {isDispute ? 'Shop: ' : 'Reporter: '}
                        <strong className="text-stone-800 font-bold">{selectedTicket.reporterName || 'Anonymous'}</strong>
                    </span>
                </div>

                {/* Status Badge */}
                <div className="shrink-0">
                    {selectedTicket.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200/80">
                            <AlertTriangle size={11} className="text-amber-600" /> Pending Review
                        </span>
                    )}
                    {selectedTicket.status === 'under_review' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-800 border border-sky-200/80">
                            <Clock size={11} className="text-sky-600" /> Under Active Review
                        </span>
                    )}
                    {selectedTicket.status === 'resolved' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200/80">
                            <CheckCircle2 size={11} className="text-emerald-600" /> Resolved / Approved
                        </span>
                    )}
                    {selectedTicket.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-700 border border-stone-200">
                            <X size={11} className="text-stone-500" /> Rejected / Kept Visible
                        </span>
                    )}
                    {selectedTicket.status === 'dismissed' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-600 border border-stone-200">
                            <Check size={11} className="text-stone-500" /> Dismissed
                        </span>
                    )}
                </div>
            </div>
            
            {/* Scrollable Inspector Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-[#FAF9F6] custom-scrollbar">
                {/* 1. Violation / Dispute Reason Card */}
                <div className={`p-4 rounded-2xl border ${isDispute ? 'bg-indigo-50/50 border-indigo-200/70' : 'bg-amber-50/60 border-amber-200/70'}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <ShieldAlert size={13} className={isDispute ? 'text-indigo-700' : 'text-amber-700'} />
                        <h4 className={`text-[10px] font-black uppercase tracking-wider ${isDispute ? 'text-indigo-800' : 'text-amber-800'}`}>
                            {isDispute ? 'Seller Dispute Claim' : 'Reported Violation Reason'}
                        </h4>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-stone-900 leading-relaxed">
                        &ldquo;{selectedTicket.reason}&rdquo;
                    </p>
                    {selectedTicket.details && selectedTicket.details !== selectedTicket.reason && (
                        <p className="text-xs text-stone-600 mt-2 pt-2 border-t border-stone-200/50 leading-relaxed">
                            {selectedTicket.details}
                        </p>
                    )}
                </div>

                {/* ----------------- DISPUTE SPECIFIC CARDS ----------------- */}
                {isDispute && dispute && (
                    <div className="space-y-4">
                        {/* Target Product / Store Header */}
                        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                        Disputed Item
                                    </span>
                                    <h3 className="text-sm font-bold text-stone-900 mt-1">
                                        {dispute.product_name || 'Product Review'}
                                    </h3>
                                    <p className="text-xs text-stone-500 font-medium mt-0.5 flex items-center gap-1.5">
                                        <Store size={12} className="text-stone-400" />
                                        Shop: <span className="font-bold text-stone-700">{dispute.shop_name}</span>
                                    </p>
                                </div>

                                {dispute.product_slug && (
                                    <Link 
                                        href={route('product.show', dispute.product_slug)} 
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition shadow-2xs shrink-0"
                                    >
                                        <Eye size={13} /> <span>View Product</span>
                                        <ExternalLink size={11} className="text-stone-400" />
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Customer Review on Store */}
                        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <MessageSquare size={13} className="text-stone-500" />
                                    Customer Review on Store
                                </h4>
                                
                                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/70 px-2.5 py-0.5 rounded-lg">
                                    <div className="flex text-amber-500">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star 
                                                key={i} 
                                                size={11} 
                                                className={i < (dispute.review_rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'} 
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-black text-amber-900 ml-1">{dispute.review_rating}.0</span>
                                </div>
                            </div>

                            <div className="bg-[#FCFBF9] rounded-xl p-3.5 border border-stone-200/70">
                                <p className="text-xs sm:text-sm text-stone-800 italic leading-relaxed font-medium">
                                    &ldquo;{dispute.review_comment || 'No written comment left by customer.'}&rdquo;
                                </p>
                            </div>

                            <div className="text-[11px] text-stone-400">
                                Current Catalog Status: <strong className={dispute.review_hidden_from_marketplace ? 'text-rose-600' : 'text-emerald-600'}>
                                    {dispute.review_hidden_from_marketplace ? 'Hidden from Store' : 'Publicly Visible'}
                                </strong>
                            </div>
                        </div>

                        {/* Resolution Notes History (if any) */}
                        {dispute.resolution_notes && (
                            <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
                                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                    Decision Notes
                                </h4>
                                <p className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-100 leading-relaxed font-medium">
                                    {dispute.resolution_notes}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ----------------- FLAGGED CONTENT CARDS ----------------- */}
                {!isDispute && flag && (
                    <div className="space-y-4">
                        {flag.reportable ? (
                            <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-clay-700 bg-clay-50 px-2 py-0.5 rounded-md border border-clay-200">
                                        Reported {isProduct ? 'Product Listing' : isUser ? 'User Account' : 'Entity'}
                                    </span>

                                    {isProduct && (
                                        <Link 
                                            href={route('product.show', flag.reportable.slug || flag.reportable.id)} 
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition shadow-2xs"
                                        >
                                            <Eye size={13} /> <span>View Live</span>
                                            <ExternalLink size={11} className="text-stone-400" />
                                        </Link>
                                    )}
                                </div>

                                {/* Product View */}
                                {isProduct && (
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-4">
                                            {flag.reportable.cover_photo_path ? (
                                                <img 
                                                    src={`/storage/${flag.reportable.cover_photo_path}`} 
                                                    alt={flag.reportable.name} 
                                                    className="w-20 h-20 object-cover rounded-xl border border-stone-200/80 shrink-0" 
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            ) : (
                                                <div className="w-20 h-20 rounded-xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-400 shrink-0">
                                                    <Package size={24} />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                                                    {flag.reportable.name}
                                                </h3>

                                                {flag.reportable.price && (
                                                    <p className="text-xs font-black text-stone-900 mt-1">
                                                        ₱{Number(flag.reportable.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                    </p>
                                                )}

                                                {flag.reportable.user && (
                                                    <p className="text-xs text-stone-500 font-medium mt-0.5 flex items-center gap-1">
                                                        <Store size={11} className="text-stone-400" />
                                                        Shop: <span className="font-semibold text-stone-700">{flag.reportable.user.shop_name || flag.reportable.user.name}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {flag.reportable.description && (
                                            <div className="bg-[#FCFBF9] p-3 rounded-xl border border-stone-200/70">
                                                <p className="text-xs text-stone-700 leading-relaxed line-clamp-4">
                                                    {flag.reportable.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* User View */}
                                {isUser && (
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-base shrink-0">
                                            {flag.reportable.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-stone-900 truncate">{flag.reportable.name}</h3>
                                            <p className="text-xs text-stone-500 font-medium truncate">{flag.reportable.email}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center shadow-2xs">
                                <HelpCircle size={24} className="mx-auto mb-2 text-stone-300" />
                                <p className="text-xs font-bold text-stone-700">Referenced Content is No Longer Available</p>
                                <p className="text-[11px] text-stone-400 mt-1">The flagged entity may have already been removed.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Pinned Action Footer */}
            <div className="px-5 py-3.5 border-t border-stone-100 bg-white shrink-0">
                {/* Actions for Review Dispute */}
                {isDispute && dispute && (
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setDisputeDeleteState({ open: true, dispute })}
                            title="Remove Record"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-rose-700 hover:bg-rose-50 border border-stone-200 transition min-h-[38px] cursor-pointer shrink-0"
                        >
                            <Trash2 size={13} />
                            <span className="hidden sm:inline">Remove</span>
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                            {dispute.status === 'pending' && (
                                <button
                                    type="button"
                                    onClick={() => openDisputeActionModal(dispute, 'under_review')}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-bold hover:bg-sky-100 transition min-h-[38px] cursor-pointer"
                                >
                                    <Clock size={13} />
                                    <span>Start Review</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => openDisputeActionModal(dispute, 'rejected')}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-50 transition min-h-[38px] cursor-pointer"
                            >
                                <X size={13} />
                                <span>Keep Visible</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => openDisputeActionModal(dispute, 'resolved')}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-clay-700 text-white rounded-xl text-xs font-bold hover:bg-clay-800 transition shadow-2xs min-h-[38px] cursor-pointer"
                            >
                                <Check size={13} />
                                <span>Approve (Hide Review)</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Actions for Content Flag */}
                {!isDispute && flag && (
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => handleFlagAction(flag.id, 'dismiss')}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 transition min-h-[38px] cursor-pointer shrink-0"
                        >
                            <X size={13} />
                            <span>Dismiss (False Alarm)</span>
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                            {isProduct && (
                                <button
                                    type="button"
                                    onClick={() => handleFlagAction(flag.id, 'takedown')}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition shadow-2xs min-h-[38px] cursor-pointer"
                                >
                                    <ShieldOff size={13} />
                                    <span>Takedown Listing</span>
                                </button>
                            )}

                            {isUser && (
                                <button
                                    type="button"
                                    onClick={() => handleFlagAction(flag.id, 'suspend')}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition shadow-2xs min-h-[38px] cursor-pointer"
                                >
                                    <UserX size={13} />
                                    <span>Suspend User Account</span>
                                </button>
                            )}

                            {!isProduct && !isUser && (
                                <button
                                    type="button"
                                    onClick={() => handleFlagAction(flag.id, 'takedown')}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition shadow-2xs min-h-[38px] cursor-pointer"
                                >
                                    <ShieldOff size={13} />
                                    <span>Take Action</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

