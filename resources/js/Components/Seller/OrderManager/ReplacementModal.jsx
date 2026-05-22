import React from "react";
import Modal from "@/Components/Modal";
import InputLabel from "@/Components/InputLabel";
import { PackageCheck } from "lucide-react";

export default function ReplacementModal({
    isOpen,
    onClose,
    processing,
    resolutionDescription,
    error,
    canEditOrders,
    setReplacementModal,
    submitReplacementApproval,
}) {
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-full bg-teal-100 p-3 text-teal-600">
                        <PackageCheck size={22} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            Approve Replacement
                        </h2>
                        <p className="text-sm text-gray-500">
                            Describe the compensation or resolution the buyer
                            will receive.
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-xs text-teal-800">
                    The order will return to the normal delivery lifecycle and
                    must be officially received by the buyer again.
                </div>
                <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-700">
                    <p className="font-bold uppercase tracking-[0.16em] text-stone-500">
                        What happens after approval
                    </p>
                    <p className="mt-1">
                        The order stays active, keeps the seller resolution
                        note, and goes back through delivery until the buyer
                        confirms receipt again.
                    </p>
                </div>

                <div className="mt-4">
                    <InputLabel value="Compensation / Resolution Description" />
                    <textarea
                        rows={4}
                        disabled={!canEditOrders}
                        value={resolutionDescription}
                        onChange={(event) =>
                            setReplacementModal((current) => ({
                                ...current,
                                resolutionDescription: event.target.value,
                                error: "",
                            }))
                        }
                        className="w-full rounded-xl border-gray-300 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
                        placeholder="Example: We will send a replacement item with reinforced packaging and include a small courtesy item for the inconvenience."
                    />
                    {error && (
                        <p className="mt-2 text-sm font-medium text-red-600">
                            {error}
                        </p>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submitReplacementApproval}
                        disabled={!canEditOrders || processing}
                        className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-teal-200 hover:bg-teal-700 disabled:opacity-50"
                    >
                        {processing ? "Approving..." : "Approve Replacement"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
