import React from "react";
import { Head } from "@inertiajs/react";
import CompactPagination from "@/Components/CompactPagination";
import ReadOnlyCapabilityNotice from "@/Components/Seller/Shared/ReadOnlyCapabilityNotice";
import SellerWorkspaceLayout, {
    useSellerWorkspaceShell,
} from "@/Layouts/SellerWorkspaceLayout";
import SellerHeader from "@/Layouts/SellerHeader";
import { Plus, CheckCircle2, RotateCcw, Archive, AlertTriangle, AlertOctagon } from "lucide-react";
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

// Custom Hook
import useProductManager from "@/hooks/useProductManager";

export default function ProductManager({
    auth,
    products: dbProducts = [],
    categories: serverCategories = [],
    supplies = [],
    subscription,
    metrics = {},
}) {
    const { openSidebar } = useSellerWorkspaceShell();
    const state = useProductManager({
        products: dbProducts,
        categories: serverCategories,
        supplies,
        subscription,
        metrics,
    });

    return (
        <>
            <Head title="Product Manager" />
            <SellerHeader
                title="Products"
                subtitle="Manage product listings, inventory levels, and prices."
                auth={auth}
                onMenuClick={openSidebar}
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={state.openAddModal}
                            disabled={!state.canEditProducts}
                            className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-clay-500/20 transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] sm:min-h-[40px]"
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">Add Product</span>
                            <span className="sm:hidden">Add</span>
                        </button>
                    </div>
                }
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
                handleStatusChange={state.handleStatusChange}
                addRecipeItem={state.addRecipeItem}
                removeRecipeItem={state.removeRecipeItem}
                updateRecipeItem={state.updateRecipeItem}
                selectedProduct={state.selectedProduct}
            />

            {/* Resubmit Modal / Drawer */}
            {state.resubmitModalOpen && (
                (() => {
                    const isFlagged = state.selectedResubmitProduct?.status === "flagged";
                    const titleText = isFlagged ? "Resolve Flagged Listing" : "Resubmit Rejected Listing";
                    const reasonLabel = isFlagged ? "Flag Reason" : "Rejection Reason";
                    const notesLabel = isFlagged ? "Clarification Notes (Explain flagged issues resolved)" : "Resubmit Notes (Explain corrections made)";
                    const notesPlaceholder = isFlagged 
                        ? "Provide explanation or detail changes made to address the flagged issues so administrators can approve the listing."
                        : "Detail the corrections you have made to address the rejection reason so administrators can approve the listing.";
                    const buttonText = isFlagged ? "Resolve Flag & Resubmit" : "Resubmit Product";
                    const getResetDate = () => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + 1);
                        d.setDate(1);
                        return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                    };

                    const renderForm = () => {
                        if (!state.selectedResubmitProduct) return null;
                        const count = state.selectedResubmitProduct.monthly_resubmission_count || 0;
                        const limitReached = count >= 3;
                        const remaining = Math.max(0, 3 - count);
                        return (
                            <form onSubmit={state.submitResubmission} className="space-y-6 animate-fadeIn">
                                <div className="space-y-4">
                                    <div className={`rounded-xl border p-4 ${isFlagged ? "border-amber-100 bg-amber-50/50" : "border-red-100 bg-rose-50/50"}`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {isFlagged ? (
                                                <AlertTriangle className="h-4 w-4 text-amber-800 shrink-0" />
                                            ) : (
                                                <AlertOctagon className="h-4 w-4 text-red-800 shrink-0" />
                                            )}
                                            <p className={`text-xs font-bold uppercase tracking-wider ${isFlagged ? "text-amber-800" : "text-red-800"}`}>
                                                {reasonLabel}
                                            </p>
                                        </div>
                                        <p className={`text-sm font-medium leading-relaxed ${isFlagged ? "text-stone-700" : "text-red-750"}`}>
                                            {state.selectedResubmitProduct.rejection_reason || "No specific reason provided."}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-stone-250 bg-stone-50 p-4 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-stone-600 uppercase tracking-wider">
                                                Monthly Resubmission Limit
                                            </span>
                                            <span className={`font-extrabold ${limitReached ? "text-rose-600" : "text-stone-700"}`}>
                                                {count} / 3 resubmitted
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-stone-500 leading-normal">
                                            You can only resubmit this product 3 times per calendar month.
                                            {limitReached 
                                                ? " You have reached the limit for this month." 
                                                : ` You have ${remaining} resubmission(s) remaining for this month.`}
                                        </p>
                                        {count > 0 && (
                                            <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                                                <span>•</span> Resubmission limit resets on {getResetDate()}.
                                            </p>
                                        )}
                                    </div>

                                    {!limitReached && (
                                        <div>
                                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                                                {notesLabel}
                                            </label>
                                            <textarea
                                                value={state.resubmitForm.data.notes}
                                                onChange={(e) => state.resubmitForm.setData("notes", e.target.value)}
                                                rows={4}
                                                className="w-full rounded-xl border border-stone-200 focus:border-clay-400 focus:ring-clay-400/20 text-sm placeholder-stone-400"
                                                placeholder={notesPlaceholder}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                                    <button
                                        type="button"
                                        onClick={state.closeResubmitModal}
                                        className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-50 transition min-h-[44px]"
                                    >
                                        Cancel
                                    </button>
                                    {!limitReached && (
                                        <button
                                            type="submit"
                                            disabled={state.resubmitForm.processing}
                                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-clay-600 hover:bg-clay-700 transition disabled:opacity-50 min-h-[44px]"
                                        >
                                            {state.resubmitForm.processing ? "Submitting..." : buttonText}
                                        </button>
                                    )}
                                </div>
                            </form>
                        );
                    };

                    return state.isMobileOrTablet ? (
                        <SlideOverDrawer
                            show={state.resubmitModalOpen}
                            onClose={state.closeResubmitModal}
                            title={titleText}
                            widthClass="max-w-md"
                        >
                            <div className="p-4">
                                {renderForm()}
                            </div>
                        </SlideOverDrawer>
                    ) : (
                        <Modal show={state.resubmitModalOpen} onClose={state.closeResubmitModal} maxWidth="md">
                            <div className="p-6">
                                <h2 className="text-lg font-bold text-stone-900 mb-4">
                                    {titleText}
                                </h2>
                                {renderForm()}
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
