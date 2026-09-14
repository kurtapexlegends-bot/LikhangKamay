import React from "react";
import Modal from "@/Components/Modal";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import FulfillmentModal from "@/Components/Seller/Orders/FulfillmentModal";
import ReplacementModal from "@/Components/Seller/Orders/ReplacementModal";
import DisputeResponseModal from "@/Components/Seller/Orders/DisputeResponseModal";
import DispatchOrderModal from "@/Components/Seller/Orders/DispatchOrderModal";

export default function OrderManagerModals({
    confirmModal,
    setConfirmModal,
    canEditOrders,
    shippingModal,
    setShippingModal,
    closeShippingModal,
    submitShipping,
    orderToShip,
    replacementModal,
    setReplacementModal,
    submitReplacementApproval,
    disputeModalState,
    setDisputeModalState,
    submitDisputeResponse,
    dispatchModal,
    setDispatchModal,
    isPremium = true,
}) {
    return (
        <>
            {/* CONFIRMATION MODAL */}
            <Modal show={confirmModal.isOpen} onClose={() => setConfirmModal(c => ({ ...c, isOpen: false }))} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmModal.isDestructive ? "bg-red-100 text-red-600" : "bg-clay-100 text-clay-600"}`}>
                        {confirmModal.isDestructive ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h2>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">{confirmModal.message}</p>
                    <div className="flex justify-center gap-3">
                        <button onClick={() => setConfirmModal(c => ({ ...c, isOpen: false }))} disabled={confirmModal.processing} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition min-h-[44px] flex items-center justify-center">Cancel</button>
                        <button onClick={confirmModal.action} disabled={!canEditOrders || confirmModal.processing} className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 min-h-[44px] ${confirmModal.isDestructive ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 focus-visible:ring-red-500/20" : "bg-clay-600 hover:bg-clay-700 shadow-lg shadow-clay-200 focus-visible:ring-clay-500/30"} disabled:cursor-not-allowed disabled:opacity-60`}>
                            {confirmModal.processing && <LoaderCircle size={16} className="animate-spin" />}
                            {confirmModal.processing ? "Saving..." : "Confirm"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* FULFILLMENT MODAL */}
            <FulfillmentModal 
                isOpen={shippingModal.isOpen} 
                onClose={closeShippingModal} 
                shippingModal={shippingModal} 
                setShippingModal={setShippingModal} 
                submitShipping={submitShipping} 
                orderToShip={orderToShip} 
                canEditOrders={canEditOrders} 
            />

            {/* REPLACEMENT MODAL */}
            <ReplacementModal 
                isOpen={replacementModal.isOpen} 
                onClose={() => setReplacementModal(c => ({ ...c, isOpen: false }))} 
                replacementModal={replacementModal} 
                setReplacementModal={setReplacementModal} 
                submitReplacementApproval={submitReplacementApproval} 
                canEditOrders={canEditOrders} 
            />

            {/* DISPUTE RESPONSE MODAL */}
            <DisputeResponseModal 
                isOpen={disputeModalState.isOpen} 
                onClose={() => setDisputeModalState(prev => ({ ...prev, isOpen: false }))} 
                disputeModalState={disputeModalState} 
                setDisputeModalState={setDisputeModalState} 
                submitDisputeResponse={submitDisputeResponse} 
                canEditOrders={canEditOrders} 
            />

            {/* IN-HOUSE & LALAMOVE DISPATCH MODAL */}
            <DispatchOrderModal
                isOpen={dispatchModal.isOpen}
                onClose={() => setDispatchModal({ isOpen: false, order: null })}
                order={dispatchModal.order}
                canEditOrders={canEditOrders}
                isPremium={isPremium}
            />
        </>
    );
}
