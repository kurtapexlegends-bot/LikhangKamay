import { useState } from "react";
import { router } from "@inertiajs/react";

export default function useProductModalsState({
    canEditProducts,
    subscription,
    addToast,
    resetForm,
    clearFormErrors,
    resetDeductForm,
    resetResubmitForm,
    clearResubmitFormErrors,
}) {
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [activeFormTab, setActiveFormTab] = useState("Essentials");
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [deductModalOpen, setDeductModalOpen] = useState(false);
    const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedResubmitProduct, setSelectedResubmitProduct] = useState(null);
    const [restockAmount, setRestockAmount] = useState("");

    const openRestockModal = (p) => {
        if (!canEditProducts) return;
        setSelectedProduct(p);
        setRestockAmount("");
        setRestockModalOpen(true);
    };

    const openArchiveModal = (p) => {
        if (!canEditProducts) return;
        setSelectedProduct(p);
        setArchiveModalOpen(true);
    };

    const openDeductModal = (p) => {
        if (!canEditProducts) return;
        setSelectedProduct(p);
        if (resetDeductForm) resetDeductForm();
        setDeductModalOpen(true);
    };

    const openResubmitModal = (p) => {
        if (!canEditProducts) return;
        setSelectedResubmitProduct(p);
        if (resetResubmitForm) resetResubmitForm();
        if (clearResubmitFormErrors) clearResubmitFormErrors();
        setResubmitModalOpen(true);
    };

    const closeResubmitModal = () => {
        setResubmitModalOpen(false);
        if (resetResubmitForm) resetResubmitForm();
    };

    const confirmRestock = () => {
        if (!canEditProducts) return;
        if (restockAmount > 0) {
            router.post(
                route("products.restock", selectedProduct.id),
                { amount: restockAmount },
                {
                    onSuccess: () => {
                        setRestockModalOpen(false);
                    },
                },
            );
        }
    };

    const confirmArchive = () => {
        if (!canEditProducts) return;
        if (selectedProduct.status === "Archived") {
            if (subscription?.activeCount >= subscription?.limit) {
                setArchiveModalOpen(false);
                setLimitModalOpen(true);
                return;
            }
            router.post(
                route("products.activate", selectedProduct.id),
                {},
                {
                    onSuccess: () => setArchiveModalOpen(false),
                },
            );
        } else {
            router.post(
                route("products.archive", selectedProduct.id),
                {},
                {
                    onSuccess: () => setArchiveModalOpen(false),
                },
            );
        }
    };

    return {
        productModalOpen,
        setProductModalOpen,
        activeFormTab,
        setActiveFormTab,
        restockModalOpen,
        setRestockModalOpen,
        archiveModalOpen,
        setArchiveModalOpen,
        limitModalOpen,
        setLimitModalOpen,
        deductModalOpen,
        setDeductModalOpen,
        resubmitModalOpen,
        setResubmitModalOpen,
        selectedProduct,
        setSelectedProduct,
        selectedResubmitProduct,
        setSelectedResubmitProduct,
        restockAmount,
        setRestockAmount,
        openRestockModal,
        openArchiveModal,
        openDeductModal,
        openResubmitModal,
        closeResubmitModal,
        confirmRestock,
        confirmArchive,
    };
}
