import React, { useState, useEffect, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Clock, Award, Package, CheckCircle2, XCircle, Eye, Calendar, RotateCcw } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import CompactPagination from '@/Components/CompactPagination';
import EmptyState from '@/Components/WorkspaceEmptyState';
import SponsorshipInspectionDrawer from '@/Components/Admin/Catalog/SponsorshipInspectionDrawer';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import { formatMoney } from '@/utils/accountingFormatters';

export default function SponsorshipRequestsTable({ requests }) {
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [processingSponsorship, setProcessingSponsorship] = useState(false);
    const [pendingActionId, setPendingActionId] = useState(null);
    const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);
    const [inspectRequest, setInspectRequest] = useState(null);
    const [requestRows, setRequestRows] = useState(requests?.data || []);

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

    const handleDrawerApprove = (req) => {
        setProcessingSponsorship(true);
        setPendingActionId(req.id);
        router.post(route('admin.sponsorships.approve', req.id), {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                const processedAt = new Date().toISOString();
                setRequestRows((currentRows) => currentRows.map((row) => (
                    row.id === req.id
                        ? {
                            ...row,
                            status: 'approved',
                            approved_at: processedAt,
                            updated_at: processedAt,
                        }
                        : row
                )));
                setRecentlyUpdatedId(req.id);
                setInspectRequest(null);
                addToast('Sponsorship approved successfully for 7 days.', 'success');
            },
            onError: (err) => {
                addToast(err?.error || err?.message || 'Failed to approve sponsorship.', 'error');
            },
            onFinish: () => {
                setProcessingSponsorship(false);
                setPendingActionId(null);
            }
        });
    };

    const handleDrawerReject = (req, reason) => {
        setProcessingSponsorship(true);
        setPendingActionId(req.id);
        router.post(route('admin.sponsorships.reject', req.id), { rejection_reason: reason }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                const processedAt = new Date().toISOString();
                setRequestRows((currentRows) => currentRows.map((row) => (
                    row.id === req.id
                        ? {
                            ...row,
                            status: 'rejected',
                            rejection_reason: reason,
                            updated_at: processedAt,
                        }
                        : row
                )));
                setRecentlyUpdatedId(req.id);
                setInspectRequest(null);
                addToast('Feedback sent and request returned to artisan.', 'success');
            },
            onError: (err) => {
                addToast(err?.error || err?.message || 'Failed to submit feedback.', 'error');
            },
            onFinish: () => {
                setProcessingSponsorship(false);
                setPendingActionId(null);
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
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-amber-250/70">
                        <RotateCcw size={12} /> Needs Revision
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
        { key: 'rejected', label: 'Needs Revision', count: requestRows.filter(r => r.status === 'rejected').length },
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
                {/* Mobile & Tablet Card View (lg:hidden) */}
                <div className="block lg:hidden">
                    {filteredRequests.length > 0 ? (
                        <div className="bg-stone-50/30 p-3 sm:p-4 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                            {filteredRequests.map((req) => (
                                <div key={req.id} className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded-xl border border-stone-200/80 bg-stone-50 shrink-0 flex items-center justify-center overflow-hidden">
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
                                                    <Package size={18} className="text-stone-300" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-stone-900 truncate">{req.product?.name || 'Unknown Product'}</h4>
                                                <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">
                                                    Shop: {req.user?.shop_name || req.user?.name || 'Unknown'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[11px] font-bold text-stone-900">{formatMoney(req.product?.price || 0)}</span>
                                                    <span className="text-stone-300">•</span>
                                                    {Number(req.product?.stock || 0) > 0 ? (
                                                        <span className="text-[10px] text-stone-500 font-medium">{req.product.stock} in stock</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/50">Out of stock</span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] text-stone-400 font-medium mt-1">
                                                    Requested {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right space-y-1">
                                            {getStatusBadge(req.status)}
                                            {req.status === 'approved' && req.product?.sponsored_until ? (
                                                <p className="text-[9px] text-emerald-700 font-bold">
                                                    Until {new Date(req.product.sponsored_until).toLocaleDateString()}
                                                </p>
                                            ) : req.status === 'pending' ? (
                                                <p className="text-[9px] text-stone-400 font-medium">7-Day Run</p>
                                            ) : null}
                                        </div>
                                    </div>

                                    {req.status === 'rejected' && req.rejection_reason && (
                                        <p className="text-[11px] leading-relaxed text-amber-900 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/70">
                                            <span className="font-bold">Feedback:</span> {req.rejection_reason}
                                        </p>
                                    )}

                                    {/* Action row */}
                                    <div className="pt-2 border-t border-stone-100">
                                        <button
                                            type="button"
                                            onClick={() => setInspectRequest(req)}
                                            className={`w-full py-2.5 px-3 text-xs font-bold rounded-xl transition border min-h-[44px] flex items-center justify-center gap-2 active:scale-95 ${
                                                req.status === 'pending'
                                                    ? 'bg-clay-600 text-white hover:bg-clay-700 border-clay-600 shadow-2xs'
                                                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200/70 border-stone-200'
                                            }`}
                                        >
                                            <Eye size={15} />
                                            <span>{req.status === 'pending' ? 'Inspect & Decide' : 'View Inspection'}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12">
                            <EmptyState
                                compact
                                icon={Award}
                                title="No requests found"
                                description="No sponsorship requests match your search or tab filter."
                            />
                        </div>
                    )}
                </div>

                {/* Desktop Table (hidden below lg) */}
                <div className="hidden lg:block overflow-x-auto no-scrollbar">
                    <table className="w-full min-w-[900px] text-left border-collapse">
                        <thead>
                            <tr className="bg-[#FDFBF9] border-b border-stone-200/80 text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                                <th className="py-3.5 px-6 text-[10px] font-bold uppercase tracking-wider text-stone-500">Product</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold uppercase tracking-wider text-stone-500">Seller</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold uppercase tracking-wider text-stone-500">Price & Stock</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold uppercase tracking-wider text-stone-500">Campaign</th>
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
                                                <div className="max-w-[200px]">
                                                    <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">{req.product?.name || 'Unknown Product'}</p>
                                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-stone-100 text-stone-600 truncate max-w-full">
                                                        {req.product?.category || 'Handcrafted'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 align-middle">
                                            <p className="text-xs sm:text-sm font-bold text-stone-900">{req.user?.shop_name || req.user?.name}</p>
                                            <p className="text-[10px] text-stone-400 font-medium">ID: {req.user?.id}</p>
                                        </td>
                                        <td className="py-4 px-6 align-middle">
                                            <p className="text-xs sm:text-sm font-bold text-stone-900">
                                                {formatMoney(req.product?.price || 0)}
                                            </p>
                                            <div className="mt-0.5">
                                                {Number(req.product?.stock || 0) > 0 ? (
                                                    <span className="text-[10px] text-stone-500 font-medium">
                                                        {req.product.stock} in stock
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 rounded">
                                                        Out of stock
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 align-middle">
                                            {req.status === 'approved' ? (
                                                req.product?.sponsored_until ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                                                            <Calendar size={12} className="text-emerald-600" />
                                                            7-Day Run
                                                        </span>
                                                        <p className="text-[10px] text-stone-400 font-medium mt-0.5">
                                                            Until {new Date(req.product.sponsored_until).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-stone-800">7-Day Run</span>
                                                )
                                            ) : req.status === 'pending' ? (
                                                <div>
                                                    <span className="text-xs font-bold text-stone-700">7 Days</span>
                                                    <p className="text-[10px] text-stone-400 font-medium mt-0.5">On approval</p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-stone-400 font-medium">—</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 align-middle text-xs text-stone-500 font-medium">
                                            {new Date(req.created_at).toLocaleDateString()}
                                            <div className="text-[10px] text-stone-400">{new Date(req.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td className="py-4 px-6 align-middle">
                                            {getStatusBadge(req.status)}
                                            {req.status === 'rejected' && req.rejection_reason && (
                                                <p className="mt-1.5 max-w-[240px] text-[11px] leading-relaxed text-amber-900 bg-amber-50/70 p-2 rounded-lg border border-amber-200/70">
                                                    <span className="font-bold">Feedback:</span> {req.rejection_reason}
                                                </p>
                                            )}
                                            {recentlyUpdatedId === req.id && (
                                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                                    Updated just now
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 align-middle text-right">
                                            <button
                                                type="button"
                                                onClick={() => setInspectRequest(req)}
                                                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition border min-h-[36px] inline-flex items-center gap-1.5 active:scale-95 ${
                                                    req.status === 'pending'
                                                        ? 'bg-clay-50 text-clay-800 border-clay-200 hover:bg-clay-100 shadow-2xs'
                                                        : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200/70'
                                                }`}
                                            >
                                                <Eye size={13} />
                                                <span>{req.status === 'pending' ? 'Inspect Request' : 'Inspect'}</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="py-12">
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

            {/* Inspection Drawer */}
            <SponsorshipInspectionDrawer
                isOpen={Boolean(inspectRequest)}
                request={inspectRequest}
                onClose={() => setInspectRequest(null)}
                onApprove={handleDrawerApprove}
                onReject={handleDrawerReject}
                isProcessing={processingSponsorship}
            />
        </div>
    );
}

