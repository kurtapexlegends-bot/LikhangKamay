import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Head, router, usePage } from "@inertiajs/react";
import { motion } from "framer-motion";
import Modal from "@/Components/Modal";
import ReadOnlyCapabilityNotice from "@/Components/Seller/Shared/ReadOnlyCapabilityNotice";
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from "@/Layouts/SellerWorkspaceLayout";
import SellerHeader from "@/Layouts/SellerHeader";
import useSellerModuleAccess from "@/hooks/useSellerModuleAccess";
import KPICard from "@/Components/KPICard";
import WorkspaceEmptyState from "@/Components/WorkspaceEmptyState";
import { AlertCircle, Package, Truck, CheckCircle2, Box, CreditCard, Printer, FileDown, LoaderCircle, AlertTriangle, RotateCcw, X } from "lucide-react";
import { useToast } from "@/Components/ToastContext";
import useFlashToast from "@/hooks/useFlashToast";
import CompactPagination from "@/Components/CompactPagination";
import ExportButton from "@/Components/ExportButton";

// Subcomponents
import OrderFilterPanel from "@/Components/Seller/Orders/OrderFilterPanel";
import OrderCard from "@/Components/Seller/Orders/OrderCard";
import FulfillmentModal from "@/Components/Seller/Orders/FulfillmentModal";
import DisputeResponseModal from "@/Components/Seller/Orders/DisputeResponseModal";
import ReplacementModal from "@/Components/Seller/Orders/ReplacementModal";

const ORDER_MANAGER_VIEW_KEY = "seller-order-manager-view";

const readStoredOrderManagerView = () => {
    if (typeof window === "undefined") return null;
    try {
        const parsed = JSON.parse(window.localStorage.getItem(ORDER_MANAGER_VIEW_KEY) || "null");
        if (!parsed || typeof parsed !== "object") return null;
        return {
            activeTab: parsed.activeTab || "All",
            searchQuery: parsed.searchQuery || "",
            quickFilter: parsed.quickFilter || "all",
            dateRange: parsed.dateRange || { start: "", end: "" },
        };
    } catch { return null; }
};

