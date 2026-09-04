/* global route */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import SlideOverDrawer from "@/Components/SlideOverDrawer";
import {
    Truck,
    UserCheck,
    MapPin,
    PackageOpen,
    Phone,
    CheckCircle2,
    LoaderCircle,
    X,
    GripVertical,
    AlertTriangle,
    ShieldAlert,
    User,
    Scale,
    Car,
    Bike,
    Receipt,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useToast } from "@/Components/ToastContext";

export default function DispatchOrderModal({
    isOpen,
    onClose,
    order,
    canEditOrders = true,
    isPremium = true,
}) {
    const { addToast } = useToast();
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState(isPremium ? "in_house" : "lalamove");
    const [drivers, setDrivers] = useState([]);
    const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
    const [selectedDriverId, setSelectedDriverId] = useState(null);
    const [dispatchNotes, setDispatchNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isDraggingAny, setIsDraggingAny] = useState(false);
    const [draggedDriverId, setDraggedDriverId] = useState(null);
    const [isItemsExpanded, setIsItemsExpanded] = useState(false);

    // Auto-scroll and scroll container refs
    const contentWrapperRef = useRef(null);
    const modalBodyRef = useRef(null);
    const driverListRef = useRef(null);
    const autoScrollRafRef = useRef(null);
    const scrollTargetRef = useRef(null);

    useEffect(() => {
        const checkMobile = () => {
            const isTouch = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
            setIsMobile(window.innerWidth < 1024 || isTouch);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Fetch live drivers whenever modal opens
    useEffect(() => {
        let isMounted = true;
        if (isOpen && isPremium) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLoadingDrivers(true);
            axios
                .get(route("orders.dispatch.drivers"))
                .then((res) => {
                    if (!isMounted) return;
                    const fetchedDrivers = res.data.drivers || [];
                    setDrivers(fetchedDrivers);
                    // Pre-select first available driver if none selected
                    const firstAvailable = fetchedDrivers.find((d) => d.status === "available");
                    setSelectedDriverId((prevId) => prevId || firstAvailable?.id || null);
                })
                .catch(() => {
                    if (!isMounted) return;
                    addToast("Failed to load driver roster.", "error");
                })
                .finally(() => {
                    if (isMounted) {
                        setIsLoadingDrivers(false);
                    }
                });
        }
        return () => {
            isMounted = false;
        };
    }, [isOpen, isPremium, addToast]);

    const orderNumber = order?.order_number || order?.id || "";
    const recipientName = order?.customer || order?.shipping_recipient_name || order?.buyer?.name || "Customer";
    const contactPhone = order?.shipping_contact_phone || order?.contact_number || order?.buyer?.phone || "No phone provided";
    const deliveryAddress = order?.shipping_address || order?.delivery_address || "Store Pickup";
    const items = order?.items || [];
    const shippingFeeAmount = Number(order?.shipping_fee_amount ?? order?.shipping_fee ?? 0);
    const hasShippingFee = !isNaN(shippingFeeAmount) && shippingFeeAmount > 0;

    const resolvedWeightKg = (() => {
        if (!order) return 1.0;
        if (order.total_weight_kg !== undefined && order.total_weight_kg !== null && !isNaN(Number(order.total_weight_kg))) {
            return Number(order.total_weight_kg);
        }
        if (order.vehicle_info?.total_weight_kg !== undefined && !isNaN(Number(order.vehicle_info.total_weight_kg))) {
            return Number(order.vehicle_info.total_weight_kg);
        }
        let raw = 0;
        items.forEach((it) => {
            const w = Number(it.weight ?? (it.is_b2b_supply ? 2.5 : 1.0));
            const q = Number(it.qty ?? it.quantity ?? 1);
            raw += w * q;
        });
        return Math.max(0.5, Math.round(raw * 1.1 * 10) / 10);
    })();

    const recommendedVehicle = (() => {
        if (!order) return "Motorcycle";
        if (order.recommended_vehicle) {
            return order.recommended_vehicle;
        }
        if (order.vehicle_info?.label) {
            return order.vehicle_info.label;
        }
        if (resolvedWeightKg <= 20) return "Motorcycle";
        if (resolvedWeightKg <= 200) return "4-Wheel Sedan";
        if (resolvedWeightKg <= 300) return "MPV (300 kg)";
        return "Van / Light Truck";
    })();

    const isHeavyOrder = resolvedWeightKg > 20;

    const getDriverVehicleSuitability = (driverVehicleType, weightKg) => {
        const type = (driverVehicleType || "Motorcycle").toLowerCase();
        let maxCapacity = 20;
        if (type.includes("bicycle") || type.includes("bike")) maxCapacity = 10;
        else if (type.includes("sedan") || type.includes("car")) maxCapacity = 200;
        else if (type.includes("mpv")) maxCapacity = 300;
        else if (type.includes("van") || type.includes("truck")) maxCapacity = 1000;

        if (weightKg > maxCapacity) {
            return {
                suitable: false,
                badge: `Exceeds ${maxCapacity}kg limit`,
                badgeClass: "bg-rose-50 text-rose-700 border border-rose-200",
            };
        }
        if (weightKg > 20 && maxCapacity >= weightKg) {
            return {
                suitable: true,
                badge: "Capacity match",
                badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
            };
        }
        return null;
    };

    const formatDriverCompensation = (driver) => {
        if (!driver) return null;
        const compType = driver.delivery_compensation_type || "salary";
        const feeRate = Number(driver.delivery_fee_rate || 0);

        if (compType === "per_delivery" && feeRate > 0) {
            return `₱${feeRate.toFixed(2)} / drop`;
        }
        if (compType === "hybrid" && feeRate > 0) {
            return `Base + ₱${feeRate.toFixed(2)} drop`;
        }
        return "Monthly Salary";
    };

    const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

    // Smart driver ordering: available & vehicle-suitable first, on-delivery next, off-duty last
    const sortedDrivers = useMemo(() => {
        return [...drivers].sort((a, b) => {
            const statusRank = (status) => {
                if (status === "available") return 0;
                if (status === "on_delivery") return 1;
                if (status === "on_break") return 2;
                return 3;
            };

            const rankA = statusRank(a.status);
            const rankB = statusRank(b.status);
            if (rankA !== rankB) return rankA - rankB;

            if (resolvedWeightKg > 20) {
                const suitA = getDriverVehicleSuitability(a.vehicle_type, resolvedWeightKg);
                const suitB = getDriverVehicleSuitability(b.vehicle_type, resolvedWeightKg);
                const aSuitable = suitA?.suitable ? 1 : 0;
                const bSuitable = suitB?.suitable ? 1 : 0;
                if (aSuitable !== bSuitable) return bSuitable - aSuitable;
            }

            return (a.name || "").localeCompare(b.name || "");
        });
    }, [drivers, resolvedWeightKg]);

    // Auto-scroll loop using requestAnimationFrame
    const stopAutoScroll = useCallback(() => {
        if (autoScrollRafRef.current) {
            window.cancelAnimationFrame(autoScrollRafRef.current);
            autoScrollRafRef.current = null;
        }
        scrollTargetRef.current = null;
    }, []);

    const startAutoScroll = useCallback((element, speed) => {
        if (!element) return;
        scrollTargetRef.current = { element, speed };
        if (!autoScrollRafRef.current) {
            const step = () => {
                if (scrollTargetRef.current && scrollTargetRef.current.element) {
                    const { element: el, speed: sp } = scrollTargetRef.current;
                    if (sp < 0 && el.scrollTop <= 0) {
                        autoScrollRafRef.current = null;
                        return;
                    }
                    if (sp > 0 && Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight) {
                        autoScrollRafRef.current = null;
                        return;
                    }
                    el.scrollTop += sp;
                    autoScrollRafRef.current = window.requestAnimationFrame(step);
                } else {
                    autoScrollRafRef.current = null;
                }
            };
            autoScrollRafRef.current = window.requestAnimationFrame(step);
        }
    }, []);

    // Global dragover auto-scroll and mouse wheel scrolling while dragging
    useEffect(() => {
        if (!isDraggingAny) {
            stopAutoScroll();
            return;
        }

        const handleGlobalDragOver = (e) => {
            const clientY = e.clientY;
            const clientX = e.clientX;

            const modalContainer = contentWrapperRef.current?.closest(".overflow-y-auto") || modalBodyRef.current;

            const checkAndScroll = (container, threshold = 65, maxSpeed = 16) => {
                if (!container) return false;
                const rect = container.getBoundingClientRect();
                if (clientX < rect.left - 40 || clientX > rect.right + 40) return false;

                // Near or past top edge -> scroll up
                if (clientY <= rect.top + threshold && clientY >= rect.top - 80) {
                    if (container.scrollTop > 0) {
                        const dist = rect.top + threshold - clientY;
                        const intensity = Math.min(1.5, Math.max(0.2, dist / threshold));
                        startAutoScroll(container, -Math.round(intensity * maxSpeed));
                        return true;
                    }
                }
                // Near or past bottom edge -> scroll down
                if (clientY >= rect.bottom - threshold && clientY <= rect.bottom + 80) {
                    if (Math.ceil(container.scrollTop + container.clientHeight) < container.scrollHeight) {
                        const dist = clientY - (rect.bottom - threshold);
                        const intensity = Math.min(1.5, Math.max(0.2, dist / threshold));
                        startAutoScroll(container, Math.round(intensity * maxSpeed));
                        return true;
                    }
                }
                return false;
            };

            // Check driver list first if cursor is within its bounds
            let handled = checkAndScroll(driverListRef.current, 50, 14);
            if (!handled) {
                // Fall back to modal body container
                handled = checkAndScroll(modalContainer, 75, 18);
            }

            if (!handled) {
                stopAutoScroll();
            }
        };

        const handleWheel = (e) => {
            const modalContainer = contentWrapperRef.current?.closest(".overflow-y-auto") || modalBodyRef.current;
            if (driverListRef.current && driverListRef.current.contains(e.target)) {
                e.preventDefault();
                driverListRef.current.scrollTop += e.deltaY;
            } else if (modalContainer) {
                e.preventDefault();
                modalContainer.scrollTop += e.deltaY;
            }
        };

        const handleGlobalDragEnd = () => {
            setIsDraggingAny(false);
            setDraggedDriverId(null);
            setIsDraggingOver(false);
            stopAutoScroll();
        };

        window.addEventListener("dragover", handleGlobalDragOver, { capture: true, passive: false });
        window.addEventListener("wheel", handleWheel, { passive: false });
        window.addEventListener("dragend", handleGlobalDragEnd);
        window.addEventListener("drop", handleGlobalDragEnd);
        window.addEventListener("mouseup", handleGlobalDragEnd);

        return () => {
            window.removeEventListener("dragover", handleGlobalDragOver, { capture: true });
            window.removeEventListener("wheel", handleWheel);
            window.removeEventListener("dragend", handleGlobalDragEnd);
            window.removeEventListener("drop", handleGlobalDragEnd);
            window.removeEventListener("mouseup", handleGlobalDragEnd);
            stopAutoScroll();
        };
    }, [isDraggingAny, startAutoScroll, stopAutoScroll]);

    // Drag and Drop handlers
    const handleDragStart = (e, driverId) => {
        setDraggedDriverId(driverId);
        setIsDraggingAny(true);
        e.dataTransfer.setData("text/plain", String(driverId));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnd = () => {
        setIsDraggingAny(false);
        setDraggedDriverId(null);
        stopAutoScroll();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isDraggingOver) setIsDraggingOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        setIsDraggingAny(false);
        stopAutoScroll();
        const driverId = Number(e.dataTransfer.getData("text/plain") || draggedDriverId);
        if (driverId) {
            setSelectedDriverId(driverId);
            const driver = drivers.find((d) => d.id === driverId);
            if (driver) {
                addToast(`Assigned ${driver.name} to Order #${orderNumber}`, "info");
            }
        }
        setDraggedDriverId(null);
    };

    // Form submission
    const handleConfirmDispatch = (e) => {
        if (e) e.preventDefault();

        if (activeTab === "in_house") {
            if (!selectedDriverId) {
                addToast("Please select a studio driver to dispatch this order.", "error");
                return;
            }

            setIsSubmitting(true);
            router.post(
                route("orders.dispatch-in-house", orderNumber),
                {
                    employee_id: selectedDriverId,
                    dispatch_notes: dispatchNotes,
                },
                {
                    onSuccess: () => {
                        setIsSubmitting(false);
                        onClose();
                    },
                    onError: (errs) => {
                        setIsSubmitting(false);
                        const msg = Object.values(errs)[0] || "Failed to dispatch order with studio driver.";
                        addToast(msg, "error");
                    },
                }
            );
        } else {
            // Lalamove dispatch
            setIsSubmitting(true);
            router.post(
                route("orders.lalamove.store", orderNumber),
                {},
                {
                    onSuccess: () => {
                        setIsSubmitting(false);
                        onClose();
                    },
                    onError: (errs) => {
                        setIsSubmitting(false);
                        const msg = Object.values(errs)[0] || "Failed to book Lalamove courier.";
                        addToast(msg, "error");
                    },
                }
            );
        }
    };

    if (!order) return null;

    const renderContent = () => (
        <div ref={contentWrapperRef} className="space-y-6">
            {/* Courier Mode Switcher Pill */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <div className="flex items-center gap-1.5 rounded-xl bg-stone-100 p-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab("in_house")}
                        className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                            activeTab === "in_house"
                                ? "bg-white text-stone-900 shadow-xs"
                                : "text-stone-500 hover:text-stone-800"
                        }`}
                    >
                        <UserCheck size={14} className="text-clay-600" />
                        <span>Studio Fleet (In-House)</span>
                        {isPremium && (
                            <span className="rounded bg-clay-100 px-1.5 py-0.5 text-[9px] font-bold text-clay-700">
                                Premium
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("lalamove")}
                        className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                            activeTab === "lalamove"
                                ? "bg-white text-stone-900 shadow-xs"
                                : "text-stone-500 hover:text-stone-800"
                        }`}
                    >
                        <Truck size={14} className="text-stone-500" />
                        <span>Lalamove (3rd-Party)</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: STUDIO FLEET (IN-HOUSE) */}
            {activeTab === "in_house" && (
                <>
                    {!isPremium ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center">
                            <ShieldAlert size={36} className="mx-auto text-amber-600 mb-2" />
                            <h3 className="text-base font-bold text-amber-900 mb-1">
                                Premium Tier Feature
                            </h3>
                            <p className="text-xs text-amber-700 max-w-md mx-auto mb-4 leading-relaxed">
                                In-House Studio Fleet dispatch with real-time driver tracking and proof-of-delivery is exclusively available on Premium and Elite plans.
                            </p>
                            <button
                                type="button"
                                onClick={() => setActiveTab("lalamove")}
                                className="rounded-xl bg-amber-800 px-4 py-2 text-xs font-bold text-white hover:bg-amber-900 transition"
                            >
                                Use Lalamove Courier Instead
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            {/* LEFT COLUMN: Order Parcel & Drop Target */}
                            <div className="lg:col-span-5 space-y-3">
                                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
                                    <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                                        <div className="flex items-center gap-2">
                                            <PackageOpen size={15} className="text-clay-600" />
                                            <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                                                Parcel Destination
                                            </span>
                                        </div>
                                        <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[10px] font-bold text-stone-600">
                                            #{orderNumber}
                                        </span>
                                    </div>

                                    {/* Customer & Address */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-bold text-stone-900 truncate">
                                                {recipientName}
                                            </p>
                                            <p className="text-[11px] text-stone-500 font-medium flex items-center gap-1 shrink-0">
                                                <Phone size={11} className="text-stone-400" />
                                                <span>{contactPhone}</span>
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-100 flex items-start gap-2">
                                            <MapPin size={14} className="text-clay-600 shrink-0 mt-0.5" />
                                            <p className="text-[11px] font-medium text-stone-800 leading-relaxed">
                                                {deliveryAddress}
                                            </p>
                                        </div>
                                    </div>

                                    {/* LOGISTICS SPECS: 3-Stat Compact Grid */}
                                    <div className="rounded-xl border border-stone-200/80 bg-stone-50/80 p-2.5">
                                        <div className="grid grid-cols-3 divide-x divide-stone-200/80 text-center">
                                            <div className="px-1">
                                                <span className="text-[10px] font-semibold text-stone-500 flex items-center justify-center gap-1">
                                                    <Scale size={11} className="text-clay-600" />
                                                    Weight
                                                </span>
                                                <p className="font-mono text-xs font-bold text-stone-900 mt-0.5">
                                                    {resolvedWeightKg.toFixed(1)} kg
                                                </p>
                                            </div>
                                            <div className="px-1">
                                                <span className="text-[10px] font-semibold text-stone-500 flex items-center justify-center gap-1">
                                                    {isHeavyOrder ? (
                                                        <Car size={11} className="text-clay-600" />
                                                    ) : (
                                                        <Bike size={11} className="text-clay-600" />
                                                    )}
                                                    Vehicle
                                                </span>
                                                <p className="text-xs font-bold text-stone-900 mt-0.5 truncate" title={recommendedVehicle}>
                                                    {recommendedVehicle}
                                                </p>
                                            </div>
                                            <div className="px-1">
                                                <span className="text-[10px] font-semibold text-stone-500 flex items-center justify-center gap-1">
                                                    <Receipt size={11} className="text-clay-600" />
                                                    Shipping Fee
                                                </span>
                                                <p className="font-mono text-xs font-bold text-emerald-700 mt-0.5">
                                                    {hasShippingFee ? `₱${shippingFeeAmount.toFixed(0)}` : "Free"}
                                                </p>
                                            </div>
                                        </div>

                                        {isHeavyOrder && (
                                            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-[10px] text-amber-900 border border-amber-200/60 leading-snug">
                                                <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-600" />
                                                <span>Exceeds standard 20 kg motorcycle capacity. Assign a 4-wheel vehicle (Sedan, MPV, or Van).</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Collapsible Items Preview */}
                                    {items.length > 0 && (
                                        <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                                    Items ({items.length})
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsItemsExpanded(!isItemsExpanded)}
                                                    className="flex items-center gap-1 text-[11px] font-semibold text-clay-700 hover:text-clay-800 transition"
                                                >
                                                    <span>{isItemsExpanded ? "Hide items" : "Show items"}</span>
                                                    {isItemsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                            </div>
                                            {isItemsExpanded && (
                                                <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1 pt-1.5 border-t border-stone-200/60">
                                                    {items.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between rounded-lg bg-white p-2 text-xs border border-stone-100 shadow-2xs"
                                                        >
                                                            <span className="truncate font-medium text-stone-700 max-w-[200px]">
                                                                {item.name || item.product_name}
                                                                {item.weight && (
                                                                    <span className="text-[10px] text-stone-400 ml-1">
                                                                        ({Number(item.weight).toFixed(1)} kg)
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="font-bold text-stone-900">
                                                                ×{item.qty || item.quantity || 1}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Drag & Drop Target Zone */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`relative rounded-2xl border-2 border-dashed p-3.5 text-center transition-all ${
                                        isDraggingOver
                                            ? "border-clay-500 bg-clay-50/80 scale-[1.01] shadow-xs"
                                            : isDraggingAny && !selectedDriver
                                            ? "border-clay-400 bg-clay-50/40 ring-2 ring-clay-400/20"
                                            : selectedDriver
                                            ? isDraggingOver
                                                ? "border-clay-500 bg-clay-100/60 ring-2 ring-clay-500"
                                                : "border-emerald-300 bg-emerald-50/40"
                                            : "border-stone-200 bg-stone-50/40 hover:border-stone-300"
                                    }`}
                                >
                                    {selectedDriver ? (
                                        <div className="flex items-center justify-between text-left">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm shadow-xs">
                                                    <UserCheck size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                            Assigned Studio Driver
                                                        </p>
                                                        {isDraggingOver && (
                                                            <span className="text-[9px] font-bold text-clay-700 bg-clay-100 px-1.5 rounded animate-pulse">
                                                                Drop to swap
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-bold text-stone-900 truncate">
                                                        {selectedDriver.name}
                                                    </p>
                                                    <p className="text-[11px] text-stone-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                                        <span>{selectedDriver.vehicle_type}</span>
                                                        {selectedDriver.vehicle_plate_number && <span>• {selectedDriver.vehicle_plate_number}</span>}
                                                        {formatDriverCompensation(selectedDriver) && (
                                                            <span className="rounded bg-emerald-100/70 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                                                                {formatDriverCompensation(selectedDriver)}
                                                            </span>
                                                        )}
                                                    </p>
                                                    {(() => {
                                                        const suitability = getDriverVehicleSuitability(selectedDriver.vehicle_type, resolvedWeightKg);
                                                        if (!suitability) return null;
                                                        return (
                                                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold mt-1 ${suitability.badgeClass}`}>
                                                                {suitability.badge}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDriverId(null);
                                                }}
                                                className="shrink-0 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition"
                                                title="Remove assignment"
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="py-2.5">
                                            <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                                <GripVertical size={16} className={`text-stone-400 ${isDraggingAny ? 'text-clay-600 animate-bounce' : ''}`} />
                                                <p className="text-xs font-bold text-stone-700">
                                                    {isDraggingAny ? "Release driver card here to assign" : isMobile ? "Select a driver below" : "Drag driver here to assign"}
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-stone-400">
                                                {isMobile ? "Tap any driver in the roster to assign" : "or click any driver in the roster to assign directly"}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Dispatch Notes for Driver */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                                        Rider Instructions (Optional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={dispatchNotes}
                                        onChange={(e) => setDispatchNotes(e.target.value)}
                                        placeholder="e.g. Call upon arrival, leave at lobby reception..."
                                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                    />
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Driver Board & Live Availability */}
                            <div className="lg:col-span-7 space-y-3">
                                <div className="flex items-center justify-between pb-1">
                                    <div className="flex items-center gap-2">
                                        <UserCheck size={16} className="text-clay-600" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                                            Driver Roster & Live Status
                                        </h3>
                                    </div>
                                    <span className="text-[10px] font-medium text-stone-500">
                                        {drivers.length} Driver(s) configured
                                    </span>
                                </div>

                                {isLoadingDrivers ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                                        <LoaderCircle size={24} className="animate-spin mb-2" />
                                        <p className="text-xs font-medium">Checking live driver availability...</p>
                                    </div>
                                ) : drivers.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center bg-stone-50/50">
                                        <User size={28} className="mx-auto text-stone-300 mb-2" />
                                        <p className="text-xs font-bold text-stone-700">
                                            No studio drivers found
                                        </p>
                                        <p className="text-[11px] text-stone-400 mt-1 max-w-xs mx-auto">
                                            Add staff members with the role &quot;Logistics &amp; Driver&quot; in People &amp; Payroll to dispatch orders with your own fleet.
                                        </p>
                                    </div>
                                ) : (
                                    <div ref={driverListRef} className="space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                                        {sortedDrivers.map((driver) => {
                                            const isSelected = selectedDriverId === driver.id;
                                            const suitability = getDriverVehicleSuitability(driver.vehicle_type, resolvedWeightKg);

                                            return (
                                                <div
                                                    key={driver.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => setSelectedDriverId(driver.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            setSelectedDriverId(driver.id);
                                                        }
                                                    }}
                                                    draggable={!isMobile}
                                                    onDragStart={(e) => handleDragStart(e, driver.id)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`group relative flex items-center justify-between rounded-xl border p-3.5 transition-all select-none cursor-pointer ${
                                                        isSelected
                                                            ? "border-clay-500 bg-clay-50/50 shadow-xs ring-2 ring-clay-500/20"
                                                            : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {!isMobile && (
                                                            <div className="text-stone-300 group-hover:text-stone-500 transition-colors cursor-grab active:cursor-grabbing">
                                                                <GripVertical size={16} />
                                                            </div>
                                                        )}
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 font-bold text-stone-700 text-xs">
                                                            {driver.name.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="truncate text-xs font-bold text-stone-900">
                                                                    {driver.name}
                                                                </p>
                                                                {/* Status badge */}
                                                                <span
                                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                                                        driver.badge_color === "emerald"
                                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                            : driver.badge_color === "amber"
                                                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                            : "bg-stone-100 text-stone-600 border border-stone-200"
                                                                    }`}
                                                                >
                                                                    <span
                                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                                            driver.badge_color === "emerald"
                                                                                ? "bg-emerald-500 animate-pulse"
                                                                                : driver.badge_color === "amber"
                                                                                ? "bg-amber-500"
                                                                                : "bg-stone-400"
                                                                        }`}
                                                                    />
                                                                    {driver.status_label}
                                                                </span>
                                                                {/* Vehicle suitability badge */}
                                                                {suitability && (
                                                                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ${suitability.badgeClass}`}>
                                                                        {suitability.badge}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[11px] text-stone-500 truncate mt-0.5 flex-wrap">
                                                                <span>{driver.vehicle_type}</span>
                                                                {driver.vehicle_plate_number && <span>• {driver.vehicle_plate_number}</span>}
                                                                {formatDriverCompensation(driver) && (
                                                                    <span className="rounded bg-stone-100 px-1.5 py-0.2 text-[10px] font-semibold text-stone-600 border border-stone-200/60">
                                                                        {formatDriverCompensation(driver)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 ml-3">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                                                isSelected
                                                                    ? "bg-clay-600 text-white shadow-xs"
                                                                    : "border border-stone-200 bg-stone-50 text-stone-700 group-hover:bg-stone-100"
                                                            }`}
                                                        >
                                                            {isSelected ? (
                                                                <>
                                                                    <CheckCircle2 size={12} />
                                                                    <span>Assigned</span>
                                                                </>
                                                            ) : (
                                                                <span>Assign</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* TAB 2: LALAMOVE ON-DEMAND */}
            {activeTab === "lalamove" && (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 font-bold">
                                <Truck size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-stone-900">
                                    Book Lalamove On-Demand Courier
                                </h4>
                                <p className="text-xs text-stone-500">
                                    Instant automated booking with 3rd-party motorcycle or four-wheel courier.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-stone-100">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                    Drop-off Recipient
                                </p>
                                <p className="font-bold text-stone-800">{recipientName}</p>
                                <p className="text-stone-500">{contactPhone}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                    Drop-off Address
                                </p>
                                <p className="font-medium text-stone-700 line-clamp-2">{deliveryAddress}</p>
                            </div>
                        </div>

                        {/* Lalamove Logistics Specs */}
                        <div className="mt-3 rounded-xl border border-stone-200/80 bg-white p-3.5 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 font-bold text-stone-600">
                                    <Scale size={13} className="text-orange-600" />
                                    Total Package Weight
                                </span>
                                <span className="font-mono font-bold text-stone-900">
                                    {resolvedWeightKg.toFixed(1)} kg
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 font-bold text-stone-600">
                                    {isHeavyOrder ? (
                                        <Car size={13} className="text-orange-600" />
                                    ) : (
                                        <Bike size={13} className="text-orange-600" />
                                    )}
                                    Recommended Courier Tier
                                </span>
                                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                    isHeavyOrder
                                        ? "bg-amber-100 text-amber-900 border border-amber-200"
                                        : "bg-stone-100 text-stone-800"
                                }`}>
                                    {recommendedVehicle}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-stone-100">
                                <span className="flex items-center gap-1.5 font-bold text-stone-600">
                                    <Receipt size={13} className="text-orange-600" />
                                    Customer Shipping Fee Paid
                                </span>
                                <span className="font-mono font-bold text-emerald-700">
                                    {hasShippingFee ? `₱${shippingFeeAmount.toFixed(2)}` : "Free / Included"}
                                </span>
                            </div>
                            {isHeavyOrder && (
                                <p className="text-[10px] text-amber-800 leading-snug flex items-start gap-1 pt-0.5">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-600" />
                                    <span>Lalamove automated quotation will request a 4-wheel vehicle (Sedan/MPV/Van) due to package weight ({resolvedWeightKg.toFixed(1)} kg).</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderFooter = () => (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3">
            {/* Live Assignment Summary Strip */}
            <div className="min-w-0 flex items-center gap-2">
                {activeTab === "in_house" && (
                    selectedDriver ? (
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-clay-100 text-clay-700 font-bold text-xs">
                                {selectedDriver.name.charAt(0)}
                            </div>
                            <div className="min-w-0 text-left">
                                <p className="truncate text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                    <span className="truncate">{selectedDriver.name}</span>
                                    <span className="text-[10px] font-normal text-stone-500 shrink-0">({selectedDriver.vehicle_type})</span>
                                </p>
                                <p className="text-[10px] text-stone-500 flex items-center gap-1 truncate">
                                    <span className={`h-1.5 w-1.5 rounded-full ${selectedDriver.badge_color === 'emerald' ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                                    <span>{selectedDriver.status_label}</span>
                                    {selectedDriver.vehicle_plate_number && <span>• {selectedDriver.vehicle_plate_number}</span>}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-stone-400">
                            <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                            <span>Select or drag a driver to dispatch</span>
                        </div>
                    )
                )}
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition disabled:opacity-50"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={handleConfirmDispatch}
                    disabled={
                        !canEditOrders ||
                        isSubmitting ||
                        (activeTab === "in_house" && (!isPremium || !selectedDriverId))
                    }
                    className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                        <CheckCircle2 size={14} />
                    )}
                    <span>
                        {isSubmitting
                            ? "Dispatching..."
                            : activeTab === "in_house"
                            ? "Confirm Studio Dispatch"
                            : "Book Lalamove Courier"}
                    </span>
                </button>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <SlideOverDrawer
                show={isOpen}
                onClose={onClose}
                title={`Dispatch Order #${orderNumber}`}
                footer={renderFooter()}
                widthClass="max-w-2xl"
            >
                {renderContent()}
            </SlideOverDrawer>
        );
    }

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="4xl">
            <div className="flex max-h-[90vh] flex-col bg-white">
                {/* Modal Header */}
                <div className="shrink-0 border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-20">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                            <Truck size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900">
                                Dispatch Order #{orderNumber}
                            </h2>
                            <p className="text-[11px] text-stone-500">
                                Select fulfillment method and assign logistics driver.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div ref={modalBodyRef} className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {renderContent()}
                </div>

                {/* Modal Footer */}
                <div className="shrink-0 border-t border-stone-200 bg-stone-50/70 px-6 py-3.5 sticky bottom-0 z-20">
                    {renderFooter()}
                </div>
            </div>
        </Modal>
    );
}
