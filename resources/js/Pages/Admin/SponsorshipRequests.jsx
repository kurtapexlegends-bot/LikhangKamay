import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { 
    Award, Search, CheckCircle2, XCircle, 
    Clock, Package, AlertCircle
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import ConfirmationModal from '@/Components/ConfirmationModal';

export default function SponsorshipRequests({ requests }) {
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [modalData, setModalData] = useState({ isOpen: false, type: null, request: null });

    const handleAction = (request, type) => {
        setModalData({ isOpen: true, type, request });
    };

    const confirmAction = () => {
        const { type, request } = modalData;
        const routeName = type === 'approve' ? 'admin.sponsorships.approve' : 'admin.sponsorships.reject';
        
        router.post(route(routeName, request.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setModalData({ isOpen: false, type: null, request: null });
                addToast(`Sponsorship ${type}d successfully.`, 'success');
            },
            onError: (err) => {
                setModalData({ isOpen: false, type: null, request: null });
                addToast(err.error || `Failed to ${type} sponsorship.`, 'error');
            }
        });
    };

    const filteredRequests = (requests.data || []).filter(r => 
        r.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user?.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                
                {/* Header & Search */}
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                            <Award size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">All Requests</h2>
                            <p className="text-xs text-gray-500">Manage 7-day product sponsorships</p>
                        </div>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search by product or seller..." 
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border-gray-200 rounded-xl text-sm focus:bg-white focus:border-clay-300 focus:ring-1 focus:ring-clay-300 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
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
                                    <tr key={req.id} className="hover:bg-gray-50/50 transition duration-150">
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
                                                <div className="max-w-[200px]">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{req.product?.name || 'Unknown Product'}</p>
                                                    <a href={route('product.show', req.product?.id)} target="_blank" rel="noreferrer" className="text-[10px] font-medium text-clay-600 hover:underline">View Product</a>
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
                                        </td>
                                        <td className="py-4 px-6 align-middle">
                                            {req.status === 'pending' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleAction(req, 'reject')}
                                                        className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAction(req, 'approve')}
                                                        className="px-4 py-1.5 text-xs font-bold bg-gray-900 text-white hover:bg-black rounded-lg transition shadow-sm"
                                                    >
                                                        Approve
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
                
                {/* Pagination (if applicable) */}
                {requests.links && requests.links.length > 3 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-1">
                        {requests.links.map((link, i) => (
                            <button
                                key={i}
                                disabled={!link.url || link.active}
                                onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    link.active 
                                        ? 'bg-clay-600 text-white' 
                                        : !link.url 
                                            ? 'text-gray-300 cursor-not-allowed hidden md:inline-block' 
                                            : 'text-gray-600 hover:bg-gray-100'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ConfirmationModal 
                isOpen={modalData.isOpen}
                onClose={() => setModalData({ isOpen: false, type: null, request: null })}
                onConfirm={confirmAction}
                title={modalData.type === 'approve' ? 'Approve Sponsorship?' : 'Reject Sponsorship?'}
                message={modalData.type === 'approve' 
                    ? `Are you sure you want to approve "${modalData.request?.product?.name}" for a 7-day sponsorship? It will be immediately boosted in the catalog.`
                    : `Are you sure you want to reject this sponsorship request for "${modalData.request?.product?.name}"?`
                }
                confirmText={modalData.type === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
                confirmStyle={modalData.type === 'approve' ? 'clay' : 'danger'}
            />
        </AdminLayout>
    );
}
