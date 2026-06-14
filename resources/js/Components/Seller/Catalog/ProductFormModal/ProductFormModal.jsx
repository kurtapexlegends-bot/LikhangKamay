import React from "react";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import { X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

// Subcomponents
import ProductFormBasicDetails from "@/Components/Seller/Catalog/ProductFormModal/ProductFormBasicDetails";
import ProductFormClaySpecs from "@/Components/Seller/Catalog/ProductFormModal/ProductFormClaySpecs";
import ProductFormRecipePanel from "@/Components/Seller/Catalog/ProductFormModal/ProductFormRecipePanel";
import ProductFormMediaUploads from "@/Components/Seller/Catalog/ProductFormModal/ProductFormMediaUploads";

const modalCloseButtonClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:text-gray-700 min-h-[44px] min-w-[44px]";

export default function ProductFormModal({
    isOpen,
    onClose,
    data,
    setData,
    processing,
    errors,
    activeFormTab,
    setActiveFormTab,
    submitProduct,
    categories,
    supplies,
    canEditProducts,
    activationReadiness,
    skuValidation,
    shouldValidateSku,
    previews,
    handleFileChange,
    handleModelAssetFolderChange,
    handleRemoveGalleryImage,
    handleStatusChange,
    addRecipeItem,
    removeRecipeItem,
    updateRecipeItem,
    selectedProduct,
}) {
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            <form
                onSubmit={submitProduct}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                        e.preventDefault();
                        if (activeFormTab !== "Media") {
                            const tabs = ["Essentials", "Details", "Production", "Media"];
                            const currentIndex = tabs.indexOf(activeFormTab);
                            setActiveFormTab(tabs[currentIndex + 1]);
                        } else {
                            submitProduct(e);
                        }
                    }
                }}
                className="flex max-h-[85vh] flex-col bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden"
            >
                <div className="shrink-0 border-b border-gray-100 px-5 py-5 sm:px-6 bg-white">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {data.id ? "Edit Product" : "New Product"}
                            </h2>
                            <div className="mt-2 flex flex-col gap-1.5">
                                <div className="relative max-w-[200px]">
                                    <input
                                        type="text"
                                        className={`w-full rounded-lg border-gray-300 bg-white px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-gray-700 shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[36px] sm:min-h-0 ${skuValidation.isValid === false ? 'border-red-300 bg-red-50' : ''}`}
                                        value={data.sku}
                                        onChange={(e) => setData("sku", e.target.value.toUpperCase())}
                                        placeholder="LK-XXXX"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                        {shouldValidateSku && data.sku && (
                                            skuValidation.isValid === null ? (
                                                <Loader2 size={12} className="animate-spin text-stone-400" />
                                            ) : skuValidation.isValid ? (
                                                <CheckCircle2 size={12} className="text-emerald-500" />
                                            ) : (
                                                <AlertTriangle size={12} className="text-red-500" />
                                            )
                                        )}
                                    </div>
                                </div>
                                {skuValidation.isValid === false && (
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">
                                        {skuValidation.message}
                                    </p>
                                )}
                                {errors.sku && <p className="text-[10px] text-red-500 font-medium">{errors.sku}</p>}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className={modalCloseButtonClass}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="mt-4 flex rounded-xl bg-gray-100 p-1 overflow-x-auto no-scrollbar flex-nowrap">
                        {[
                            "Essentials",
                            "Details",
                            "Production",
                            "Media",
                        ].map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveFormTab(tab)}
                                className={`px-4 py-2.5 sm:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap min-h-[44px] sm:min-h-0 flex-1 ${activeFormTab === tab ? "bg-white text-clay-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                    {activeFormTab === "Essentials" && (
                        <ProductFormBasicDetails
                            data={data}
                            setData={setData}
                            errors={errors}
                            categories={categories}
                            activationReadiness={activationReadiness}
                            handleStatusChange={handleStatusChange}
                            selectedProduct={selectedProduct}
                        />
                    )}

                    {activeFormTab === "Details" && (
                        <ProductFormClaySpecs
                            data={data}
                            setData={setData}
                            errors={errors}
                        />
                    )}

                    {activeFormTab === "Production" && (
                        <ProductFormRecipePanel
                            data={data}
                            setData={setData}
                            supplies={supplies}
                            addRecipeItem={addRecipeItem}
                            removeRecipeItem={removeRecipeItem}
                            updateRecipeItem={updateRecipeItem}
                        />
                    )}

                    {activeFormTab === "Media" && (
                        <ProductFormMediaUploads
                            data={data}
                            setData={setData}
                            errors={errors}
                            activationReadiness={activationReadiness}
                            previews={previews}
                            handleFileChange={handleFileChange}
                            handleModelAssetFolderChange={handleModelAssetFolderChange}
                            handleRemoveGalleryImage={handleRemoveGalleryImage}
                        />
                    )}
                </div>

                <div className="shrink-0 sticky bottom-0 z-20 border-t border-gray-100 bg-white/80 backdrop-blur-md px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-gray-50 min-h-[44px] sm:min-h-0 order-2 sm:order-1"
                    >
                        Cancel
                    </button>

                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center order-1 sm:order-2">
                        {activeFormTab !== "Essentials" && (
                            <button
                                type="button"
                                onClick={() => {
                                    const tabs = ["Essentials", "Details", "Production", "Media"];
                                    const currentIndex = tabs.indexOf(activeFormTab);
                                    setActiveFormTab(tabs[currentIndex - 1]);
                                }}
                                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition min-h-[44px] sm:min-h-0"
                            >
                                Previous
                            </button>
                        )}

                        {activeFormTab === "Media" ? (
                            <PrimaryButton
                                type="submit"
                                className="px-8 py-2.5 rounded-xl shadow-lg shadow-clay-500/20 min-h-[44px] sm:min-h-0 justify-center"
                                disabled={!canEditProducts || processing}
                            >
                                {processing
                                    ? "Saving..."
                                    : data.id
                                    ? "Save Changes"
                                    : "Publish Product"}
                            </PrimaryButton>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    const tabs = ["Essentials", "Details", "Production", "Media"];
                                    const currentIndex = tabs.indexOf(activeFormTab);
                                    setActiveFormTab(tabs[currentIndex + 1]);
                                }}
                                className="px-6 py-2.5 bg-clay-600 text-white rounded-xl text-sm font-bold hover:bg-clay-700 transition shadow-lg shadow-clay-500/20 min-h-[44px] sm:min-h-0"
                            >
                                Next Step
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
}
