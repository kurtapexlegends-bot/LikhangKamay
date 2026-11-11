import React, { useMemo } from 'react';
import { X, CheckCircle, FileText, Eye, AlertTriangle, LoaderCircle, RotateCcw } from 'lucide-react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { ActionTooltip } from '@/Components/Admin/Layout/BulkActionPill';
import KycVerificationSummaryCard from '@/Components/Admin/Users/Partials/KycVerificationSummaryCard';
import InlineRevisionCard from '@/Components/Common/InlineRevisionCard';
import InlineRevisionFooter from '@/Components/Common/InlineRevisionFooter';
import DocumentMagnifierModal from '@/Components/Common/DocumentMagnifierModal';
import { useRevisionSelection } from '@/hooks/useRevisionSelection';

export default function ArtisanVerificationDrawer({
    viewingArtisan,
    onClose,
    currentDocuments,
    viewedDocumentsCount,
    submittedDocumentsCount,
    allSubmittedDocumentsViewed,
    confirmApprove,
    processing,
    approvalError,
    documentPreviewingKey,
    openDocumentPreview,
    viewingDoc,
    setViewingDoc,
    rejectingArtisan,
    setRejectingArtisan,
    rejectReason,
    setRejectReason,
    revisionItems = [],
    setRevisionItems,
    handleRejectArtisan,
}) {
    const revisionMode = Boolean(rejectingArtisan && viewingArtisan && rejectingArtisan.id === viewingArtisan.id);
    const { isSelected, getNote, toggleItem, updateItemNote, addCustomItem, removeItem } = useRevisionSelection(
        revisionItems,
        setRevisionItems
    );

    const revisionReview = viewingArtisan?.revision_review || null;
    const reviewItemsMap = useMemo(() => {
        const map = {};
        if (Array.isArray(revisionReview?.items)) {
            revisionReview.items.forEach((item) => {
                if (item?.key) map[item.key] = item;
            });
        }
        return map;
    }, [revisionReview]);

    const handleInspectSummaryPhoto = (photo) => {
        if (!photo?.url) return;
        if (photo.key === 'valid_id') {
            const validIdDoc = currentDocuments.find((doc) => doc.key === 'valid_id');
            if (validIdDoc?.url) {
                openDocumentPreview(validIdDoc);
                return;
            }
        }
        setViewingDoc(photo);
    };

    const renderFooter = () => {
        if (!viewingArtisan) return null;

        if (revisionMode) {
            return (
                <InlineRevisionFooter
                    items={revisionItems}
                    onRemoveItem={removeItem}
                    onAddCustomItem={addCustomItem}
                    reason={rejectReason}
                    onChangeReason={setRejectReason}
                    reasonPlaceholder="Revision note (required if no cards are flagged above)..."
                    processing={processing}
                    canSubmit={revisionItems.length > 0 || rejectReason.trim().length >= 10}
                    submitLabel="Send Revision Request"
                    submitTone="stone"
                    onCancel={() => setRejectingArtisan(null)}
                    onSubmit={handleRejectArtisan}
                />
            );
        }

        return (
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setRejectingArtisan(viewingArtisan)}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-bold text-stone-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 transition min-h-[44px] cursor-pointer"
                >
                    <RotateCcw size={16} /> Request Revision
                </button>
                <button
                    type="button"
                    onClick={confirmApprove}
                    disabled={processing || !allSubmittedDocumentsViewed}
                    className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 disabled:bg-stone-200 disabled:shadow-none transition min-h-[44px] cursor-pointer"
                >
                    {processing ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    {processing ? 'Processing...' : 'Approve Application'}
                </button>
            </div>
        );
    };

    return (
        <>
            <SlideOverDrawer
                show={!!viewingArtisan}
                onClose={() => !viewingDoc && !processing && onClose()}
                title={viewingArtisan ? `${viewingArtisan.shop_name} Verification` : 'Review Application'}
                widthClass="max-w-2xl"
                bodyClassName="relative flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5"
                footer={renderFooter()}
            >
                {viewingArtisan && (
                    <div className="space-y-3">
                        {/* Resubmission Review Banner for Super Admin */}
                        {revisionReview?.has_resubmitted_revision && (
                            <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 text-emerald-950 flex items-center justify-between gap-3 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-700">
                                        <CheckCircle size={15} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs sm:text-sm font-bold leading-snug">
                                            Resubmitted for Review
                                        </h4>
                                        {revisionReview.summary_note && (
                                            <p className="text-[11px] text-stone-600 truncate mt-0.5">
                                                "{revisionReview.summary_note}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                    Revision Addressed
                                </span>
                            </div>
                        )}

                        <InlineRevisionCard
                            active={revisionMode}
                            selected={isSelected('shop_details')}
                            label="Shop Name & Contact Info"
                            note={getNote('shop_details')}
                            reviewItem={reviewItemsMap['shop_details']}
                            onToggle={() => toggleItem('shop_details', 'Shop Name & Contact Info')}
                            onChangeNote={(val) => updateItemNote('shop_details', val)}
                        >
                            <div className={`${revisionMode ? 'bg-stone-50/70 p-3' : 'rounded-xl bg-stone-50 p-3 border border-stone-100'}`}>
                                <div className="flex items-center gap-2.5">
                                    {viewingArtisan.avatar_url ? (
                                        <img
                                            src={viewingArtisan.avatar_url}
                                            alt={viewingArtisan.shop_name}
                                            className="h-10 w-10 rounded-xl object-cover border border-clay-100 shadow-2xs shrink-0"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = '/images/placeholder.svg';
                                            }}
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-clay-100 bg-clay-50 text-sm font-bold text-clay-700 shadow-2xs shrink-0">
                                            {viewingArtisan.shop_name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">{viewingArtisan.shop_name}</h4>
                                        <p className="text-[11px] text-stone-500 font-medium truncate">{viewingArtisan.name} • {viewingArtisan.email}</p>
                                    </div>
                                </div>
                            </div>
                        </InlineRevisionCard>

                        {/* Contact & Location Profile Details */}
                        <InlineRevisionCard
                            active={revisionMode}
                            selected={isSelected('shop_address')}
                            label="Workshop Address & Cavite Map Pin"
                            note={getNote('shop_address')}
                            reviewItem={reviewItemsMap['shop_address']}
                            onToggle={() => toggleItem('shop_address', 'Workshop Address & Cavite Map Pin')}
                            onChangeNote={(val) => updateItemNote('shop_address', val)}
                        >
                            <div className={`${revisionMode ? 'bg-white p-3.5 space-y-2' : 'rounded-xl border border-stone-200 bg-white p-3.5 space-y-2'}`}>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">Contact &amp; Location</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                    <div>
                                        <span className="block text-[11px] text-stone-500 font-medium">Phone Number</span>
                                        <span className="font-bold text-stone-900">{viewingArtisan.phone_number || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-stone-500 font-medium">Submitted On</span>
                                        <span className="font-bold text-stone-900">{viewingArtisan.submitted_at || 'N/A'}</span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="block text-[11px] text-stone-500 font-medium">Registered Address</span>
                                        <span className="font-bold text-stone-950 leading-snug">{viewingArtisan.address || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </InlineRevisionCard>

                        {/* Payout Preferences Section */}
                        <InlineRevisionCard
                            active={revisionMode}
                            selected={isSelected('payout_info')}
                            label="GCash / Maya Payout Account Details"
                            note={getNote('payout_info')}
                            reviewItem={reviewItemsMap['payout_info']}
                            onToggle={() => toggleItem('payout_info', 'GCash / Maya Payout Account Details')}
                            onChangeNote={(val) => updateItemNote('payout_info', val)}
                        >
                            <div className={`${revisionMode ? 'bg-white p-3.5 space-y-2' : 'rounded-xl border border-stone-200 bg-white p-3.5 space-y-2'}`}>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">Payout Preferences</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                                    <div>
                                        <span className="block text-[11px] text-stone-500 font-medium">Method</span>
                                        <span className="font-bold text-stone-900 capitalize">{viewingArtisan.payout_method || 'GCash'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-stone-500 font-medium">Account Name</span>
                                        <span className="font-bold text-stone-900 truncate block">{viewingArtisan.payout_account_name || 'N/A'}</span>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <span className="block text-[11px] text-stone-500 font-medium">Account/Phone Number</span>
                                        <span className="font-bold text-stone-900 tracking-wide">{viewingArtisan.payout_account_number || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </InlineRevisionCard>

                        {/* Identity & Photo Verification Summary */}
                        <InlineRevisionCard
                            active={revisionMode}
                            selected={isSelected('face_verification')}
                            label="Quick Face Check / Identity Photo Match"
                            note={getNote('face_verification')}
                            reviewItem={reviewItemsMap['face_verification']}
                            onToggle={() => toggleItem('face_verification', 'Quick Face Check / Identity Photo Match')}
                            onChangeNote={(val) => updateItemNote('face_verification', val)}
                        >
                            <KycVerificationSummaryCard
                                artisan={viewingArtisan}
                                onInspectPhoto={handleInspectSummaryPhoto}
                            />
                        </InlineRevisionCard>

                        <div>
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">Submitted Documents</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {currentDocuments.map(doc => (
                                    <InlineRevisionCard
                                        key={doc.key}
                                        active={revisionMode}
                                        selected={isSelected(doc.key)}
                                        label={doc.label}
                                        note={getNote(doc.key)}
                                        reviewItem={reviewItemsMap[doc.key]}
                                        onToggle={() => toggleItem(doc.key, doc.label)}
                                        onChangeNote={(val) => updateItemNote(doc.key, val)}
                                        secondaryAction={doc.url ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDocumentPreview(doc);
                                                }}
                                                className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer shrink-0"
                                            >
                                                <Eye size={11} />
                                                <span>View</span>
                                            </button>
                                        ) : null}
                                    >
                                        <div
                                            onClick={() => {
                                                if (revisionMode) {
                                                    toggleItem(doc.key, doc.label);
                                                    return;
                                                }
                                                if (documentPreviewingKey !== doc.key) {
                                                    openDocumentPreview(doc);
                                                }
                                            }}
                                            className={`group relative overflow-hidden p-3 transition flex flex-col justify-between gap-2 ${
                                                revisionMode ? '' : 'rounded-xl border border-stone-200'
                                            } ${
                                                doc.url
                                                    ? 'cursor-pointer bg-white hover:bg-stone-50/40'
                                                    : `bg-stone-50/50 ${revisionMode ? 'cursor-pointer' : 'opacity-60'}`
                                            } ${documentPreviewingKey === doc.key && !revisionMode ? 'pointer-events-none' : ''}`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="p-1.5 bg-stone-50 rounded-md group-hover:bg-clay-50 border border-stone-100 shrink-0 flex items-center gap-1">
                                                        <doc.icon size={13} className="text-stone-400 group-hover:text-clay-600" />
                                                        {doc.flags.length > 0 && (
                                                            <ActionTooltip text={`Automated check: ${doc.flags.join(', ').replace(/_/g, ' ')}`}>
                                                                <AlertTriangle size={12} className="text-amber-500 fill-amber-50" />
                                                            </ActionTooltip>
                                                        )}
                                                    </div>
                                                    <p className="font-bold text-xs text-stone-850 truncate">{doc.label}</p>
                                                </div>
                                                {doc.viewed && <CheckCircle size={14} className="text-emerald-500 shrink-0" />}
                                            </div>
                                            {doc.url ? (
                                                <div className="relative h-24 w-full overflow-hidden rounded-lg border border-stone-100 bg-stone-50">
                                                    {doc.url.endsWith('.pdf') ? (
                                                        <div className="w-full h-full flex items-center justify-center bg-white"><FileText size={20} className="text-clay-200" /></div>
                                                    ) : (
                                                        <img
                                                            src={doc.url}
                                                            alt={doc.label}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = '/images/placeholder.svg';
                                                            }}
                                                        />
                                                    )}
                                                    {!revisionMode && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/10 group-hover:opacity-100 transition duration-200">
                                                            <Eye size={18} className="text-white drop-shadow-md" />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="h-24 w-full rounded-lg border border-dashed border-stone-200 bg-stone-50 flex items-center justify-center"><X size={14} className="text-stone-300" /></div>
                                            )}
                                        </div>
                                    </InlineRevisionCard>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl bg-stone-50 border border-stone-100 p-3.5 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-stone-600">Verification Progress</span>
                                <span className={allSubmittedDocumentsViewed ? 'text-emerald-600' : 'text-amber-600'}>
                                    {viewedDocumentsCount} / {submittedDocumentsCount}
                                </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                                <div
                                    className={`h-full transition-all duration-500 ${allSubmittedDocumentsViewed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-amber-400'}`}
                                    style={{ width: `${submittedDocumentsCount > 0 ? (viewedDocumentsCount / submittedDocumentsCount) * 100 : 0}%` }}
                                />
                            </div>
                            <p className={`text-[11px] font-semibold leading-tight ${allSubmittedDocumentsViewed ? 'text-emerald-600' : 'text-stone-400'}`}>
                                {allSubmittedDocumentsViewed ? 'All documents reviewed. Ready for approval.' : 'Review all submitted files before approving.'}
                            </p>
                        </div>
                        {approvalError && <p className="text-center text-xs font-bold text-red-600 mt-2">{approvalError}</p>}
                    </div>
                )}
            </SlideOverDrawer>

            {/* Document & Identity Photo Preview Modal with Interactive Magnifier */}
            <DocumentMagnifierModal
                viewingDoc={viewingDoc}
                onClose={() => setViewingDoc(null)}
            />
        </>
    );
}
