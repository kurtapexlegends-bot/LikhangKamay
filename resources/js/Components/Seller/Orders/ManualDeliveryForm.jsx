import React from "react";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import { Hash, Camera as CameraIcon, CheckCircle2 } from "lucide-react";

export default function ManualDeliveryForm({
    shippingModal,
    setShippingModal,
    canEditOrders,
    config,
    handleFileChange
}) {
    return (
        <>
            {config.allowTracking && (
                <div className="mb-6">
                    <InputLabel>
                        <Hash size={14} className="inline mr-1 text-stone-400" />
                        Tracking Number
                    </InputLabel>
                    <TextInput
                        disabled={!canEditOrders}
                        value={shippingModal.trackingNumber || ""}
                        onChange={(e) =>
                            setShippingModal(prev => ({
                                ...prev,
                                trackingNumber: e.target.value
                            }))
                        }
                        placeholder="e.g. JNT-12345678"
                        className="w-full rounded-xl border-stone-200 focus:border-stone-900 focus:ring-stone-900 font-medium"
                    />
                </div>
            )}

            <div className="mb-6">
                <InputLabel className="flex items-center justify-between">
                    <span>{config.proofLabel}</span>
                    {config.proofRequired && (
                        <span className="text-[10px] uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Required
                        </span>
                    )}
                </InputLabel>
                <div className="relative w-full border-2 border-dashed border-stone-300 rounded-xl p-4 text-center cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition group overflow-hidden bg-stone-50/30 min-h-[140px] flex items-center justify-center">
                    <input
                        type="file"
                        disabled={!canEditOrders}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    {shippingModal.previewUrl ? (
                        <div className="relative w-full">
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
                                {config.proofHint}
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
                            {config.proofRequired && (
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
                    {config.noteLabel}{" "}
                    <span className="text-stone-400 font-normal text-xs">
                        (Optional)
                    </span>
                </InputLabel>
                <textarea
                    disabled={!canEditOrders}
                    value={shippingModal.shippingNotes || ""}
                    onChange={(e) =>
                        setShippingModal(prev => ({
                            ...prev,
                            shippingNotes: e.target.value
                        }))
                    }
                    placeholder={config.notePlaceholder}
                    rows={3}
                    className="w-full border-stone-200 rounded-xl focus:border-stone-900 focus:ring-stone-900 shadow-sm text-sm font-medium resize-none"
                />
            </div>
        </>
    );
}