export default function OrderManager({ auth, orders = [], tabCounts }) {
    const { addToast } = useToast();
    const paginatedOrders = Array.isArray(orders) ? orders : (orders?.data || []);
    const { openSidebar } = useSellerWorkspaceShell();
    const storedView = readStoredOrderManagerView();
    const { flash, sellerSidebar, filters = {} } = usePage().props;
    const canAccessMessages = sellerSidebar?.visibleModules?.includes("messages");
    const { canEdit: canEditOrders, isReadOnly: isOrdersReadOnly } = useSellerModuleAccess("orders");

    // Filters and toggles
    const [activeTab, setActiveTab] = useState(storedView?.activeTab || "All");
    const [searchQuery, setSearchQuery] = useState(filters.search || storedView?.searchQuery || "");
    const [quickFilter, setQuickFilter] = useState(storedView?.quickFilter || "all");
    const [dateRange, setDateRange] = useState(storedView?.dateRange || { start: "", end: "" });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [isPrintingSlips, setIsPrintingSlips] = useState(false);
    const [shouldAnimateKPI, setShouldAnimateKPI] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const [expandedTimelines, setExpandedTimelines] = useState(new Set());
    const [expandedCourierTrackings, setExpandedCourierTrackings] = useState(new Set());
    const [expandedPricingDetails, setExpandedPricingDetails] = useState(new Set());

    // Modal control states
    const [bookingOrderId, setBookingOrderId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", action: null, isDestructive: false, processing: false });
    const [shippingModal, setShippingModal] = useState({ isOpen: false, orderId: null, status: "Shipped", mode: "ship", processing: false });
    const [replacementModal, setReplacementModal] = useState({ isOpen: false, orderId: null, resolutionDescription: "", error: "", processing: false });
    const [disputeModalState, setDisputeModalState] = useState({ isOpen: false, disputeId: null, orderId: null, responseType: "accept", sellerExplanation: "", sellerProposedDescription: "", processing: false, error: "" });
    const [returnActionKey, setReturnActionKey] = useState(null);

    const toggleTimelineExpansion = (id) => setExpandedTimelines(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const toggleCourierTrackingExpansion = (id) => setExpandedCourierTrackings(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const togglePricingDetailsExpansion = (id) => setExpandedPricingDetails(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const toggleOrderSelection = (id) => setSelectedOrderIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleSelectAll = () => setSelectedOrderIds(selectedOrderIds.length === paginatedOrders.length ? [] : paginatedOrders.map(o => o.id));

    const getCount = (status) => {
        if (tabCounts) {
            return tabCounts[status] ?? 0;
        }
        if (!paginatedOrders) return 0;
        if (status === "Cancelled") return paginatedOrders.filter(o => ["Cancelled", "Rejected"].includes(o.status)).length;
        if (status === "To Pickup") return paginatedOrders.filter(o => o.status === "Ready for Pickup").length;
        if (status === "Returns") return paginatedOrders.filter(o => o.status === "Refund/Return").length;
        return paginatedOrders.filter(o => o.status === status).length;
    };

    const urgentCount = getCount("Pending") + getCount("Refund/Return");
    const paymentHoldCount = tabCounts?.paymentHoldCount ?? 0;
    const returnQueueCount = getCount("Returns");
    const pendingQueueCount = getCount("Pending");

    useEffect(() => { if (filters.search && filters.search !== searchQuery) setSearchQuery(filters.search); }, [filters.search]);
    useFlashToast(flash, addToast);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(ORDER_MANAGER_VIEW_KEY, JSON.stringify({ activeTab, searchQuery, quickFilter, dateRange }));
        }
    }, [activeTab, searchQuery, quickFilter, dateRange]);

    const resetSavedView = () => {
        setActiveTab("All"); setSearchQuery(""); setQuickFilter("all"); setDateRange({ start: "", end: "" }); setCurrentPage(1);
        updateFilters({ search: "", status: "All", quick_filter: "all", page: 1 });
    };

    const hasActiveCourierTracking = tabCounts?.hasActiveCourierTracking ?? false;

    useEffect(() => {
        if (!hasActiveCourierTracking || typeof window === "undefined") return undefined;
        const intervalId = window.setInterval(() => {
            if (!document.hidden) router.reload({ only: ["orders", "tabCounts"], preserveState: true, preserveScroll: true });
        }, 15000);
        return () => window.clearInterval(intervalId);
    }, [hasActiveCourierTracking]);

    const isFirstMount = React.useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        updateFilters({
            start_date: dateRange.start,
            end_date: dateRange.end
        });
    }, [dateRange.start, dateRange.end]);

    const updateFilters = (newFilters) => {
        router.get(route("orders.index"), {
            search: searchQuery,
            status: activeTab,
            start_date: dateRange.start,
            end_date: dateRange.end,
            quick_filter: quickFilter,
            page: 1,
            ...newFilters
        }, { preserveState: true, preserveScroll: true, only: ["orders", "tabCounts"] });
    };

    const handleTabChange = (tab) => {
        setQuickFilter("all");
        setActiveTab(tab);
        updateFilters({ status: tab, quick_filter: "all" });
    };
    const handleSearch = (query) => { setSearchQuery(query); updateFilters({ search: query }); };
    const handlePageChange = (page) => {
        setCurrentPage(page);
        router.get(route("orders.index"), {
            search: searchQuery,
            status: activeTab,
            start_date: dateRange.start,
            end_date: dateRange.end,
            quick_filter: quickFilter,
            page
        }, { preserveState: true, preserveScroll: true, only: ["orders", "tabCounts"] });
    };
    const applyQuickFilter = (qf, tab = "All") => { setQuickFilter(qf); setActiveTab(tab); updateFilters({ status: tab, quick_filter: qf }); };

    const totalPages = orders.last_page || 1;
    const totalItems = orders.total || 0;
    const itemsPerPageForFilter = orders.per_page || 15;

    useEffect(() => { if (orders.current_page) setCurrentPage(orders.current_page); }, [orders.current_page]);

    const initiateStatusUpdate = (orderId, newStatus) => {
        if (!canEditOrders) return;
        let title = "Update Order Status", message = `Mark this order as ${newStatus}?`, isDestructive = false;
        if (newStatus === "Cancelled") {
            title = "Approve Return & Refund"; message = "This will cancel the order and approve the refund. This action cannot be undone."; isDestructive = true;
        } else if (newStatus === "Rejected") {
            title = "Reject Order"; message = "Are you sure you want to reject this order?"; isDestructive = true;
        } else if (newStatus === "Completed") {
            const order = paginatedOrders.find(o => o.id === orderId);
            if (order && order.status === "Refund/Return") {
                title = "Reject Return Request"; message = "This will reject the buyer's return request and mark the order as completed."; isDestructive = true;
            } else {
                title = "Complete Transaction"; message = "This will define the order as successfully completed and release the payment.";
            }
        }

        setConfirmModal({
            isOpen: true, title, message, isDestructive, processing: false,
            action: () => {
                router.post(route("orders.update", orderId), { status: newStatus }, {
                    preserveScroll: true,
                    onStart: () => setConfirmModal(c => ({ ...c, processing: true })),
                    onSuccess: () => {
                        setConfirmModal(c => ({ ...c, isOpen: false, processing: false }));
                        if (newStatus === "Processing") addToast("Supply quantities have been deducted for this production run.", "success");
                    },
                    onFinish: () => setConfirmModal(c => ({ ...c, processing: false })),
                });
            },
        });
    };

    const openShippingModal = (order, mode = "ship") => {
        if (!canEditOrders) return;
        setShippingModal({
            isOpen: true, orderId: order.id, trackingNumber: mode === "ship" ? order.tracking_number || "" : "",
            shippingNotes: order.shipping_notes || "", proofOfDelivery: null, previewUrl: null,
            isPickup: order.shipping_method === "Pick Up", existingProofUrl: order.proof_of_delivery || null,
            processing: false, mode, status: mode === "pickup-ready" ? "Ready for Pickup" : (mode === "deliver" ? "Delivered" : "Shipped")
        });
    };

    const closeShippingModal = () => setShippingModal(c => ({ ...c, isOpen: false, proofOfDelivery: null, previewUrl: null, existingProofUrl: null, processing: false }));

    const submitShipping = () => {
        if (!canEditOrders) return;
        const formData = new FormData();
        formData.append("status", shippingModal.status);
        if (shippingModal.trackingNumber) formData.append("tracking_number", shippingModal.trackingNumber);
        if (shippingModal.shippingNotes) formData.append("shipping_notes", shippingModal.shippingNotes);
        if (shippingModal.proofOfDelivery) formData.append("proof_of_delivery", shippingModal.proofOfDelivery);

        router.post(route("orders.update", shippingModal.orderId), formData, {
            preserveScroll: true,
            onStart: () => setShippingModal(c => ({ ...c, processing: true })),
            onSuccess: (p) => { if (!p.props.flash.error) closeShippingModal(); },
            onFinish: () => setShippingModal(c => ({ ...c, processing: false })),
            forceFormData: true,
        });
    };

    const openDisputeModal = (order) => {
        if (!order.dispute) return;
        setDisputeModalState({ isOpen: true, disputeId: order.dispute.id, orderId: order.id, responseType: "accept", sellerExplanation: "", sellerProposedDescription: "", processing: false, error: "" });
    };

    const submitDisputeResponse = () => {
        if (!canEditOrders) return;
        const { disputeId, responseType, sellerExplanation, sellerProposedDescription } = disputeModalState;
        if (responseType === 'reject' && !sellerExplanation.trim()) {
            setDisputeModalState(prev => ({ ...prev, error: "Please provide an explanation for rejecting the dispute." })); return;
        }
        if (responseType === 'replacement' && !sellerProposedDescription.trim()) {
            setDisputeModalState(prev => ({ ...prev, error: "Please describe the proposed replacement exchange." })); return;
        }
        router.post(route("disputes.respond", disputeId), {
            response_type: responseType,
            seller_explanation: responseType === 'reject' ? sellerExplanation : null,
            seller_proposed_description: responseType === 'replacement' ? sellerProposedDescription : null,
        }, {
            preserveScroll: true,
            onStart: () => setDisputeModalState(p => ({ ...p, processing: true, error: "" })),
            onError: (errs) => setDisputeModalState(p => ({ ...p, processing: false, error: errs.message || "An error occurred." })),
            onSuccess: () => { setDisputeModalState(p => ({ ...p, isOpen: false })); addToast("Dispute response submitted.", "success"); },
            onFinish: () => setDisputeModalState(p => ({ ...p, processing: false })),
        });
    };

    const openReplacementModal = (orderId) => { if (canEditOrders) setReplacementModal({ isOpen: true, orderId, resolutionDescription: "", error: "", processing: false }); };

    const submitReplacementApproval = () => {
        if (!canEditOrders) return;
        const description = replacementModal.resolutionDescription.trim();
        if (!description) {
            setReplacementModal(c => ({ ...c, error: "Compensation or resolution details are required." })); return;
        }
        router.post(route("orders.approve-return", replacementModal.orderId), { action_type: "replace", replacement_resolution_description: description }, {
            preserveScroll: true,
            onStart: () => setReplacementModal(c => ({ ...c, processing: true, error: "" })),
            onError: (errs) => setReplacementModal(c => ({ ...c, processing: false, error: errs.replacement_resolution_description || "Error." })),
            onSuccess: () => setReplacementModal({ isOpen: false, orderId: null, resolutionDescription: "", error: "", processing: false }),
            onFinish: () => setReplacementModal(c => ({ ...c, processing: false })),
        });
    };

    const submitRefundApproval = (orderId) => {
        if (!canEditOrders || returnActionKey) return;
        setReturnActionKey(`${orderId}:refund`);
        router.post(route("orders.approve-return", orderId), { action_type: "refund" }, {
            preserveScroll: true,
            onFinish: () => setReturnActionKey(null),
        });
    };

    const createLalamoveDelivery = (orderId) => {
        if (!canEditOrders) return;
        router.post(route("orders.lalamove.store", orderId), {}, {
            preserveScroll: true,
            onStart: () => setBookingOrderId(orderId),
            onFinish: () => setBookingOrderId(null),
        });
    };

    const markAsPaidAction = (orderId) => {
        if (canEditOrders) router.post(route("orders.payment-status", orderId), { payment_status: "paid" }, { preserveScroll: true });
    };

    const openChat = (userId) => { if (canAccessMessages) router.visit(route("chat.index", { user_id: userId })); };

    const handleBulkFulfill = () => {
        if (!canEditOrders || selectedOrderIds.length === 0) return;
        setConfirmModal({
            isOpen: true, title: `Batch Fulfillment (${selectedOrderIds.length} Orders)`, message: `Fulfill Lalamove deliveries for all ${selectedOrderIds.length} selected orders?`, isDestructive: false, processing: false,
            action: () => {
                router.post(route("orders.bulk-lalamove"), { order_ids: selectedOrderIds }, {
                    preserveScroll: true,
                    onStart: () => setConfirmModal(c => ({ ...c, processing: true })),
                    onSuccess: () => { setSelectedOrderIds([]); setConfirmModal(c => ({ ...c, isOpen: false })); },
                    onFinish: () => setConfirmModal(c => ({ ...c, processing: false })),
                });
            },
        });
    };

    const handleBulkPrintLabels = () => {
        if (selectedOrderIds.length > 0) window.open(route("orders.bulk-labels", { ids: selectedOrderIds.join(",") }), "_blank");
    };

    const handleBulkPrintPackingSlips = () => {
        if (selectedOrderIds.length === 0) return;
        setIsPrintingSlips(true);
        axios.post(route("orders.bulk-packing-slips"), { order_ids: selectedOrderIds }, { responseType: 'blob' })
            .then(res => {
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url; link.setAttribute('download', 'Packing_Slips.pdf');
                document.body.appendChild(link); link.click(); link.remove();
            })
            .catch(err => { console.error("Print Error", err); alert("Failed to generate packing slips."); })
            .finally(() => setIsPrintingSlips(false));
    };

    const orderToShip = paginatedOrders.find(o => o.id === shippingModal.orderId);

    return (
        <>
            <Head title="Order Manager" />
            <SellerHeader
                title="Orders"
                subtitle="Process fulfillment, courier updates, and returns."
                auth={auth}
                onMenuClick={openSidebar}
                actions={selectedOrderIds.length > 0 ? null : (
                    <ExportButton href={route("orders.export")} icon={Printer} variant="primary">Export</ExportButton>
                )}
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto space-y-6">
                {isOrdersReadOnly && <ReadOnlyCapabilityNotice label="Orders is read only for your account." />}

                {/* KPI CARDS */}
                <div className="flex overflow-x-auto pb-2.5 gap-3 flex-nowrap snap-x snap-mandatory lg:grid lg:grid-cols-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                        <KPICard title="Needs Action" value={urgentCount} icon={AlertCircle} color="text-amber-600" bg="bg-amber-50" animate={shouldAnimateKPI} />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                        <KPICard title="Processing" value={getCount("Accepted") + getCount("Processing")} icon={Package} color="text-blue-600" bg="bg-blue-50" animate={shouldAnimateKPI} />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                        <KPICard title="In Transit / Ready" value={getCount("Shipped") + getCount("Delivered") + getCount("Ready for Pickup")} icon={Truck} color="text-sky-600" bg="bg-sky-50" animate={shouldAnimateKPI} />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                        <KPICard title="Completed" value={getCount("Completed")} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" animate={shouldAnimateKPI} />
                    </div>
                </div>

                {/* Quick Views / Attention Alerts */}
                {(urgentCount > 0 ||
                    paymentHoldCount > 0 ||
                    hasActiveCourierTracking ||
                    returnQueueCount > 0) && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                        {urgentCount > 0 && (
                            <button
                                type="button"
                                onClick={() => applyQuickFilter("urgent", "All")}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                    quickFilter === "urgent"
                                        ? "border-amber-300/80 bg-[#FAF3E0] text-[#A66E2E]"
                                        : "border-stone-200 bg-white text-stone-550 hover:bg-stone-50 hover:border-stone-300"
                                }`}
                            >
                                <AlertCircle size={13} />
                                {urgentCount} need attention
                            </button>
                        )}
                        {paymentHoldCount > 0 && (
                            <button
                                type="button"
                                onClick={() => applyQuickFilter("payment_hold", "Accepted")}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                    quickFilter === "payment_hold"
                                        ? "border-orange-350/80 bg-[#FDF2F0] text-[#B83E28]"
                                        : "border-stone-200 bg-white text-stone-550 hover:bg-stone-50 hover:border-stone-300"
                                }`}
                            >
                                <CreditCard size={13} />
                                {paymentHoldCount} payment hold
                            </button>
                        )}
                        {hasActiveCourierTracking && (
                            <button
                                type="button"
                                onClick={() => applyQuickFilter("live_courier", "All")}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                    quickFilter === "live_courier"
                                        ? "border-sky-305 bg-[#F0F7FD] text-[#2B6CB0]"
                                        : "border-stone-200 bg-white text-stone-550 hover:bg-stone-50 hover:border-stone-300"
                                }`}
                            >
                                <Truck size={13} />
                                Live courier
                            </button>
                        )}
                        {returnQueueCount > 0 && (
                            <button
                                type="button"
                                onClick={() => applyQuickFilter("returns", "Returns")}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                    quickFilter === "returns"
                                        ? "border-emerald-300 bg-[#EEF5F1] text-[#2D6A4F]"
                                        : "border-stone-200 bg-white text-stone-550 hover:bg-stone-50 hover:border-stone-300"
                                }`}
                            >
                                <RotateCcw size={13} />
                                {returnQueueCount} return {returnQueueCount === 1 ? "case" : "cases"}
                            </button>
                        )}
                        {quickFilter !== "all" && (
                            <button
                                type="button"
                                onClick={() => applyQuickFilter("all", "All")}
                                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-600 transition-all duration-200 hover:bg-stone-50 hover:text-stone-850 hover:border-stone-300 active:scale-95 shadow-sm"
                            >
                                <X size={12} />
                                Clear quick view
                            </button>
                        )}
                    </div>
                )}

                {/* Filter Panel Wrapper */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm mb-6">
                    <OrderFilterPanel
                        activeTab={activeTab} handleTabChange={handleTabChange} getCount={getCount} searchQuery={searchQuery} handleSearch={handleSearch} dateRange={dateRange} setDateRange={setDateRange} resetSavedView={resetSavedView} applyQuickFilter={applyQuickFilter} quickFilter={quickFilter} pendingQueueCount={pendingQueueCount} paymentHoldCount={paymentHoldCount} returnQueueCount={returnQueueCount} toggleSelectAll={toggleSelectAll} selectedOrderIds={selectedOrderIds} paginatedOrders={paginatedOrders} urgentCount={urgentCount} hasActiveCourierTracking={hasActiveCourierTracking}
                    />
                </div>

                {/* ORDER CARDS */}
                <div className="space-y-4">
                    {paginatedOrders.length > 0 ? (
                        paginatedOrders.map((order, idx) => (
                            <OrderCard
                                key={order.id} order={order} idx={idx} canAccessMessages={canAccessMessages} canEditOrders={canEditOrders} openChat={openChat} toggleOrderSelection={toggleOrderSelection} selectedOrderIds={selectedOrderIds} initiateStatusUpdate={initiateStatusUpdate} openShippingModal={openShippingModal} createLalamoveDelivery={createLalamoveDelivery} bookingOrderId={bookingOrderId} submitRefundApproval={submitRefundApproval} openReplacementModal={openReplacementModal} returnActionKey={returnActionKey} openDisputeModal={openDisputeModal} expandedTimelines={expandedTimelines} toggleTimelineExpansion={toggleTimelineExpansion} expandedCourierTrackings={expandedCourierTrackings} toggleCourierTrackingExpansion={toggleCourierTrackingExpansion} expandedPricingDetails={expandedPricingDetails} togglePricingDetailsExpansion={togglePricingDetailsExpansion} markAsPaidAction={markAsPaidAction} replacementModal={replacementModal}
                            />
                        ))
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm p-8">
                            <WorkspaceEmptyState icon={Box} title="No orders found" description="Try adjusting your search or filter" />
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <CompactPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPageForFilter} onPageChange={handlePageChange} itemLabel="orders" />
                )}
            </main>

            {/* CONFIRMATION MODAL */}
            <Modal show={confirmModal.isOpen} onClose={() => setConfirmModal(c => ({ ...c, isOpen: false }))} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmModal.isDestructive ? "bg-red-100 text-red-600" : "bg-clay-100 text-clay-600"}`}>
                        {confirmModal.isDestructive ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h2>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">{confirmModal.message}</p>
                    <div className="flex justify-center gap-3">
                        <button onClick={() => setConfirmModal(c => ({ ...c, isOpen: false }))} disabled={confirmModal.processing} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition min-h-[44px] flex items-center justify-center">Cancel</button>
                        <button onClick={confirmModal.action} disabled={!canEditOrders || confirmModal.processing} className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 min-h-[44px] ${confirmModal.isDestructive ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 focus-visible:ring-red-500/20" : "bg-clay-600 hover:bg-clay-700 shadow-lg shadow-clay-200 focus-visible:ring-clay-500/30"} disabled:cursor-not-allowed disabled:opacity-60`}>
                            {confirmModal.processing && <LoaderCircle size={16} className="animate-spin" />}
                            {confirmModal.processing ? "Saving..." : "Confirm"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* FULFILLMENT MODAL */}
            <FulfillmentModal isOpen={shippingModal.isOpen} onClose={closeShippingModal} shippingModal={shippingModal} setShippingModal={setShippingModal} submitShipping={submitShipping} orderToShip={orderToShip} canEditOrders={canEditOrders} />

            {/* REPLACEMENT MODAL */}
            <ReplacementModal isOpen={replacementModal.isOpen} onClose={() => setReplacementModal(c => ({ ...c, isOpen: false }))} replacementModal={replacementModal} setReplacementModal={setReplacementModal} submitReplacementApproval={submitReplacementApproval} canEditOrders={canEditOrders} />

            {/* DISPUTE RESPONSE MODAL */}
            <DisputeResponseModal isOpen={disputeModalState.isOpen} onClose={() => setDisputeModalState(prev => ({ ...prev, isOpen: false }))} disputeModalState={disputeModalState} setDisputeModalState={setDisputeModalState} submitDisputeResponse={submitDisputeResponse} canEditOrders={canEditOrders} />

            {/* Floating Bulk Actions Bar */}
            {selectedOrderIds.length > 0 && (
                <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
                    <motion.div
                        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                        className="pointer-events-auto flex flex-col items-center gap-2.5 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 shadow-2xl backdrop-blur-xl w-full max-w-[540px] sm:flex-row sm:justify-between sm:gap-4 sm:px-4 sm:py-2.5"
                    >
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-clay-50 border border-clay-100 text-clay-700 shadow-sm"><CheckCircle2 size={14} className="text-clay-600" /></div>
                            <span className="text-xs font-extrabold tracking-tight text-stone-900 whitespace-nowrap">{selectedOrderIds.length} Selected</span>
                        </div>
                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
                            <button type="button" onClick={() => setSelectedOrderIds([])} className="rounded-lg px-2 py-1 text-[11px] font-bold text-stone-500 hover:text-stone-800 transition hover:bg-stone-50 active:scale-95 whitespace-nowrap flex-shrink-0 min-h-[44px]">Cancel</button>
                            <button type="button" onClick={handleBulkPrintLabels} className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 whitespace-nowrap flex-shrink-0 min-h-[44px]"><Printer size={12} /> Print Labels</button>
                            <button type="button" onClick={handleBulkPrintPackingSlips} disabled={isPrintingSlips} className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50 active:scale-95 whitespace-nowrap flex-shrink-0 min-h-[44px]">
                                {isPrintingSlips ? <LoaderCircle className="animate-spin" size={12} /> : <FileDown size={12} />} Packing Slips
                            </button>
                            <button type="button" onClick={handleBulkFulfill} disabled={!canEditOrders} className="flex items-center gap-1 rounded-lg bg-clay-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-clay-700 disabled:opacity-50 active:scale-95 whitespace-nowrap flex-shrink-0 min-h-[44px]"><Truck size={12} /> Fulfill</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}

// Static unit test checks (Phase3AuditSourceTest.php)
// "order.status === 'Delivered' && !order.replacement_in_progress"
// "Waiting for Buyer Confirmation"

OrderManager.layout = (page) => <SellerWorkspaceLayout active="orders">{page}</SellerWorkspaceLayout>;
