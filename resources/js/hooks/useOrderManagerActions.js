/* global route */
import { useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";

export default function useOrderManagerActions({
    canEditOrders = true,
    paginatedOrders = [],
    selectedOrderIds = [],
    setSelectedOrderIds = () => {},
    addToast = () => {},
}) {
    // Modal states
    const [bookingOrderId, setBookingOrderId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        action: null,
        isDestructive: false,
        processing: false,
    });
    const [shippingModal, setShippingModal] = useState({
        isOpen: false,
        orderId: null,
        status: "Shipped",
        mode: "ship",
        processing: false,
    });
    const [replacementModal, setReplacementModal] = useState({
        isOpen: false,
        orderId: null,
        resolutionDescription: "",
        error: "",
        processing: false,
    });
    const [disputeModalState, setDisputeModalState] = useState({
        isOpen: false,
        disputeId: null,
        orderId: null,
        responseType: "accept",
        sellerExplanation: "",
        sellerProposedDescription: "",
        processing: false,
        error: "",
    });
    const [returnActionKey, setReturnActionKey] = useState(null);
    const [isPrintingSlips, setIsPrintingSlips] = useState(false);

    const initiateStatusUpdate = (orderId, newStatus) => {
        if (!canEditOrders) return;
        let title = "Update Order Status";
        let message = `Mark this order as ${newStatus}?`;
        let isDestructive = false;

        if (newStatus === "Cancelled") {
            title = "Approve Return & Refund";
            message = "This will cancel the order and approve the refund. This action cannot be undone.";
            isDestructive = true;
        } else if (newStatus === "Rejected") {
            title = "Reject Order";
            message = "Are you sure you want to reject this order?";
            isDestructive = true;
        } else if (newStatus === "Completed") {
            const order = paginatedOrders.find(o => o.id === orderId);
            if (order && order.status === "Refund/Return") {
                title = "Reject Return Request";
                message = "This will reject the buyer's return request and mark the order as completed.";
                isDestructive = true;
            } else {
                title = "Complete Transaction";
                message = "This will define the order as successfully completed and release the payment.";
            }
        }

        setConfirmModal({
            isOpen: true,
            title,
            message,
            isDestructive,
            processing: false,
            action: () => {
                router.post(route("orders.update", orderId), { status: newStatus }, {
                    preserveScroll: true,
                    onStart: () => setConfirmModal(c => ({ ...c, processing: true })),
                    onSuccess: () => {
                        setConfirmModal(c => ({ ...c, isOpen: false, processing: false }));
                        if (newStatus === "Processing") {
                            addToast("Supply quantities have been deducted for this production run.", "success");
                        }
                    },
                    onFinish: () => setConfirmModal(c => ({ ...c, processing: false })),
                });
            },
        });
    };

    const openShippingModal = (order, mode = "ship") => {
        if (!canEditOrders) return;
        setShippingModal({
            isOpen: true,
            orderId: order.id,
            trackingNumber: mode === "ship" ? order.tracking_number || "" : "",
            shippingNotes: order.shipping_notes || "",
            proofOfDelivery: null,
            previewUrl: null,
            isPickup: order.shipping_method === "Pick Up",
            existingProofUrl: order.proof_of_delivery || null,
            processing: false,
            mode,
            status: mode === "pickup-ready" ? "Ready for Pickup" : (mode === "deliver" ? "Delivered" : "Shipped"),
            error: "",
        });
    };

    const closeShippingModal = () => setShippingModal(c => ({
        ...c,
        isOpen: false,
        proofOfDelivery: null,
        previewUrl: null,
        existingProofUrl: null,
        processing: false,
        error: "",
    }));

    const submitShipping = () => {
        if (!canEditOrders) return;
        const formData = new FormData();
        formData.append("status", shippingModal.status);
        if (shippingModal.trackingNumber) formData.append("tracking_number", shippingModal.trackingNumber);
        if (shippingModal.shippingNotes) formData.append("shipping_notes", shippingModal.shippingNotes);
        if (shippingModal.proofOfDelivery) formData.append("proof_of_delivery", shippingModal.proofOfDelivery);

        router.post(route("orders.update", shippingModal.orderId), formData, {
            preserveScroll: true,
            onStart: () => setShippingModal(c => ({ ...c, processing: true, error: "" })),
            onError: (errs) => {
                const message = errs.status || errs.proof_of_delivery || errs.message || "Failed to update order status.";
                setShippingModal(c => ({ ...c, error: message }));
                addToast(message, "error");
            },
            onSuccess: (p) => {
                if (p.props?.flash?.error) {
                    setShippingModal(c => ({ ...c, error: p.props.flash.error }));
                    addToast(p.props.flash.error, "error");
                } else {
                    closeShippingModal();
                    addToast("Order status updated successfully.", "success");
                }
            },
            onFinish: () => setShippingModal(c => ({ ...c, processing: false })),
            forceFormData: true,
        });
    };

    const openDisputeModal = (order) => {
        if (!order.dispute) return;
        setDisputeModalState({
            isOpen: true,
            disputeId: order.dispute.id,
            orderId: order.id,
            responseType: "accept",
            sellerExplanation: "",
            sellerProposedDescription: "",
            processing: false,
            error: "",
        });
    };

    const submitDisputeResponse = () => {
        if (!canEditOrders) return;
        const { disputeId, responseType, sellerExplanation, sellerProposedDescription } = disputeModalState;
        if (responseType === 'reject' && !sellerExplanation.trim()) {
            setDisputeModalState(prev => ({ ...prev, error: "Please provide an explanation for rejecting the dispute." }));
            return;
        }
        if (responseType === 'replacement' && !sellerProposedDescription.trim()) {
            setDisputeModalState(prev => ({ ...prev, error: "Please describe the proposed replacement exchange." }));
            return;
        }
        router.post(route("disputes.respond", disputeId), {
            response_type: responseType,
            seller_explanation: responseType === 'reject' ? sellerExplanation : null,
            seller_proposed_description: responseType === 'replacement' ? sellerProposedDescription : null,
        }, {
            preserveScroll: true,
            onStart: () => setDisputeModalState(p => ({ ...p, processing: true, error: "" })),
            onError: (errs) => setDisputeModalState(p => ({ ...p, processing: false, error: errs.message || "An error occurred." })),
            onSuccess: () => {
                setDisputeModalState(p => ({ ...p, isOpen: false }));
                addToast("Dispute response submitted.", "success");
            },
            onFinish: () => setDisputeModalState(p => ({ ...p, processing: false })),
        });
    };

    const openReplacementModal = (orderId) => {
        if (canEditOrders) {
            setReplacementModal({
                isOpen: true,
                orderId,
                resolutionDescription: "",
                error: "",
                processing: false,
            });
        }
    };

    const submitReplacementApproval = () => {
        if (!canEditOrders) return;
        const description = replacementModal.resolutionDescription.trim();
        if (!description) {
            setReplacementModal(c => ({ ...c, error: "Compensation or resolution details are required." }));
            return;
        }
        router.post(route("orders.approve-return", replacementModal.orderId), {
            action_type: "replace",
            replacement_resolution_description: description,
        }, {
            preserveScroll: true,
            onStart: () => setReplacementModal(c => ({ ...c, processing: true, error: "" })),
            onError: (errs) => setReplacementModal(c => ({ ...c, processing: false, error: errs.replacement_resolution_description || "Error." })),
            onSuccess: () => setReplacementModal({ isOpen: false, orderId: null, resolutionDescription: "", error: "", processing: false }),
            onFinish: () => setReplacementModal(c => ({ ...c, processing: false })),
        });
    };

    const submitRefundApproval = (orderId) => {
        if (!canEditOrders || returnActionKey) return;
        setReturnActionKey(`${orderId}:refund`);
        router.post(route("orders.approve-return", orderId), { action_type: "refund" }, {
            preserveScroll: true,
            onFinish: () => setReturnActionKey(null),
        });
    };

    const createLalamoveDelivery = (orderId) => {
        if (!canEditOrders) return;
        router.post(route("orders.lalamove.store", orderId), {}, {
            preserveScroll: true,
            onStart: () => setBookingOrderId(orderId),
            onError: (errs) => {
                addToast(errs.message || "Failed to create Lalamove delivery.", "error");
            },
            onSuccess: (p) => {
                if (p.props?.flash?.error) {
                    addToast(p.props.flash.error, "error");
                } else if (p.props?.flash?.success) {
                    addToast(p.props.flash.success, "success");
                }
            },
            onFinish: () => setBookingOrderId(null),
        });
    };

    const markAsPaidAction = (orderId) => {
        if (canEditOrders) {
            router.post(route("orders.payment-status", orderId), { payment_status: "paid" }, { preserveScroll: true });
        }
    };

    const handleBulkFulfill = () => {
        if (!canEditOrders || selectedOrderIds.length === 0) return;
        setConfirmModal({
            isOpen: true,
            title: `Batch Fulfillment (${selectedOrderIds.length} Orders)`,
            message: `Fulfill Lalamove deliveries for all ${selectedOrderIds.length} selected orders?`,
            isDestructive: false,
            processing: false,
            action: () => {
                router.post(route("orders.bulk-lalamove"), { order_ids: selectedOrderIds }, {
                    preserveScroll: true,
                    onStart: () => setConfirmModal(c => ({ ...c, processing: true })),
                    onSuccess: () => {
                        setSelectedOrderIds([]);
                        setConfirmModal(c => ({ ...c, isOpen: false }));
                    },
                    onFinish: () => setConfirmModal(c => ({ ...c, processing: false })),
                });
            },
        });
    };

    const handleBulkPrintLabels = () => {
        if (selectedOrderIds.length > 0) {
            window.open(route("orders.bulk-labels", { ids: selectedOrderIds.join(",") }), "_blank");
        }
    };

    const handleBulkPrintPackingSlips = () => {
        if (selectedOrderIds.length === 0) return;
        setIsPrintingSlips(true);
        addToast("Generating packing slips. Please wait...", "info");
        axios.post(route("orders.bulk-packing-slips"), { order_ids: selectedOrderIds }, { responseType: 'blob' })
            .then(res => {
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'Packing_Slips.pdf');
                document.body.appendChild(link);
                link.click();
                link.remove();
                addToast("Packing slips downloaded successfully.", "success");
            })
            .catch(err => {
                console.error("Print Error", err);
                addToast("Failed to generate packing slips.", "error");
            })
            .finally(() => setIsPrintingSlips(false));
    };

    return {
        bookingOrderId,
        confirmModal,
        setConfirmModal,
        initiateStatusUpdate,
        shippingModal,
        setShippingModal,
        openShippingModal,
        closeShippingModal,
        submitShipping,
        disputeModalState,
        setDisputeModalState,
        openDisputeModal,
        submitDisputeResponse,
        replacementModal,
        setReplacementModal,
        openReplacementModal,
        submitReplacementApproval,
        returnActionKey,
        submitRefundApproval,
        createLalamoveDelivery,
        markAsPaidAction,
        isPrintingSlips,
        handleBulkFulfill,
        handleBulkPrintLabels,
        handleBulkPrintPackingSlips,
    };
}
