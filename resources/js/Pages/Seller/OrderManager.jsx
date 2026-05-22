import React, { useEffect, useState, useMemo, useRef } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { motion } from "framer-motion";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import ReadOnlyCapabilityNotice from "@/Components/ReadOnlyCapabilityNotice";
import SellerWorkspaceLayout, {
    useSellerWorkspaceShell,
} from "@/Layouts/SellerWorkspaceLayout";
import SellerHeader from "@/Components/SellerHeader";
import useSellerModuleAccess from "@/hooks/useSellerModuleAccess";
import KPICard from "@/Components/KPICard";
import InputLabel from "@/Components/InputLabel";
import WorkspaceEmptyState from "@/Components/WorkspaceEmptyState";
import {
    Download,
    ChevronRight,
    Hash,
    XCircle,
    Printer,
    Store,
    DollarSign,
    PenSquare,
    Edit,
    Edit3,
    X,
    Eye,
    EyeOff,
    LoaderCircle,
    MapPin,
    Search,
    Plus,
    Filter,
    FileText,
    DownloadCloud,
    AlertTriangle,
    MessageCircle,
    MoreVertical,
    Bell,
    Upload,
    ExternalLink,
    RefreshCw,
    Tag,
    Play,
    StopCircle,
    Building2,
    User,
    Camera as CameraIcon,
    Mail,
    Phone,
    Calendar,
    Star,
    Clock,
    Heart,
    PackageCheck,
    PackageOpen,
    RotateCcw,
    Truck,
    CheckCircle2,
    Package,
    CheckCircle,
    Save,
    Trash2,
    ArrowRight,
    Activity,
    CreditCard,
    ChevronLeft,
    AlertCircle,
    Box,
    ShoppingBag,
    Check,
    FileDown,
    ChevronDown,
} from "lucide-react";
import { useToast } from "@/Components/ToastContext";
import useFlashToast from "@/hooks/useFlashToast";
import CompactPagination from "@/Components/CompactPagination";
import ExportButton from "@/Components/ExportButton";
import ArtisanSkeleton from "@/Components/ArtisanSkeleton";


const Tab = ({ label, count, active, onClick, color = "clay" }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
            active
                ? "border-clay-600 text-clay-700 bg-clay-50/30"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
    >
        {label}
        {count > 0 && (
            <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    active
                        ? "bg-clay-600 text-white"
                        : "bg-gray-200 text-gray-600"
                }`}
            >
                {count}
            </span>
        )}
    </button>
);

const StatusBadge = ({ status }) => {
    const config = {
        Pending: {
            bg: "bg-amber-100",
            text: "text-amber-700",
            border: "border-amber-200",
            icon: Clock,
        },
        Accepted: {
            bg: "bg-blue-100",
            text: "text-blue-700",
            border: "border-blue-200",
            icon: PackageCheck,
        },
        Processing: {
            bg: "bg-indigo-100",
            text: "text-indigo-700",
            border: "border-indigo-200",
            icon: Play,
        },
        Shipped: {
            bg: "bg-sky-100",
            text: "text-sky-700",
            border: "border-sky-200",
            icon: Truck,
        },
        "Ready for Pickup": {
            bg: "bg-sky-100",
            text: "text-sky-700",
            border: "border-sky-200",
            icon: PackageCheck,
        },
        Delivered: {
            bg: "bg-teal-100",
            text: "text-teal-700",
            border: "border-teal-200",
            icon: MapPin,
        },
        Completed: {
            bg: "bg-green-100",
            text: "text-green-700",
            border: "border-green-200",
            icon: CheckCircle2,
        },
        "Refund/Return": {
            bg: "bg-orange-100",
            text: "text-orange-700",
            border: "border-orange-200",
            icon: RotateCcw,
        },
        Refunded: {
            bg: "bg-purple-100",
            text: "text-purple-700",
            border: "border-purple-200",
            icon: CreditCard,
        },
        Replaced: {
            bg: "bg-teal-100",
            text: "text-teal-700",
            border: "border-teal-200",
            icon: PackageCheck,
        },
        Rejected: {
            bg: "bg-red-100",
            text: "text-red-700",
            border: "border-red-200",
            icon: XCircle,
        },
        Cancelled: {
            bg: "bg-gray-100",
            text: "text-gray-500",
            border: "border-gray-200",
            icon: XCircle,
        },
    };

    const {
        bg,
        text,
        border,
        icon: Icon,
    } = config[status] || config["Pending"];
    const isUrgent = ["Pending", "Refund/Return"].includes(status);

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${bg} ${text} ${border} ${isUrgent ? "animate-pulse shadow-sm shadow-current/20" : ""}`}
        >
            <Icon size={12} />
            {status}
        </span>
    );
};

