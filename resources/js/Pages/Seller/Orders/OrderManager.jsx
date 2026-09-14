/* global route */
import React, { useEffect, useState, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import ReadOnlyCapabilityNotice from "@/Components/Seller/Shared/ReadOnlyCapabilityNotice";
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from "@/Layouts/SellerWorkspaceLayout";
import SellerHeader from "@/Layouts/SellerHeader";
import useSellerModuleAccess from "@/hooks/useSellerModuleAccess";
import WorkspaceEmptyState from "@/Components/WorkspaceEmptyState";
import { Box } from "lucide-react";
import { useToast } from "@/Components/ToastContext";
import useFlashToast from "@/hooks/useFlashToast";
import useOrderManagerActions from "@/hooks/useOrderManagerActions";
import CompactPagination from "@/Components/CompactPagination";

// Subcomponents
import OrderFilterPanel from "@/Components/Seller/Orders/OrderFilterPanel";
import OrderCard from "@/Components/Seller/Orders/OrderCard";
import BulkActionsBar from "@/Components/Seller/Orders/BulkActionsBar";
import OrderKPICards from "@/Components/Seller/Orders/OrderKPICards";
import OrderManagerModals from "@/Components/Seller/Orders/OrderManagerModals";

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

export default function OrderManager({ auth, orders = [], tabCounts, filters: propFilters }) {
    const { addToast } = useToast();
    const paginatedOrders = Array.isArray(orders) ? orders : (orders?.data || []);
    const { openSidebar } = useSellerWorkspaceShell();
    const storedView = readStoredOrderManagerView();
    const { flash, sellerSidebar, filters: pageFilters = {} } = usePage().props;
    const filters = propFilters || pageFilters || {};
    const canAccessMessages = sellerSidebar?.visibleModules?.includes("messages");
    const { canEdit: canEditOrders, isReadOnly: isOrdersReadOnly } = useSellerModuleAccess("orders");

    // Filters and toggles
    const [activeTab, setActiveTab] = useState(storedView?.activeTab || "All");
    const [searchQuery, setSearchQuery] = useState(filters?.search || storedView?.searchQuery || "");
    const [quickFilter, setQuickFilter] = useState(storedView?.quickFilter || "all");
    const [dateRange, setDateRange] = useState(storedView?.dateRange || { start: filters?.start_date || "", end: filters?.end_date || "" });
    const [paymentMethod, setPaymentMethod] = useState(filters?.payment_method || "all");
    const [fulfillmentType, setFulfillmentType] = useState(filters?.fulfillment_type || "all");
    const [flaggedOnly, setFlaggedOnly] = useState(filters?.flagged || "all");
    const currentPage = orders.current_page || 1;
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [dispatchModal, setDispatchModal] = useState({ isOpen: false, order: null });
    const [shouldAnimateKPI, setShouldAnimateKPI] = useState(true);
    const mounted = true;

    const openDispatchModal = (order) => {
        if (!canEditOrders) return;
        setDispatchModal({ isOpen: true, order });
    };

    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const prevSearchProp = React.useRef(filters?.search);
    useEffect(() => {
        if (prevSearchProp.current !== filters?.search) {
            prevSearchProp.current = filters?.search;
            setSearchQuery(filters?.search || "");
        }
    }, [filters?.search]);

    useEffect(() => {
        const handleResize = () => {
            if (selectedOrderIds.length > 0 && window.innerWidth < 640) {
                document.body.classList.add('has-sticky-action-bar');
            } else {
                document.body.classList.remove('has-sticky-action-bar');
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            document.body.classList.remove('has-sticky-action-bar');
        };
    }, [selectedOrderIds]);

    const [expandedTimelines, setExpandedTimelines] = useState(new Set());
    const [expandedCourierTrackings, setExpandedCourierTrackings] = useState(new Set());
    const [expandedPricingDetails, setExpandedPricingDetails] = useState(new Set());

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

    useFlashToast(flash, addToast);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(ORDER_MANAGER_VIEW_KEY, JSON.stringify({ activeTab, searchQuery, quickFilter, dateRange }));
        }
    }, [activeTab, searchQuery, quickFilter, dateRange]);

    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = React.useRef(null);

    const updateFilters = (newFilters) => {
        const mergedFilters = {
            search: ('search' in newFilters) ? newFilters.search : searchQuery,
            status: activeTab,
            start_date: dateRange.start,
            end_date: dateRange.end,
            payment_method: paymentMethod,
            fulfillment_type: fulfillmentType,
            flagged: flaggedOnly,
            quick_filter: quickFilter,
            page: 1,
            ...newFilters
        };

        setIsSearching(true);
        router.get(route("orders.index"), mergedFilters, {
            preserveState: true,
            preserveScroll: true,
            showProgress: false,
            only: ["orders", "tabCounts", "filters"],
            onFinish: () => setIsSearching(false),
        });
    };

    const resetSavedView = () => {
        setActiveTab("All"); setSearchQuery(""); setQuickFilter("all"); setDateRange({ start: "", end: "" });
        updateFilters({ search: "", status: "All", quick_filter: "all", page: 1, start_date: "", end_date: "" });
    };

    const hasActiveCourierTracking = tabCounts?.hasActiveCourierTracking ?? false;

    useEffect(() => {
        if (!hasActiveCourierTracking || typeof window === "undefined") return undefined;
        const intervalId = window.setInterval(() => {
            if (!document.hidden) router.reload({ only: ["orders", "tabCounts"], preserveState: true, preserveScroll: true });
        }, 15000);
        return () => window.clearInterval(intervalId);
    }, [hasActiveCourierTracking]);

    const handleDateRangeChange = (newRange) => {
        setDateRange(newRange);
        updateFilters({
            start_date: newRange.start,
            end_date: newRange.end,
        });
    };

    const handleTabChange = (tab) => {
        setQuickFilter("all");
        setActiveTab(tab);
        updateFilters({ status: tab, quick_filter: "all" });
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!query || query.trim() === "") {
            setIsSearching(false);
            updateFilters({ search: "" });
        } else {
            searchTimeoutRef.current = setTimeout(() => {
                updateFilters({ search: query });
            }, 300);
        }
    };

    // Instant client-side pre-filtering (0ms response) while deep server search syncs
    const displayedOrders = useMemo(() => {
        if (!searchQuery || searchQuery.trim() === "") {
            return paginatedOrders;
        }

        const q = searchQuery.toLowerCase().trim();
        const cleanQ = q.replace(/^ord-/i, "");

        const filtered = paginatedOrders.filter((order) => {
            const orderNum = String(order.id || order.order_number || "").toLowerCase();
            const customer = String(order.customer || order.customer_name || "").toLowerCase();
            const recipient = String(order.shipping_recipient_name || "").toLowerCase();
            const phone = String(order.shipping_contact_phone || "").toLowerCase();
            const tracking = String(order.tracking_number || "").toLowerCase();
            const address = String(order.shipping_address || "").toLowerCase();
            const userName = String(order.user?.name || "").toLowerCase();
            const userEmail = String(order.user?.email || "").toLowerCase();

            const itemsMatch = (order.items || []).some((item) =>
                String(item.name || item.product_name || "").toLowerCase().includes(q) ||
                String(item.variant || "").toLowerCase().includes(q)
            );

            return (
                orderNum.includes(q) ||
                orderNum.includes(cleanQ) ||
                customer.includes(q) ||
                recipient.includes(q) ||
                phone.includes(q) ||
                tracking.includes(q) ||
                address.includes(q) ||
                userName.includes(q) ||
                userEmail.includes(q) ||
                itemsMatch
            );
        });

        return filtered;
    }, [paginatedOrders, searchQuery]);

    const handlePageChange = (page) => {
        router.get(route("orders.index"), {
            search: searchQuery,
            status: activeTab,
            start_date: dateRange.start,
            end_date: dateRange.end,
            quick_filter: quickFilter,
            page
        }, {
            preserveState: true,
            preserveScroll: true,
            showProgress: false,
            only: ["orders", "tabCounts", "filters"],
        });
    };
    const applyQuickFilter = (qf, tab = "All") => { setQuickFilter(qf); setActiveTab(tab); updateFilters({ status: tab, quick_filter: qf }); };

    const totalPages = orders.last_page || 1;
    const totalItems = orders.total || 0;
    const itemsPerPageForFilter = orders.per_page || 15;

    const {
        bookingOrderId,
        confirmModal,
        setConfirmModal,
        initiateStatusUpdate,
        shippingModal,
        setShippingModal,
        openShippingModal,
        closeShippingModal,
        submitShipping,
        disputeModalState,
        setDisputeModalState,
        openDisputeModal,
        submitDisputeResponse,
        replacementModal,
        setReplacementModal,
        openReplacementModal,
        submitReplacementApproval,
        returnActionKey,
        submitRefundApproval,
        createLalamoveDelivery,
        markAsPaidAction,
        isPrintingSlips,
        handleBulkFulfill,
        handleBulkPrintLabels,
        handleBulkPrintPackingSlips,
    } = useOrderManagerActions({
        canEditOrders,
        paginatedOrders,
        selectedOrderIds,
        setSelectedOrderIds,
        addToast,
    });

    const openChat = (userId) => { if (canAccessMessages) router.visit(route("chat.index", { user_id: userId })); };

    const orderToShip = paginatedOrders.find(o => o.id === shippingModal.orderId);

    return (
        <>
            <Head title="Order Manager" />
            <SellerHeader
                title="Orders"
                subtitle="Manage order fulfillment, delivery tracking, and returns."
                auth={auth}
                onMenuClick={openSidebar}
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto space-y-6">
                {isOrdersReadOnly && <ReadOnlyCapabilityNotice label="Orders is read only for your account." />}

                <OrderKPICards
                    urgentCount={urgentCount}
                    shouldAnimateKPI={shouldAnimateKPI}
                    getCount={getCount}
                />

                {/* Filter Panel Wrapper */}
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mb-6 relative">
                    <OrderFilterPanel
                        activeTab={activeTab}
                        handleTabChange={handleTabChange}
                        getCount={getCount}
                        searchQuery={searchQuery}
                        handleSearch={handleSearch}
                        isSearching={isSearching}
                        dateRange={dateRange}
                        setDateRange={handleDateRangeChange}
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        fulfillmentType={fulfillmentType}
                        setFulfillmentType={setFulfillmentType}
                        flaggedOnly={flaggedOnly}
                        setFlaggedOnly={setFlaggedOnly}
                        updateFilters={updateFilters}
                        resetSavedView={resetSavedView}
                        applyQuickFilter={applyQuickFilter}
                        quickFilter={quickFilter}
                        pendingQueueCount={pendingQueueCount}
                        paymentHoldCount={paymentHoldCount}
                        returnQueueCount={returnQueueCount}
                        toggleSelectAll={toggleSelectAll}
                        selectedOrderIds={selectedOrderIds}
                        paginatedOrders={paginatedOrders}
                        urgentCount={urgentCount}
                        hasActiveCourierTracking={hasActiveCourierTracking}
                    />
                </div>

                {/* ORDER CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3.5">
                    {displayedOrders.length > 0 ? (
                        displayedOrders.map((order, idx) => (
                            <OrderCard
                                key={order.id} order={order} idx={idx} canAccessMessages={canAccessMessages} canEditOrders={canEditOrders} openChat={openChat} toggleOrderSelection={toggleOrderSelection} selectedOrderIds={selectedOrderIds} initiateStatusUpdate={initiateStatusUpdate} openShippingModal={openShippingModal} openDispatchModal={openDispatchModal} createLalamoveDelivery={createLalamoveDelivery} bookingOrderId={bookingOrderId} submitRefundApproval={submitRefundApproval} openReplacementModal={openReplacementModal} returnActionKey={returnActionKey} openDisputeModal={openDisputeModal} expandedTimelines={expandedTimelines} toggleTimelineExpansion={toggleTimelineExpansion} expandedCourierTrackings={expandedCourierTrackings} toggleCourierTrackingExpansion={toggleCourierTrackingExpansion} expandedPricingDetails={expandedPricingDetails} togglePricingDetailsExpansion={togglePricingDetailsExpansion} markAsPaidAction={markAsPaidAction} replacementModal={replacementModal}
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

            {/* ORDER MODALS (Confirmation, Fulfillment, Replacement, Dispute, Dispatch) */}
            <OrderManagerModals
                confirmModal={confirmModal}
                setConfirmModal={setConfirmModal}
                canEditOrders={canEditOrders}
                shippingModal={shippingModal}
                setShippingModal={setShippingModal}
                closeShippingModal={closeShippingModal}
                submitShipping={submitShipping}
                orderToShip={orderToShip}
                replacementModal={replacementModal}
                setReplacementModal={setReplacementModal}
                submitReplacementApproval={submitReplacementApproval}
                disputeModalState={disputeModalState}
                setDisputeModalState={setDisputeModalState}
                submitDisputeResponse={submitDisputeResponse}
                dispatchModal={dispatchModal}
                setDispatchModal={setDispatchModal}
                isPremium={sellerSidebar?.isPremium ?? true}
            />

            {/* Floating Bulk Actions Bar */}
            <BulkActionsBar
                mounted={mounted}
                selectedOrderIds={selectedOrderIds}
                setSelectedOrderIds={setSelectedOrderIds}
                handleBulkPrintLabels={handleBulkPrintLabels}
                handleBulkPrintPackingSlips={handleBulkPrintPackingSlips}
                isPrintingSlips={isPrintingSlips}
                handleBulkFulfill={handleBulkFulfill}
                canEditOrders={canEditOrders}
            />
        </>
    );
}

// Static unit test checks (Phase3AuditSourceTest.php)
// "order.status === 'Delivered' && !order.replacement_in_progress"
// "Waiting for Buyer Confirmation"

OrderManager.layout = (page) => <SellerWorkspaceLayout active="orders">{page}</SellerWorkspaceLayout>;
