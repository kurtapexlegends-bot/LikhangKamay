/* global route */
import React, { useState, useEffect } from "react";
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
    Navigation,
    Clock,
    User,
    ArrowRight
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
    const [draggedDriverId, setDraggedDriverId] = useState(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Fetch live drivers whenever modal opens
    useEffect(() => {
        if (isOpen && isPremium) {
            setIsLoadingDrivers(true);
            axios
                .get(route("orders.dispatch.drivers"))
                .then((res) => {
                    const fetchedDrivers = res.data.drivers || [];
                    setDrivers(fetchedDrivers);
                    // Pre-select first available driver if none selected
                    const firstAvailable = fetchedDrivers.find((d) => d.status === "available");
                    if (firstAvailable && !selectedDriverId) {
                        setSelectedDriverId(firstAvailable.id);
                    }
                })
                .catch(() => {
                    addToast("Failed to load driver roster.", "error");
                })
                .finally(() => {
                    setIsLoadingDrivers(false);
                });
        }
    }, [isOpen, isPremium]);

    if (!order) return null;

    const orderNumber = order.order_number || order.id;
    const recipientName = order.customer || order.shipping_recipient_name || order.buyer?.name || "Customer";
    const contactPhone = order.shipping_contact_phone || order.contact_number || order.buyer?.phone || "No phone provided";
    const deliveryAddress = order.shipping_address || order.delivery_address || "Store Pickup";
    const items = order.items || [];

    const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

    // Drag and Drop handlers
    const handleDragStart = (e, driverId) => {
        setDraggedDriverId(driverId);
        e.dataTransfer.setData("text/plain", String(driverId));
        e.dataTransfer.effectAllowed = "move";
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

    const renderContent = () => (
        <div className="space-y-6">
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
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* LEFT COLUMN: Order Parcel & Drop Target */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <PackageOpen size={16} className="text-clay-600" />
                                            <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                                                Parcel Destination
                                            </span>
                                        </div>
                                        <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[10px] font-bold text-stone-600">
                                            #{orderNumber}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                                Customer
                                            </p>
                                            <p className="text-sm font-bold text-stone-900">
                                                {recipientName}
                                            </p>
                                            <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5 mt-0.5">
                                                <Phone size={12} />
                                                {contactPhone}
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-stone-50 p-3 border border-stone-100 flex items-start gap-2">
                                            <MapPin size={15} className="text-clay-600 shrink-0 mt-0.5" />
                                            <p className="text-xs font-medium text-stone-800 leading-relaxed">
                                                {deliveryAddress}
                                            </p>
                                        </div>

                                        {items.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                                                    Items ({items.length})
                                                </p>
                                                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                                    {items.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between rounded-lg bg-stone-50/60 p-2 text-xs"
                                                        >
                                                            <span className="truncate font-medium text-stone-700 max-w-[200px]">
                                                                {item.name || item.product_name}
                                                            </span>
                                                            <span className="font-bold text-stone-900">
                                                                ×{item.qty || item.quantity || 1}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Drag & Drop Target Zone */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                                        isDraggingOver
                                            ? "border-clay-500 bg-clay-50/70 scale-[1.02]"
                                            : selectedDriver
                                            ? "border-emerald-300 bg-emerald-50/40"
                                            : "border-stone-200 bg-stone-50/40 hover:border-stone-300"
                                    }`}
                                >
                                    {selectedDriver ? (
                                        <div className="flex items-center justify-between text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm shadow-xs">
                                                    <UserCheck size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                        Assigned Studio Driver
                                                    </p>
                                                    <p className="text-sm font-bold text-stone-900">
                                                        {selectedDriver.name}
                                                    </p>
                                                    <p className="text-[11px] text-stone-500">
                                                        {selectedDriver.vehicle_type}
                                                        {selectedDriver.vehicle_plate_number && ` • ${selectedDriver.vehicle_plate_number}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDriverId(null)}
                                                className="text-stone-400 hover:text-stone-700 p-1"
                                                title="Remove assignment"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="py-3">
                                            <GripVertical size={20} className="mx-auto text-stone-400 mb-1" />
                                            <p className="text-xs font-bold text-stone-700">
                                                Drag driver here to assign
                                            </p>
                                            <p className="text-[10px] text-stone-400 mt-0.5">
                                                or click "Assign" on any driver in the list
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
                                            Add staff members with the role "Logistics / Driver" in People & Payroll to dispatch orders with your own fleet.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                                        {drivers.map((driver) => {
                                            const isSelected = selectedDriverId === driver.id;
                                            const isAvailable = driver.status === "available";

                                            return (
                                                <div
                                                    key={driver.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, driver.id)}
                                                    className={`group relative flex items-center justify-between rounded-xl border p-3.5 transition-all cursor-grab active:cursor-grabbing ${
                                                        isSelected
                                                            ? "border-clay-500 bg-clay-50/30 shadow-xs ring-1 ring-clay-500"
                                                            : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="text-stone-300 group-hover:text-stone-500 transition-colors">
                                                            <GripVertical size={16} />
                                                        </div>
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 font-bold text-stone-700 text-xs">
                                                            {driver.name.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
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
                                                            </div>
                                                            <p className="text-[11px] text-stone-500 truncate mt-0.5">
                                                                {driver.vehicle_type}
                                                                {driver.vehicle_plate_number && ` • ${driver.vehicle_plate_number}`}
                                                                {driver.phone && ` • ${driver.phone}`}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedDriverId(driver.id)}
                                                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ml-3 ${
                                                            isSelected
                                                                ? "bg-clay-600 text-white shadow-xs"
                                                                : "border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                                                        }`}
                                                    >
                                                        {isSelected ? "Assigned" : "Assign"}
                                                    </button>
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
                    </div>
                </div>
            )}
        </div>
    );

    const renderFooter = () => (
        <div className="flex items-center justify-between w-full">
            <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition disabled:opacity-50"
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
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
                <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
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