// Payment Status Badge
const PaymentStatusBadge = ({ status, method }) => {
    const config = {
        pending: {
            bg: "bg-yellow-100",
            text: "text-yellow-700",
            border: "border-yellow-200",
            label: "Unpaid",
        },
        paid: {
            bg: "bg-green-100",
            text: "text-green-700",
            border: "border-green-200",
            label: "Paid",
        },
        refunded: {
            bg: "bg-purple-100",
            text: "text-purple-700",
            border: "border-purple-200",
            label: "Refunded",
        },
    };

    const { bg, text, border, label } = config[status] || config["pending"];

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${bg} ${text} ${border}`}
        >
            <CreditCard size={10} />
            {label} - {method || "COD"}
        </span>
    );
};

const humanizeAddressType = (value) => {
    if (!value) return null;

    return String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const isLalamoveManagedOrder = (order) =>
    order?.shipping_method === "Delivery" &&
    !!order?.delivery?.external_order_id;

const lalamoveStatusConfig = (status) => {
    const normalized = String(status || "").toUpperCase();

    const configs = {
        ASSIGNING_DRIVER: {
            label: "Assigning Driver",
            tone: "border-sky-200 bg-sky-50 text-sky-700",
            detail: "Lalamove is looking for a courier.",
        },
        ON_GOING: {
            label: "On Going",
            tone: "border-sky-200 bg-sky-50 text-sky-700",
            detail: "Courier is actively handling the order.",
        },
        PICKED_UP: {
            label: "Picked Up",
            tone: "border-blue-200 bg-blue-50 text-blue-700",
            detail: "Package has already been picked up.",
        },
        COMPLETED: {
            label: "Completed",
            tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
            detail: "Courier marked the delivery as completed.",
        },
        CANCELED: {
            label: "Canceled",
            tone: "border-red-200 bg-red-50 text-red-700",
            detail: "Courier canceled the delivery.",
        },
        REJECTED: {
            label: "Rejected",
            tone: "border-red-200 bg-red-50 text-red-700",
            detail: "Lalamove rejected the delivery request.",
        },
        EXPIRED: {
            label: "Expired",
            tone: "border-amber-200 bg-amber-50 text-amber-700",
            detail: "The booking expired before courier completion.",
        },
    };

    return (
        configs[normalized] || {
            label: normalized || "Pending",
            tone: "border-gray-200 bg-gray-50 text-gray-700",
            detail: "Waiting for courier updates.",
        }
    );
};

const sellerCourierTrackingState = (order) => {
    const base = lalamoveStatusConfig(order?.delivery?.status);
    const isReplacementExchange =
        order?.delivery?.flow_type === "replacement_exchange";

    if (
        String(order?.delivery?.status || "").toUpperCase() === "COMPLETED" &&
        order?.status === "Delivered"
    ) {
        return {
            ...base,
            label: isReplacementExchange
                ? "Exchange Completed"
                : "Awaiting Buyer",
            tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
            detail: isReplacementExchange
                ? "Courier completed the replacement exchange. Waiting for the buyer to confirm receipt of the replacement item."
                : "Courier completed delivery. Waiting for the buyer to confirm receipt.",
        };
    }

    if (
        String(order?.delivery?.status || "").toUpperCase() === "COMPLETED" &&
        order?.status === "Completed"
    ) {
        return {
            ...base,
            label: isReplacementExchange
                ? "Exchange Resolved"
                : "Buyer Confirmed",
            tone: "border-green-200 bg-green-50 text-green-700",
            detail: isReplacementExchange
                ? "Courier completed the replacement exchange and the buyer already confirmed receipt."
                : "Courier completed delivery and the buyer already confirmed receipt.",
        };
    }

    if (isReplacementExchange) {
        return {
            ...base,
            detail: "Replacement exchange is in progress. Courier will deliver the replacement and return the rejected item to the seller.",
        };
    }

    return base;
};

const formatTimelineStamp = (value) => {
    if (!value) return "No timestamp";

    try {
        return new Intl.DateTimeFormat("en-PH", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(new Date(value));
    } catch {
        return value;
    }
};

const timelineSourceTone = (source) => {
    if (source === "courier") {
        return "border-sky-200 bg-sky-50 text-sky-700";
    }

    if (source === "status") {
        return "border-stone-200 bg-stone-100 text-stone-600";
    }

    return "border-clay-200 bg-clay-50 text-clay-700";
};

const sellerProofLabel = (order) => {
    if (!order?.proof_of_delivery) return null;

    if (order.shipping_method === "Pick Up") {
        return ["Delivered", "Completed"].includes(order.status)
            ? "Pickup Handover Proof"
            : "Pickup Readiness Proof";
    }

    return ["Delivered", "Completed"].includes(order.status)
        ? "Delivery Proof"
        : "Shipment Proof";
};

const sellerDeliverySummary = (order) => {
    if (order.shipping_method === "Pick Up") {
        if (order.status === "Accepted") {
            return {
                tone: "border-orange-200 bg-orange-50 text-orange-700",
                title: "Prepare for pickup",
                detail: "Upload a readiness photo before the buyer is notified for pickup.",
            };
        }

        if (order.status === "Ready for Pickup") {
            return {
                tone: "border-sky-200 bg-sky-50 text-sky-700",
                title: "Waiting for buyer pickup",
                detail: "Mark the order as picked up once the handover is complete.",
            };
        }

        return null;
    }

    if (isLalamoveManagedOrder(order)) {
        // The detailed "Courier Tracking" card below handles Lalamove status.
        // We return null here to prevent duplicating the status in a summary box.
        return null;
    }

    if (order.status === "Accepted") {
        return {
            tone: "border-blue-200 bg-blue-50 text-blue-700",
            title: "Choose a delivery path",
            detail: "Manual shipping needs shipment proof. Lalamove will handle courier status updates automatically.",
        };
    }

    if (order.status === "Shipped") {
        return {
            tone: "border-sky-200 bg-sky-50 text-sky-700",
            title: "Manual shipment in progress",
            detail: "Keep the shipment proof visible to the buyer, then upload final delivery proof when the parcel arrives.",
        };
    }

    if (order.status === "Delivered") {
        return {
            tone: "border-teal-200 bg-teal-50 text-teal-700",
            title: "Delivered, waiting for buyer confirmation",
            detail: "The buyer can now confirm receipt. Keep delivery proof available in case of disputes.",
        };
    }

    return null;
};

const sellerIssueSummary = (order) => {
    if (order.status === "Refund/Return") {
        return {
            tone: "border-orange-200 bg-orange-50",
            badgeTone: "border-orange-200 bg-white text-orange-700",
            icon: RotateCcw,
            title: "Return pending decision",
            detail: "Review the buyer proof, coordinate in chat if needed, then refund, replace, or reject the request.",
            timestampLabel: null,
            timestampValue: null,
            infoLabel: "Reason",
            infoValue: order.return_reason || "No reason provided.",
            proofHref: order.return_proof_image,
            proofLabel: "View Buyer Proof",
        };
    }

    if (order.replacement_in_progress) {
        return {
            tone: "border-teal-200 bg-teal-50",
            badgeTone: "border-teal-200 bg-white text-teal-700",
            icon: PackageCheck,
            title: "Replacement approved",
            detail:
                order.delivery?.flow_type === "replacement_exchange"
                    ? "Courier is handling the exchange. Wait for buyer confirmation before treating the case as closed."
                    : "Keep the replacement moving and wait for the buyer to confirm receipt to close the issue.",
            timestampLabel: "Approved",
            timestampValue: order.replacement_started_at,
            infoLabel: "Resolution",
            infoValue: order.replacement_resolution_description || null,
            proofHref: null,
            proofLabel: null,
        };
    }

    if (order.replacement_resolved_at || order.status === "Replaced") {
        return {
            tone: "border-emerald-200 bg-emerald-50",
            badgeTone: "border-emerald-200 bg-white text-emerald-700",
            icon: CheckCircle2,
            title: "Replacement completed",
            detail: "The buyer already confirmed receipt of the replacement item and the issue is resolved.",
            timestampLabel: "Resolved",
            timestampValue: order.replacement_resolved_at,
            infoLabel: "Resolution",
            infoValue: order.replacement_resolution_description || null,
            proofHref: null,
            proofLabel: null,
        };
    }

    if (order.status === "Refunded" || order.payment_status === "refunded") {
        return {
            tone: "border-purple-200 bg-purple-50",
            badgeTone: "border-purple-200 bg-white text-purple-700",
            icon: CreditCard,
            title: "Refund completed",
            detail: "The refund is already processed for this order. The return case is closed unless a new issue is opened.",
            timestampLabel: null,
            timestampValue: null,
            infoLabel: null,
            infoValue: null,
            proofHref: order.return_proof_image,
            proofLabel: order.return_proof_image ? "View Buyer Proof" : null,
        };
    }

    return null;
};

const ORDER_MANAGER_VIEW_KEY = "seller-order-manager-view";

const readStoredOrderManagerView = () => {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const parsed = JSON.parse(
            window.localStorage.getItem(ORDER_MANAGER_VIEW_KEY) || "null",
        );

        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        return {
            activeTab:
                typeof parsed.activeTab === "string" ? parsed.activeTab : "All",
            searchQuery:
                typeof parsed.searchQuery === "string"
                    ? parsed.searchQuery
                    : "",
            quickFilter:
                typeof parsed.quickFilter === "string"
                    ? parsed.quickFilter
                    : "all",
            dateRange: {
                start:
                    typeof parsed?.dateRange?.start === "string"
                        ? parsed.dateRange.start
                        : "",
                end:
                    typeof parsed?.dateRange?.end === "string"
                        ? parsed.dateRange.end
                        : "",
            },
        };
    } catch {
        return null;
    }
};

// --- MAIN COMPONENT ---
export default function OrderManager({ auth, orders = [] }) {
    const { addToast } = useToast();
    const paginatedOrders = Array.isArray(orders) ? orders : (orders?.data || []);
    const { openSidebar } = useSellerWorkspaceShell();
    const storedView = readStoredOrderManagerView();
    const { flash, sellerSidebar, filters = {} } = usePage().props;
    const canAccessMessages =
        sellerSidebar?.visibleModules?.includes("messages");
    const { canEdit: canEditOrders, isReadOnly: isOrdersReadOnly } =
        useSellerModuleAccess("orders");

    const [activeTab, setActiveTab] = useState(storedView?.activeTab || "All");
    const [searchQuery, setSearchQuery] = useState(
        filters.search || storedView?.searchQuery || "",
    );
    const [quickFilter, setQuickFilter] = useState(
        storedView?.quickFilter || "all",
    );
    const [dateRange, setDateRange] = useState(
        storedView?.dateRange || { start: "", end: "" },
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [bookingOrderId, setBookingOrderId] = useState(null);
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    const toggleOrderSelection = (orderId) => {
        setSelectedOrderIds((prev) =>
            prev.includes(orderId)
                ? prev.filter((id) => id !== orderId)
                : [...prev, orderId],
        );
    };

    const toggleSelectAll = () => {
        if (selectedOrderIds.length === paginatedOrders.length) {
            setSelectedOrderIds([]);
        } else {
            setSelectedOrderIds(paginatedOrders.map((o) => o.id));
        }
    };

    const getCount = (status) => {
        if (!paginatedOrders) return 0;
        if (status === "Cancelled")
            return paginatedOrders.filter((o) =>
                ["Cancelled", "Rejected"].includes(o.status),
            ).length;
        if (status === "To Pickup")
            return paginatedOrders.filter((o) => o.status === "Ready for Pickup").length;
        if (status === "Returns")
            return paginatedOrders.filter((o) => o.status === "Refund/Return").length;
        return paginatedOrders.filter((o) => o.status === status).length;
    };

    const getBOMWarning = (order) => {
        const issues = [];
        order.items.forEach((item) => {
            if (item.production_method === "manufactured" && item.recipes) {
                item.recipes.forEach((recipe) => {
                    const totalNeeded = recipe.quantity_required * item.qty;
                    if (recipe.supply_quantity < totalNeeded) {
                        issues.push(
                            `${recipe.supply_name}: Need ${totalNeeded} ${recipe.supply_unit}, have ${recipe.supply_quantity} ${recipe.supply_unit}`,
                        );
                    }
                });
            }
        });
        return issues;
    };

    const itemsPerPage = 10;

    // Sync search from URL (for Global Search support)
    useEffect(() => {
        if (filters.search && filters.search !== searchQuery) {
            setSearchQuery(filters.search);
        }
    }, [filters.search]);

    useFlashToast(flash, addToast);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        action: null,
        isDestructive: false,
        processing: false,
    });

    // Shipping Modal State
    const [shippingModal, setShippingModal] = useState({
        isOpen: false,
        orderId: null,
        status: "Shipped",
        mode: "ship",
        title: "Mark as Shipped",
        description: "Add tracking info for the buyer",
        confirmLabel: "Confirm Shipment",
        proofLabel: "Shipment Proof",
        proofHint: "Upload a photo of the packed parcel or courier handoff.",
        noteLabel: "Shipping Notes",
        notePlaceholder: "e.g. Driver contact: 0917-XXX-XXXX",
        proofRequired: true,
        allowTracking: true,
        existingProofUrl: null,
        trackingNumber: "",
        shippingNotes: "",
        proofOfDelivery: null,
        previewUrl: null,
        isPickup: false,
        processing: false,
    });

    const revokeShippingPreview = () => {
        if (shippingModal.previewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(shippingModal.previewUrl);
        }
    };

    const [replacementModal, setReplacementModal] = useState({
        isOpen: false,
        orderId: null,
        resolutionDescription: "",
        error: "",
        processing: false,
    });
    const [returnActionKey, setReturnActionKey] = useState(null);

    const hasActiveCourierTracking = useMemo(() => {
        return paginatedOrders.some((order) => {
            if (!isLalamoveManagedOrder(order)) {
                return false;
            }

            return !["COMPLETED", "CANCELED", "REJECTED", "EXPIRED"].includes(
                String(order?.delivery?.status || "").toUpperCase(),
            );
        });
    }, [paginatedOrders]);
    const paymentHoldCount = useMemo(
        () =>
            paginatedOrders.filter(
                (order) =>
                    order.payment_method !== "COD" &&
                    order.payment_status !== "paid" &&
                    order.status === "Accepted",
            ).length,
        [paginatedOrders],
    );
    const returnQueueCount = useMemo(
        () => paginatedOrders.filter((order) => order.status === "Refund/Return").length,
        [paginatedOrders],
    );
    const pendingQueueCount = useMemo(
        () => paginatedOrders.filter((order) => order.status === "Pending").length,
        [paginatedOrders],
    );

    useEffect(() => {
        if (!hasActiveCourierTracking || typeof window === "undefined") {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            if (document.hidden) {
                return;
            }

            router.reload({
                only: ["orders"],
                preserveState: true,
                preserveScroll: true,
            });
        }, 15000);

        return () => window.clearInterval(intervalId);
    }, [hasActiveCourierTracking]);

    // --- FILTER LOGIC (Server-Side) ---
    const updateFilters = (newFilters) => {
        const queryParams = {
            search: searchQuery,
            status: activeTab,
            page: 1, // Reset to page 1 on filter change
            ...newFilters,
        };

        router.get(route("orders.index"), queryParams, {
            preserveState: true,
            preserveScroll: true,
            only: ["orders"],
        });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        updateFilters({ status: tab });
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        updateFilters({ search: query });
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        router.get(route("orders.index"), {
            search: searchQuery,
            status: activeTab,
            page: page
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ["orders"],
        });
    };

    const applyQuickFilter = (qf, tab = "All") => {
        setQuickFilter(qf);
        setActiveTab(tab);
        updateFilters({ status: tab, quick_filter: qf });
    };

    // paginator structure from backend
    const totalPages = orders.last_page || 1;
    const totalItems = orders.total || 0;
    const itemsPerPageForFilter = orders.per_page || 15;

    useEffect(() => {
        if (orders.current_page) {
            setCurrentPage(orders.current_page);
        }
    }, [orders.current_page]);



    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        window.localStorage.setItem(
            ORDER_MANAGER_VIEW_KEY,
            JSON.stringify({
                activeTab,
                searchQuery,
                quickFilter,
                dateRange,
            }),
        );
    }, [activeTab, searchQuery, quickFilter, dateRange]);

    const resetSavedView = () => {
        setActiveTab("All");
        setSearchQuery("");
        setQuickFilter("all");
        setDateRange({ start: "", end: "" });
        setCurrentPage(1);
    };

    // --- ACTIONS ---
    const initiateStatusUpdate = (orderId, newStatus) => {
        if (!canEditOrders) return;
        let title = "Update Order Status";
        let message = `Mark this order as ${newStatus}?`;
        let isDestructive = false;

        if (newStatus === "Cancelled") {
            title = "Approve Return & Refund";
            message =
                "This will cancel the order and approve the refund. This action cannot be undone.";
            isDestructive = true;
        } else if (newStatus === "Rejected") {
            title = "Reject Order";
            message = "Are you sure you want to reject this order?";
            isDestructive = true;
        } else if (newStatus === "Completed") {
            const order = paginatedOrders.find((o) => o.id === orderId);
            if (order && order.status === "Refund/Return") {
                title = "Reject Return Request";
                message =
                    "This will reject the buyer's return request and mark the order as completed.";
                isDestructive = true;
            } else {
                title = "Complete Transaction";
                message =
                    "This will define the order as successfully completed and release the payment.";
                isDestructive = false;
            }
        }

        setConfirmModal({
            isOpen: true,
            title,
            message,
            isDestructive,
            processing: false,
            action: () => {
                router.post(
                    route("orders.update", orderId),
                    { status: newStatus },
                    {
                        preserveScroll: true,
                        onStart: () =>
                            setConfirmModal((current) => ({
                                ...current,
                                processing: true,
                            })),
                        onSuccess: () => {
                            setConfirmModal((current) => ({
                                ...current,
                                isOpen: false,
                                processing: false,
                            }));
                            if (newStatus === "Processing") {
                                addToast(
                                    "Supply quantities have been deducted for this production run.",
                                    "success",
                                );
                            }
                        },
                        onFinish: () =>
                            setConfirmModal((current) => ({
                                ...current,
                                processing: false,
                            })),
                    },
                );
            },
        });
    };

    const openShippingModal = (order, mode = "ship") => {
        if (!canEditOrders) return;
        revokeShippingPreview();

        const modalConfig = (() => {
            if (mode === "pickup-ready") {
                return {
                    mode,
                    status: "Ready for Pickup",
                    title: "Ready for Pickup",
                    description:
                        "Notify the buyer that the item is prepared for pickup.",
                    confirmLabel: "Confirm Ready",
                    proofLabel: "Pickup Readiness Photo",
                    proofHint:
                        "Upload a photo showing the packaged item is ready for pickup.",
                    noteLabel: "Pickup Instructions",
                    notePlaceholder: "e.g. Meet at lobby, look for blue shirt",
                    proofRequired: true,
                    allowTracking: false,
                };
            }

            if (mode === "deliver") {
                return {
                    mode,
                    status: "Delivered",
                    title:
                        order.shipping_method === "Pick Up"
                            ? "Mark as Picked Up"
                            : "Mark as Delivered",
                    description:
                        order.shipping_method === "Pick Up"
                            ? "Confirm the buyer has already picked up the order."
                            : "Confirm the parcel has reached the buyer and attach final proof.",
                    confirmLabel:
                        order.shipping_method === "Pick Up"
                            ? "Confirm Pickup"
                            : "Confirm Delivery",
                    proofLabel:
                        order.shipping_method === "Pick Up"
                            ? "Pickup Handover Photo"
                            : "Final Delivery Proof",
                    proofHint:
                        order.shipping_method === "Pick Up"
                            ? "Upload a new handover photo if you want to replace the existing pickup proof."
                            : "Upload a photo showing the order has been successfully delivered to the buyer.",
                    noteLabel:
                        order.shipping_method === "Pick Up"
                            ? "Pickup Notes"
                            : "Delivery Notes",
                    notePlaceholder:
                        order.shipping_method === "Pick Up"
                            ? "e.g. Buyer received at store counter"
                            : "e.g. Delivered to guard/reception with buyer approval",
                    proofRequired: order.shipping_method === "Delivery",
                    allowTracking: false,
                };
            }

            return {
                mode,
                status: "Shipped",
                title: "Dispatch Order",
                description:
                    "Add tracking info and shipment proof for the buyer.",
                confirmLabel: "Confirm Shipment",
                proofLabel: "Shipment Proof",
                proofHint:
                    "Upload a photo of the packed parcel or courier handoff.",
                noteLabel: "Shipping Notes",
                notePlaceholder: "e.g. Driver contact: 0917-XXX-XXXX",
                proofRequired: true,
                allowTracking: true,
            };
        })();

        setShippingModal({
            isOpen: true,
            orderId: order.id,
            trackingNumber: modalConfig.allowTracking
                ? order.tracking_number || ""
                : "",
            shippingNotes: order.shipping_notes || "",
            proofOfDelivery: null,
            previewUrl: null,
            isPickup: order.shipping_method === "Pick Up",
            existingProofUrl: order.proof_of_delivery || null,
            processing: false,
            ...modalConfig,
        });
    };

    const closeShippingModal = () => {
        revokeShippingPreview();
        setShippingModal((current) => ({
            ...current,
            isOpen: false,
            proofOfDelivery: null,
            previewUrl: null,
            existingProofUrl: null,
            processing: false,
        }));
    };

    useEffect(() => {
        return () => revokeShippingPreview();
    }, [shippingModal.previewUrl]);

    const openReplacementModal = (orderId) => {
        if (!canEditOrders) return;
        setReplacementModal({
            isOpen: true,
            orderId,
            resolutionDescription: "",
            error: "",
            processing: false,
        });
    };

    const closeReplacementModal = () => {
        setReplacementModal({
            isOpen: false,
            orderId: null,
            resolutionDescription: "",
            error: "",
            processing: false,
        });
    };

    const submitShipping = () => {
        if (!canEditOrders) return;
        const formData = new FormData();

        formData.append("status", shippingModal.status);
        if (shippingModal.allowTracking && shippingModal.trackingNumber) {
            formData.append("tracking_number", shippingModal.trackingNumber);
        }
        if (shippingModal.shippingNotes)
            formData.append("shipping_notes", shippingModal.shippingNotes);
        if (shippingModal.proofOfDelivery)
            formData.append("proof_of_delivery", shippingModal.proofOfDelivery);

        router.post(route("orders.update", shippingModal.orderId), formData, {
            preserveScroll: true,
            onStart: () =>
                setShippingModal((current) => ({
                    ...current,
                    processing: true,
                })),
            onSuccess: (page) => {
                if (!page.props.flash.error) {
                    closeShippingModal();
                }
            },
            onFinish: () =>
                setShippingModal((current) => ({
                    ...current,
                    processing: false,
                })),
            forceFormData: true,
        });
    };

    const createLalamoveDelivery = (orderId) => {
        if (!canEditOrders) return;
        router.post(
            route("orders.lalamove.store", orderId),
            {},
            {
                preserveScroll: true,
                onStart: () => setBookingOrderId(orderId),
                onFinish: () => setBookingOrderId(null),
            },
        );
    };

    const submitReplacementApproval = () => {
        if (!canEditOrders) return;
        const description = replacementModal.resolutionDescription.trim();

        if (!description) {
            setReplacementModal((current) => ({
                ...current,
                error: "Compensation or resolution details are required before approving a replacement.",
            }));
            return;
        }

        router.post(
            route("orders.approve-return", replacementModal.orderId),
            {
                action_type: "replace",
                replacement_resolution_description: description,
            },
            {
                preserveScroll: true,
                onStart: () =>
                    setReplacementModal((current) => ({
                        ...current,
                        processing: true,
                        error: "",
                    })),
                onError: (errors) =>
                    setReplacementModal((current) => ({
                        ...current,
                        processing: false,
                        error:
                            errors.replacement_resolution_description ||
                            errors.action_type ||
                            "Unable to approve replacement.",
                    })),
                onSuccess: () => closeReplacementModal(),
                onFinish: () =>
                    setReplacementModal((current) => ({
                        ...current,
                        processing: false,
                    })),
            },
        );
    };

    const submitRefundApproval = (orderId) => {
        if (!canEditOrders) return;
        if (returnActionKey || replacementModal.processing) {
            return;
        }

        const actionKey = `${orderId}:refund`;
        setReturnActionKey(actionKey);

        router.post(
            route("orders.approve-return", orderId),
            { action_type: "refund" },
            {
                preserveScroll: true,
                onFinish: () => setReturnActionKey(null),
            },
        );
    };

    const openChat = (userId) => {
        if (!canAccessMessages) return;
        router.visit(route("chat.index", { user_id: userId }));
    };

    const handleBulkFulfill = () => {
        if (!canEditOrders || selectedOrderIds.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: `Batch Fulfillment (${selectedOrderIds.length} Orders)`,
            message: `Are you sure you want to book Lalamove deliveries for all ${selectedOrderIds.length} selected orders? This will generate multiple delivery bookings.`,
            isDestructive: false,
            processing: false,
            action: () => {
                router.post(
                    route("orders.bulk-lalamove"),
                    { order_ids: selectedOrderIds },
                    {
                        preserveScroll: true,
                        onStart: () =>
                            setConfirmModal((current) => ({
                                ...current,
                                processing: true,
                            })),
                        onSuccess: () => {
                            setSelectedOrderIds([]);
                            setConfirmModal((current) => ({
                                ...current,
                                isOpen: false,
                                processing: false,
                            }));
                        },
                        onFinish: () =>
                            setConfirmModal((current) => ({
                                ...current,
                                processing: false,
                            })),
                    },
                );
            },
        });
    };

    const handleBulkPrintLabels = () => {
        if (selectedOrderIds.length === 0) return;
        const ids = selectedOrderIds.join(",");
        window.open(route("orders.bulk-labels", { ids }), "_blank");
    };

    // Get urgent count (pending + returns)
    const urgentCount = getCount("Pending") + getCount("Refund/Return");

    return (
        <>
            <Head title="Order Manager" />
            <SellerHeader
                title="Orders"
                subtitle="Process fulfillment, courier updates, and returns."
                auth={auth}
                onMenuClick={openSidebar}
                actions={
                    <ExportButton
                        href={route("orders.export")}
                        icon={Printer}
                        variant="primary"
                    >
                        Export
                    </ExportButton>
                }
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto space-y-6">
                {isOrdersReadOnly && (
                    <ReadOnlyCapabilityNotice label="Orders is read only for your account. Fulfillment and return actions are disabled." />
                )}

                {/* 1. KPI CARDS */}
                <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
                    <KPICard
                        title="Needs Action"
                        value={urgentCount}
                        icon={AlertCircle}
                        color="text-amber-600"
                        bg="bg-amber-50"
                    />
                    <KPICard
                        title="Processing"
                        value={getCount("Accepted")}
                        icon={Package}
                        color="text-blue-600"
                        bg="bg-blue-50"
                    />
                    <KPICard
                        title="In Transit / Ready"
                        value={
                            getCount("Shipped") +
                            getCount("Delivered") +
                            getCount("Ready for Pickup")
                        }
                        icon={Truck}
                        color="text-sky-600"
                        bg="bg-sky-50"
                    />
                    <KPICard
                        title="Completed"
                        value={getCount("Completed")}
                        icon={CheckCircle2}
                        color="text-green-600"
                        bg="bg-green-50"
                    />
                </div>

                {(urgentCount > 0 ||
                    paymentHoldCount > 0 ||
                    hasActiveCourierTracking ||
                    returnQueueCount > 0) && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                        {urgentCount > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    applyQuickFilter("urgent", "All")
                                }
                                className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[11px] font-bold transition-colors ${
                                    quickFilter === "urgent"
                                        ? "border-amber-300 bg-amber-50 text-amber-800"
                                        : "border-amber-200 text-amber-700 hover:bg-amber-50"
                                }`}
                            >
                                <AlertCircle size={13} />
                                {urgentCount} need attention
                            </button>
                        )}
                        {paymentHoldCount > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    applyQuickFilter(
                                        "payment_hold",
                                        "Processing",
                                    )
                                }
                                className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[11px] font-bold transition-colors ${
                                    quickFilter === "payment_hold"
                                        ? "border-red-300 bg-red-50 text-red-800"
                                        : "border-red-200 text-red-700 hover:bg-red-50"
                                }`}
                            >
                                <CreditCard size={13} />
                                {paymentHoldCount} payment hold
                            </button>
                        )}
                        {hasActiveCourierTracking && (
                            <button
                                type="button"
                                onClick={() =>
                                    applyQuickFilter("live_courier", "All")
                                }
                                className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[11px] font-bold transition-colors ${
                                    quickFilter === "live_courier"
                                        ? "border-blue-300 bg-blue-50 text-blue-800"
                                        : "border-blue-200 text-blue-700 hover:bg-blue-50"
                                }`}
                            >
                                <Truck size={13} />
                                Live courier
                            </button>
                        )}
                        {returnQueueCount > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    applyQuickFilter("returns", "Returns")
                                }
                                className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[11px] font-bold transition-colors ${
                                    quickFilter === "returns"
                                        ? "border-teal-300 bg-teal-50 text-teal-800"
                                        : "border-teal-200 text-teal-700 hover:bg-teal-50"
                                }`}
                            >
                                <RotateCcw size={13} />
                                {returnQueueCount} return{" "}
                                {returnQueueCount === 1 ? "case" : "cases"}
                            </button>
                        )}
                        {quickFilter !== "all" && (
                            <button
                                type="button"
                                onClick={() => applyQuickFilter("all", "All")}
                                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-600 transition-colors hover:bg-stone-100"
                            >
                                <X size={12} />
                                Clear quick view
                            </button>
                        )}
                    </div>
                )}

                {/* 2. ORDER BOARD */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    {/* Tabs */}
                        <OrderTabs activeTab={activeTab} getCount={getCount} handleTabChange={handleTabChange} />

                    {/* Filters & Search */}
                    <div className="flex flex-col items-stretch gap-3 border-b border-gray-50 bg-gray-50/30 p-3.5 md:flex-row md:items-center">
                        <div className="relative w-full md:w-80">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                size={14}
                            />
                            <input
                                type="text"
                                placeholder="Search order, buyer, or item..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs font-medium transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-200"
                            />
                        </div>
                        <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors focus-within:border-clay-500 focus-within:ring-2 focus-within:ring-clay-200 md:w-auto">
                            <Calendar className="text-gray-400" size={14} />
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) =>
                                        setDateRange({
                                            ...dateRange,
                                            start: e.target.value,
                                        })
                                    }
                                    className="border-none bg-transparent p-0 text-xs font-medium focus:ring-0 text-gray-600 placeholder-gray-400 cursor-pointer"
                                />
                                <span className="text-gray-300 font-medium text-xs">
                                    to
                                </span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) =>
                                        setDateRange({
                                            ...dateRange,
                                            end: e.target.value,
                                        })
                                    }
                                    className="border-none bg-transparent p-0 text-xs font-medium focus:ring-0 text-gray-600 placeholder-gray-400 cursor-pointer"
                                />
                            </div>
                            {(dateRange.start || dateRange.end) && (
                                <button
                                    onClick={() =>
                                        setDateRange({ start: "", end: "" })
                                    }
                                    aria-label="Clear date filters"
                                    className="text-gray-400 hover:text-red-500 transition-colors ml-1 p-0.5 rounded-md hover:bg-red-50"
                                    title="Clear dates"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={resetSavedView}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[11px] font-bold text-stone-600 transition-colors hover:bg-stone-50 md:ml-auto"
                        >
                            <RefreshCw size={13} />
                            Reset saved view
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-b border-gray-50 px-3 py-3 sm:px-4">
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("all", activeTab)}
                            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                quickFilter === "all"
                                    ? "border-clay-200 bg-clay-50 text-clay-700"
                                    : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                            }`}
                        >
                            All visible
                        </button>
                        {pendingQueueCount > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    applyQuickFilter("urgent", "Pending")
                                }
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                    quickFilter === "urgent" &&
                                    activeTab === "Pending"
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                                }`}
                            >
                                Pending queue
                            </button>
                        )}
                        {paymentHoldCount > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    applyQuickFilter(
                                        "payment_hold",
                                        "Processing",
                                    )
                                }
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                    quickFilter === "payment_hold"
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                                }`}
                            >
                                Payment hold
                            </button>
                        )}
                        {returnQueueCount > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    applyQuickFilter("returns", "Returns")
                                }
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                    quickFilter === "returns"
                                        ? "border-teal-200 bg-teal-50 text-teal-700"
                                        : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                                }`}
                            >
                                Return queue
                            </button>
                        )}

                        <div className="ml-auto flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div 
                                    onClick={toggleSelectAll}
                                    className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                        selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0
                                            ? "border-clay-600 bg-clay-600 text-white"
                                            : "border-stone-300 bg-white"
                                    }`}
                                >
                                    {selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 && (
                                        <Check size={14} strokeWidth={4} />
                                    )}
                                </div>
                                <span className="text-[11px] font-bold text-stone-600 uppercase tracking-tight">
                                    {selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 ? "Deselect All" : "Select All Page"}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Order List */}
                    <div className="space-y-3 p-3 sm:space-y-0 sm:p-0 sm:divide-y sm:divide-gray-100">
                        {paginatedOrders.length > 0 ? (
                            paginatedOrders.map((order, idx) => (
                                <OrderDetailsCard
                                    key={order.id}
                                    order={order}
                                    idx={idx}
                                    selectedOrderIds={selectedOrderIds}
                                    toggleOrderSelection={toggleOrderSelection}
                                    canAccessMessages={canAccessMessages}
                                    openChat={openChat}
                                    canEditOrders={canEditOrders}
                                    updateOrderStatus={initiateStatusUpdate}
                                    initiateShipping={openShippingModal}
                                    openReplacementApproval={openReplacementModal}
                                />
                            ))
                        ) : (
                            <WorkspaceEmptyState
                                icon={Box}
                                title="No orders found"
                                description="Try adjusting your search or filter"
                            />
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <CompactPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPageForFilter}
                            onPageChange={handlePageChange}
                            itemLabel="orders"
                        />
                    )}
                </div>
            </main>

            {/* --- CONFIRMATION MODAL --- */}
            <Modal
                show={confirmModal.isOpen}
                onClose={() =>
                    setConfirmModal({ ...confirmModal, isOpen: false })
                }
                maxWidth="sm"
            >
                <div className="p-6 text-center">
                    <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmModal.isDestructive ? "bg-red-100 text-red-600" : "bg-clay-100 text-clay-600"}`}
                    >
                        {confirmModal.isDestructive ? (
                            <AlertTriangle size={28} />
                        ) : (
                            <CheckCircle2 size={28} />
                        )}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">
                        {confirmModal.title}
                    </h2>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                        {confirmModal.message}
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() =>
                                setConfirmModal({
                                    ...confirmModal,
                                    isOpen: false,
                                })
                            }
                            disabled={confirmModal.processing}
                            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmModal.action}
                            disabled={!canEditOrders || confirmModal.processing}
                            className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 ${confirmModal.isDestructive ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 focus-visible:ring-red-500/20" : "bg-clay-600 hover:bg-clay-700 shadow-lg shadow-clay-200 focus-visible:ring-clay-500/30"} disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                            {confirmModal.processing && (
                                <LoaderCircle
                                    size={16}
                                    className="animate-spin"
                                />
                            )}
                            {confirmModal.processing ? "Saving..." : "Confirm"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* --- FULFILLMENT COMPOSER MODAL --- */}
            <ShippingModal
                shippingModal={shippingModal}
                setShippingModal={setShippingModal}
                orderToShip={paginatedOrders.find(o => o.id === shippingModal.orderId)}
                closeShippingModal={closeShippingModal}
                submitShipping={submitShipping}
                revokeShippingPreview={revokeShippingPreview}
                canEditOrders={canEditOrders}
            />

            {/* --- REPLACEMENT MODAL --- */}
            <ReplacementModal
                isOpen={replacementModal.isOpen}
                onClose={closeReplacementModal}
                processing={replacementModal.processing}
                resolutionDescription={replacementModal.resolutionDescription}
                error={replacementModal.error}
                canEditOrders={canEditOrders}
                setReplacementModal={setReplacementModal}
                submitReplacementApproval={submitReplacementApproval}
            />

            {/* Floating Bulk Actions Bar */}
            {selectedOrderIds.length > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-clay-200 bg-white/90 p-4 shadow-2xl backdrop-blur-md sm:w-auto sm:px-6"
                >
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-600 text-white shadow-lg shadow-clay-200">
                                <PackageCheck size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">
                                    {selectedOrderIds.length} Orders Selected
                                </p>
                                <p className="text-[11px] font-medium text-gray-500">
                                    Bulk actions for selected shipments
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedOrderIds([])}
                                className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 transition hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkPrintLabels}
                                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
                            >
                                <Printer size={14} />
                                Print Labels
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkFulfill}
                                disabled={!canEditOrders}
                                className="flex items-center gap-2 rounded-xl bg-clay-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-clay-200 transition hover:bg-clay-700 disabled:opacity-50"
                            >
                                <Truck size={14} />
                                Batch Fulfillment
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </>
    );
}

OrderManager.layout = (page) => (
    <SellerWorkspaceLayout active="orders">{page}</SellerWorkspaceLayout>
);
