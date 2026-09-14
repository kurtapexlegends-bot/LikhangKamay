/* global route */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import SlideOverDrawer from "@/Components/SlideOverDrawer";
import {
    Truck,
    UserCheck,
    X,
    Lock,
} from "lucide-react";
import { useToast } from "@/Components/ToastContext";
import InHouseDriverSelector from "./InHouseDriverSelector";
import LalamoveQuoteSection from "./LalamoveQuoteSection";
import DispatchModalFooter from "./DispatchModalFooter";
import useDragAutoScroll from "@/hooks/useDragAutoScroll";

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

    const onDragEndCleanup = useCallback(() => {
        setIsDraggingAny(false);
        setDraggedDriverId(null);
        setIsDraggingOver(false);
    }, []);

    useDragAutoScroll({
        isDraggingAny,
        contentWrapperRef,
        modalBodyRef,
        driverListRef,
        onDragEndCleanup,
    });

    const handleDragStart = (e, driverId) => {
        e.dataTransfer.setData("text/plain", String(driverId));
        e.dataTransfer.effectAllowed = "move";
        setDraggedDriverId(driverId);
        setIsDraggingAny(true);
    };

    const handleDragEnd = () => {
        setIsDraggingAny(false);
        setDraggedDriverId(null);
        setIsDraggingOver(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isDraggingOver) setIsDraggingOver(true);
    };

    const handleDragLeave = (e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDraggingOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        setIsDraggingAny(false);
        const droppedId = e.dataTransfer.getData("text/plain");
        const resolvedId = droppedId ? Number(droppedId) : draggedDriverId;

        if (resolvedId) {
            const found = drivers.find((d) => d.id === resolvedId);
            if (found) {
                setSelectedDriverId(resolvedId);
                addToast(`Assigned ${found.name} to Order #${orderNumber}`, "success");
            }
        }
        setDraggedDriverId(null);
    };

    const handleConfirmDispatch = () => {
        if (!orderNumber) return;

        if (activeTab === "in_house") {
            if (!selectedDriverId) {
                addToast("Please select an in-house driver.", "error");
                return;
            }
            setIsSubmitting(true);
            router.post(
                route("orders.dispatch-in-house", orderNumber),
                {
                    driver_id: selectedDriverId,
                    dispatch_notes: dispatchNotes,
                },
                {
                    onSuccess: () => {
                        setIsSubmitting(false);
                        onClose();
                    },
                    onError: (errs) => {
                        setIsSubmitting(false);
                        const msg = Object.values(errs)[0] || "Failed to dispatch order with driver.";
                        addToast(msg, "error");
                    },
                }
            );
        } else {
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
                        className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                            activeTab === "in_house"
                                ? "bg-white text-stone-900 shadow-xs"
                                : "text-stone-500 hover:text-stone-800"
                        }`}
                    >
                        <UserCheck size={14} className="text-clay-600" />
                        <span>Studio Fleet (In-House)</span>
                        {isPremium ? (
                            <span className="rounded bg-clay-100 px-1.5 py-0.5 text-[9px] font-bold text-clay-700">
                                Premium
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-stone-200/80 px-1.5 py-0.5 text-[9px] font-bold text-stone-600">
                                <Lock size={10} /> Locked
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("lalamove")}
                        className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
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
                <InHouseDriverSelector
                    orderNumber={orderNumber}
                    recipientName={recipientName}
                    contactPhone={contactPhone}
                    deliveryAddress={deliveryAddress}
                    resolvedWeightKg={resolvedWeightKg}
                    isHeavyOrder={isHeavyOrder}
                    recommendedVehicle={recommendedVehicle}
                    hasShippingFee={hasShippingFee}
                    shippingFeeAmount={shippingFeeAmount}
                    items={items}
                    isItemsExpanded={isItemsExpanded}
                    setIsItemsExpanded={setIsItemsExpanded}
                    dispatchNotes={dispatchNotes}
                    setDispatchNotes={setDispatchNotes}
                    drivers={drivers}
                    sortedDrivers={sortedDrivers}
                    isLoadingDrivers={isLoadingDrivers}
                    selectedDriverId={selectedDriverId}
                    setSelectedDriverId={setSelectedDriverId}
                    selectedDriver={selectedDriver}
                    isDraggingOver={isDraggingOver}
                    isDraggingAny={isDraggingAny}
                    isMobile={isMobile}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                    handleDrop={handleDrop}
                    handleDragStart={handleDragStart}
                    handleDragEnd={handleDragEnd}
                    driverListRef={driverListRef}
                    formatDriverCompensation={formatDriverCompensation}
                    getDriverVehicleSuitability={getDriverVehicleSuitability}
                    isPremium={isPremium}
                    setActiveTab={setActiveTab}
                />
            )}

            {/* TAB 2: LALAMOVE ON-DEMAND */}
            {activeTab === "lalamove" && (
                <LalamoveQuoteSection
                    recipientName={recipientName}
                    contactPhone={contactPhone}
                    deliveryAddress={deliveryAddress}
                    resolvedWeightKg={resolvedWeightKg}
                    isHeavyOrder={isHeavyOrder}
                    recommendedVehicle={recommendedVehicle}
                    hasShippingFee={hasShippingFee}
                    shippingFeeAmount={shippingFeeAmount}
                />
            )}
        </div>
    );

    const renderFooter = () => (
        <DispatchModalFooter
            activeTab={activeTab}
            selectedDriver={selectedDriver}
            selectedDriverId={selectedDriverId}
            onClose={onClose}
            onConfirm={handleConfirmDispatch}
            isSubmitting={isSubmitting}
            canEditOrders={canEditOrders}
            isPremium={isPremium}
        />
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
                        className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
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
