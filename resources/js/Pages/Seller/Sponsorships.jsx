import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import { 
    Award, TrendingUp, Clock, AlertCircle, 
    CheckCircle2, XCircle, Search, Package,
    User, LogOut, Menu, ChevronDown
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';

export default function Sponsorships({ auth, creditsAvailable, activeProducts, requests }) {
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const { openSidebar } = useSellerWorkspaceShell();

    const { data, setData, post, processing, reset } = useForm({
        product_id: '',
    });

    const isSuperPremium = auth.user.premium_tier === 'super_premium';

    const submitRequest = (e) => {
        e.preventDefault();
        if (!data.product_id) return addToast('Please select a product first.', 'error');
        
        post(route('seller.sponsorships.store'), {
            onSuccess: () => {
                reset();
                addToast('Sponsorship request submitted.', 'success');
            },
            onError: (err) => {
                addToast(err.error || 'Failed to request sponsorship.', 'error');
            }
        });
    };

    // Filter available products for the dropdown
    const availableProducts = activeProducts.filter(p => !p.is_sponsored);
    const pendingProductIds = requests.filter(r => r.status === 'pending').map(r => r.product_id);
    const selectableProducts = availableProducts.filter(p => !pendingProductIds.includes(p.id));

    // Filter history based on search
    const filteredRequests = requests.filter(r => 
        r.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">Approved</span>;
            case 'rejected': return <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">Rejected</span>;
            default: return <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">Pending</span>;
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Product Sponsorships - Seller Dashboard" />

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">

                {/* --- STANDARDIZED HEADER --- */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40">
                    <div className="flex min-w-0 items-center gap-3">
                        <button onClick={openSidebar} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg sm:text-xl font-bold text-gray-900">Sponsorships</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Boost your products to the top of the catalog</p>
                        </div>
                    </div>

                                        
                    <div className="flex items-center gap-2 sm:gap-6">
                        <NotificationDropdown />
                        <div className="hidden sm:block h-8 w-px bg-gray-200"></div>
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-2 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <div className="hidden lg:block">
                                                <WorkspaceAccountSummary user={auth.user} />
                                            </div>
                                            <UserAvatar user={auth.user} />
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <LogOut size={16} /> Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        {/* CREDITS CARD */}
                        <div className="bg-stone-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between border border-stone-800">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                            
                            <div className="relative z-10 mb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Award className="text-amber-400" size={20} />
                                    <h3 className="text-stone-300 text-xs font-bold uppercase tracking-wider">Monthly Credits</h3>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-bold text-white leading-none">{creditsAvailable}</span>
                                    <span className="text-stone-400 text-sm mb-1 font-medium">/ 5 left</span>
                                </div>
                            </div>

                            <div className="relative z-10">
                                <p className="text-xs text-stone-400 leading-relaxed">
                                    Sponsorships last for <strong className="text-white">7 days</strong>. Credits reset every 30 days based on your billing cycle.
                                </p>
                            </div>
                        </div>

                        {/* NEW REQUEST FORM */}
                        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <TrendingUp size={20} className="text-clay-600" />
                                Request New Sponsorship
                            </h2>
                            
                            {!isSuperPremium ? (
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h3 className="text-sm font-bold text-amber-800">Elite Feature</h3>
                                        <p className="text-xs text-amber-700 mt-1 mb-3">
                                            Upgrade to the Elite plan to unlock product sponsorships and gain premium placement on the homepage and catalog.
                                        </p>
                                        <button 
                                            onClick={() => router.visit(route('seller.subscription'))}
                                            className="text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition"
                                        >
                                            Upgrade Plan
                                        </button>
                                    </div>
                                </div>
                            ) : creditsAvailable <= 0 ? (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h3 className="text-sm font-bold text-red-800">No Credits Remaining</h3>
                                        <p className="text-xs text-red-700 mt-1">
                                            You have used all 5 of your sponsorship credits for this cycle. Please wait for them to reset.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={submitRequest} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                                            Select an Active Product
                                        </label>
                                        <select
                                            className="w-full border-gray-200 rounded-xl text-sm focus:ring-clay-500 focus:border-clay-500 shadow-sm transition"
                                            value={data.product_id}
                                            onChange={(e) => setData('product_id', e.target.value)}
                                            required
                                        >
                                            <option value="">-- Choose a product to feature --</option>
                                            {selectableProducts.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.sku} - {p.name}
                                                </option>
                                            ))}
                                        </select>
                                        {selectableProducts.length === 0 && (
                                            <p className="text-xs text-red-500 mt-1.5">No eligible products available to sponsor.</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing || !data.product_id}
                                        className="w-full bg-stone-900 text-white font-bold text-sm py-3 rounded-xl hover:bg-stone-800 transition shadow-lg shadow-stone-900/20 disabled:opacity-50 flex justify-center items-center gap-2"
                                    >
                                        {processing ? 'Submitting Request...' : 'Use 1 Credit to Sponsor'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* CURRENT & PAST SPONSORSHIPS */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <h2 className="text-lg font-bold text-gray-900">Sponsorship History</h2>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search products..." 
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border-transparent rounded-xl text-sm focus:bg-white focus:border-clay-300 focus:ring-0 transition"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {filteredRequests.length > 0 ? (
                            <>
                            <div className="space-y-3 p-4 sm:hidden">
                                {filteredRequests.map((req) => (
                                    <div key={req.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="w-11 h-11 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 flex items-center justify-center">
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
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-gray-900">{req.product?.name || 'Unknown Product'}</p>
                                                    <p className="mt-1 text-[11px] font-medium text-gray-500">
                                                        Requested {new Date(req.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0">{getStatusBadge(req.status)}</div>
                                        </div>

                                        <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5">
                                            {req.status === 'rejected' && req.rejection_reason ? (
                                                <>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Rejection reason</p>
                                                    <p className="mt-1 text-xs leading-5 text-gray-600">{req.rejection_reason}</p>
                                                </>
                                            ) : req.status === 'approved' ? (
                                                <p className="text-xs font-medium text-emerald-600">Approved for a 7-day sponsored run.</p>
                                            ) : (
                                                <p className="text-xs font-medium text-gray-500">Awaiting admin review.</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="hidden overflow-x-auto sm:block">
                                <table className="w-full min-w-[760px] text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-100">
                                            <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Product</th>
                                            <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Requested On</th>
                                            <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Notes</th>
                                            <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredRequests.map((req) => (
                                            <tr id={`request-${req.id}`} key={req.id} className="hover:bg-gray-50/50 transition duration-150 scroll-mt-24">
                                                <td className="py-4 px-5 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 flex items-center justify-center">
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
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{req.product?.name || 'Unknown Product'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-5 align-middle text-sm text-gray-500 font-medium">
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="py-4 px-5 align-middle">
                                                    {req.status === 'rejected' && req.rejection_reason ? (
                                                        <div className="max-w-xs">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">Rejection reason</p>
                                                            <p className="text-xs text-gray-600 leading-relaxed">{req.rejection_reason}</p>
                                                        </div>
                                                    ) : req.status === 'approved' ? (
                                                        <p className="text-xs text-emerald-600 font-medium">Approved for a 7-day sponsored run.</p>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 font-medium">Awaiting admin review.</p>
                                                    )}
                                                </td>
                                                <td className="py-4 px-5 align-middle text-right flex justify-end">
                                                    <div className="flex items-center gap-1.5" title={req.status}>
                                                        {getStatusBadge(req.status)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            </>
                        ) : (
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <Award size={24} className="text-gray-300" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900">No sponsorships yet</h3>
                                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                                    You haven't requested any product sponsorships. Select a product above to get started.
                                </p>
                            </div>
                        )}
                    </div>

                </main>
            </div>
        </div>
    );
}

Sponsorships.layout = (page) => <SellerWorkspaceLayout active="sponsorships">{page}</SellerWorkspaceLayout>;
