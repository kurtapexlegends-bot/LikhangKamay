import React from "react";
import Modal from "@/Components/Modal";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";

const modalFieldClass =
    "w-full mt-1 rounded-xl border-gray-300 bg-white text-sm text-gray-900 shadow-none focus:border-clay-500 focus:ring-clay-500";

export default function DeductModal({
    isOpen,
    onClose,
    deductForm,
    handleDeduct,
    selectedProduct,
    canEditProducts,
}) {
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="sm">
            <form onSubmit={handleDeduct} className="flex max-h-[85vh] flex-col p-5 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        Update Stock (Deduct)
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 min-h-[44px] min-w-[44px]"
                    >
                        &times;
                    </button>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                    Manually remove items from inventory (e.g., physical store sales, breakage).
                </p>

                <div className="space-y-4 overflow-y-auto px-1 py-1">
                    <div>
                        <InputLabel value="Quantity to Remove" />
                        <TextInput
                            type="number"
                            className="w-full mt-1 min-h-[44px] sm:min-h-0"
                            value={deductForm.data.quantity}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                            onChange={(e) => deductForm.setData("quantity", e.target.value.replace(/[-.]/g, ""))}
                            autoFocus
                            min="1"
                            max={selectedProduct?.stock}
                        />
                        <InputError message={deductForm.errors.quantity} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel value="Reason" />
                        <select
                            className={`${modalFieldClass} min-h-[44px] sm:min-h-0`}
                            value={deductForm.data.reason}
                            onChange={(e) => deductForm.setData("reason", e.target.value)}
                        >
                            <option value="Physical Store Sale">Physical Store Sale</option>
                            <option value="Damaged/Breakage">Damaged / Breakage</option>
                            <option value="Lost/Stolen">Lost / Stolen</option>
                            <option value="Other">Other</option>
                        </select>
                        <InputError message={deductForm.errors.reason} className="mt-2" />
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-gray-50 min-h-[44px] sm:min-h-0"
                    >
                        Cancel
                    </button>
                    <PrimaryButton
                        disabled={!canEditProducts || deductForm.processing}
                        className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 min-h-[44px] sm:min-h-0"
                    >
                        Confirm Deduction
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
