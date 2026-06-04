import React, { useState, useEffect } from "react";
import Modal from "@/Components/Modal";
import SlideOverDrawer from "@/Components/SlideOverDrawer";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import ManualDeliveryForm from "@/Components/Seller/Orders/ManualDeliveryForm";
import {
    MapPin,
    PackageCheck,
    Truck,
    X,
    User,
    MessageCircle,
    PackageOpen,
    Hash,
    Camera as CameraIcon,
    CheckCircle2,
    LoaderCircle
} from "lucide-react";

export default function FulfillmentModal({
    isOpen,
    onClose,
    shippingModal,
    setShippingModal,
    submitShipping,
    orderToShip,
    canEditOrders
}) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (shippingModal.previewUrl?.startsWith("blob:")) {
                URL.revokeObjectURL(shippingModal.previewUrl);
            }
            setShippingModal(prev => ({
                ...prev,
                proofOfDelivery: file,
                previewUrl: URL.createObjectURL(file)
            }));
        }
    };

    if (!orderToShip) return null;

    const isPickup = shippingModal.isPickup;
    const mode = shippingModal.mode;
    const status = shippingModal.status;

    // Encapsulate UI text configurations locally
    const config = (() => {
        if (mode === "pickup-ready") {
            return {
                title: "Ready for Pickup",
                description: "Notify the buyer that the item is prepared for pickup.",
                confirmLabel: "Confirm Ready",
                proofLabel: "Pickup Readiness Photo",
                proofHint: "Upload a photo showing the packaged item is ready for pickup.",
                noteLabel: "Pickup Instructions",
                notePlaceholder: "e.g. Meet at lobby, look for blue shirt",
                proofRequired: true,
                allowTracking: false,
            };
        }
        if (mode === "deliver") {
            return {
                title: isPickup ? "Mark as Picked Up" : "Mark as Delivered",
                description: isPickup
                    ? "Confirm the buyer has already picked up the order."
                    : "Confirm the parcel has reached the buyer and attach final proof.",
                confirmLabel: isPickup ? "Confirm Pickup" : "Confirm Delivery",
                proofLabel: isPickup ? "Pickup Handover Photo" : "Final Delivery Proof",
                proofHint: isPickup
                    ? "Upload a new handover photo if you want to replace the existing pickup proof."
                    : "Upload a photo showing the order has been successfully delivered to the buyer.",
                noteLabel: isPickup ? "Pickup Notes" : "Delivery Notes",
                notePlaceholder: isPickup
                    ? "e.g. Buyer received at store counter"
                    : "e.g. Delivered to guard/reception with buyer approval",
                proofRequired: !isPickup,
                allowTracking: false,
            };
        }
        return {
            title: "Dispatch Order",
            description: "Add tracking info and shipment proof for the buyer.",
            confirmLabel: "Confirm Shipment",
            proofLabel: "Shipment Proof",
            proofHint: "Upload a photo of the packed parcel or courier handoff.",
            noteLabel: "Shipping Notes",
            notePlaceholder: "e.g. Driver contact: 0917-XXX-XXXX",
            proofRequired: true,
            allowTracking: true,
        };
    })();

    // Modal Content
    const renderContent = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                {/* LEFT COLUMN: Order Context */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Customer & Destination */}
                    <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4 flex items-center gap-2">
                            <User size={16} className="text-stone-400" />
                            Destination
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                                    Buyer Name
                                </p>
                                <p className="text-sm font-bold text-stone-900">
                                    {orderToShip.customer}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                                    Contact
                                </p>
                                <p className="text-sm font-medium text-stone-700">
                                    {orderToShip.shipping_contact_phone || "No phone provided"}
                                </p>
                            </div>
                            <div className="sm:col-span-2 mt-2">
                                <div className="flex items-start gap-2.5 rounded-xl bg-stone-50 p-3 border border-stone-100">
                                    <MapPin size={16} className="text-clay-600 mt-0.5 shrink-0" />
                                    <p className="text-sm font-medium text-stone-800 leading-relaxed">
                                        {orderToShip.shipping_address || "No address provided (Pickup)"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Buyer Notes */}
                    {orderToShip.buyer_notes && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageCircle size={16} className="text-amber-600" />
                                <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
                                    Buyer Notes
                                </h3>
                            </div>
                            <p className="text-sm text-amber-800 italic">
                                "{orderToShip.buyer_notes}"
                            </p>
                        </div>
                    )}

                    {/* Order Summary (Items to pack) */}
                    <section>
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-2 mb-4 flex items-center gap-2">
                            <PackageOpen size={16} className="text-stone-400" />
                            Items to Pack
                        </h3>
                        <div className="space-y-3">
                            {orderToShip.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-4 rounded-xl border border-stone-100 bg-white p-3 shadow-sm hover:border-stone-200 transition-colors"
                                >
                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                                        <img
                                            src={
                                                item.img.startsWith("http") || item.img.startsWith("/storage")
                                                    ? item.img
                                                    : `/storage/${item.img}`
                                            }
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = "/images/no-image.png";
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate text-sm font-bold text-stone-900">
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-stone-500 font-medium">
                                            Variant: {item.variant}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                                            Quantity
                                        </p>
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-clay-50 text-clay-700 font-bold border border-clay-100">
                                            {item.qty}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: Logistics & Proof */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm flex-1">
                        <div
                            className={`mb-6 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
                                status === "Delivered"
                                    ? "border-teal-200 bg-teal-50 text-teal-800"
                                    : isPickup
                                    ? "border-orange-200 bg-orange-50 text-orange-800"
                                    : "border-blue-200 bg-blue-50 text-blue-800"
                            }`}
                        >
                            <p className="font-bold uppercase tracking-[0.16em] mb-1">
                                {status === "Delivered"
                                    ? "Next step"
                                    : isPickup
                                    ? "Pickup flow"
                                    : "Shipping flow"}
                            </p>
                            <p className="font-medium">
                                {status === "Delivered"
                                    ? "Submitting this closes the seller-side delivery step and keeps the latest proof visible to the buyer."
                                    : isPickup
                                    ? "Mark the order ready first, then confirm the handover once the buyer actually receives it."
                                    : "Submit shipping proof now, then return once delivery is complete to attach the final proof if needed."}
                            </p>
                        </div>

                        <ManualDeliveryForm
                            shippingModal={shippingModal}
                            setShippingModal={setShippingModal}
                            canEditOrders={canEditOrders}
                            config={config}
                            handleFileChange={handleFileChange}
                        />
                    </div>
                </div>
            </div>
        );
    };

    const renderFooter = () => {
        return (
            <div className="flex items-center justify-between w-full">
                <button
                    onClick={onClose}
                    disabled={shippingModal.processing}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                >
                    Cancel
                </button>
                <button
                    onClick={submitShipping}
                    disabled={
                        !canEditOrders ||
                        shippingModal.processing ||
                        (config.proofRequired && !shippingModal.proofOfDelivery)
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 min-h-[44px] ${
                        status === "Delivered"
                            ? "bg-teal-600 hover:bg-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500/30"
                            : isPickup
                            ? "bg-orange-500 hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500/30"
                            : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    }`}
                >
                    {shippingModal.processing ? (
                        <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                        <CheckCircle2 size={16} />
                    )}
                    {shippingModal.processing ? "Processing..." : config.confirmLabel}
                </button>
            </div>
        );
    };

    if (isMobile) {
        return (
            <SlideOverDrawer
                show={isOpen}
                onClose={onClose}
                title={config.title}
                footer={renderFooter()}
                widthClass="max-w-xl"
            >
                {renderContent()}
            </SlideOverDrawer>
        );
    }

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="5xl">
            <div className="flex max-h-[90vh] flex-col bg-[#FDFBF9]">
                {/* Header */}
                <div className="shrink-0 border-b border-stone-200/60 bg-white px-6 py-5 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                status === "Delivered"
                                    ? "bg-teal-100 text-teal-600 border border-teal-200 shadow-sm"
                                    : isPickup
                                    ? "bg-orange-100 text-orange-600 border border-orange-200 shadow-sm"
                                    : "bg-blue-100 text-blue-600 border border-blue-200 shadow-sm"
                            }`}
                        >
                            {status === "Delivered" ? (
                                <MapPin size={24} />
                            ) : isPickup ? (
                                <PackageCheck size={24} />
                            ) : (
                                <Truck size={24} />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                                {config.title}
                            </h2>
                            <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                    Order
                                </span>
                                <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] font-bold text-stone-600">
                                    {shippingModal.orderId}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-900 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-stone-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                    {renderContent()}
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-stone-200/60 bg-stone-50/80 px-6 py-4 flex items-center justify-between sticky bottom-0 z-20">
                    {renderFooter()}
                </div>
            </div>
        </Modal>
    );
}
