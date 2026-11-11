import React from "react";
import { Head } from "@inertiajs/react";
import CompactPagination from "@/Components/CompactPagination";
import ReadOnlyCapabilityNotice from "@/Components/Seller/Shared/ReadOnlyCapabilityNotice";
import SellerWorkspaceLayout, {
    useSellerWorkspaceShell,
} from "@/Layouts/SellerWorkspaceLayout";
import SellerHeader from "@/Layouts/SellerHeader";
import { CheckCircle2, RotateCcw, Archive, AlertTriangle, AlertOctagon, Plus } from "lucide-react";
import SlideOverDrawer from "@/Components/SlideOverDrawer";
import Modal from "@/Components/Modal";

// Subcomponents
import CatalogMetrics from "@/Components/Seller/Catalog/CatalogMetrics";
import CatalogQuickAlerts from "@/Components/Seller/Catalog/CatalogQuickAlerts";
import CatalogFilters from "@/Components/Seller/Catalog/CatalogFilters";
import ProductTable from "@/Components/Seller/Catalog/ProductTable";
import ProductMobileCard from "@/Components/Seller/Catalog/ProductMobileCard";
import DeductModal from "@/Components/Seller/Catalog/DeductModal";
import RestockModal from "@/Components/Seller/Catalog/RestockModal";
import ArchiveModal from "@/Components/Seller/Catalog/ArchiveModal";
import LimitModal from "@/Components/Seller/Catalog/LimitModal";
import ProductFormModal from "@/Components/Seller/Catalog/ProductFormModal/ProductFormModal";
import RevisionFeedbackBanner from "@/Components/Common/RevisionFeedbackBanner";

// Custom Hook
import useProductManager from "@/hooks/useProductManager";

