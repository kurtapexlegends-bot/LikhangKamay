import { useState, useMemo, useEffect } from "react";
import { useForm } from "@inertiajs/react";
import useConstraintValidation from "@/hooks/useConstraintValidation";
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
    const getInitialProductData = (sku = "", category = defaultCategory) => ({
        id: null,
        sku: sku || "",
        name: "",
        description: "",
        category: category || defaultCategory,
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
        status: "Draft",
        cover_photo: null,
        retained_gallery: [],
        gallery: [],
        model_3d: null,
        model_3d_assets: [],
        model_3d_asset_paths: [],
        model_3d_path: null,
        production_method: "resell",
        recipes: [],
        track_as_supply: false,
    });

    // Form setup for products
    const productForm = useForm(getInitialProductData("", defaultCategory));

    const deductForm = useForm({
        quantity: "",
        reason: "Physical Store Sale",
    });

    const resubmitForm = useForm({
        notes: "",
    });

    const { data, setData, post, processing, errors, reset, clearErrors } = productForm;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const combinedProcessing = Boolean(processing || isSubmitting);

    const shouldValidateSku = !data.id || (selectedProduct && data.sku !== selectedProduct.sku);
    const skuValidation = useConstraintValidation(
        'sku_uniqueness', 
        data.sku, 
        { product_id: data.id }, 
        shouldValidateSku
    );

    const [previews, setPreviews] = useState({ cover: null, gallery: [], model_3d: null });
    const hasThreeDReady = Boolean(data.model_3d || data.model_3d_path || previews.model_3d);

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
        revokeBlobUrl(previews.model_3d);
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

        setPreviews({ cover: null, gallery: [], model_3d: null });
        setData(getInitialProductData(generateSKU(), defaultCategory));
        setActiveFormTab("Essentials");
        setProductModalOpen(true);
    };

    const openEditModal = (product) => {
        if (!canEditProducts) return;
        cleanupPreviews();
        setSelectedProduct(product);
        clearErrors();

        setData({
            id: product.id,
            sku: product.sku || "",
            name: product.name || "",
            description: product.description || "",
            category: categories.includes(product.category) ? product.category : defaultCategory,
            clay_type: product.clay_type || "Stoneware",
            glaze_type: product.glaze_type || "Matte",
            firing_method: product.firing_method || "Electric Kiln",
            food_safe: typeof product.food_safe === "boolean" ? product.food_safe : true,
            height: product.height !== null && product.height !== undefined ? product.height : "",
            width: product.width !== null && product.width !== undefined ? product.width : "",
            weight: product.weight !== null && product.weight !== undefined ? product.weight : "",
            price: product.price !== null && product.price !== undefined ? product.price : "",
            cost_price: product.cost_price || "",
            stock: product.stock !== null && product.stock !== undefined ? product.stock : "",
            lead_time: product.lead_time || 3,
            status: product.model_3d_path || product.status !== "Active" ? product.status : "Draft",
            retained_gallery: product.gallery_paths || [],
            cover_photo: null,
            gallery: [],
            model_3d: null,
            model_3d_assets: [],
            model_3d_asset_paths: [],
            model_3d_path: product.model_3d_path || null,
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

        const model3dUrl = product.model_3d_url || (product.model_3d_path ? resolveStorageUrl(product.model_3d_path) : null);

        setPreviews({
            cover: product.cover_photo_url || product.img || resolveStorageUrl(product.cover_photo_path),
            gallery: product.gallery_urls && product.gallery_urls.length > 0 
                ? product.gallery_urls 
                : (product.gallery_paths ? product.gallery_paths.map(resolveStorageUrl) : []),
            model_3d: model3dUrl,
        });
        setActiveFormTab("Essentials");
        setProductModalOpen(true);
    };

    const closeProductModal = () => {
        cleanupPreviews();
        setSelectedProduct(null);
        reset();
        clearErrors();
        setData(getInitialProductData("", defaultCategory));
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
            const MAX_MODEL_BYTES = 4 * 1024 * 1024; // 4MB ceiling for serverless multipart payload
            if (file && file.size > MAX_MODEL_BYTES) {
                e.target.value = "";
                if (typeof addToast === "function") {
                    addToast(
                        "3D model file exceeds 4MB serverless payload limit. Please compress textures or optimize the model.",
                        "error"
                    );
                }
                return;
            }
            if (previews.model_3d) revokeBlobUrl(previews.model_3d);
            setData("model_3d", file);
            setData("model_3d_assets", []);
            setData("model_3d_asset_paths", []);
            setPreviews((prev) => ({
                ...prev,
                model_3d: file ? URL.createObjectURL(file) : null,
            }));
        } else {
            setData(field, file);
        }
    };

    const handleRemoveCover = () => {
        if (previews.cover) revokeBlobUrl(previews.cover);
        setData("cover_photo", null);
        setPreviews((prev) => ({
            ...prev,
            cover: null,
        }));
    };

    const handleRemoveModel3D = () => {
        if (previews.model_3d) revokeBlobUrl(previews.model_3d);
        setData((prev) => ({
            ...prev,
            model_3d: null,
            model_3d_path: null,
            model_3d_assets: [],
            model_3d_asset_paths: [],
        }));
        setPreviews((prev) => ({
            ...prev,
            model_3d: null,
        }));
    };

    const handleModelAssetFolderChange = (event) => {
        const selectedFiles = Array.from(event.target.files || []);
        const totalSizeBytes = selectedFiles.reduce((acc, file) => acc + (file.size || 0), 0);
        const MAX_FOLDER_BYTES = 4 * 1024 * 1024; // 4MB ceiling for serverless multipart payload

        if (totalSizeBytes > MAX_FOLDER_BYTES) {
            event.target.value = "";
            if (typeof addToast === "function") {
                addToast(
                    "Companion 3D asset folder exceeds 4MB serverless payload limit. Please compress textures or optimize assets.",
                    "error"
                );
            }
            return;
        }

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
        return () => cleanupPreviews();
    }, []);

    const submitProduct = async (e, targetStatus = null) => {
        if (e && typeof e.preventDefault === "function") {
            e.preventDefault();
        }
        if (!canEditProducts) return;

        const effectiveStatus = targetStatus || (data.id ? (data.status || "Active") : (activationReadiness.canActivate ? "Active" : "Draft"));

        if (effectiveStatus === "Active" && !activationReadiness.canActivate) {
            setActiveFormTab("Media");
            addToast(`Active listing requires ${activationReadiness.missingLabels.join(", ")}. Save as Draft or upload required media.`, "error");
            return;
        }

        const isAddingNewActive = !data.id && effectiveStatus === "Active";
        const isActivatingExisting = data.id && selectedProduct?.status !== "Active" && effectiveStatus === "Active";

        if ((isAddingNewActive || isActivatingExisting) && subscription?.activeCount >= subscription?.limit) {
            setLimitModalOpen(true);
            return;
        }

        setIsSubmitting(true);

        // 1. Direct-to-Storage upload for 3D model if it's a File
        let model3dKeyOrFile = data.model_3d;
        if (data.model_3d instanceof File) {
            const extension = data.model_3d.name?.split('.').pop()?.toLowerCase();
            if (['glb', 'gltf'].includes(extension)) {
                try {
                    addToast("Uploading 3D model directly to storage...", "info");
                    
                    const uploadContentType = extension === 'glb' ? 'model/gltf-binary' : (data.model_3d.type || 'application/octet-stream');
                    const presignResponse = await axios.post(route('3d.presign'), {
                        filename: data.model_3d.name,
                        contentType: uploadContentType
                    });
                    const { url, key, contentType } = presignResponse.data;
                    
                    await axios.put(url, data.model_3d, {
                        headers: {
                            'Content-Type': contentType || uploadContentType
                        }
                    });
                    
                    model3dKeyOrFile = key;
                    setData("model_3d", key);
                } catch (err) {
                    console.error("Direct 3D upload failed during product listing:", err);
                    addToast("Failed to upload 3D model. Please try again.", "error");
                    setIsSubmitting(false);
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

        // Calculate total aggregate multipart payload size of all raw File instances being sent via Inertia
        let totalPayloadBytes = 0;
        if (compressedCover instanceof File) {
            totalPayloadBytes += compressedCover.size || 0;
        }
        if (Array.isArray(compressedGallery)) {
            compressedGallery.forEach((f) => {
                if (f instanceof File) {
                    totalPayloadBytes += f.size || 0;
                }
            });
        }
        if (Array.isArray(data.model_3d_assets)) {
            data.model_3d_assets.forEach((f) => {
                if (f instanceof File) {
                    totalPayloadBytes += f.size || 0;
                }
            });
        }
        if (model3dKeyOrFile instanceof File) {
            totalPayloadBytes += model3dKeyOrFile.size || 0;
        }

        const MAX_MULTIPART_BYTES = 4 * 1024 * 1024; // 4MB serverless payload limit
        if (totalPayloadBytes > MAX_MULTIPART_BYTES) {
            setIsSubmitting(false);
            addToast("Total upload payload exceeds 4MB serverless limit. Please compress images or companion assets.", "error");
            return;
        }

        // 3. Transform Inertia payload to lightened payload for Vercel 4.5MB limit
        productForm.transform((currentData) => ({
            ...currentData,
            status: effectiveStatus,
            cover_photo: compressedCover,
            gallery: compressedGallery,
            model_3d: model3dKeyOrFile,
            model_3d_assets: currentData.model_3d_assets || [],
            model_3d_asset_paths: currentData.model_3d_asset_paths || [],
        }));

        const options = {
            onSuccess: () => {
                setIsSubmitting(false);
                closeProductModal();
                reset();
            },
            onError: (err) => {
                setIsSubmitting(false);
                console.error("Validation Failed:", err);
                if (err.limit) {
                    setLimitModalOpen(true);
                } else {
                    addToast("Failed to save product. Please check the form for errors.", "error");
                }
                const essentialsKeys = ["sku", "name", "category", "price", "cost_price", "stock", "status", "description"];
                const detailsKeys = ["clay_type", "glaze_type", "firing_method", "colors", "food_safe", "height", "width", "weight", "lead_time"];
                const productionKeys = ["production_method", "recipes"];
                const mediaKeys = ["cover_photo", "gallery", "model_3d"];

                if (essentialsKeys.some((k) => err[k])) setActiveFormTab("Essentials");
                else if (detailsKeys.some((k) => err[k])) setActiveFormTab("Details");
                else if (productionKeys.some((k) => err[k] || Object.keys(err).some((ek) => ek.startsWith("recipes.")))) setActiveFormTab("Production");
                else if (mediaKeys.some((k) => err[k] || Object.keys(err).some((ek) => ek.startsWith("gallery.")))) setActiveFormTab("Media");
            },
            onFinish: () => {
                setIsSubmitting(false);
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
        if (nextStatus === "Active") {
            if (!activationReadiness.canActivate) {
                addToast(`Add ${activationReadiness.missingLabels.join(", ")} before listing this product as Active.`, "info");
                return;
            }
            const isAlreadyActive = selectedProduct?.status === "Active";
            if (!isAlreadyActive && subscription && subscription.limit && (subscription.activeCount >= subscription.limit)) {
                addToast(`Product limit reached (${subscription.activeCount}/${subscription.limit}). Upgrade your plan or move another product to Draft.`, "error");
                setLimitModalOpen(true);
                return;
            }
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
        processing: combinedProcessing,
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
        handleRemoveCover,
        handleRemoveModel3D,
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
