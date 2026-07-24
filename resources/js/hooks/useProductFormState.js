import { useState, useMemo, useEffect } from "react";
import { useForm } from "@inertiajs/react";
import useConstraintValidation from "@/hooks/useConstraintValidation";
import { STANDARD_PRODUCT_CATEGORIES } from "@/utils/catalog";
import { compressImage } from "@/utils/imageCompressor";
import axios from "axios";

export default function useProductFormState({
    canEditProducts,
    defaultCategory,
    categories,
    subscription,
    addToast,
    // Modal controls
    setLimitModalOpen,
    setProductModalOpen,
    setDeductModalOpen,
    setResubmitModalOpen,
    // Selected products
    selectedProduct,
    setSelectedProduct,
    selectedResubmitProduct,
    setSelectedResubmitProduct,
    setActiveFormTab,
}) {
    // Form setup for products
    const productForm = useForm({
        id: null,
        sku: "",
        name: "",
        description: "",
        category: defaultCategory,
        clay_type: "Stoneware",
        glaze_type: "Matte",
        firing_method: "Electric Kiln",
        food_safe: true,
        height: "",
        width: "",
        weight: "",
        price: "",
        cost_price: "",
        stock: "",
        lead_time: 3,
        status: "Active",
        cover_photo: null,
        gallery: [],
        model_3d: null,
        model_3d_assets: [],
        model_3d_asset_paths: [],
        model_3d_path: null,
        production_method: "resell",
        recipes: [],
        track_as_supply: false,
    });

    const deductForm = useForm({
        quantity: "",
        reason: "Physical Store Sale",
    });

    const resubmitForm = useForm({
        notes: "",
    });

    const { data, setData, post, processing, errors, reset, clearErrors } = productForm;

    const shouldValidateSku = !data.id || (selectedProduct && data.sku !== selectedProduct.sku);
    const skuValidation = useConstraintValidation(
        'sku_uniqueness', 
        data.sku, 
        { product_id: data.id }, 
        shouldValidateSku
    );

    const [previews, setPreviews] = useState({ cover: null, gallery: [] });
    const hasThreeDReady = Boolean(data.model_3d || data.model_3d_path);

    const activationReadiness = useMemo(() => {
        const galleryImageCount = previews.gallery.length;
        const items = [
            {
                key: "cover",
                label: "Cover image",
                detail: "Required main product photo",
                complete: Boolean(previews.cover),
            },
            {
                key: "gallery",
                label: "Gallery images",
                detail: `${galleryImageCount}/3-5 selected`,
                complete: galleryImageCount >= 3 && galleryImageCount <= 5,
            },
            {
                key: "model",
                label: "3D model",
                detail: hasThreeDReady ? "3D file ready" : "Upload .glb or .gltf",
                complete: hasThreeDReady,
            },
            {
                key: "cost",
                label: "Cost price",
                detail: data.cost_price ? "Cost recorded" : "Missing cost data",
                complete: Boolean(data.cost_price) && !isNaN(parseFloat(data.cost_price)),
            },
        ];

        return {
            canActivate: items.every((item) => item.complete),
            items,
            missingLabels: items.filter((item) => !item.complete).map((item) => item.label.toLowerCase()),
        };
    }, [previews.cover, previews.gallery.length, hasThreeDReady, data.cost_price]);

    const revokeBlobUrl = (url) => {
        if (typeof url === "string" && url.startsWith("blob:")) {
            URL.revokeObjectURL(url);
        }
    };

    const cleanupPreviews = () => {
        revokeBlobUrl(previews.cover);
        (previews.gallery || []).forEach(revokeBlobUrl);
    };

    const generateSKU = () =>
        "LK-" +
        Math.floor(Math.random() * 0xffff)
            .toString(16)
            .toUpperCase()
            .padStart(4, "0");

    const openAddModal = () => {
        if (!canEditProducts) return;
        cleanupPreviews();
        setSelectedProduct(null);
        reset();
        clearErrors();

        setPreviews({ cover: null, gallery: [] });
        setData({
            ...data,
            id: null,
            sku: generateSKU(),
            cost_price: "",
            category: defaultCategory,
            clay_type: "Stoneware",
            glaze_type: "Matte",
            firing_method: "Electric Kiln",
            status: "Draft",
            lead_time: 3,
            retained_gallery: [],
            gallery: [],
            model_3d: null,
            model_3d_assets: [],
            model_3d_asset_paths: [],
            model_3d_path: null,
            track_as_supply: false,
            recipes: [],
        });
        setActiveFormTab("Essentials");
        setProductModalOpen(true);
    };

    const openEditModal = (product) => {
        if (!canEditProducts) return;
        cleanupPreviews();
        setSelectedProduct(product);
        clearErrors();

        setData({
            ...product,
            category: categories.includes(product.category) ? product.category : defaultCategory,
            cost_price: product.cost_price || "",
            description: product.description || "",
            retained_gallery: product.gallery_paths || [],
            cover_photo: null,
            gallery: [],
            model_3d: null,
            model_3d_assets: [],
            model_3d_asset_paths: [],
            status: product.model_3d_path || product.status !== "Active" ? product.status : "Draft",
            track_as_supply: product.track_as_supply || false,
            production_method: product.production_method || "resell",
            recipes: product.recipes || [],
        });
        const resolveStorageUrl = (urlOrPath) => {
            if (!urlOrPath) return null;
            if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://') || urlOrPath.startsWith('blob:') || urlOrPath.startsWith('data:')) {
                return urlOrPath;
            }
            return `/storage/${urlOrPath.replace(/^\/+/, '').replace(/^storage\//, '')}`;
        };

        setPreviews({
            cover: product.cover_photo_url || product.img || resolveStorageUrl(product.cover_photo_path),
            gallery: product.gallery_urls && product.gallery_urls.length > 0 
                ? product.gallery_urls 
                : (product.gallery_paths ? product.gallery_paths.map(resolveStorageUrl) : []),
        });
        setActiveFormTab("Essentials");
        setProductModalOpen(true);
    };

    const closeProductModal = () => {
        cleanupPreviews();
        setProductModalOpen(false);
    };

    const handleFileChange = async (e, field) => {
        const file = e.target.files[0];
        if (field === "gallery") {
            const files = Array.from(e.target.files);
            const compressedFiles = await Promise.all(
                files.map((f) => compressImage(f))
            );
            setData("gallery", [...(data.gallery || []), ...compressedFiles]);
            setPreviews((prev) => ({
                ...prev,
                gallery: [...(prev.gallery || []), ...compressedFiles.map((f) => URL.createObjectURL(f))],
            }));
        } else if (field === "cover_photo") {
            const compressedCover = await compressImage(file);
            setData("cover_photo", compressedCover);
            if (previews.cover) revokeBlobUrl(previews.cover);
            setPreviews((prev) => ({
                ...prev,
                cover: compressedCover ? URL.createObjectURL(compressedCover) : null,
            }));
        } else if (field === "model_3d") {
            setData("model_3d", file);
            setData("model_3d_assets", []);
            setData("model_3d_asset_paths", []);
        } else {
            setData(field, file);
        }
    };

    const handleModelAssetFolderChange = (event) => {
        const selectedFiles = Array.from(event.target.files || []);
        const mainModelName = data.model_3d?.name || "";
        const normalizedFiles = selectedFiles
            .filter((file) => file.name !== mainModelName)
            .map((file) => ({
                file,
                relativePath: file.webkitRelativePath
                    ? file.webkitRelativePath.split(/[\\/]/).filter(Boolean).join("/")
                    : file.name,
            }))
            .filter(({ relativePath }) => Boolean(relativePath));

        setData("model_3d_assets", normalizedFiles.map(({ file }) => file));
        setData("model_3d_asset_paths", normalizedFiles.map(({ relativePath }) => relativePath));
        event.target.value = "";
    };

    const handleRemoveGalleryImage = (indexToRemove) => {
        const retainedCount = (data.retained_gallery || []).length;
        if (indexToRemove < retainedCount) {
            const updatedRetained = [...data.retained_gallery];
            updatedRetained.splice(indexToRemove, 1);
            setData("retained_gallery", updatedRetained);
        } else {
            const newFileIndex = indexToRemove - retainedCount;
            const updatedFiles = [...(data.gallery || [])];
            updatedFiles.splice(newFileIndex, 1);
            setData("gallery", updatedFiles);
        }
        setPreviews((prev) => {
            const updatedPreviews = [...prev.gallery];
            revokeBlobUrl(updatedPreviews[indexToRemove]);
            updatedPreviews.splice(indexToRemove, 1);
            return { ...prev, gallery: updatedPreviews };
        });
    };

    useEffect(() => {
        if (!activationReadiness.canActivate && data.status === "Active") {
            setData("status", "Draft");
        }
    }, [data.status, activationReadiness.canActivate]);

    useEffect(() => {
        return () => cleanupPreviews();
    }, []);

    const submitProduct = async (e) => {
        e.preventDefault();
        if (!canEditProducts) return;

        if (data.status === "Active" && !activationReadiness.canActivate) {
            setActiveFormTab("Media");
            addToast(`Active products require ${activationReadiness.missingLabels.join(", ")}.`, "error");
            return;
        }

        const isAddingNewActive = !data.id && data.status === "Active";
        const isActivatingExisting = data.id && selectedProduct?.status !== "Active" && data.status === "Active";

        if ((isAddingNewActive || isActivatingExisting) && subscription?.activeCount >= subscription?.limit) {
            setLimitModalOpen(true);
            return;
        }

        // 1. Direct-to-Storage upload for 3D model if it's a File
        let model3dKeyOrFile = data.model_3d;
        if (data.model_3d instanceof File) {
            const extension = data.model_3d.name?.split('.').pop()?.toLowerCase();
            if (['glb', 'gltf'].includes(extension)) {
                try {
                    addToast("Uploading 3D model directly to storage...", "info");
                    
                    const presignResponse = await axios.post(route('3d.presign'), {
                        filename: data.model_3d.name,
                        contentType: data.model_3d.type || 'application/octet-stream'
                    });
                    const { url, key } = presignResponse.data;
                    
                    await axios.put(url, data.model_3d, {
                        headers: {
                            'Content-Type': data.model_3d.type || 'application/octet-stream'
                        }
                    });
                    
                    model3dKeyOrFile = key;
                    setData("model_3d", key);
                } catch (err) {
                    console.error("Direct 3D upload failed during product listing:", err);
                    addToast("Failed to upload 3D model. Please try again.", "error");
                    return;
                }
            }
        }

        // 2. Compress images defensively before form submission
        let compressedCover = data.cover_photo;
        if (data.cover_photo instanceof File) {
            compressedCover = await compressImage(data.cover_photo);
        }

        let compressedGallery = data.gallery;
        if (Array.isArray(data.gallery) && data.gallery.length > 0) {
            compressedGallery = await Promise.all(
                data.gallery.map((f) => (f instanceof File ? compressImage(f) : f))
            );
        }

        // 3. Transform Inertia payload to lightened payload for Vercel 4.5MB limit
        productForm.transform((currentData) => ({
            ...currentData,
            cover_photo: compressedCover,
            gallery: compressedGallery,
            model_3d: model3dKeyOrFile,
            model_3d_assets: [],
            model_3d_asset_paths: [],
        }));

        const options = {
            onSuccess: () => {
                closeProductModal();
                reset();
            },
            onError: (err) => {
                console.error("Validation Failed:", err);
                if (err.limit) {
                    setLimitModalOpen(true);
                } else {
                    addToast("Failed to save product. Please check the form for errors.", "error");
                }
                const essentialsKeys = ["name", "category", "price", "stock"];
                const detailsKeys = ["clay_type", "glaze_type"];
                const mediaKeys = ["cover_photo", "model_3d"];

                if (essentialsKeys.some((k) => err[k])) setActiveFormTab("Essentials");
                else if (detailsKeys.some((k) => err[k])) setActiveFormTab("Details");
                else if (mediaKeys.some((k) => err[k])) setActiveFormTab("Media");
            },
            forceFormData: true,
        };

        if (data.id) {
            post(route("products.update", data.id), options);
        } else {
            post(route("products.store"), options);
        }
    };

    const handleStatusChange = (nextStatus) => {
        if (nextStatus === "Active" && !activationReadiness.canActivate) {
            addToast(`Add ${activationReadiness.missingLabels.join(", ")} before listing this product as Active.`, "info");
            return;
        }
        setData("status", nextStatus);
    };

    const addRecipeItem = () => {
        setData("recipes", [
            ...data.recipes,
            { supply_id: "", quantity_required: 1 },
        ]);
    };

    const removeRecipeItem = (index) => {
        const updated = [...data.recipes];
        updated.splice(index, 1);
        setData("recipes", updated);
    };

    const updateRecipeItem = (index, field, value) => {
        const updated = [...data.recipes];
        updated[index][field] = value;
        setData("recipes", updated);
    };

    const handleDeduct = (e) => {
        e.preventDefault();
        if (!canEditProducts) return;
        deductForm.post(route("products.deduct", selectedProduct.id), {
            onSuccess: () => {
                setDeductModalOpen(false);
                deductForm.reset();
            },
            onError: (err) => {
                console.error("Deduction Failed:", err);
                addToast("Failed to deduct stock", "error");
            },
        });
    };

    const submitResubmission = (e) => {
        e?.preventDefault();
        resubmitForm.post(route("products.resubmit", selectedResubmitProduct.id), {
            preserveScroll: true,
            onSuccess: () => {
                setResubmitModalOpen(false);
                resubmitForm.reset();
            },
        });
    };

    return {
        productForm,
        deductForm,
        resubmitForm,
        data,
        setData,
        processing,
        errors,
        reset,
        clearErrors,
        previews,
        skuValidation,
        activationReadiness,
        openAddModal,
        openEditModal,
        closeProductModal,
        handleFileChange,
        handleModelAssetFolderChange,
        handleRemoveGalleryImage,
        submitProduct,
        handleStatusChange,
        addRecipeItem,
        removeRecipeItem,
        updateRecipeItem,
        handleDeduct,
        submitResubmission,
        shouldValidateSku,
        hasThreeDReady,
    };
}
