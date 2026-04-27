import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { Search, ShieldAlert, Trash2, X } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import CompactPagination from '@/Components/CompactPagination';

const statusClasses = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    under_review: 'border-blue-200 bg-blue-50 text-blue-700',
    resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-stone-200 bg-stone-50 text-stone-600',
};

const statusLabels = {
    pending: 'Pending',
    under_review: 'Under Review',
    resolved: 'Approved',
    rejected: 'Rejected',
};

const outcomeClasses = {
    hidden: 'border-rose-200 bg-rose-50 text-rose-700',
    visible: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const getModerationOutcome = (dispute) => {
    if (dispute.status === 'resolved') {
        return dispute.review_hidden_from_marketplace
            ? { tone: 'hidden', label: 'Review hidden from marketplace' }
            : { tone: 'visible', label: 'Request approved, but review is still visible' };
    }

    if (dispute.status === 'rejected') {
        return { tone: 'visible', label: 'Review remains visible in the marketplace' };
    }

    if (dispute.status === 'under_review') {
        return { tone: null, label: 'Review is still visible while the request is being reviewed' };
    }

    return { tone: null, label: 'No review action yet. Start review or remove the request.' };
};

const closeModal = (setModalState, processing) => {
    if (processing) {
        return;
    }

    setModalState({ open: false, dispute: null, status: 'under_review' });
};

export default function ReviewModeration({ disputes = [] }) {
    const { addToast } = useToast();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [quickView, setQuickView] = useState('open');
    const [modalState, setModalState] = useState({ open: false, dispute: null, status: 'under_review' });
    const [deleteState, setDeleteState] = useState({ open: false, dispute: null });
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    const filteredDisputes = useMemo(() => {
        const query = search.trim().toLowerCase();

        return disputes.filter((dispute) => {
            if (statusFilter !== 'all' && dispute.status !== statusFilter) {
                return false;
            }

            if (quickView === 'open' && ['resolved', 'rejected'].includes(dispute.status)) {
                return false;
            }

            if (quickView === 'closed' && !['resolved', 'rejected'].includes(dispute.status)) {
                return false;
            }

            if (quickView === 'low_rating' && Number(dispute.review_rating || 0) > 2) {
                return false;
            }

            if (quickView === 'high_rating' && Number(dispute.review_rating || 0) < 4) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [
                dispute.shop_name,
                dispute.product_name,
                dispute.reported_by,
                dispute.reason,
                dispute.review_comment,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [disputes, search, statusFilter, quickView]);

    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filteredDisputes.length / ITEMS_PER_PAGE));
    const paginatedDisputes = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredDisputes.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredDisputes, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, quickView]);

    const openActionModal = (dispute, status) => {
        setModalState({ open: true, dispute, status });
        setResolutionNotes(dispute?.resolution_notes || '');
    };

    const submitUpdate = () => {
        if (!modalState.dispute) {
            return;
        }

        setProcessing(true);
        router.patch(route('admin.review-moderation.update', modalState.dispute.id), {
            status: modalState.status,
            resolution_notes: resolutionNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                addToast(
                    modalState.status === 'resolved'
                        ? 'Request approved. The review is now hidden from the marketplace.'
                        : modalState.status === 'rejected'
                            ? 'Request rejected. The review remains visible in the marketplace.'
                            : 'Moderation request moved into active review.',
                    'success'
                );
                setModalState({ open: false, dispute: null, status: 'under_review' });
                setResolutionNotes('');
            },
            onError: (errors) => {
                addToast(errors.resolution_notes || errors.status || 'Failed to save moderation decision.', 'error');
            },
            onFinish: () => setProcessing(false),
        });
    };

    const submitDelete = () => {
        if (!deleteState.dispute) {
            return;
        }

        setProcessing(true);
        router.delete(route('admin.review-moderation.destroy', deleteState.dispute.id), {
            preserveScroll: true,
            onSuccess: () => {
                addToast('Moderation request removed.', 'success');
                setDeleteState({ open: false, dispute: null });
            },
            onError: () => {
                addToast('Failed to remove moderation request.', 'error');
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AdminLayout title="Review Moderation">
            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ['Total Requests', disputes.length, 'amber'],
                        ['Pending', disputes.filter((item) => item.status === 'pending').length, 'amber'],
                        ['Under Review', disputes.filter((item) => item.status === 'under_review').length, 'blue'],
                        ['Closed', disputes.filter((item) => ['resolved', 'rejected'].includes(item.status)).length, 'emerald'],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                            <p className="mt-2 text-3xl font-black text-stone-900">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <h2 className="text-lg font-bold text-stone-900">Moderation Queue</h2>
                            <p className="text-sm text-stone-500">Seller-submitted review disputes arrive here for admin review.</p>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <div className="relative w-full sm:w-72">
                                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search shop, product, or reason"
                                    className="w-full rounded-full border border-stone-200 bg-stone-50 py-2 pl-9 pr-9 text-sm font-medium text-stone-900 placeholder-stone-400 transition focus:border-clay-300 focus:bg-white focus:ring-2 focus:ring-clay-500/20"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-600"
                                        aria-label="Clear moderation search"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-600 outline-none"
                            >
                                <option value="all">All statuses</option>
                                <option value="pending">Pending</option>
                                <option value="under_review">Under review</option>
                                <option value="resolved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3 sm:px-6">
                        {[
                            ['open', 'Open queue'],
                            ['closed', 'Closed'],
                            ['low_rating', '1-2 stars'],
                            ['high_rating', '4-5 stars'],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setQuickView(key)}
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                    quickView === key
                                        ? 'border-clay-200 bg-clay-50 text-clay-700'
                                        : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                setQuickView('open');
                                setStatusFilter('all');
                                setSearch('');
                            }}
                            className="ml-auto rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-500 transition-colors hover:bg-stone-50"
                        >
                            Reset filters
                        </button>
                    </div>

                    {paginatedDisputes.length > 0 ? (
                        <div className="divide-y divide-stone-100">
                            {paginatedDisputes.map((dispute) => {
                                const outcome = getModerationOutcome(dispute);

                                return (
                                <div key={dispute.id} className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses[dispute.status] || statusClasses.pending}`}>
                                                {statusLabels[dispute.status] || String(dispute.status).replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-xs text-stone-400">
                                                {dispute.reported_at ? new Date(dispute.reported_at).toLocaleString() : 'Unknown date'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-stone-900">{dispute.product_name}</p>
                                            <p className="text-xs text-stone-500">{dispute.shop_name} · Reported by {dispute.reported_by}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                                            <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-stone-600">
                                                {Number(dispute.review_rating || 0)} star review
                                            </span>
                                            {dispute.resolved_at && (
                                                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-stone-500">
                                                    Closed {new Date(dispute.resolved_at).toLocaleDateString()}
                                                </span>
                                            )}
                                            <span
                                                className={`rounded-full border px-2.5 py-1 ${
                                                    outcome.tone ? outcomeClasses[outcome.tone] : 'border-stone-200 bg-stone-50 text-stone-600'
                                                }`}
                                            >
                                                {outcome.label}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-stone-700">Reason: {dispute.reason}</p>
                                        {dispute.review_comment && (
                                            <p className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                                                Review: {dispute.review_comment}
                                            </p>
                                        )}
                                        {dispute.details && (
                                            <p className="text-sm text-stone-500">{dispute.details}</p>
                                        )}
                                        <p className="text-xs font-medium text-stone-500">
                                            Next step: {dispute.status === 'pending'
                                                ? 'Start review first, or remove the request if it should not stay in the queue.'
                                                : dispute.status === 'under_review'
                                                    ? 'Approve or reject once the product and review context are verified.'
                                                    : 'Queue closed. Keep notes concise for future traceability.'}
                                        </p>
                                        {dispute.resolution_notes && (
                                            <p className="text-xs text-stone-500">Notes: {dispute.resolution_notes}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                        {dispute.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => openActionModal(dispute, 'under_review')}
                                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                                            >
                                                Start Review
                                            </button>
                                        )}
                                        {dispute.status === 'under_review' && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openActionModal(dispute, 'resolved')}
                                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                                                >
                                                    Approve Request
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openActionModal(dispute, 'rejected')}
                                                    className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
                                                >
                                                    Reject Request
                                                </button>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setDeleteState({ open: true, dispute })}
                                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                                        >
                                            Remove Request
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-6 py-12">
                            <WorkspaceEmptyState
                                icon={ShieldAlert}
                                title="No moderation requests"
                                description="Seller review disputes will appear here once a moderation request is submitted."
                            />
                        </div>
                    )}
                    <CompactPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredDisputes.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                        itemLabel="disputes"
                    />
                </div>
            </div>

            <Modal show={modalState.open} onClose={() => closeModal(setModalState, processing)} maxWidth="lg">
                <div className="space-y-4 p-6">
                    <div>
                        <p className="text-sm font-bold text-stone-900">
                            {modalState.status === 'under_review'
                                ? 'Start Moderation Review'
                                : modalState.status === 'resolved'
                                    ? 'Approve Moderation Request'
                                    : 'Reject Moderation Request'}
                        </p>
                        <p className="mt-1 text-sm text-stone-500">
                            {modalState.status === 'under_review'
                                ? 'Move this request into active review so other admins know it is being checked.'
                                : modalState.status === 'resolved'
                                    ? 'Approve the seller request. This will hide the review from the marketplace and keep the dispute as approved.'
                                    : 'Reject the seller request. This will keep the review visible in the marketplace.'}
                        </p>
                    </div>
                    <textarea
                        value={resolutionNotes}
                        onChange={(event) => setResolutionNotes(event.target.value)}
                        rows={4}
                        placeholder="Optional admin notes"
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-clay-300 focus:bg-white"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => closeModal(setModalState, processing)}
                            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-600 transition hover:bg-stone-50"
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={submitUpdate}
                            className="rounded-xl bg-clay-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-clay-700 disabled:opacity-50"
                            disabled={processing}
                        >
                            {processing ? 'Saving...' : modalState.status === 'under_review' ? 'Start Review' : modalState.status === 'resolved' ? 'Approve Request' : 'Reject Request'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal show={deleteState.open} onClose={() => !processing && setDeleteState({ open: false, dispute: null })} maxWidth="sm">
                <div className="space-y-4 p-6">
                    <div>
                        <p className="text-sm font-bold text-stone-900">Remove Moderation Request</p>
                        <p className="mt-1 text-sm text-stone-500">
                            This deletes the moderation request record. If this request had already been approved, the linked review will be restored unless another approved request still exists.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                        {deleteState.dispute?.product_name || 'Selected request'}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setDeleteState({ open: false, dispute: null })}
                            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-600 transition hover:bg-stone-50"
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={submitDelete}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                            disabled={processing}
                        >
                            {processing ? 'Removing...' : 'Remove Request'}
                        </button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
