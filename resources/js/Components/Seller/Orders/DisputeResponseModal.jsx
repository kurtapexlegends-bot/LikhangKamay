import React from "react";
import Modal from "@/Components/Modal";
import InputLabel from "@/Components/InputLabel";
import { RotateCcw, LoaderCircle } from "lucide-react";

export default function DisputeResponseModal({
    isOpen,
    onClose,
    disputeModalState,
    setDisputeModalState,
    submitDisputeResponse,
    canEditOrders
}) {
    return (
        <Modal
            show={isOpen}
            onClose={onClose}
            maxWidth="md"
        >
            <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-full bg-clay-100 p-3 text-clay-700">
                        <RotateCcw size={22} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">
                            Respond to Dispute
                        </h2>
                        <p className="text-sm text-stone-500">
                            Select an option to resolve or reply to the buyer's return/refund claim.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                            Response Action
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                            <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/50 p-3 hover:bg-stone-50 cursor-pointer select-none transition-colors min-h-[44px]">
                                <input
                                    type="radio"
                                    name="responseType"
                                    value="accept"
                                    checked={disputeModalState.responseType === "accept"}
                                    onChange={(e) => setDisputeModalState(prev => ({ ...prev, responseType: e.target.value, error: "" }))}
                                    className="mt-0.5 text-clay-600 focus:ring-clay-500 h-5 w-5"
                                />
                                <div>
                                    <p className="text-sm font-bold text-stone-800">Accept return & refund</p>
                                    <p className="text-xs text-stone-500">Approve return request and issue full refund immediately.</p>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/50 p-3 hover:bg-stone-50 cursor-pointer select-none transition-colors min-h-[44px]">
                                <input
                                    type="radio"
                                    name="responseType"
                                    value="replacement"
                                    checked={disputeModalState.responseType === "replacement"}
                                    onChange={(e) => setDisputeModalState(prev => ({ ...prev, responseType: e.target.value, error: "" }))}
                                    className="mt-0.5 text-clay-600 focus:ring-clay-500 h-5 w-5"
                                />
                                <div>
                                    <p className="text-sm font-bold text-stone-800">Suggest replacement exchange</p>
                                    <p className="text-xs text-stone-500">Offer to replace the items. Buyer must accept/confirm.</p>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/50 p-3 hover:bg-stone-50 cursor-pointer select-none transition-colors min-h-[44px]">
                                <input
                                    type="radio"
                                    name="responseType"
                                    value="reject"
                                    checked={disputeModalState.responseType === "reject"}
                                    onChange={(e) => setDisputeModalState(prev => ({ ...prev, responseType: e.target.value, error: "" }))}
                                    className="mt-0.5 text-clay-600 focus:ring-clay-500 h-5 w-5"
                                />
                                <div>
                                    <p className="text-sm font-bold text-stone-800">Reject return request</p>
                                    <p className="text-xs text-stone-500">Deny return request. Buyer can escalate to admin support.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {disputeModalState.responseType === "replacement" && (
                        <div>
                            <InputLabel value="Proposed Replacement Details" />
                            <textarea
                                rows={4}
                                value={disputeModalState.sellerProposedDescription}
                                onChange={(e) => setDisputeModalState(prev => ({ ...prev, sellerProposedDescription: e.target.value, error: "" }))}
                                className="w-full rounded-xl border-stone-200 text-sm shadow-sm focus:border-clay-500 focus:ring-clay-500 resize-none"
                                placeholder="Describe the replacement items or how you will resolve the issue..."
                            />
                        </div>
                    )}

                    {disputeModalState.responseType === "reject" && (
                        <div>
                            <InputLabel value="Rejection Explanation" />
                            <textarea
                                rows={4}
                                value={disputeModalState.sellerExplanation}
                                onChange={(e) => setDisputeModalState(prev => ({ ...prev, sellerExplanation: e.target.value, error: "" }))}
                                className="w-full rounded-xl border-stone-200 text-sm shadow-sm focus:border-clay-500 focus:ring-clay-500 resize-none"
                                placeholder="Explain the reasons why the return request is rejected..."
                            />
                        </div>
                    )}

                    {disputeModalState.error && (
                        <p className="text-xs font-bold text-red-600">
                            {disputeModalState.error}
                        </p>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-stone-100 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={disputeModalState.processing}
                        className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 transition disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submitDisputeResponse}
                        disabled={!canEditOrders || disputeModalState.processing}
                        className="rounded-xl bg-clay-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-clay-200 hover:bg-clay-700 transition disabled:opacity-50 flex items-center gap-1.5 min-h-[44px]"
                    >
                        {disputeModalState.processing && (
                            <LoaderCircle size={14} className="animate-spin" />
                        )}
                        Submit Response
                    </button>
                </div>
            </div>
        </Modal>
    );
}
