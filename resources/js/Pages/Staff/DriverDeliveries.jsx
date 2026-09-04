/* global route */
import React, { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import SellerWorkspaceLayout from "@/Layouts/SellerWorkspaceLayout";
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
    User,
    Package,
    ArrowUpRight,
    LoaderCircle,
    X,
    FileText,
    ExternalLink,
    AlertCircle
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
    const [activeTab, setActiveTab] = useState("active");
    const [completingDelivery, setCompletingDelivery] = useState(null);
    const [podPhoto, setPodPhoto] = useState(null);
    const [podPreview, setPodPreview] = useState(null);
    const [podNotes, setPodNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewingPodPhoto, setViewingPodPhoto] = useState(null);

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
        <div className="min-h-screen bg-stone-50 pb-20">
            <Head title="Driver Delivery Console - LikhangKamay" />

            {/* Top Bar / Driver Hero */}
            <div className="bg-white border-b border-stone-200 sticky top-0 z-20 px-4 py-3 sm:px-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-100 text-clay-700 font-bold">
                            <Truck size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-bold text-stone-900">
                                    {driverProfile.name || "Delivery Driver"}
                                </h1>
                                <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
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
                            <p className="text-[11px] text-stone-500">
                                {shopName} • {driverProfile.vehicle_type || "Motorcycle"}
                                {driverProfile.vehicle_plate_number && ` • ${driverProfile.vehicle_plate_number}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                            {activeDeliveries.length} Active Run(s)
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-6">
                {/* Tab Switcher */}
                <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("active")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                            activeTab === "active"
                                ? "bg-stone-900 text-white shadow-xs"
                                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                        }`}
                    >
                        <Truck size={14} />
                        <span>Active Deliveries ({activeDeliveries.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("completed")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                            activeTab === "completed"
                                ? "bg-stone-900 text-white shadow-xs"
                                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                        }`}
                    >
                        <CheckCircle2 size={14} />
                        <span>Completed Today ({completedToday.length})</span>
                    </button>
                </div>

                {/* ACTIVE DELIVERIES TAB */}
                {activeTab === "active" && (
                    <div className="space-y-4">
                        {activeDeliveries.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mb-3">
                                    <Truck size={24} />
                                </div>
                                <h3 className="text-sm font-bold text-stone-900 mb-1">
                                    No Deliveries In Progress
                                </h3>
                                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                                    You have no open orders assigned right now. As the studio assigns parcels for local dispatch, they will appear here in real-time.
                                </p>
                            </div>
                        ) : (
                            activeDeliveries.map((delivery) => {
                                const encodedAddr = encodeURIComponent(delivery.destination?.address || "");
                                const mapUrl =
                                    delivery.destination?.latitude && delivery.destination?.longitude
                                        ? `https://www.google.com/maps/dir/?api=1&destination=${delivery.destination.latitude},${delivery.destination.longitude}`
                                        : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddr}`;

                                return (
                                    <div
                                        key={delivery.id}
                                        className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden"
                                    >
                                        {/* Card Header */}
                                        <div className="border-b border-stone-100 bg-stone-50/70 px-5 py-3.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-stone-800">
                                                    #{delivery.order_number}
                                                </span>
                                                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                                    In Transit
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                                                <Clock size={12} />
                                                {delivery.dispatched_at || "Dispatched today"}
                                            </span>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-5 space-y-4">
                                            {/* Customer & Destination */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                                        Recipient Customer
                                                    </p>
                                                    <p className="text-sm font-bold text-stone-900 mt-0.5">
                                                        {delivery.customer?.name}
                                                    </p>
                                                    <p className="text-xs text-stone-600 mt-0.5">
                                                        {delivery.customer?.phone || "No contact phone"}
                                                    </p>
                                                </div>

                                                {/* Communication Shortcuts */}
                                                <div className="flex items-center gap-2 sm:justify-end">
                                                    {delivery.customer?.phone && (
                                                        <>
                                                            <a
                                                                href={`tel:${delivery.customer.phone}`}
                                                                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition shadow-2xs"
                                                            >
                                                                <Phone size={14} className="text-emerald-600" />
                                                                <span>Call</span>
                                                            </a>
                                                            <a
                                                                href={`sms:${delivery.customer.phone}`}
                                                                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition shadow-2xs"
                                                            >
                                                                <MessageSquare size={14} className="text-sky-600" />
                                                                <span>SMS</span>
                                                            </a>
                                                        </>
                                                    )}
                                                    <a
                                                        href={mapUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 rounded-xl bg-clay-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-clay-800 transition shadow-xs"
                                                    >
                                                        <Navigation size={14} />
                                                        <span>Navigate</span>
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Drop-off Address */}
                                            <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-100 flex items-start gap-2.5">
                                                <MapPin size={16} className="text-clay-600 shrink-0 mt-0.5" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium text-stone-800 leading-relaxed">
                                                        {delivery.destination?.address}
                                                    </p>
                                                    {delivery.dispatch_notes && (
                                                        <p className="text-[11px] text-amber-800 bg-amber-50 rounded-lg p-2 mt-2 border border-amber-200/60 font-medium">
                                                            <strong>Note:</strong> {delivery.dispatch_notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Items to Deliver */}
                                            {delivery.items?.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                                                        Parcel Contents ({delivery.items.length})
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {delivery.items.map((item, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center gap-2.5 rounded-lg border border-stone-100 p-2 text-xs"
                                                            >
                                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-500 font-bold text-[10px]">
                                                                    ×{item.quantity}
                                                                </div>
                                                                <span className="truncate font-medium text-stone-800">
                                                                    {item.name}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Mark Delivered Action */}
                                            <div className="pt-2 border-t border-stone-100">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenCompleteModal(delivery)}
                                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-xs active:scale-[0.99]"
                                                >
                                                    <Camera size={16} />
                                                    <span>Complete Delivery & Submit Proof</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* COMPLETED TODAY TAB */}
                {activeTab === "completed" && (
                    <div className="space-y-4">
                        {completedToday.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center">
                                <CheckCircle2 size={28} className="mx-auto text-stone-300 mb-2" />
                                <p className="text-xs font-bold text-stone-700">
                                    No completed deliveries yet today
                                </p>
                                <p className="text-[11px] text-stone-400 mt-1">
                                    Delivered orders with submitted proof photos will appear here.
                                </p>
                            </div>
                        ) : (
                            completedToday.map((delivery) => (
                                <div
                                    key={delivery.id}
                                    className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-bold text-stone-900">
                                                Order #{delivery.order_number} • {delivery.customer?.name}
                                            </p>
                                            <p className="truncate text-[11px] text-stone-500 mt-0.5">
                                                {delivery.destination?.address}
                                            </p>
                                            <p className="text-[10px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                                                <Clock size={10} />
                                                Delivered at {delivery.delivered_at || "Today"}
                                            </p>
                                        </div>
                                    </div>

                                    {delivery.pod_photo_url && (
                                        <button
                                            type="button"
                                            onClick={() => setViewingPodPhoto(delivery.pod_photo_url)}
                                            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                                        >
                                            <Camera size={13} className="text-clay-600" />
                                            <span>View Proof</span>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
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
        </div>
    );
}

DriverDeliveries.layout = (page) => <SellerWorkspaceLayout active="orders">{page}</SellerWorkspaceLayout>;
