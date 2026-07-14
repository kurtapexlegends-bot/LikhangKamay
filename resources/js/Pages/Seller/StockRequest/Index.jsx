import React, { useDeferredValue, useState, useEffect } from 'react';
import { Head, usePage, router, Link } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import { Search, AlertTriangle, ShoppingBag } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';

// Subcomponents & Helpers
import { STATUS_TABS } from '@/utils/stockRequestHelpers';
import StockRequestMetrics from '@/Components/Seller/StockRequest/StockRequestMetrics';
import StockRequestsTable from '@/Components/Seller/StockRequest/StockRequestsTable';
import ReceiveRequestModal from '@/Components/Seller/StockRequest/ReceiveRequestModal';
import TransferRequestModal from '@/Components/Seller/StockRequest/TransferRequestModal';
import ConfirmOrderModal from '@/Components/Seller/StockRequest/ConfirmOrderModal';

export default function StockRequestIndex({ auth, requests }) {
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    const { canEdit: canEditStockRequests, isReadOnly: isStockRequestsReadOnly } = useSellerModuleAccess('stock_requests');
    const { flash, filters = {} } = usePage().props;
    
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [actionNotice, setActionNotice] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const deferredSearch = useDeferredValue(searchTerm);

    // Sync search from URL
    useEffect(() => {
        if (filters.search && filters.search !== searchTerm) {
            setSearchTerm(filters.search);
        }
    }, [filters.search]);

    useFlashToast(flash, addToast);

    // Modal States
    const [receiveModal, setReceiveModal] = useState({ open: false, max: null });
    const [transferModal, setTransferModal] = useState({ open: false, max: null });
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [qtyInput, setQtyInput] = useState('');

    // Counts per status
    const getCount = (status) => {
        if (status === 'all') return requests.length;
        if (status === 'pending') return requests.filter(r => r.status === 'pending').length;
        return requests.filter(r => r.status === status).length;
    };

    // Filtered queue
    const filteredRequests = requests.filter((req) => {
        const matchesTab = activeTab === 'all'
            ? true
            : activeTab === 'pending'
                ? req.status === 'pending'
                : req.status === activeTab;

        if (!matchesTab) return false;

        const normalizedSearch = deferredSearch.trim().toLowerCase();
        if (!normalizedSearch) return true;

        return [
            req.id,
            req.supply?.name,
            req.supply?.category,
            req.requester?.name,
            req.status,
            req.supply?.supplier,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch);
    });

    const handleMarkAsOrdered = () => {
        if (!canEditStockRequests || !selectedRequest) return;
        router.post(route('stock-requests.ordered', selectedRequest.id), {}, {
            onStart: () => setProcessingId(`ordered-${selectedRequest.id}`),
            onSuccess: () => {
                setShowOrderModal(false);
                setSelectedRequest(null);
                setActionNotice(null);
            },
            onError: () => {
                setActionNotice('This request could not be marked as ordered right now.');
                addToast('Order update failed.', 'error');
            },
            onFinish: () => setProcessingId(null),
        });
    };

    const openReceiveModal = (req) => {
        if (!canEditStockRequests) return;
        setSelectedRequest(req);
        const remaining = req.quantity - req.received_quantity;
        setReceiveModal({ open: true, max: remaining });
        setQtyInput(remaining); 
    };

    const submitReceive = (e) => {
        e.preventDefault();
        if (!canEditStockRequests || !selectedRequest) return;
        router.post(route('stock-requests.receive', selectedRequest.id), { quantity: qtyInput }, {
            onStart: () => setProcessingId(`receive-${selectedRequest.id}`),
            onSuccess: () => {
                setReceiveModal({ open: false, max: null });
                setSelectedRequest(null);
                setQtyInput('');
                setActionNotice(null);
            },
            onError: () => {
                setActionNotice('Received quantity could not be recorded right now.');
                addToast('Receive action failed.', 'error');
            },
            onFinish: () => setProcessingId(null),
        });
    };

    const openTransferModal = (req) => {
        if (!canEditStockRequests) return;
        setSelectedRequest(req);
        const available = req.received_quantity - req.transferred_quantity;
        setTransferModal({ open: true, max: available });
        setQtyInput(available); 
    };

    const submitTransfer = (e) => {
        e.preventDefault();
        if (!canEditStockRequests || !selectedRequest) return;
        router.post(route('stock-requests.transfer', selectedRequest.id), { quantity: qtyInput }, {
            onStart: () => setProcessingId(`transfer-${selectedRequest.id}`),
            onSuccess: () => {
                setTransferModal({ open: false, max: null });
                setSelectedRequest(null);
                setQtyInput('');
                setActionNotice(null);
            },
            onError: () => {
                setActionNotice('Transfer to active inventory did not go through.');
                addToast('Transfer failed.', 'error');
            },
            onFinish: () => setProcessingId(null),
        });
    };

    const headerActions = canEditStockRequests ? (
        <Link 
            href={route('procurement.index')} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-clay-600 text-white text-[11px] font-bold rounded-lg hover:bg-clay-700 transition-all min-h-[44px] sm:min-h-[36px]"
        >
            <ShoppingBag size={13} />
            REQUEST STOCK
        </Link>
    ) : null;

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Restock Requests" />

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <SellerHeader 
                    title="Restock Requests"
                    subtitle="Track stock purchase orders and inventory intake."
                    auth={auth}
                    onMenuClick={openSidebar}
                    badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
                    actions={headerActions}
                />

                <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-4">
                    {isStockRequestsReadOnly && (
                        <ReadOnlyCapabilityNotice label="Restock requests are read only for your account. Ordering, receiving, and transfer actions are disabled." />
                    )}
                    {actionNotice && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
                            <AlertTriangle size={13} />
                            {actionNotice}
                        </div>
                    )}

                    {/* KPI SUMMARY CARDS */}
                    <StockRequestMetrics requests={requests} />

                    {/* STATUS TABS */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">
                        <div className="overflow-x-auto border-b border-gray-100">
                            <div className="flex min-w-max gap-1 p-1.5">
                                {STATUS_TABS.map(tab => {
                                    const count = getCount(tab.id);
                                    const isActive = activeTab === tab.id;
                                    const TabIcon = tab.icon;
                                    return (
                                        <button 
                                            key={tab.id} 
                                            onClick={() => setActiveTab(tab.id)} 
                                            className={`inline-flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 min-h-[44px] sm:min-h-0 ${
                                                isActive 
                                                    ? 'bg-clay-600 text-white shadow-sm shadow-clay-100' 
                                                    : 'text-gray-500 hover:bg-[#FCF7F2] hover:text-clay-700'
                                            }`}
                                        >
                                            <TabIcon size={12} />
                                            {tab.label}
                                            {count > 0 && (
                                                <span className={`ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <label className="relative block w-full sm:max-w-sm">
                                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search item, supplier, requester, or request ID"
                                    className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-10 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-clay-400 focus:ring-clay-400"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 transition hover:text-stone-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                    >
                                        Clear
                                    </button>
                                )}
                            </label>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-600">
                                    {filteredRequests.length} visible
                                </span>
                                {searchTerm && (
                                    <span className="inline-flex items-center rounded-full border border-clay-200 bg-[#FCF7F2] px-3 py-1 text-clay-700">
                                        Filtered queue
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* DATA TABLE / LIST VIEW */}
                        <StockRequestsTable 
                            filteredRequests={filteredRequests}
                            activeTab={activeTab}
                            canEdit={canEditStockRequests}
                            processingId={processingId}
                            onMarkOrdered={(req) => {
                                setSelectedRequest(req);
                                setShowOrderModal(true);
                            }}
                            onReceiveClick={openReceiveModal}
                            onTransferClick={openTransferModal}
                        />

                        {/* Footer (if matching requests are found) */}
                        {filteredRequests.length > 0 && (
                            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-xs text-gray-400">
                                    Showing <span className="font-bold text-gray-600">{filteredRequests.length}</span> of <span className="font-bold text-gray-600">{requests.length}</span> requests
                                </p>
                            </div>
                        )}
                    </div>
                </main>

                {/* MODALS */}
                <ReceiveRequestModal 
                    isOpen={receiveModal.open}
                    onClose={() => setReceiveModal({ open: false, max: null })}
                    max={receiveModal.max}
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    onSubmit={submitReceive}
                    processing={processingId === `receive-${selectedRequest?.id}`}
                    canEdit={canEditStockRequests}
                    supplyName={selectedRequest?.supply?.name}
                />

                <TransferRequestModal 
                    isOpen={transferModal.open}
                    onClose={() => setTransferModal({ open: false, max: null })}
                    max={transferModal.max}
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    onSubmit={submitTransfer}
                    processing={processingId === `transfer-${selectedRequest?.id}`}
                    canEdit={canEditStockRequests}
                    supplyName={selectedRequest?.supply?.name}
                />

                <ConfirmOrderModal 
                    show={showOrderModal}
                    onClose={() => setShowOrderModal(false)}
                    request={selectedRequest}
                    onConfirm={handleMarkAsOrdered}
                    processing={processingId === `ordered-${selectedRequest?.id}`}
                    canEdit={canEditStockRequests}
                />
            </div>
        </div>
    );
}

StockRequestIndex.layout = (page) => <SellerWorkspaceLayout active="stock-requests">{page}</SellerWorkspaceLayout>;