export default function ProductManager({
    auth,
    products: dbProducts = [],
    categories: serverCategories = [],
    supplies = [],
    subscription,
    metrics = {},
    filters = {},
}) {
    const { openSidebar } = useSellerWorkspaceShell();
    const state = useProductManager({
        products: dbProducts,
        categories: serverCategories,
        supplies,
        subscription,
        metrics,
        filters,
    });

    return (
        <>
            <Head title="Product Manager" />
            <SellerHeader
                title="Products"
                subtitle="Manage product listings, inventory levels, and prices."
                auth={auth}
                onMenuClick={openSidebar}
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto space-y-6 pb-28 sm:pb-20">
                {state.isProductsReadOnly && (
                    <ReadOnlyCapabilityNotice label="Products is read only for your account. Add, edit, stock, and bulk actions are disabled." />
                )}

                <CatalogMetrics
                    totalItems={state.totalItems}
                    activeCount={subscription?.activeCount || 0}
                    remainingActivationSlots={state.remainingActivationSlots}
                    animate={state.shouldAnimateKPI}
                />

                <CatalogQuickAlerts
                    incompleteDraftCount={state.incompleteDraftCount}
                    remainingActivationSlots={state.remainingActivationSlots}
                    lowStockCount={state.lowStockCount}
                    quickFilter={state.quickFilter}
                    activeTab={state.activeTab}
                    applyQuickFilter={state.applyQuickFilter}
                />

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[500px]">
                    <CatalogFilters
                        activeTab={state.activeTab}
                        handleTabChange={state.handleTabChange}
                        searchQuery={state.searchQuery}
                        handleSearch={state.handleSearch}
                        resetSavedView={state.resetSavedView}
                        quickFilter={state.quickFilter}
                        applyQuickFilter={state.applyQuickFilter}
                        incompleteDraftCount={state.incompleteDraftCount}
                        selectVisibleProducts={state.selectVisibleProducts}
                        visibleProductIds={state.visibleProductIds}
                        selectedProductIds={state.selectedProductIds}
                        setSelectedProductIds={state.setSelectedProductIds}
                        allVisibleSelected={state.allVisibleSelected}
                        toggleVisibleSelection={state.toggleVisibleSelection}
                        canEditProducts={state.canEditProducts}
                        runBulkStatusUpdate={state.runBulkStatusUpdate}
                        openDiscountModal={state.openDiscountModal}
                        openAddModal={state.openAddModal}
                    />

                    <div className="overflow-x-auto hidden md:block">
                        <ProductTable
                            products={state.products}
                            selectedProductIds={state.selectedProductIds}
                            toggleProductSelection={state.toggleProductSelection}
                            allVisibleSelected={state.allVisibleSelected}
                            toggleVisibleSelection={state.toggleVisibleSelection}
                            canEditProducts={state.canEditProducts}
                            handleQuickRestock={state.handleQuickRestock}
                            openRestockModal={state.openRestockModal}
                            openDeductModal={state.openDeductModal}
                            openDiscountModal={state.openDiscountModal}
                            openEditModal={state.openEditModal}
                            openArchiveModal={state.openArchiveModal}
                            sortConfig={state.sortConfig}
                            requestSort={state.requestSort}
                            openAddModal={state.openAddModal}
                            onResubmitClick={state.openResubmitModal}
                        />
                    </div>

                    <ProductMobileCard
                        products={state.products}
                        selectedProductIds={state.selectedProductIds}
                        toggleProductSelection={state.toggleProductSelection}
                        canEditProducts={state.canEditProducts}
                        openDiscountModal={state.openDiscountModal}
                        openEditModal={state.openEditModal}
                        openAddModal={state.openAddModal}
                        onResubmitClick={state.openResubmitModal}
                    />

                    {state.totalPages > 1 && (
                        <CompactPagination
                            currentPage={state.currentPage}
                            totalPages={state.totalPages}
                            totalItems={state.totalItems}
                            itemsPerPage={state.itemsPerPage}
                            itemLabel="products"
                            onPageChange={state.handlePageChange}
                        />
                    )}
                </div>

                {state.canEditProducts && state.selectedProductIds.length === 0 && (
                    <button
                        type="button"
                        onClick={state.openAddModal}
                        aria-label="Add new product"
                        className="fixed bottom-6 right-4 z-40 md:hidden flex items-center gap-2 rounded-full bg-clay-600 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-clay-900/20 active:scale-95 transition-all hover:bg-clay-700 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-clay-500 focus:ring-offset-2"
                    >
                        <Plus size={18} className="shrink-0" />
                        <span>Add Product</span>
                    </button>
                )}
            </main>

            {/* Mobile Selection Drawer (Bulk actions bottom sheet drawer) */}
            <SlideOverDrawer
                show={state.selectedProductIds.length > 0 && state.isMobileOrTablet}
                onClose={() => state.setSelectedProductIds([])}
                title={`${state.selectedProductIds.length} Products Selected`}
                position="bottom"
                heightClass="max-h-[300px]"
                bodyClassName="p-4"
            >
                <div className="grid grid-cols-3 gap-2 w-full">
                    <button
                        type="button"
                        disabled={!state.canEditProducts}
                        onClick={() => state.runBulkStatusUpdate("Active")}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-3 text-[11px] font-bold text-emerald-700 shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                    >
                        <CheckCircle2 size={12} className="text-emerald-500" /> Activate
                    </button>
                    <button
                        type="button"
                        disabled={!state.canEditProducts}
                        onClick={() => state.runBulkStatusUpdate("Draft")}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-250 bg-amber-50 px-2 py-3 text-[11px] font-bold text-amber-700 shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                    >
                        <RotateCcw size={12} className="text-amber-500" /> Draft
                    </button>
                    <button
                        type="button"
                        disabled={!state.canEditProducts}
                        onClick={() => state.runBulkStatusUpdate("Archived")}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-2 py-3 text-[11px] font-bold text-stone-700 shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                    >
                        <Archive size={12} className="text-stone-400" /> Archive
                    </button>
                </div>
            </SlideOverDrawer>

            <DeductModal
                isOpen={state.deductModalOpen}
                onClose={() => state.setDeductModalOpen(false)}
                deductForm={state.deductForm}
                handleDeduct={state.handleDeduct}
                selectedProduct={state.selectedProduct}
                canEditProducts={state.canEditProducts}
            />

            <RestockModal
                isOpen={state.restockModalOpen}
                onClose={() => state.setRestockModalOpen(false)}
                restockAmount={state.restockAmount}
                setRestockAmount={state.setRestockAmount}
                confirmRestock={state.confirmRestock}
                selectedProduct={state.selectedProduct}
                canEditProducts={state.canEditProducts}
            />

            <ArchiveModal
                isOpen={state.archiveModalOpen}
                onClose={() => state.setArchiveModalOpen(false)}
                confirmArchive={state.confirmArchive}
                selectedProduct={state.selectedProduct}
                canEditProducts={state.canEditProducts}
            />

            <LimitModal
                isOpen={state.limitModalOpen}
                onClose={() => state.setLimitModalOpen(false)}
                subscription={subscription}
                onSaveAsDraft={() => {
                    state.setLimitModalOpen(false);
                    state.setData("status", "Draft");
                }}
            />

            <ProductFormModal
                isOpen={state.productModalOpen}
                onClose={state.closeProductModal}
                data={state.data}
                setData={state.setData}
                processing={state.processing}
                errors={state.errors}
                activeFormTab={state.activeFormTab}
                setActiveFormTab={state.setActiveFormTab}
                submitProduct={state.submitProduct}
                categories={state.categories}
                supplies={supplies}
                canEditProducts={state.canEditProducts}
                activationReadiness={state.activationReadiness}
                skuValidation={state.skuValidation}
                shouldValidateSku={state.shouldValidateSku}
                previews={state.previews}
                handleFileChange={state.handleFileChange}
                handleModelAssetFolderChange={state.handleModelAssetFolderChange}
                handleRemoveGalleryImage={state.handleRemoveGalleryImage}
                handleRemoveCover={state.handleRemoveCover}
                handleRemoveModel3D={state.handleRemoveModel3D}
                handleStatusChange={state.handleStatusChange}
                addRecipeItem={state.addRecipeItem}
                removeRecipeItem={state.removeRecipeItem}
                updateRecipeItem={state.updateRecipeItem}
                selectedProduct={state.selectedProduct}
                subscription={subscription}
            />

            {/* Resubmit Modal / Drawer */}
            {state.resubmitModalOpen && (
                (() => {
                    const isFlagged = state.selectedResubmitProduct?.status === "flagged";
                    const titleText = isFlagged ? "Resolve Flagged Listing" : "Update Listing for Review";
                    const reasonLabel = isFlagged ? "Flag Reason" : "Feedback / Needed Changes";
                    const notesLabel = isFlagged ? "Clarification Notes" : "Update Notes";
                    const notesPlaceholder = "Explain changes made to address the feedback...";
                    const buttonText = "Submit Revision";
                    const getResetDate = () => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + 1);
                        d.setDate(1);
                        return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                    };

                    const selectedResubmitProduct = state.selectedResubmitProduct;
                    const count = selectedResubmitProduct?.monthly_resubmission_count || 0;
                    const limitReached = count >= 3;
                    const remaining = Math.max(0, 3 - count);

                    const renderActions = (inDrawer = false) => (
                        <div className={`flex items-center justify-end gap-2.5 ${inDrawer ? 'w-full' : 'pt-4 border-t border-stone-100'}`}>
                            <button
                                type="button"
                                onClick={state.closeResubmitModal}
                                className="px-4 py-2 border border-stone-200 bg-white rounded-xl text-xs sm:text-sm font-bold text-stone-700 hover:bg-stone-50 transition min-h-[44px] cursor-pointer"
                            >
                                Cancel
                            </button>
                            {!limitReached && (
                                <button
                                    type="submit"
                                    form="product-resubmit-form"
                                    disabled={state.resubmitForm.processing}
                                    className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-clay-600 hover:bg-clay-700 transition disabled:opacity-50 min-h-[44px] cursor-pointer"
                                >
                                    {state.resubmitForm.processing ? "Submitting..." : buttonText}
                                </button>
                            )}
                        </div>
                    );

                    const renderFormBody = () => {
                        if (!selectedResubmitProduct) return null;
                        return (
                            <form id="product-resubmit-form" onSubmit={state.submitResubmission} className="space-y-4 animate-fadeIn">
                                <RevisionFeedbackBanner
                                    revision={selectedResubmitProduct.active_revision}
                                    fallbackReason={selectedResubmitProduct.rejection_reason || "No specific reason provided."}
                                    title={reasonLabel}
                                    variant={isFlagged ? "amber" : "rose"}
                                />

                                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-stone-600 uppercase tracking-wider">
                                            Monthly Revisions
                                        </span>
                                        <span className={`font-extrabold ${limitReached ? "text-rose-600" : "text-stone-700"}`}>
                                            {count} / 3 submitted
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-stone-500 leading-normal">
                                        You can submit revisions up to 3 times per month.
                                        {limitReached
                                            ? " You have reached the limit for this month."
                                            : ` You have ${remaining} revision(s) remaining for this month.`}
                                    </p>
                                    {count > 0 && (
                                        <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                                            <span>•</span> Resets on {getResetDate()}.
                                        </p>
                                    )}
                                </div>

                                {!limitReached && (
                                    <div>
                                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                            {notesLabel}
                                        </label>
                                        <textarea
                                            value={state.resubmitForm.data.notes}
                                            onChange={(e) => state.resubmitForm.setData("notes", e.target.value)}
                                            rows={3}
                                            className="w-full rounded-xl border border-stone-200 focus:border-clay-400 focus:ring-clay-400/20 text-sm placeholder-stone-400"
                                            placeholder={notesPlaceholder}
                                        />
                                    </div>
                                )}
                            </form>
                        );
                    };

                    return state.isMobileOrTablet ? (
                        <SlideOverDrawer
                            show={state.resubmitModalOpen}
                            onClose={state.closeResubmitModal}
                            title={titleText}
                            widthClass="max-w-md"
                            bodyClassName="relative flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5"
                            footer={renderActions(true)}
                        >
                            {renderFormBody()}
                        </SlideOverDrawer>
                    ) : (
                        <Modal show={state.resubmitModalOpen} onClose={state.closeResubmitModal} maxWidth="md">
                            <div className="p-5 sm:p-6 space-y-4">
                                <h2 className="text-lg font-bold text-stone-900">
                                    {titleText}
                                </h2>
                                {renderFormBody()}
                                {renderActions(false)}
                            </div>
                        </Modal>
                    );
                })()
            )}
        </>
    );
}

ProductManager.layout = (page) => (
    <SellerWorkspaceLayout active="products">{page}</SellerWorkspaceLayout>
);
