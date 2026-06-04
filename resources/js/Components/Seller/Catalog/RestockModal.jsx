import React from "react";
import Modal from "@/Components/Modal";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import PrimaryButton from "@/Components/PrimaryButton";
import { X } from "lucide-react";

const modalCloseButtonClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:text-gray-700 min-h-[44px] min-w-[44px]";

export default function RestockModal({
    isOpen,
    onClose,
    restockAmount,
    setRestockAmount,
    confirmRestock,
    selectedProduct,
    canEditProducts,
}) {
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="sm">
            <div className="p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            Restock {selectedProduct?.name}
                        </h2>
                        <p className="mt-1 text-[13px] text-gray-500">
                            Add new inventory to the current stock count.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={modalCloseButtonClass}
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="mb-6">
                    <InputLabel value="Quantity to Add" />
                    <TextInput
                        disabled={!canEditProducts}
                        type="number"
                        min="1"
                        step="1"
                        className="w-full mt-1 min-h-[44px] sm:min-h-0"
                        value={restockAmount}
                        onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                        onChange={(e) => setRestockAmount(e.target.value.replace(/[-.]/g, ""))}
                        autoFocus
                    />
                </div>
                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-gray-50 min-h-[44px] sm:min-h-0"
                    >
                        Cancel
                    </button>
                    <PrimaryButton
                        disabled={!canEditProducts}
                        onClick={confirmRestock}
                        className="min-h-[44px] sm:min-h-0"
                    >
                        Confirm
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
