import React, { useDeferredValue, useState, useEffect } from 'react';
import { Head, usePage, router, Link } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import { Search, AlertTriangle, ShoppingBag, Store } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';

import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
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

    return (
        <>
            <Head title="Restock Requests | LikhangKamay" />

            <SellerHeader 
                title="Restock Requests"
                subtitle="Track stock purchase orders and material intake from suppliers and peer workshops."
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
            />

            <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-4 lg:space-y-6 pb-12">
                {isStockRequestsReadOnly && (
                    <ReadOnlyCapabilityNotice label="Restock requests are read only for your account. Ordering, receiving, and transfer actions are disabled." />
                )}
                {actionNotice && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-800">
                        <AlertTriangle size={14} className="text-amber-600" />
                        <span>{actionNotice}</span>
                    </div>
                )}

                {/* KPI Summary Cards */}
                <StockRequestMetrics requests={requests} />

                {/* Restock Requests Table Container with Integrated Toolbar */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                    <FilterToolbarHeader
                        tabs={STATUS_TABS.map(tab => ({
                            key: tab.id,
                            label: tab.label,
                            count: getCount(tab.id)
                        }))}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        searchQuery={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder="Search item, supplier, requester, or ID..."
                        extraActions={
                            <div className="flex items-center gap-2">
                                <Link
                                    href={route('seller.supply-hub.index')}
                                    className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 h-[38px] min-h-[38px] text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition shadow-2xs"
                                    title="Browse Wholesale Supply Hub"
                                >
                                    <Store size={14} className="text-clay-600" />
                                    <span>Supply Hub</span>
                                </Link>
                                {canEditStockRequests && (
                                    <Link 
                                        href={route('procurement.index')} 
                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-3.5 h-[38px] min-h-[38px] text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition active:scale-95"
                                        title="Request stock from inventory"
                                    >
                                        <ShoppingBag size={13} />
                                        <span className="hidden sm:inline">Request Stock</span>
                                        <span className="inline sm:hidden">Request</span>
                                    </Link>
                                )}
                            </div>
                        }
                        onResetFilters={() => {
                            setActiveTab('all');
                            setSearchTerm('');
                        }}
                        containerClassName="rounded-none border-x-0 border-t-0 border-b border-stone-200/80 shadow-none bg-stone-50/40"
                    />

                    <StockRequestsTable 
                        filteredRequests={filteredRequests}
                        activeTab={activeTab} 
                        canEdit={canEditStockRequests}
                        processingId={processingId}
                        onMarkOrdered={(req) => { setSelectedRequest(req); setShowOrderModal(true); }}
                        onReceiveClick={openReceiveModal}
                        onTransferClick={openTransferModal}
                    />

                    {/* Footer showing count */}
                    {filteredRequests.length > 0 && (
                        <div className="px-4 sm:px-6 py-3 border-t border-stone-100 bg-stone-50/40 flex items-center justify-between text-xs text-stone-400 font-medium">
                            <span>
                                Showing <strong className="text-stone-700 font-bold">{filteredRequests.length}</strong> of <strong className="text-stone-700 font-bold">{requests.length}</strong> requests
                            </span>
                        </div>
                    )}
                </div>
            </div>

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
        </>
    );
}

StockRequestIndex.layout = (page) => <SellerWorkspaceLayout active="stock-requests">{page}</SellerWorkspaceLayout>;
