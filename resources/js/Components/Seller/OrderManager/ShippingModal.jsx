import React from "react";
import Modal from "@/Components/Modal";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import { 
    MapPin, 
    PackageCheck, 
    Truck, 
    X, 
    User, 
    MessageCircle, 
    PackageOpen, 
    Hash, 
    CameraIcon, 
    CheckCircle2, 
    LoaderCircle 
} from "lucide-react";

export default function ShippingModal({
    shippingModal,
    setShippingModal,
    orderToShip,
    closeShippingModal,
    submitShipping,
    revokeShippingPreview,
    canEditOrders,
}) {
    if (!shippingModal.isOpen || !orderToShip) return null;

    return (
        <Modal
            show={shippingModal.isOpen}
            onClose={closeShippingModal}
            maxWidth="5xl"
        >
            <div className="flex max-h-[90vh] flex-col bg-[#FDFBF9]">
                {/* Header */}
                <div className="shrink-0 border-b border-stone-200/60 bg-white px-6 py-5 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                shippingModal.status === "Delivered"
                                    ? "bg-teal-100 text-teal-600 border border-teal-200 shadow-sm"
                                    : shippingModal.isPickup
                                      ? "bg-orange-100 text-orange-600 border border-orange-200 shadow-sm"
                                      : "bg-blue-100 text-blue-600 border border-blue-200 shadow-sm"
                            }`}
                        >
                            {shippingModal.status === "Delivered" ? (
                                <MapPin size={24} />
                            ) : shippingModal.isPickup ? (
                                <PackageCheck size={24} />
                            ) : (
                                <Truck size={24} />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                                {shippingModal.title}
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
                        onClick={closeShippingModal}
                        className="p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-900 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-stone-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body - 2 Columns */}
                <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                        {/* LEFT COLUMN: Order Context */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* Customer & Destination */}
                            <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4 flex items-center gap-2">
                                    <User size={16} className="text-stone-400" />{" "}
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
                                    <PackageOpen size={16} className="text-stone-400" />{" "}
                                    Items to Pack
                                </h3>
                                <div className="space-y-3">
                                    {orderToShip.items?.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-4 rounded-xl border border-stone-100 bg-white p-3 shadow-sm hover:border-stone-200 transition-colors"
                                        >
                                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                                                <img
                                                    src={
                                                        item.img?.startsWith("http") || item.img?.startsWith("/storage")
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
                                        shippingModal.status === "Delivered"
                                            ? "border-teal-200 bg-teal-50 text-teal-800"
                                            : shippingModal.isPickup
                                              ? "border-orange-200 bg-orange-50 text-orange-800"
                                              : "border-blue-200 bg-blue-50 text-blue-800"
                                    }`}
                                >
                                    <p className="font-bold uppercase tracking-[0.16em] mb-1">
                                        {shippingModal.status === "Delivered"
                                            ? "Next step"
                                            : shippingModal.isPickup
                                              ? "Pickup flow"
                                              : "Shipping flow"}
                                    </p>
                                    <p className="font-medium">
                                        {shippingModal.status === "Delivered"
                                            ? "Submitting this closes the seller-side delivery step and keeps the latest proof visible to the buyer."
                                            : shippingModal.isPickup
                                              ? "Mark the order ready first, then confirm the handover once the buyer actually receives it."
                                              : "Submit shipping proof now, then return once delivery is complete to attach the final proof if needed."}
                                    </p>
                                </div>

                                {shippingModal.allowTracking && (
                                    <div className="mb-6">
                                        <InputLabel>
                                            <Hash size={14} className="inline mr-1 text-stone-400" />{" "}
                                            Tracking Number
                                        </InputLabel>
                                        <TextInput
                                            disabled={!canEditOrders}
                                            value={shippingModal.trackingNumber}
                                            onChange={(e) =>
                                                setShippingModal({
                                                    ...shippingModal,
                                                    trackingNumber: e.target.value,
                                                })
                                            }
                                            placeholder="e.g. JNT-12345678"
                                            className="w-full rounded-xl border-stone-200 focus:border-stone-900 focus:ring-stone-900 font-medium"
                                        />
                                    </div>
                                )}

                                <div className="mb-6">
                                    <InputLabel className="flex items-center justify-between">
                                        <span>{shippingModal.proofLabel}</span>
                                        {shippingModal.proofRequired && (
                                            <span className="text-[10px] uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                Required
                                            </span>
                                        )}
                                    </InputLabel>
                                    <div className="relative w-full border-2 border-dashed border-stone-300 rounded-xl p-4 text-center cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition group overflow-hidden bg-stone-50/30">
                                        <input
                                            type="file"
                                            disabled={!canEditOrders}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    revokeShippingPreview();
                                                    setShippingModal({
                                                        ...shippingModal,
                                                        proofOfDelivery: file,
                                                        previewUrl: URL.createObjectURL(file),
                                                    });
                                                }
                                            }}
                                        />
                                        {shippingModal.previewUrl ? (
                                            <div className="relative">
                                                <img
                                                    src={shippingModal.previewUrl}
                                                    alt="Proof"
                                                    className="h-40 w-full object-cover mx-auto rounded-lg shadow-sm"
                                                />
                                                <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] rounded-lg">
                                                    <span className="bg-white text-stone-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                                                        Change Photo
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-6 flex flex-col items-center justify-center text-stone-400 group-hover:text-stone-600 transition-colors">
                                                <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-stone-100 flex items-center justify-center mb-3">
                                                    <CameraIcon size={20} />
                                                </div>
                                                <p className="text-sm font-bold text-stone-700">
                                                    Click to upload photo
                                                </p>
                                                <p className="text-[10px] font-medium mt-1 max-w-[200px] text-center leading-snug">
                                                    {shippingModal.proofHint}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    {shippingModal.existingProofUrl && (
                                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-stone-50 p-2.5 border border-stone-100">
                                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-stone-700 truncate">
                                                    Existing proof attached
                                                </p>
                                                {shippingModal.proofRequired && (
                                                    <p className="text-[9px] text-stone-500">
                                                        Upload a new one to replace it.
                                                    </p>
                                                )}
                                            </div>
                                            <a
                                                href={shippingModal.existingProofUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 text-[10px] font-bold text-clay-600 hover:underline"
                                            >
                                                View
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <InputLabel>
                                        {shippingModal.noteLabel}{" "}
                                        <span className="text-stone-400 font-normal text-xs">
                                            (Optional)
                                        </span>
                                    </InputLabel>
                                    <textarea
                                        disabled={!canEditOrders}
                                        value={shippingModal.shippingNotes}
                                        onChange={(e) =>
                                            setShippingModal({
                                                ...shippingModal,
                                                shippingNotes: e.target.value,
                                            })
                                        }
                                        placeholder={shippingModal.notePlaceholder}
                                        rows={3}
                                        className="w-full border-stone-200 rounded-xl focus:border-stone-900 focus:ring-stone-900 shadow-sm text-sm font-medium resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="shrink-0 border-t border-stone-200/60 bg-stone-50/80 px-6 py-4 flex items-center justify-between sticky bottom-0 z-20">
                    <button
                        onClick={closeShippingModal}
                        disabled={shippingModal.processing}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submitShipping}
                        disabled={
                            !canEditOrders ||
                            shippingModal.processing ||
                            (shippingModal.proofRequired && !shippingModal.proofOfDelivery)
                        }
                        className={`flex items-center justify-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${
                            shippingModal.status === "Delivered"
                                ? "bg-teal-600 hover:bg-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500/30"
                                : shippingModal.isPickup
                                  ? "bg-orange-500 hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500/30"
                                  : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500/30"
                        }`}
                    >
                        {shippingModal.processing ? (
                            <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={16} />
                        )}
                        {shippingModal.processing ? "Processing..." : shippingModal.confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
