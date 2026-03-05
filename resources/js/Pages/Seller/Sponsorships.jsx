import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Modal from '@/Components/Modal';
import { Crown, Send, Clock, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

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

export default function Sponsorships({ auth, requests = [], eligible_products = [], sponsorship_credits }) {
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        product_id: '',
        requested_duration_days: 7,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('seller.sponsorships.store'), {
            onSuccess: () => {
                setRequestModalOpen(false);
                reset();
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Sponsorships" />
            <SellerSidebar active="sponsorships" user={auth.user} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Sponsorships</h1>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Promote your products · <span className="font-bold text-amber-500">{sponsorship_credits} Credits</span> remaining
                        </p>
                    </div>
                    <button
                        onClick={() => setRequestModalOpen(true)}
                        disabled={sponsorship_credits <= 0 || eligible_products.length === 0}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Crown size={16} /> Request Sponsorship
                    </button>
                </header>

                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {requests.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Crown size={28} className="text-amber-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-700 mb-2">No Sponsorship Requests</h3>
                                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                    Use your sponsorship credits to promote products. Sponsored products get featured placement across the marketplace.
                                </p>
                            </div>
                        ) : (
                            requests.map((req) => {
                                const StatusIcon = statusIcons[req.status] || Clock;
                                return (
                                    <div key={req.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
                                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                                            <Crown className="text-amber-500" size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{req.product?.name || 'Unknown Product'}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {req.requested_duration_days} days · Requested {new Date(req.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full border ${statusColors[req.status]}`}>
                                            <StatusIcon size={12} />
                                            {req.status}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </main>
            </div>

            {/* REQUEST MODAL */}
            <Modal show={requestModalOpen} onClose={() => setRequestModalOpen(false)} maxWidth="sm">
                <form onSubmit={handleSubmit} className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Request Sponsorship</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Select a product to sponsor. 1 credit will be deducted. An admin will review your request.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">Product</label>
                            <select
                                value={data.product_id}
                                onChange={(e) => setData('product_id', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                            >
                                <option value="">Select a product...</option>
                                {eligible_products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {errors.product_id && <p className="text-xs text-red-500 mt-1">{errors.product_id}</p>}
                            {errors.credits && <p className="text-xs text-red-500 mt-1">{errors.credits}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">Duration (days)</label>
                            <input
                                type="number"
                                min={1}
                                max={30}
                                value={data.requested_duration_days}
                                onChange={(e) => setData('requested_duration_days', parseInt(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end mt-6">
                        <button type="button" onClick={() => setRequestModalOpen(false)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={processing || !data.product_id} className="px-5 py-2 font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2">
                            <Send size={14} /> Submit Request
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
