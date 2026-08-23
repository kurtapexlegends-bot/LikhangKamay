import React, { useState, useEffect, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Clock, Award, Package, Check, X, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import CompactPagination from '@/Components/CompactPagination';
import EmptyState from '@/Components/WorkspaceEmptyState';
import BulkActionPill, { ActionTooltip } from '@/Components/Admin/Layout/BulkActionPill';
import SponsorshipDecisionModal from '@/Components/Admin/Catalog/SponsorshipDecisionModal';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';

export default function SponsorshipRequestsTable({ requests }) {
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [processingSponsorship, setProcessingSponsorship] = useState(false);
    const [pendingActionId, setPendingActionId] = useState(null);
    const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);
    const [modalData, setModalData] = useState({ isOpen: false, type: null, request: null });
    const [requestRows, setRequestRows] = useState(requests?.data || []);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedRequestIds, setSelectedRequestIds] = useState([]);

    useEffect(() => {
        if (requests?.data) {
            setRequestRows(requests.data);
        }
    }, [requests?.data]);

    useEffect(() => {
        if (!recentlyUpdatedId) return undefined;
        const timeout = setTimeout(() => setRecentlyUpdatedId(null), 2200);
        return () => clearTimeout(timeout);
    }, [recentlyUpdatedId]);

    const filteredRequests = useMemo(() => {
        return requestRows.filter(r => {
            const query = searchTerm.toLowerCase().trim();
            const matchesSearch =
                !query ||
                r.product?.name?.toLowerCase().includes(query) ||
                r.user?.shop_name?.toLowerCase().includes(query) ||
                r.user?.name?.toLowerCase().includes(query);

            const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [requestRows, searchTerm, statusFilter]);

    const pendingRequests = useMemo(() => filteredRequests.filter(r => r.status === 'pending'), [filteredRequests]);
    const pendingRequestsCount = pendingRequests.length;

    const handleSelectAllRequests = (e) => {
        if (e.target.checked) {
            setSelectedRequestIds(pendingRequests.map(r => r.id));
        } else {
            setSelectedRequestIds([]);
        }
    };

    const handleSelectRequest = (id) => {
        setSelectedRequestIds(prev =>
            prev.includes(id)
                ? prev.filter(rId => rId !== id)
                : [...prev, id]
        );
    };

    const handleSponsorshipAction = (request, type) => {
        setRejectionReason('');
        setModalData({ isOpen: true, type, request });
    };

    const confirmSponsorshipAction = () => {
        const { type, request } = modalData;
        const routeName = type === 'approve' ? 'admin.sponsorships.approve' : 'admin.sponsorships.reject';

        if (type === 'reject' && !rejectionReason.trim()) {
            addToast('A rejection reason is required.', 'error');
            return;
        }

        if (request) {
            // Single Action
            setProcessingSponsorship(true);
            setPendingActionId(request.id);
            router.post(route(routeName, request.id), type === 'reject' ? { rejection_reason: rejectionReason.trim() } : {}, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    const processedAt = new Date().toISOString();
                    setRequestRows((currentRows) => currentRows.map((row) => (
                        row.id === request.id
                            ? {
                                ...row,
                                status: type === 'approve' ? 'approved' : 'rejected',
                                approved_at: type === 'approve' ? processedAt : null,
                                rejection_reason: type === 'reject' ? rejectionReason.trim() : null,
                                updated_at: processedAt,
                            }
                            : row
                    )));
                    setRecentlyUpdatedId(request.id);
                    setRejectionReason('');
                    setModalData({ isOpen: false, type: null, request: null });
                    addToast(`Sponsorship ${type}d successfully.`, 'success');
                    setSelectedRequestIds(prev => prev.filter(id => id !== request.id));
                },
                onError: (err) => {
                    if (type === 'approve') {
                        setModalData({ isOpen: false, type: null, request: null });
                    }
                    addToast(err.error || `Failed to ${type} sponsorship.`, 'error');
                },
                onFinish: () => {
                    setProcessingSponsorship(false);
                    setPendingActionId(null);
                }
            });
        } else {
            // Bulk Action
            const idsToProcess = [...selectedRequestIds];
            setProcessingSponsorship(true);
            processSequentialSponsorships(idsToProcess, type, rejectionReason.trim());
        }
    };

    const processSequentialSponsorships = (ids, type, reason = '') => {
        if (ids.length === 0) {
            setProcessingSponsorship(false);
            setRejectionReason('');
            setModalData({ isOpen: false, type: null, request: null });
            setSelectedRequestIds([]);
            addToast(`All selected sponsorship requests processed successfully.`, 'success');
            return;
        }

        const id = ids[0];
        const routeName = type === 'approve' ? 'admin.sponsorships.approve' : 'admin.sponsorships.reject';

        router.post(route(routeName, id), type === 'reject' ? { rejection_reason: reason } : {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                const processedAt = new Date().toISOString();
                setRequestRows((currentRows) => currentRows.map((row) => (
                    row.id === id
                        ? {
                            ...row,
                            status: type === 'approve' ? 'approved' : 'rejected',
                            approved_at: type === 'approve' ? processedAt : null,
                            rejection_reason: type === 'reject' ? reason : null,
                            updated_at: processedAt,
                        }
                        : row
                )));
                setRecentlyUpdatedId(id);
                processSequentialSponsorships(ids.slice(1), type, reason);
            },
            onError: (err) => {
                setProcessingSponsorship(false);
                addToast(err.error || `Failed to process request ID ${id}. Bulk operation halted.`, 'error');
            }
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-emerald-200/60">
                        <CheckCircle2 size={12} /> Approved
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-rose-200/60">
                        <XCircle size={12} /> Rejected
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-amber-200/60">
                        <Clock size={12} /> Pending
                    </span>
                );
        }
    };

    const tabs = [
        { key: 'all', label: 'All Requests', count: requestRows.length },
        { key: 'pending', label: 'Pending', count: requestRows.filter(r => r.status === 'pending').length },
        { key: 'approved', label: 'Approved', count: requestRows.filter(r => r.status === 'approved').length },
        { key: 'rejected', label: 'Rejected', count: requestRows.filter(r => r.status === 'rejected').length },
    ];

    return (
        <div className="space-y-4">
            {/* Standardized FilterToolbarHeader */}
            <FilterToolbarHeader
                tabs={tabs}
                activeTab={statusFilter}
                onTabChange={setStatusFilter}
                searchQuery={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search product, artisan, or shop..."
                onResetFilters={() => {
                    setStatusFilter('all');
                    setSearchTerm('');
                }}
            />

            {/* Table wrapper */}
            <div className="bg-white rounded-2xl shadow-2xs border border-stone-200/80 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full min-w-[900px] text-left border-collapse">
                        <thead>
                            <tr className="bg-[#FDFBF9] border-b border-stone-200/80 text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                                <th className="py-3.5 px-6 w-12 text-center align-middle">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAllRequests}
                                        checked={pendingRequestsCount > 0 && selectedRequestIds.length === pendingRequestsCount}
                                        className="rounded border-stone-300 text-clay-600 focus:ring-clay-500"
                                    />
                                </th>
                                <th className="py-3.5 px-6 text-[10px] font-bold uppercase tracking-wider text-stone-500 w-1/3">Product</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold uppercase tracking-wider text-stone-500">Seller</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold uppercase tracking-wider text-stone-500">Requested</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold uppercase tracking-wider text-stone-500">Status</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold uppercase tracking-wider text-stone-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {filteredRequests.length > 0 ? (
                                filteredRequests.map((req) => (
                                    <tr
                                        key={req.id}
                                        className={`transition duration-200 ${
                                            recentlyUpdatedId === req.id
                                                ? 'bg-emerald-50/60'
                                                : 'hover:bg-stone-50/50'
                                        }`}
                                    >
                                        <td className="py-4 px-6 text-center align-middle">
                                            {req.status === 'pending' ? (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRequestIds.includes(req.id)}
                                                    onChange={() => handleSelectRequest(req.id)}
                                                    className="rounded border-stone-300 text-clay-600 focus:ring-clay-500"
                                                />
                                            ) : null}
                                        </td>
                                        <td className="py-4 px-6 align-middle">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-11 h-11 rounded-xl border border-stone-200/80 bg-stone-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                    {req.product?.img || req.product?.cover_photo_path ? (
                                                        <img
                                                            src={req.product.img || (req.product.cover_photo_path?.startsWith('http') ? req.product.cover_photo_path : `/storage/${req.product.cover_photo_path}`)}
                                                            alt={req.product?.name || ''}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = '/images/placeholder.svg';
                                                            }}
                                                        />
                                                    ) : (
                                                        <Package size={16} className="text-stone-300" />
                                                    )}
                                                </div>
                                                <div className="max-w-[220px]">
                                                    <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">{req.product?.name || 'Unknown Product'}</p>
                                                    <p className="text-[10px] text-stone-500 mt-0.5 truncate">
                                                        Shop: {req.user?.shop_name || req.user?.name || 'Unknown Shop'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 align-middle">
                                            <p className="text-xs sm:text-sm font-bold text-stone-900">{req.user?.shop_name || req.user?.name}</p>
                                            <p className="text-[10px] text-stone-400 font-medium">ID: {req.user?.id}</p>
                                        </td>
                                        <td className="py-4 px-6 align-middle text-xs text-stone-500 font-medium">
                                            {new Date(req.created_at).toLocaleDateString()}
                                            <div className="text-[10px] text-stone-400">{new Date(req.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td className="py-4 px-6 align-middle">
                                            {getStatusBadge(req.status)}
                                            {req.status === 'rejected' && req.rejection_reason && (
                                                <p className="mt-1.5 max-w-[240px] text-[11px] leading-relaxed text-red-700 bg-red-50/50 p-2 rounded-lg border border-red-100/60">
                                                    <span className="font-bold">Reason:</span> {req.rejection_reason}
                                                </p>
                                            )}
                                            {recentlyUpdatedId === req.id && (
                                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                                    Updated just now
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 align-middle text-right">
                                            {req.status === 'pending' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSponsorshipAction(req, 'reject')}
                                                        disabled={processingSponsorship && pendingActionId === req.id}
                                                        className="px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200/60 hover:border-rose-300 disabled:opacity-50 min-h-[36px]"
                                                    >
                                                        {processingSponsorship && pendingActionId === req.id && modalData.type === 'reject' ? 'Rejecting...' : 'Reject'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSponsorshipAction(req, 'approve')}
                                                        disabled={processingSponsorship && pendingActionId === req.id}
                                                        className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs rounded-xl disabled:opacity-50 min-h-[36px]"
                                                    >
                                                        {processingSponsorship && pendingActionId === req.id && modalData.type === 'approve' ? 'Approving...' : 'Approve'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-right text-[10px] text-stone-400 font-medium leading-relaxed">
                                                    Processed on<br/>
                                                    {new Date(req.approved_at || req.updated_at).toLocaleDateString()}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-12">
                                        <EmptyState
                                            compact
                                            icon={Award}
                                            title="No requests found"
                                            description="No sponsorship requests match your search or tab filter."
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {requests?.last_page > 1 && (
                <CompactPagination
                    currentPage={requests.current_page}
                    totalPages={requests.last_page}
                    totalItems={requests.total}
                    itemsPerPage={requests.per_page}
                    onPageChange={(requests_page) => router.get(route('admin.catalog.index'), { tab: 'sponsorships', requests_page }, { preserveScroll: true, preserveState: true })}
                    itemLabel="requests"
                />
            )}

            {/* Decision Modals */}
            <SponsorshipDecisionModal
                isOpen={modalData.isOpen}
                type={modalData.type}
                request={modalData.request}
                processing={processingSponsorship}
                rejectionReason={rejectionReason}
                setRejectionReason={setRejectionReason}
                onClose={() => setModalData({ isOpen: false, type: null, request: null })}
                onConfirm={confirmSponsorshipAction}
            />

            {/* Bulk Sticky Action Bar */}
            <BulkActionPill selectedCount={selectedRequestIds.length} onClear={() => setSelectedRequestIds([])}>
                <ActionTooltip text="Approve Selected">
                    <button
                        onClick={() => setModalData({ isOpen: true, type: 'approve', request: null })}
                        disabled={processingSponsorship}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50/40 text-emerald-600 hover:bg-emerald-100/60 hover:text-emerald-700 transition-all duration-205 active:scale-90 shadow-sm"
                    >
                        <Check size={18} strokeWidth={2.5} />
                    </button>
                </ActionTooltip>

                <ActionTooltip text="Reject Selected">
                    <button
                        onClick={() => {
                            setRejectionReason('');
                            setModalData({ isOpen: true, type: 'reject', request: null });
                        }}
                        disabled={processingSponsorship}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50/40 text-rose-600 hover:bg-rose-100/60 hover:text-rose-700 transition-all duration-205 active:scale-90 shadow-sm"
                    >
                        <X size={18} />
                    </button>
                </ActionTooltip>
            </BulkActionPill>
        </div>
    );
}

