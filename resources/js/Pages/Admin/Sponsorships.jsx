import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import { Crown, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

const statusColors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
};

const statusIcons = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
};

export default function Sponsorships({ requests = [] }) {
    const [actionModal, setActionModal] = useState({ open: false, request: null, action: '' });
    const { data, setData, post, processing, reset } = useForm({ admin_notes: '' });

    const openAction = (req, action) => {
        setActionModal({ open: true, request: req, action });
        setData('admin_notes', '');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const routeName = actionModal.action === 'approve' ? 'admin.sponsorships.approve' : 'admin.sponsorships.reject';
        post(route(routeName, actionModal.request.id), {
            onSuccess: () => {
                setActionModal({ open: false, request: null, action: '' });
                reset();
            }
        });
    };

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const processedRequests = requests.filter(r => r.status !== 'pending');

    return (
        <AdminLayout title="Sponsorship Requests">
            <div className="space-y-8">
                {/* Pending Section */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-amber-500" />
                        Pending Requests ({pendingRequests.length})
                    </h2>
                    {pendingRequests.length === 0 ? (
                        <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center text-gray-400 font-medium">
                            No pending sponsorship requests
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingRequests.map((req) => (
                                <div key={req.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
                                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                                        <Crown className="text-amber-500" size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 truncate">{req.product?.name || 'Unknown Product'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            by <span className="font-medium text-gray-700">{req.seller?.shop_name || req.seller?.name}</span>
                                            {' · '}{req.requested_duration_days} days
                                            {' · '}{new Date(req.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openAction(req, 'approve')}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition"
                                        >
                                            <CheckCircle size={14} /> Approve
                                        </button>
                                        <button
                                            onClick={() => openAction(req, 'reject')}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                                        >
                                            <XCircle size={14} /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Processed Section */}
                {processedRequests.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">History</h2>
                        <div className="space-y-2">
                            {processedRequests.map((req) => {
                                const StatusIcon = statusIcons[req.status] || Clock;
                                return (
                                    <div key={req.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4 opacity-80">
                                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                                            <Crown className="text-gray-400" size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-700 truncate">{req.product?.name || 'Unknown Product'}</p>
                                            <p className="text-xs text-gray-400">{req.seller?.shop_name || req.seller?.name}</p>
                                        </div>
                                        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${statusColors[req.status]}`}>
                                            <StatusIcon size={10} />
                                            {req.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Modal */}
            <Modal show={actionModal.open} onClose={() => setActionModal({ open: false, request: null, action: '' })} maxWidth="sm">
                <form onSubmit={handleSubmit} className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 capitalize">
                        {actionModal.action} Sponsorship
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        {actionModal.action === 'approve'
                            ? `This will mark "${actionModal.request?.product?.name}" as sponsored for ${actionModal.request?.requested_duration_days} days.`
                            : `This will reject the request and refund 1 sponsorship credit to the seller.`
                        }
                    </p>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Admin Notes (optional)</label>
                        <textarea
                            value={data.admin_notes}
                            onChange={(e) => setData('admin_notes', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-clay-500/20 focus:border-clay-500 transition resize-none"
                            placeholder="Optional notes..."
                        />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => setActionModal({ open: false, request: null, action: '' })} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className={`px-5 py-2 font-bold text-white rounded-xl transition shadow-lg disabled:opacity-50 ${
                                actionModal.action === 'approve'
                                    ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20'
                                    : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                            }`}
                        >
                            Confirm {actionModal.action === 'approve' ? 'Approval' : 'Rejection'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
