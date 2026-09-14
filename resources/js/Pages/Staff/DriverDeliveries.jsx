/* global route */
import React, { useState, lazy, Suspense } from "react";
import { Head, router } from "@inertiajs/react";
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from "@/Layouts/SellerWorkspaceLayout";
import SellerHeader from "@/Layouts/SellerHeader";
import { Truck, Clock, ShieldAlert, ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";
import { useToast } from "@/Components/ToastContext";
import { useDriverTelemetry } from "@/hooks/useDriverTelemetry";

// Subcomponents under resources/js/Components/Staff/Driver/
import ActiveDeliveryCard from "@/Components/Staff/Driver/ActiveDeliveryCard";
import DeliveryProofModal from "@/Components/Staff/Driver/DeliveryProofModal";
import DeliveryRouteMapModal from "@/Components/Staff/Driver/DeliveryRouteMapModal";
import DriverVehicleVerifyModal from "@/Components/Staff/Driver/DriverVehicleVerifyModal";
import DriverProfileSidebar, { renderVehicleIcon } from "@/Components/Staff/Driver/DriverProfileSidebar";
import CompletedDeliveriesList from "@/Components/Staff/Driver/CompletedDeliveriesList";
import DriverPhotoViewerModal from "@/Components/Staff/Driver/DriverPhotoViewerModal";

const StaffClockInModal = lazy(() => import("@/Components/Staff/Dashboard/StaffClockInModal"));

export default function DriverDeliveries({
    auth,
    activeDeliveries = [],
    completedToday = [],
    driverProfile = {},
    shopName = "Studio",
}) {
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    const {
        isSharing: isLocationSharing,
        lastSyncTime: locationLastSync,
        errorMessage: locationError,
        toggleTracking: toggleLocationTracking,
    } = useDriverTelemetry({
        activeDeliveries,
        isClockedIn: Boolean(driverProfile?.is_clocked_in),
    });

    const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("active");
    const [completingDelivery, setCompletingDelivery] = useState(null);
    const [routeMapDelivery, setRouteMapDelivery] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewingPodPhoto, setViewingPodPhoto] = useState(null);

    // Vehicle & License Verification State
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
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

    const handleSubmitVehicleVerification = (formDataValues) => {
        setIsSubmittingVehicle(true);
        const formData = new FormData();
        formData.append("vehicle_type", formDataValues.vehicle_type);
        formData.append("vehicle_plate_number", formDataValues.vehicle_plate_number);
        formData.append("driver_license_number", formDataValues.driver_license_number);
        if (formDataValues.driver_license_photo) {
            formData.append("driver_license_photo", formDataValues.driver_license_photo);
        }

        router.post(route("staff.deliveries.verify-vehicle"), formData, {
            forceFormData: true,
            onSuccess: () => {
                setIsSubmittingVehicle(false);
                setIsVerifyModalOpen(false);
                setVehicleErrors({});
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

    const handleSubmitDeliveryCompletion = ({ delivery, podPhoto, podNotes, signatureDataUrl }) => {
        if (!delivery) return;
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
        if (signatureDataUrl) {
            formData.append("signature_data", signatureDataUrl);
        }

        router.post(
            route("staff.deliveries.complete", delivery.id),
            formData,
            {
                forceFormData: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    setCompletingDelivery(null);
                    addToast(`Delivery #${delivery.order_number} confirmed!`, "success");
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
                    <div className="flex items-center gap-2">
                        {driverProfile.is_clocked_in && activeDeliveries.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleLocationTracking}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                                    isLocationSharing
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                        : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                                }`}
                                title="Share live location with studio and customers"
                            >
                                <span className={`h-2 w-2 rounded-full ${isLocationSharing ? "bg-emerald-500 animate-ping" : "bg-stone-300"}`} />
                                <span className="hidden sm:inline">{isLocationSharing ? "Live GPS Sharing" : "Share Location"}</span>
                            </button>
                        )}
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
                    </div>
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
                        {/* LEFT COLUMN: Deliveries & Tabs */}
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
                                    {locationError && (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                                            <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold">Location Permission Notice</p>
                                                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{locationError}</p>
                                            </div>
                                        </div>
                                    )}
                                    {isLocationSharing && (
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-2xs">
                                            <div className="flex items-center gap-2">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className="font-semibold text-emerald-800">
                                                    Broadcasting live location to customer and workshop
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-emerald-700 font-mono">
                                                {locationLastSync ? `Synced ${locationLastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : "GPS active"}
                                            </span>
                                        </div>
                                    )}
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
                                            {activeDeliveries.map((delivery) => (
                                                <ActiveDeliveryCard
                                                    key={delivery.id}
                                                    delivery={delivery}
                                                    copiedOrderId={copiedOrderId}
                                                    onCopyAddress={handleCopyAddress}
                                                    onOpenCompleteModal={setCompletingDelivery}
                                                    onOpenRouteMap={setRouteMapDelivery}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* COMPLETED TODAY TAB */}
                            {activeTab === "completed" && (
                                <CompletedDeliveriesList
                                    completedToday={completedToday}
                                    onViewPodPhoto={setViewingPodPhoto}
                                />
                            )}
                        </div>

                        {/* RIGHT COLUMN: Driver Profile & Shift Status (Desktop Only) */}
                        <DriverProfileSidebar
                            driverProfile={driverProfile}
                            shopName={shopName}
                            activeDeliveriesCount={activeDeliveries.length}
                            completedTodayCount={completedToday.length}
                            onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
                            onOpenClockInModal={() => setIsClockInModalOpen(true)}
                            onViewLicensePhoto={setViewingLicensePhoto}
                        />
                    </div>
                </div>
            </div>

            {/* MODAL 1: Complete Delivery & POD Capture */}
            <DeliveryProofModal
                isOpen={Boolean(completingDelivery)}
                onClose={() => setCompletingDelivery(null)}
                delivery={completingDelivery}
                onSubmit={handleSubmitDeliveryCompletion}
                isSubmitting={isSubmitting}
            />

            {/* MODAL 2: Interactive Delivery Route Map */}
            <DeliveryRouteMapModal
                isOpen={Boolean(routeMapDelivery)}
                onClose={() => setRouteMapDelivery(null)}
                delivery={routeMapDelivery}
                shopName={shopName}
            />

            {/* MODAL 3: View POD Photo Thumbnail */}
            <DriverPhotoViewerModal
                isOpen={Boolean(viewingPodPhoto)}
                onClose={() => setViewingPodPhoto(null)}
                title="Proof of Delivery Photo"
                photoUrl={viewingPodPhoto}
            />

            {/* MODAL 4: Verify Vehicle & Driver License */}
            <DriverVehicleVerifyModal
                isOpen={isVerifyModalOpen}
                onClose={() => {
                    setIsVerifyModalOpen(false);
                    setVehicleErrors({});
                }}
                driverProfile={driverProfile}
                onSubmit={handleSubmitVehicleVerification}
                isSubmitting={isSubmittingVehicle}
                errors={vehicleErrors}
            />

            {/* MODAL 5: View License / ID Photo */}
            <DriverPhotoViewerModal
                isOpen={Boolean(viewingLicensePhoto)}
                onClose={() => setViewingLicensePhoto(null)}
                title="Driver License / ID Photo"
                photoUrl={viewingLicensePhoto}
                isVerifiedBadge={true}
            />

            {/* Clock In Modal */}
            {isClockInModalOpen && (
                <Suspense fallback={null}>
                    <StaffClockInModal
                        isOpen={isClockInModalOpen}
                        onClose={() => setIsClockInModalOpen(false)}
                    />
                </Suspense>
            )}
        </div>
    );
}

DriverDeliveries.layout = (page) => <SellerWorkspaceLayout active="deliveries">{page}</SellerWorkspaceLayout>;
