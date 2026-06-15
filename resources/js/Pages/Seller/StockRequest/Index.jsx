import React, { useDeferredValue, useState, useEffect } from 'react';
import { Head, usePage, router, Link } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import { AlertTriangle, Truck } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';

// Global shared components
import ConfirmationModal from '@/Components/ConfirmationModal';

// Subcomponents and helpers
import StockRequestMetrics from '@/Components/Seller/StockRequest/StockRequestMetrics';
import StockRequestsFilter from '@/Components/Seller/StockRequest/StockRequestsFilter';
import StockRequestsList from '@/Components/Seller/StockRequest/StockRequestsList';
import ReceiveRequestModal from '@/Components/Seller/StockRequest/ReceiveRequestModal';
import TransferRequestModal from '@/Components/Seller/StockRequest/TransferRequestModal';

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

    // Sync search from URL (for Global Search support)
    useEffect(() => {
        if (filters.search && filters.search !== searchTerm) {
            setSearchTerm(filters.search);
        }
    }, [filters.search]);

    useFlashToast(flash, addToast);

    // Modal States
    const [receiveModal, setReceiveModal] = useState({ open: false, id: null, max: null });
    const [transferModal, setTransferModal] = useState({ open: false, id: null, max: null });
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [qtyInput, setQtyInput] = useState('');

    // Filter requests based on tab & search term
    const filteredRequests = requests.filter((req) => {
        const matchesTab = activeTab === 'all'
            ? true
            : activeTab === 'pending'
                ? req.status === 'pending'
                : req.status === activeTab;

        if (!matchesTab) {
            return false;
        }

        const normalizedSearch = deferredSearch.trim().toLowerCase();

        if (!normalizedSearch) {
            return true;
        }

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

    // 1. Mark as Ordered
    const handleMarkAsOrdered = () => {
        if (!canEditStockRequests) return;
        router.post(route('stock-requests.ordered', selectedRequest.id), {}, {
            onStart: () => setProcessingId(selectedRequest?.id ? `ordered-${selectedRequest.id}` : null),
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

    // 2. Receive Items
    const openReceiveModal = (req) => {
        if (!canEditStockRequests) return;
        const remaining = req.quantity - req.received_quantity;
        setReceiveModal({ open: true, id: req.id, max: remaining });
        setQtyInput(remaining); 
    };

    const submitReceive = (e) => {
        e.preventDefault();
        if (!canEditStockRequests) return;
        router.post(route('stock-requests.receive', receiveModal.id), { quantity: qtyInput }, {
            onStart: () => setProcessingId(`receive-${receiveModal.id}`),
            onSuccess: () => {
                setReceiveModal({ open: false, id: null, max: null });
                setActionNotice(null);
            },
            onError: () => {
                setActionNotice('Received quantity could not be recorded right now.');
                addToast('Receive action failed.', 'error');
            },
            onFinish: () => setProcessingId(null),
        });
    };

    // 3. Transfer to Inventory
    const openTransferModal = (req) => {
        if (!canEditStockRequests) return;
        const available = req.received_quantity - req.transferred_quantity;
        setTransferModal({ open: true, id: req.id, max: available });
        setQtyInput(available);
    };

    const submitTransfer = (e) => {
        e.preventDefault();
        if (!canEditStockRequests) return;
        router.post(route('stock-requests.transfer', transferModal.id), { quantity: qtyInput }, {
            onStart: () => setProcessingId(`transfer-${transferModal.id}`),
            onSuccess: () => {
                setTransferModal({ open: false, id: null, max: null });
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
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800 pb-16 lg:pb-0">
            <Head title="Restock Requests" />

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <SellerHeader 
                    title="Restock Requests"
                    subtitle="Track stock purchase orders and inventory intake."
                    auth={auth}
                    onMenuClick={openSidebar}
                    badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
                />

                <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-4 pb-20 lg:pb-6">
                    {isStockRequestsReadOnly && (
                        <ReadOnlyCapabilityNotice label="Restock requests are read only for your account. Ordering, receiving, and transfer actions are disabled." />
                    )}
                    
                    {actionNotice && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
                            <AlertTriangle size={13} />
                            {actionNotice}
                        </div>
                    )}
                    
                    {/* KPI Metrics Summary Grid */}
                    <StockRequestMetrics requests={requests} />

                    {/* Status Tabs and Search Filter Bar */}
                    <StockRequestsFilter
                        requests={requests}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filteredCount={filteredRequests.length}
                    />

                    {/* Stock Requests List Renderer (Responsive viewports layout) */}
                    <StockRequestsList 
                        filteredRequests={filteredRequests}
                        requests={requests}
                        activeTab={activeTab}
                        canEditStockRequests={canEditStockRequests}
                        processingId={processingId}
                        setSelectedRequest={setSelectedRequest}
                        setShowOrderModal={setShowOrderModal}
                        openReceiveModal={openReceiveModal}
                        openTransferModal={openTransferModal}
                    />
                </main>

                {/* Mobile Sticky Action Dock */}
                <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/95 backdrop-blur-md border-t border-stone-200 z-30 p-3 shadow-lg">
                    <Link
                        href={route('procurement.index')}
                        className="w-full inline-flex items-center justify-center rounded-xl bg-clay-600 px-4 py-3 text-xs font-bold text-white shadow-md hover:bg-clay-700 transition min-h-[44px]"
                    >
                        Create Stock Request (Inventory)
                    </Link>
                </div>

                {/* Receive Items Dialog */}
                <ReceiveRequestModal 
                    isOpen={receiveModal.open}
                    onClose={() => setReceiveModal({ open: false, id: null, max: null })}
                    max={receiveModal.max}
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    onSubmit={submitReceive}
                    processing={processingId === `receive-${receiveModal.id}`}
                    canEdit={canEditStockRequests}
                />

                {/* Transfer to Inventory Dialog */}
                <TransferRequestModal 
                    isOpen={transferModal.open}
                    onClose={() => setTransferModal({ open: false, id: null, max: null })}
                    max={transferModal.max}
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    onSubmit={submitTransfer}
                    processing={processingId === `transfer-${transferModal.id}`}
                    canEdit={canEditStockRequests}
                />

                {/* Confirm Order Placement Modal */}
                <ConfirmationModal 
                    isOpen={showOrderModal}
                    onClose={() => setShowOrderModal(false)}
                    onConfirm={handleMarkAsOrdered}
                    title="Confirm Order Placed?"
                    message={`Are you sure you have placed the order for "${selectedRequest?.supply?.name}" with the supplier? This will move the request to "On Process" status.`}
                    icon={Truck}
                    iconBg="bg-clay-50 text-clay-700"
                    confirmText={processingId === `ordered-${selectedRequest?.id}` ? 'Confirming...' : 'Confirm Order'}
                    confirmColor="bg-clay-600 hover:bg-clay-700"
                    processing={processingId === `ordered-${selectedRequest?.id}`}
                />
            </div>
        </div>
    );
}

StockRequestIndex.layout = (page) => <SellerWorkspaceLayout active="stock-requests">{page}</SellerWorkspaceLayout>;
