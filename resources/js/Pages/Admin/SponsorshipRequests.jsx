import React, { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Award, Search, CheckCircle2, XCircle,
    Clock, Package, TrendingUp, Store
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import ConfirmationModal from '@/Components/ConfirmationModal';
import Modal from '@/Components/Modal';
import CompactPagination from '@/Components/CompactPagination';

const MetricCard = ({ title, value, subtitle, icon: Icon, tone = 'amber' }) => {
    const tones = {
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-blue-50 text-blue-600',
        stone: 'bg-stone-100 text-stone-600',
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
                <p className="text-[10px] font-medium text-gray-400 mt-1">{subtitle}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone] || tones.amber}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default function SponsorshipRequests({ requests }) {
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState(false);
    const [pendingActionId, setPendingActionId] = useState(null);
    const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);
    const [modalData, setModalData] = useState({ isOpen: false, type: null, request: null });
    const [requestRows, setRequestRows] = useState(requests.data || []);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        setRequestRows(requests.data || []);
    }, [requests.data]);

    useEffect(() => {
        if (!recentlyUpdatedId) {
            return undefined;
        }

        const timeout = setTimeout(() => setRecentlyUpdatedId(null), 2200);
        return () => clearTimeout(timeout);
    }, [recentlyUpdatedId]);

    const handleAction = (request, type) => {
        setRejectionReason('');
        setModalData({ isOpen: true, type, request });
    };

    const confirmAction = () => {
        const { type, request } = modalData;
        const routeName = type === 'approve' ? 'admin.sponsorships.approve' : 'admin.sponsorships.reject';

        if (type === 'reject' && !rejectionReason.trim()) {
            addToast('A rejection reason is required.', 'error');
            return;
        }

        setProcessing(true);
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
            },
            onError: (err) => {
                if (type === 'approve') {
                    setModalData({ isOpen: false, type: null, request: null });
                }
                addToast(err.error || `Failed to ${type} sponsorship.`, 'error');
            },
            onFinish: () => {
                setProcessing(false);
                setPendingActionId(null);
            }
        });
    };

    const filteredRequests = requestRows.filter(r =>
        r.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user?.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalRequests = requestRows.length;
    const pendingRequests = useMemo(() => requestRows.filter((request) => request.status === 'pending').length, [requestRows]);
    const approvedRequests = useMemo(() => requestRows.filter((request) => request.status === 'approved').length, [requestRows]);
    const uniqueShops = useMemo(() => new Set(requestRows.map((request) => request.user?.id).filter(Boolean)).size, [requestRows]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={12}/> Approved</span>;
            case 'rejected': return <span className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><XCircle size={12}/> Rejected</span>;
            default: return <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><Clock size={12}/> Pending</span>;
        }
    };

    return (
        <AdminLayout title="Sponsorship Requests">
            <Head title="Sponsorship Requests - Admin" />

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                    <MetricCard
                        title="Total Requests"
                        value={totalRequests}
                        subtitle="Across the current listing"
                        icon={Award}
                        tone="amber"
                    />
                    <MetricCard
                        title="Pending Review"
                        value={pendingRequests}
                        subtitle="Need admin action"
                        icon={Clock}
                        tone="stone"
                    />
                    <MetricCard
                        title="Approved"
                        value={approvedRequests}
                        subtitle="Already boosted"
                        icon={TrendingUp}
                        tone="emerald"
                    />
                    <MetricCard
                        title="Active Sellers"
                        value={uniqueShops}
                        subtitle="Unique shops requesting"
                        icon={Store}
                        tone="blue"
                    />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* Header & Search */}
                    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
                                <Award size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">All Requests</h2>
                                <p className="text-sm text-gray-500 mt-1">Manage 7-day product sponsorship approvals from artisan shops.</p>
                            </div>
                        </div>
                        <div className="relative w-full lg:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by product or seller..."
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-clay-300 focus:ring-1 focus:ring-clay-300 transition"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[940px] text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Seller</th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Requested</th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRequests.length > 0 ? (
                                    filteredRequests.map((req) => (
                                        <tr
                                            key={req.id}
                                            className={`transition duration-300 ${
                                                recentlyUpdatedId === req.id
                                                    ? 'bg-emerald-50/60'
                                                    : 'hover:bg-gray-50/50'
                                            }`}
                                        >
                                            <td className="py-4 px-6 align-middle">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl border border-gray-100 bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                        {req.product?.cover_photo_path ? (
                                                            <img
                                                                src={`/storage/${req.product.cover_photo_path}`}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                            />
                                                        ) : (
                                                            <Package size={16} className="text-gray-300" />
                                                        )}
                                                    </div>
                                                    <div className="max-w-[220px]">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{req.product?.name || 'Unknown Product'}</p>
                                                        <p className="text-[10px] text-gray-500 mt-1 truncate">
                                                            Shop: {req.user?.shop_name || req.user?.name || 'Unknown Shop'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 align-middle">
                                                <p className="text-sm font-bold text-gray-900">{req.user?.shop_name || req.user?.name}</p>
                                                <p className="text-[10px] text-gray-500">ID: {req.user?.id}</p>
                                            </td>
                                            <td className="py-4 px-6 align-middle text-sm text-gray-500 font-medium">
                                                {new Date(req.created_at).toLocaleDateString()}
                                                <div className="text-[10px] text-gray-400">{new Date(req.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="py-4 px-6 align-middle">
                                                {getStatusBadge(req.status)}
                                                {req.status === 'rejected' && req.rejection_reason && (
                                                    <p className="mt-2 max-w-[260px] text-[11px] leading-relaxed text-red-600">
                                                        Reason: {req.rejection_reason}
                                                    </p>
                                                )}
                                                {recentlyUpdatedId === req.id && (
                                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                                        Updated just now
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 align-middle">
                                                {req.status === 'pending' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleAction(req, 'reject')}
                                                            disabled={processing && pendingActionId === req.id}
                                                            className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                                        >
                                                            {processing && pendingActionId === req.id && modalData.type === 'reject' ? 'Rejecting...' : 'Reject'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(req, 'approve')}
                                                            disabled={processing && pendingActionId === req.id}
                                                            className="px-4 py-1.5 text-xs font-bold bg-gray-900 text-white hover:bg-black rounded-lg transition shadow-sm disabled:opacity-50"
                                                        >
                                                            {processing && pendingActionId === req.id && modalData.type === 'approve' ? 'Approving...' : 'Approve'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-right text-[10px] text-gray-400 font-medium">
                                                        Processed on<br/>
                                                        {new Date(req.approved_at || req.updated_at).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-12">
                                            <div className="text-center flex flex-col items-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                                                    <Award size={24} />
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-900">No requests found</h3>
                                                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                                                    No sponsorship requests match your search criteria.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {requests.last_page > 1 && (
                        <CompactPagination
                            currentPage={requests.current_page}
                            totalPages={requests.last_page}
                            totalItems={requests.total}
                            itemsPerPage={requests.per_page}
                            onPageChange={(page) => router.get(route('admin.sponsorships'), { page }, { preserveScroll: true, preserveState: true })}
                            itemLabel="requests"
                        />
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={modalData.isOpen && modalData.type === 'approve'}
                onClose={() => setModalData({ isOpen: false, type: null, request: null })}
                onConfirm={confirmAction}
                title={modalData.type === 'approve' ? 'Approve Sponsorship?' : 'Reject Sponsorship?'}
                message={modalData.type === 'approve'
                    ? `Are you sure you want to approve "${modalData.request?.product?.name}" for a 7-day sponsorship? It will be placed across the homepage and catalog sponsored surfaces.`
                    : `Are you sure you want to reject this sponsorship request for "${modalData.request?.product?.name}"?`
                }
                icon={modalData.type === 'approve' ? CheckCircle2 : XCircle}
                iconBg={modalData.type === 'approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}
                confirmText={modalData.type === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
                confirmColor={modalData.type === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                    : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200'
                }
                processing={processing}
            />

            <Modal
                show={modalData.isOpen && modalData.type === 'reject'}
                onClose={() => {
                    setRejectionReason('');
                    setModalData({ isOpen: false, type: null, request: null });
                }}
                maxWidth="md"
            >
                <div className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                            <XCircle size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Reject Sponsorship?</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Add a reason for rejecting "{modalData.request?.product?.name}". This note will be shown to the seller.
                            </p>
                        </div>
                    </div>

                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-2">
                        Rejection Reason
                    </label>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={5}
                        className="w-full rounded-xl border border-gray-200 focus:border-red-300 focus:ring-red-200 text-sm"
                        placeholder="Explain why the request was rejected so the seller knows what to improve."
                    />

                    <div className="mt-5 flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setRejectionReason('');
                                setModalData({ isOpen: false, type: null, request: null });
                            }}
                            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmAction}
                            disabled={processing}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
                        >
                            {processing ? 'Rejecting...' : 'Reject Request'}
                        </button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
