import React from "react";
import Modal from "@/Components/Modal";
import { RotateCcw, Archive } from "lucide-react";

export default function ArchiveModal({
    isOpen,
    onClose,
    confirmArchive,
    selectedProduct,
    canEditProducts,
}) {
    const isArchived = selectedProduct?.status === "Archived";
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="sm">
            <div className="p-5 sm:p-6 text-center">
                <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        isArchived ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                    }`}
                >
                    {isArchived ? <RotateCcw size={24} /> : <Archive size={24} />}
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                    {isArchived ? "Unarchive Product?" : "Archive Product?"}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    {isArchived
                        ? "This will make the product visible in your dashboard again."
                        : "This will hide the product from your shop. You can unarchive it later."}
                </p>
                <div className="flex justify-center gap-3 border-t border-gray-100 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50 min-h-[44px] sm:min-h-0"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={confirmArchive}
                        disabled={!canEditProducts}
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white min-h-[44px] sm:min-h-0 ${
                            isArchived ? "bg-amber-500 hover:bg-amber-600" : "bg-rose-600 hover:bg-rose-700"
                        }`}
                    >
                        {isArchived ? "Yes, Unarchive" : "Yes, Archive"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
