/* global route */
import React, { useState } from "react";
import { Head, router } from "@inertiajs/react";
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from "@/Layouts/SellerWorkspaceLayout";
import SellerHeader from "@/Layouts/SellerHeader";
import StaffClockInModal from "@/Components/Staff/Dashboard/StaffClockInModal";
import Modal from "@/Components/Modal";
import {
    Truck,
    Navigation,
    Phone,
    MessageSquare,
    Camera,
    CheckCircle2,
    MapPin,
    Clock,
    LoaderCircle,
    X,
    ShieldAlert,
    ShieldCheck,
    Eye,
    RefreshCw,
    Copy,
    Check,
    ArrowUpRight,
    Bike,
    Car,
} from "lucide-react";
import { useToast } from "@/Components/ToastContext";

export default function DriverDeliveries({
    auth,
    activeDeliveries = [],
    completedToday = [],
    driverProfile = {},
    shopName = "Studio",
}) {
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("active");
    const [completingDelivery, setCompletingDelivery] = useState(null);
    const [podPhoto, setPodPhoto] = useState(null);
    const [podPreview, setPodPreview] = useState(null);
    const [podNotes, setPodNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewingPodPhoto, setViewingPodPhoto] = useState(null);

    // Vehicle & License Verification State
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [vehicleType, setVehicleType] = useState(driverProfile.vehicle_type || "Motorcycle");
    const [plateNumber, setPlateNumber] = useState(driverProfile.vehicle_plate_number || "");
    const [licenseNumber, setLicenseNumber] = useState(driverProfile.driver_license_number || "");
    const [licensePhoto, setLicensePhoto] = useState(null);
    const [licensePreview, setLicensePreview] = useState(null);
    const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
    const [vehicleErrors, setVehicleErrors] = useState({});
    const [viewingLicensePhoto, setViewingLicensePhoto] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copiedOrderId, setCopiedOrderId] = useState(null);

    const handleSync = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['activeDeliveries', 'completedToday', 'driverProfile'],
            onFinish: () => {
                setIsRefreshing(false);
                addToast("Dispatches synced.", "info");
            },
        });
    };

    const handleCopyAddress = (orderId, address) => {
        if (!address) return;
        navigator.clipboard.writeText(address);
        setCopiedOrderId(orderId);
        addToast("Address copied to clipboard.", "success");
        setTimeout(() => setCopiedOrderId(null), 2500);
    };

    const renderVehicleIcon = (type, className = "text-clay-700", size = 22) => {
        const lower = (type || "").toLowerCase();
        if (lower.includes("bicycle") || lower.includes("bike")) {
            return <Bike className={className} size={size} />;
        }
        if (lower.includes("sedan") || lower.includes("car")) {
            return <Car className={className} size={size} />;
        }
        return <Truck className={className} size={size} />;
    };

    const handleLicensePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (licensePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(licensePreview);
            }
            setLicensePhoto(file);
            setLicensePreview(URL.createObjectURL(file));
        }
    };

    const handleCloseVerifyModal = () => {
        if (licensePreview?.startsWith("blob:")) {
            URL.revokeObjectURL(licensePreview);
        }
        setIsVerifyModalOpen(false);
        setLicensePhoto(null);
        setLicensePreview(null);
        setVehicleErrors({});
    };

    const handleSubmitVehicleVerification = (e) => {
        e.preventDefault();
        setVehicleErrors({});

        const errs = {};
        if (!plateNumber.trim()) {
            errs.vehicle_plate_number = "Plate number is required.";
        }
        if (!licenseNumber.trim()) {
            errs.driver_license_number = "Driver license number is required.";
        }
        if (!licensePhoto && !driverProfile.driver_license_photo_url) {
            errs.driver_license_photo = "Driver license or ID photo is required.";
        }

        if (Object.keys(errs).length > 0) {
            setVehicleErrors(errs);
            return;
        }

        setIsSubmittingVehicle(true);
        const formData = new FormData();
        formData.append("vehicle_type", vehicleType);
        formData.append("vehicle_plate_number", plateNumber.toUpperCase().trim());
        formData.append("driver_license_number", licenseNumber.toUpperCase().trim());
        if (licensePhoto) {
            formData.append("driver_license_photo", licensePhoto);
        }

        router.post(route("staff.deliveries.verify-vehicle"), formData, {
            forceFormData: true,
            onSuccess: () => {
                setIsSubmittingVehicle(false);
                handleCloseVerifyModal();
                addToast("Vehicle and driver license details successfully verified!", "success");
            },
            onError: (serverErrors) => {
                setIsSubmittingVehicle(false);
                setVehicleErrors(serverErrors);
                const msg = Object.values(serverErrors)[0] || "Failed to verify vehicle details.";
                addToast(msg, "error");
            },
        });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (podPreview?.startsWith("blob:")) {
                URL.revokeObjectURL(podPreview);
            }
            setPodPhoto(file);
            setPodPreview(URL.createObjectURL(file));
        }
    };

    const handleOpenCompleteModal = (delivery) => {
        setCompletingDelivery(delivery);
        setPodPhoto(null);
        setPodPreview(null);
        setPodNotes("");
    };

    const handleCloseCompleteModal = () => {
        if (podPreview?.startsWith("blob:")) {
            URL.revokeObjectURL(podPreview);
        }
        setCompletingDelivery(null);
        setPodPhoto(null);
        setPodPreview(null);
        setPodNotes("");
    };

    const handleSubmitDeliveryCompletion = (e) => {
        e.preventDefault();
        if (!completingDelivery) return;

        if (!podPhoto) {
            addToast("Please capture or upload a Proof of Delivery photo.", "error");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("pod_photo", podPhoto);
        if (podNotes) {
            formData.append("pod_notes", podNotes);
        }

        router.post(
            route("staff.deliveries.complete", completingDelivery.id),
            formData,
            {
                forceFormData: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    handleCloseCompleteModal();
                    addToast(`Delivery #${completingDelivery.order_number} confirmed!`, "success");
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    const msg = Object.values(errs)[0] || "Failed to complete delivery.";
                    addToast(msg, "error");
                },
            }
        );
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#FDFBF9]">
            <Head title="Driver Delivery Console - LikhangKamay" />

            <SellerHeader
                title="Driver Delivery Console"
                subtitle={`${shopName} • ${driverProfile.vehicle_type || "Motorcycle"}${driverProfile.vehicle_plate_number ? ` • Plate ${driverProfile.vehicle_plate_number}` : ''}`}
                auth={auth}
                onMenuClick={openSidebar}
                actions={
                    <button
                        type="button"
                        onClick={handleSync}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50/90 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 active:scale-95 transition shadow-2xs"
                        title="Sync recent dispatches"
                    >
                        <RefreshCw size={12} className={isRefreshing ? "animate-spin text-clay-600" : "text-stone-500"} />
                        <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync Runs"}</span>
                    </button>
                }
                badge={{
                    label: driverProfile.is_clocked_in ? "On Duty" : "Off Duty",
                    iconColor: driverProfile.is_clocked_in ? "text-emerald-400" : "text-stone-400",
                }}
            />

            <div className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 lg:px-8 pb-24">
                <div className="max-w-7xl mx-auto space-y-4">
                    {/* MOBILE TOP IDENTITY & STAT BAR (< lg) */}
                    <div className="lg:hidden space-y-2.5">
                        {/* Driver mini bar */}
                        <div className="rounded-2xl border border-stone-200/90 bg-white p-3 shadow-2xs flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 border border-stone-200/80 text-clay-700">
                                    {renderVehicleIcon(driverProfile.vehicle_type, "text-clay-700", 18)}
                                    <span
                                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                                            driverProfile.is_clocked_in ? "bg-emerald-500" : "bg-stone-400"
                                        }`}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <p className="text-xs font-extrabold text-stone-900 truncate">
                                            {driverProfile.name || "Delivery Driver"}
                                        </p>
                                        <span className="text-[10px] font-mono text-stone-400 shrink-0">
                                            • {driverProfile.vehicle_plate_number || driverProfile.vehicle_type || "Rider"}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-stone-500 truncate mt-0.5">
                                        {shopName}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsVerifyModalOpen(true)}
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${
                                        driverProfile.is_vehicle_verified
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-800 border-amber-200"
                                    }`}
                                >
                                    {driverProfile.is_vehicle_verified ? (
                                        <ShieldCheck size={12} className="text-emerald-600" />
                                    ) : (
                                        <ShieldAlert size={12} className="text-amber-600" />
                                    )}
                                    <span>{driverProfile.is_vehicle_verified ? "Verified" : "Verify"}</span>
                                </button>
                                {!driverProfile.is_clocked_in && (
                                    <button
                                        type="button"
                                        onClick={() => setIsClockInModalOpen(true)}
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-clay-600 rounded-lg px-2.5 py-1 shadow-2xs hover:bg-clay-700 active:scale-95 transition"
                                    >
                                        <Clock size={11} />
                                        <span>Clock In</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mobile 4-metric glanceable strip */}
                        <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-stone-200/80 bg-white p-2 shadow-2xs text-center">
                            <div className="px-1 border-r border-stone-100">
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">Active</span>
                                <span className="text-sm font-extrabold text-stone-900 font-mono">{activeDeliveries.length}</span>
                            </div>
                            <div className="px-1 border-r border-stone-100">
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">Done</span>
                                <span className="text-sm font-extrabold text-stone-900 font-mono">{completedToday.length}</span>
                            </div>
                            <div className="px-1 border-r border-stone-100 truncate">
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 truncate">Earnings</span>
                                <span className="text-xs font-bold text-stone-900 font-mono truncate block">
                                    {(driverProfile.compensation_type === 'per_delivery' || driverProfile.compensation_type === 'hybrid')
                                        ? `₱${Number(driverProfile.today_drop_earnings || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
                                        : "Salary"}
                                </span>
                            </div>
                            <div className="px-1 flex flex-col items-center justify-center">
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">Shift</span>
                                <span className={`text-[10px] font-bold inline-flex items-center gap-1 ${
                                    driverProfile.is_clocked_in ? "text-emerald-700" : "text-stone-500"
                                }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                        driverProfile.is_clocked_in ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                                    }`} />
                                    {driverProfile.is_clocked_in ? "On" : "Off"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* MAIN TWO-COLUMN LAYOUT (DESKTOP) / STREAM (MOBILE) */}
                    <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
                        {/* LEFT COLUMN: Deliveries & Tabs (Full on Mobile, 8 cols on Desktop) */}
                        <div className="lg:col-span-8 space-y-4">
                            {/* Sleek Tab Switcher Bar */}
                            <div className="flex items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("active")}
                                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                                            activeTab === "active"
                                                ? "bg-stone-900 text-white shadow-xs"
                                                : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/80"
                                        }`}
                                    >
                                        <Truck size={14} className={activeTab === "active" ? "text-clay-300" : "text-stone-400"} />
                                        <span>Active Runs</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                            activeTab === "active" ? "bg-white/20 text-white" : "bg-stone-100 text-stone-700"
                                        }`}>
                                            {activeDeliveries.length}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("completed")}
                                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                                            activeTab === "completed"
                                                ? "bg-stone-900 text-white shadow-xs"
                                                : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/80"
                                        }`}
                                    >
                                        <CheckCircle2 size={14} className={activeTab === "completed" ? "text-emerald-400" : "text-stone-400"} />
                                        <span>Completed Today</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                            activeTab === "completed" ? "bg-white/20 text-white" : "bg-stone-100 text-stone-700"
                                        }`}>
                                            {completedToday.length}
                                        </span>
                                    </button>
                                </div>

                                <div className="hidden sm:flex items-center gap-2 text-xs text-stone-500 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Live In-House Dispatch Queue</span>
                                </div>
                            </div>

                            {/* ACTIVE DELIVERIES TAB */}
                            {activeTab === "active" && (
                                <div className="space-y-4">
                                    {activeDeliveries.length === 0 ? (
                                        !driverProfile.is_clocked_in ? (
                                            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-6 sm:p-10 text-center shadow-xs">
                                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3 shadow-2xs">
                                                    <Clock size={22} />
                                                </div>
                                                <h3 className="text-sm sm:text-base font-bold text-stone-900 mb-1">
                                                    You are Currently Off Duty
                                                </h3>
                                                <p className="text-xs text-stone-500 max-w-md mx-auto mb-5 leading-relaxed">
                                                    Clock in with your quick face photo and store location check to start receiving and completing in-house delivery runs for the studio.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsClockInModalOpen(true)}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-clay-700 active:scale-95 transition min-h-[42px]"
                                                >
                                                    <Clock size={15} />
                                                    <span>Clock In Shift Now</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-10 text-center shadow-xs">
                                                <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-50 text-clay-700 mb-3.5">
                                                    <div className="absolute inset-0 rounded-2xl bg-clay-400/20 animate-ping opacity-30" />
                                                    {renderVehicleIcon(driverProfile.vehicle_type, "text-clay-700 relative z-10", 24)}
                                                </div>
                                                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold mb-1.5">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span>Standing By for Dispatches</span>
                                                </div>
                                                <h3 className="text-sm sm:text-base font-bold text-stone-900 mb-1">
                                                    No Active Deliveries Right Now
                                                </h3>
                                                <p className="text-xs text-stone-500 max-w-md mx-auto mb-5 leading-relaxed">
                                                    You are on duty and ready to roll! As soon as your artisan workshop assigns customer parcels for in-house dispatch, they will appear here with one-tap navigation.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleSync}
                                                    disabled={isRefreshing}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 active:scale-95 transition min-h-[40px]"
                                                >
                                                    <RefreshCw size={13} className={isRefreshing ? "animate-spin text-clay-600" : "text-stone-500"} />
                                                    <span>{isRefreshing ? "Checking Studio..." : "Check for New Dispatches"}</span>
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                <div className="space-y-4">
                                    {activeDeliveries.map((delivery) => {
                                        const encodedAddr = encodeURIComponent(delivery.destination?.address || "");
                                        const mapUrl =
                                            delivery.destination?.latitude && delivery.destination?.longitude
                                                ? `https://www.google.com/maps/dir/?api=1&destination=${delivery.destination.latitude},${delivery.destination.longitude}`
                                                : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddr}`;

                                        return (
                                            <div
                                                key={delivery.id}
                                                className="rounded-3xl border border-stone-200/90 bg-white shadow-xs overflow-hidden transition hover:border-stone-300"
                                            >
                                                {/* Card Header: Order #, Status & Dispatch Time */}
                                                <div className="border-b border-stone-100 bg-stone-50/80 px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm font-extrabold text-stone-900">
                                                            Order #{delivery.order_number}
                                                        </span>
                                                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/80 flex items-center gap-1">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            In Transit
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                                                        <Clock size={12} className="text-stone-400" />
                                                        <span>Dispatched {delivery.dispatched_at || "today"}</span>
                                                    </span>
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-4 sm:p-6 space-y-4">
                                                    {/* Recipient Customer Details */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/60 p-3.5 rounded-2xl border border-stone-100">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                                                Recipient Customer
                                                            </p>
                                                            <p className="text-sm sm:text-base font-extrabold text-stone-900 mt-0.5 truncate">
                                                                {delivery.customer?.name || "Customer"}
                                                            </p>
                                                            <p className="text-xs text-stone-600 font-mono mt-0.5">
                                                                {delivery.customer?.phone || "No phone provided"}
                                                            </p>
                                                        </div>

                                                        {/* Quick Call & SMS Actions (Mobile-First Touch Target) */}
                                                        {delivery.customer?.phone && (
                                                            <div className="flex items-center gap-2">
                                                                <a
                                                                    href={`tel:${delivery.customer.phone}`}
                                                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition min-h-[42px] shadow-2xs"
                                                                >
                                                                    <Phone size={14} className="text-emerald-700" />
                                                                    <span>Call</span>
                                                                </a>
                                                                <a
                                                                    href={`sms:${delivery.customer.phone}`}
                                                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100 active:scale-95 transition min-h-[42px] shadow-2xs"
                                                                >
                                                                    <MessageSquare size={14} className="text-sky-700" />
                                                                    <span>SMS</span>
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Drop-off Address Card & Turn-by-Turn Navigation */}
                                                    <div className="rounded-2xl bg-stone-50/90 p-4 border border-stone-200/70 space-y-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-clay-100 text-clay-700 mt-0.5">
                                                                    <MapPin size={16} />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                                                        Delivery Address
                                                                    </p>
                                                                    <p className="text-xs sm:text-sm font-semibold text-stone-900 leading-relaxed mt-0.5">
                                                                        {delivery.destination?.address || "Store Pickup"}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Copy Address Button */}
                                                            {delivery.destination?.address && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyAddress(delivery.id, delivery.destination?.address)}
                                                                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition shadow-2xs"
                                                                    title="Copy Address"
                                                                >
                                                                    {copiedOrderId === delivery.id ? (
                                                                        <>
                                                                            <Check size={12} className="text-emerald-600" />
                                                                            <span className="text-emerald-700">Copied</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Copy size={12} />
                                                                            <span>Copy</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Big Turn-by-Turn Navigation Action */}
                                                        <a
                                                            href={mapUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-xs font-bold text-white hover:bg-stone-800 active:scale-[0.99] transition shadow-xs min-h-[46px]"
                                                        >
                                                            <Navigation size={15} className="text-clay-400" />
                                                            <span>Navigate in Maps (Google Maps / Waze)</span>
                                                            <ArrowUpRight size={14} className="text-stone-400" />
                                                        </a>

                                                        {delivery.dispatch_notes && (
                                                            <div className="text-[11px] text-amber-900 bg-amber-50/80 rounded-xl p-3 border border-amber-200/70 font-medium">
                                                                <strong className="font-bold">Artisan Note:</strong> {delivery.dispatch_notes}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Parcel Contents */}
                                                    {delivery.items?.length > 0 && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                                                    Parcel Contents ({delivery.items.length} item{delivery.items.length === 1 ? '' : 's'})
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {delivery.items.map((item, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/50 p-2.5 text-xs"
                                                                    >
                                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-700 font-extrabold text-[11px]">
                                                                            ×{item.quantity}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="truncate font-semibold text-stone-900">
                                                                                {item.name}
                                                                            </p>
                                                                            {item.variant && (
                                                                                <p className="truncate text-[10px] text-stone-500">
                                                                                    {item.variant}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Big Bottom Action: Complete Delivery & POD Photo */}
                                                    <div className="pt-2 border-t border-stone-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenCompleteModal(delivery)}
                                                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3.5 px-4 text-xs sm:text-sm font-bold text-white hover:bg-emerald-800 active:scale-[0.99] transition shadow-xs min-h-[50px]"
                                                        >
                                                            <Camera size={18} />
                                                            <span>Complete Delivery &amp; Submit Proof Photo</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* COMPLETED TODAY TAB */}
                    {activeTab === "completed" && (
                        <div className="space-y-4">
                            {completedToday.length === 0 ? (
                                <div className="rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-12 text-center shadow-xs">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mb-3 shadow-2xs">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h3 className="text-sm font-bold text-stone-900 mb-1">
                                        No Completed Deliveries Yet Today
                                    </h3>
                                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                                        Deliveries marked completed with customer proof photos will be logged here with timestamps and drop compensation records.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {completedToday.map((delivery) => (
                                        <div
                                            key={delivery.id}
                                            className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                                                    <CheckCircle2 size={20} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-mono text-xs font-bold text-stone-900">
                                                            Order #{delivery.order_number}
                                                        </span>
                                                        <span className="text-xs font-bold text-stone-800 truncate">
                                                            • {delivery.customer?.name}
                                                        </span>
                                                    </div>
                                                    <p className="truncate text-xs text-stone-500 mt-0.5">
                                                        {delivery.destination?.address}
                                                    </p>
                                                    <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                                                        <Clock size={11} />
                                                        <span>Delivered at {delivery.delivered_at || "Today"}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {delivery.pod_photo_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingPodPhoto(delivery.pod_photo_url)}
                                                    className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition shadow-2xs min-h-[40px]"
                                                >
                                                    <Camera size={14} className="text-clay-600" />
                                                    <span>View Proof Photo</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Driver Profile & Shift Status (Desktop Only: 4 cols) */}
                        <div className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
                            {/* Card 1: Rider Profile & Vehicle Compliance */}
                            <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-100 border border-stone-200 text-clay-700 shadow-2xs">
                                            {renderVehicleIcon(driverProfile.vehicle_type, "text-clay-700", 22)}
                                            <span
                                                className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                                                    driverProfile.is_clocked_in ? "bg-emerald-500" : "bg-stone-400"
                                                }`}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-base font-extrabold text-stone-900 truncate">
                                                {driverProfile.name || "Delivery Driver"}
                                            </h2>
                                            <p className="text-xs text-stone-500 font-medium truncate">
                                                {shopName}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                                            driverProfile.is_clocked_in
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-stone-100 text-stone-600 border border-stone-200"
                                        }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                driverProfile.is_clocked_in ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                                            }`}
                                        />
                                        {driverProfile.is_clocked_in ? "On Duty" : "Off Duty"}
                                    </span>
                                </div>

                                {/* Transport Specs */}
                                <div className="rounded-xl bg-stone-50 p-3 border border-stone-100 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-stone-400 font-medium">Vehicle</span>
                                        <span className="font-bold text-stone-800">{driverProfile.vehicle_type || "Motorcycle"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-stone-400 font-medium">Plate Number</span>
                                        <span className="font-mono font-bold text-stone-800">{driverProfile.vehicle_plate_number || "Not set"}</span>
                                    </div>
                                    {driverProfile.driver_license_number && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-stone-400 font-medium">License No.</span>
                                            <span className="font-mono font-bold text-stone-800">{driverProfile.driver_license_number}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Verification Status & Actions */}
                                <div className="pt-3 border-t border-stone-100">
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                                driverProfile.is_vehicle_verified
                                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                                            }`}
                                        >
                                            {driverProfile.is_vehicle_verified ? (
                                                <>
                                                    <ShieldCheck size={13} className="text-emerald-600" />
                                                    <span>Verified Transport</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldAlert size={13} className="text-amber-600" />
                                                    <span>Verification Pending</span>
                                                </>
                                            )}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            {driverProfile.driver_license_photo_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingLicensePhoto(driverProfile.driver_license_photo_url)}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 underline"
                                                >
                                                    <Eye size={12} />
                                                    <span>View ID</span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setIsVerifyModalOpen(true)}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-clay-700 hover:text-clay-800 underline"
                                            >
                                                {driverProfile.is_vehicle_verified ? "Update" : "Verify Now"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Shift & Compensation Summary */}
                            <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                                    Shift &amp; Earnings
                                </h3>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-stone-50 p-3 border border-stone-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Active Runs</span>
                                        <span className="text-2xl font-extrabold text-stone-900 font-mono">{activeDeliveries.length}</span>
                                        <span className="text-[10px] text-stone-500 font-medium block mt-0.5">In transit</span>
                                    </div>
                                    <div className="rounded-xl bg-stone-50 p-3 border border-stone-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Completed</span>
                                        <span className="text-2xl font-extrabold text-stone-900 font-mono">{completedToday.length}</span>
                                        <span className="text-[10px] text-stone-500 font-medium block mt-0.5">Today</span>
                                    </div>
                                </div>

                                {/* Compensation breakdown */}
                                <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                                        {(driverProfile.compensation_type === 'per_delivery' || driverProfile.compensation_type === 'hybrid')
                                            ? "Today's Drop Earnings"
                                            : "Compensation Model"}
                                    </span>
                                    <div className="text-lg font-extrabold text-stone-900 font-mono">
                                        {(driverProfile.compensation_type === 'per_delivery' || driverProfile.compensation_type === 'hybrid')
                                            ? `₱${Number(driverProfile.today_drop_earnings || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                                            : "Monthly Salary"}
                                    </div>
                                    <p className="text-[11px] text-stone-500 font-medium">
                                        {(driverProfile.compensation_type === 'per_delivery' || driverProfile.compensation_type === 'hybrid')
                                            ? `₱${Number(driverProfile.delivery_fee_rate || 0).toFixed(2)} / completed drop`
                                            : "Regular employee wage structure"}
                                    </p>
                                </div>

                                {!driverProfile.is_clocked_in && (
                                    <button
                                        type="button"
                                        onClick={() => setIsClockInModalOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-clay-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-clay-700 active:scale-95 transition min-h-[42px]"
                                    >
                                        <Clock size={15} />
                                        <span>Clock In Shift Now</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL 1: Complete Delivery & POD Capture */}
            {completingDelivery && (
                <Modal show={true} onClose={handleCloseCompleteModal} maxWidth="lg">
                    <form onSubmit={handleSubmitDeliveryCompletion} className="p-6 bg-white">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                    <Camera size={18} />
                                </div>
                                <h3 className="text-sm font-bold text-stone-900">
                                    Proof of Delivery: Order #{completingDelivery.order_number}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseCompleteModal}
                                className="text-stone-400 hover:text-stone-700"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                                    Capture Photo Proof (Required)
                                </label>
                                <div className="relative border-2 border-dashed border-stone-300 rounded-2xl p-4 text-center hover:border-stone-400 transition bg-stone-50/50">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handlePhotoChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    />
                                    {podPreview ? (
                                        <div className="space-y-2">
                                            <img
                                                src={podPreview}
                                                alt="Proof Preview"
                                                className="max-h-48 mx-auto rounded-xl object-cover shadow-xs"
                                            />
                                            <p className="text-[11px] font-bold text-clay-700">
                                                Tap to retake photo
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="py-6 flex flex-col items-center justify-center text-stone-400">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-stone-200 text-stone-500 mb-2 shadow-2xs">
                                                <Camera size={22} />
                                            </div>
                                            <p className="text-xs font-bold text-stone-700">
                                                Take Photo / Upload Proof
                                            </p>
                                            <p className="text-[10px] text-stone-400 mt-0.5">
                                                Photo of parcel delivered to customer or doorstep
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                                    Delivery Remarks (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={podNotes}
                                    onChange={(e) => setPodNotes(e.target.value)}
                                    placeholder="e.g. Received by buyer at gate, or left with security reception..."
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100 mt-5">
                            <button
                                type="button"
                                onClick={handleCloseCompleteModal}
                                disabled={isSubmitting}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!podPhoto || isSubmitting}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition disabled:opacity-50 shadow-xs"
                            >
                                {isSubmitting ? (
                                    <LoaderCircle size={14} className="animate-spin" />
                                ) : (
                                    <CheckCircle2 size={14} />
                                )}
                                <span>{isSubmitting ? "Submitting..." : "Confirm Delivery"}</span>
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL 2: View POD Photo Thumbnail */}
            {viewingPodPhoto && (
                <Modal show={true} onClose={() => setViewingPodPhoto(null)} maxWidth="md">
                    <div className="p-4 bg-white">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
                            <h4 className="text-xs font-bold text-stone-900">Proof of Delivery Photo</h4>
                            <button
                                type="button"
                                onClick={() => setViewingPodPhoto(null)}
                                className="text-stone-400 hover:text-stone-700"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <img
                            src={viewingPodPhoto}
                            alt="POD Photo"
                            className="w-full rounded-xl object-contain max-h-[70vh]"
                        />
                    </div>
                </Modal>
            )}

            {/* MODAL 3: Verify Vehicle & Driver License */}
            {isVerifyModalOpen && (
                <Modal show={true} onClose={handleCloseVerifyModal} maxWidth="md">
                    <form onSubmit={handleSubmitVehicleVerification} className="p-5 sm:p-6 bg-white">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-stone-900">
                                        Rider Vehicle &amp; License Verification
                                    </h3>
                                    <p className="text-[11px] text-stone-500">
                                        Verify your vehicle and driver&apos;s license / ID card
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseVerifyModal}
                                className="text-stone-400 hover:text-stone-700 rounded-lg p-1 hover:bg-stone-100 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Vehicle Type */}
                            <div>
                                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                                    Vehicle Type <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={vehicleType}
                                    onChange={(e) => setVehicleType(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                >
                                    <option value="Motorcycle">Motorcycle (Standard)</option>
                                    <option value="Bicycle">Bicycle / E-Bike</option>
                                    <option value="Sedan">Sedan (4-Wheel)</option>
                                    <option value="MPV">MPV / SUV (Bulky)</option>
                                    <option value="Van">Van / Light Cargo Truck</option>
                                </select>
                                {vehicleErrors.vehicle_type && (
                                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                                        {vehicleErrors.vehicle_type}
                                    </p>
                                )}
                            </div>

                            {/* Plate Number */}
                            <div>
                                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                                    Plate Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={plateNumber}
                                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                                    placeholder="e.g. ABC 1234"
                                    maxLength={20}
                                    className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold uppercase text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 ${
                                        vehicleErrors.vehicle_plate_number ? "border-rose-300 bg-rose-50/20" : "border-stone-200"
                                    }`}
                                />
                                {vehicleErrors.vehicle_plate_number && (
                                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                                        {vehicleErrors.vehicle_plate_number}
                                    </p>
                                )}
                            </div>

                            {/* Driver License Number */}
                            <div>
                                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                                    Driver&apos;s License / ID Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={licenseNumber}
                                    onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                                    placeholder="e.g. D01-12-345678"
                                    maxLength={50}
                                    className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold uppercase text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 ${
                                        vehicleErrors.driver_license_number ? "border-rose-300 bg-rose-50/20" : "border-stone-200"
                                    }`}
                                />
                                {vehicleErrors.driver_license_number && (
                                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                                        {vehicleErrors.driver_license_number}
                                    </p>
                                )}
                            </div>

                            {/* Driver License / ID Photo */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-[11px] font-bold text-stone-700">
                                        Driver&apos;s License or ID Card Photo {!driverProfile.driver_license_photo_url && <span className="text-rose-500">*</span>}
                                    </label>
                                    {driverProfile.driver_license_photo_url && (
                                        <span className="text-[10px] font-semibold text-emerald-600">
                                            Currently Uploaded
                                        </span>
                                    )}
                                </div>

                                <div className="relative border-2 border-dashed border-stone-300 rounded-2xl p-4 text-center hover:border-stone-400 transition bg-stone-50/50">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleLicensePhotoChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    />
                                    {licensePreview || driverProfile.driver_license_photo_url ? (
                                        <div className="space-y-2">
                                            <img
                                                src={licensePreview || driverProfile.driver_license_photo_url}
                                                alt="License Preview"
                                                className="max-h-44 mx-auto rounded-xl object-contain shadow-xs bg-stone-100"
                                            />
                                            <p className="text-[11px] font-bold text-clay-700">
                                                {licensePreview ? "Tap to retake / change photo" : "Tap to update with new photo"}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="py-5 flex flex-col items-center justify-center text-stone-400">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-stone-200 text-stone-500 mb-2 shadow-2xs">
                                                <Camera size={20} />
                                            </div>
                                            <p className="text-xs font-bold text-stone-700">
                                                Take Photo / Upload Card
                                            </p>
                                            <p className="text-[10px] text-stone-400 mt-0.5">
                                                Clear photo of driver&apos;s license or valid government ID
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {vehicleErrors.driver_license_photo && (
                                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                                        {vehicleErrors.driver_license_photo}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100 mt-5">
                            <button
                                type="button"
                                onClick={handleCloseVerifyModal}
                                disabled={isSubmittingVehicle}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingVehicle}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-clay-700 hover:bg-clay-800 transition disabled:opacity-50 shadow-xs"
                            >
                                {isSubmittingVehicle ? (
                                    <LoaderCircle size={14} className="animate-spin" />
                                ) : (
                                    <CheckCircle2 size={14} />
                                )}
                                <span>{isSubmittingVehicle ? "Saving..." : "Save & Verify Details"}</span>
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL 4: View License / ID Photo */}
            {viewingLicensePhoto && (
                <Modal show={true} onClose={() => setViewingLicensePhoto(null)} maxWidth="md">
                    <div className="p-4 bg-white">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-600" />
                                <h4 className="text-xs font-bold text-stone-900">Driver License / ID Photo</h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingLicensePhoto(null)}
                                className="text-stone-400 hover:text-stone-700 rounded-lg p-1 hover:bg-stone-100 transition"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <img
                            src={viewingLicensePhoto}
                            alt="Driver License"
                            className="w-full rounded-xl object-contain max-h-[70vh] bg-stone-50"
                        />
                    </div>
                </Modal>
            )}

            {/* Clock In Modal */}
            <StaffClockInModal
                isOpen={isClockInModalOpen}
                onClose={() => setIsClockInModalOpen(false)}
            />
        </div>
    );
}

DriverDeliveries.layout = (page) => <SellerWorkspaceLayout active="deliveries">{page}</SellerWorkspaceLayout>;
