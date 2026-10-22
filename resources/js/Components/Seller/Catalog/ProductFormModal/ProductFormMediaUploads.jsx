import React, { useState, useMemo } from "react";
import InputLabel from "@/Components/InputLabel";
import InputError from "@/Components/InputError";
import External3DToolLink from "@/Components/ThreeD/External3DToolLink";
import ProductImageLightboxModal from "@/Components/Consumer/Shop/ProductShow/ProductImageLightboxModal";
import { resolveImageUrl } from "@/lib/media";
import {
    CheckCircle,
    ListTodo,
    Check,
    Plus,
    Cuboid,
    X,
    FolderOpen,
    Folder,
    Maximize2,
    Eye,
} from "lucide-react";

export default function ProductFormMediaUploads({
    data,
    errors,
    activationReadiness,
    previews,
    handleFileChange,
    handleModelAssetFolderChange,
    handleRemoveGalleryImage,
    handleRemoveCover,
    handleRemoveModel3D,
}) {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxMode, setLightboxMode] = useState("image");

    // Aggregate all uploaded images for the carousel lightbox
    const allPhotos = useMemo(() => {
        const photos = [];
        if (previews?.cover) {
            photos.push(previews.cover);
        }
        if (Array.isArray(previews?.gallery)) {
            previews.gallery.forEach((url) => {
                if (url) photos.push(url);
            });
        }
        return photos;
    }, [previews]);

    // 3D Model URL for interactive 3D lightbox
    const model3dUrl = useMemo(() => {
        if (previews?.model_3d) return previews.model_3d;
        if (data?.model_3d_path) return resolveImageUrl(data.model_3d_path, "");
        return null;
    }, [previews, data.model_3d_path]);

    const has3D = Boolean(data?.model_3d || data?.model_3d_path || previews?.model_3d);

    const openLightbox = (index = 0, mode = "image") => {
        setLightboxIndex(index);
        setLightboxMode(mode);
        setIsLightboxOpen(true);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Activation Checklist */}
            <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
                <div className={`px-6 py-5 border-b ${activationReadiness.canActivate ? "bg-emerald-50/50 border-emerald-100" : "bg-stone-50/50 border-stone-100"}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                {activationReadiness.canActivate ? (
                                    <CheckCircle size={18} className="text-emerald-500" />
                                ) : (
                                    <ListTodo size={18} className="text-stone-400" />
                                )}
                                Activation Checklist
                            </h3>
                            <p className="mt-1 text-xs text-stone-500">
                                {activationReadiness.canActivate
                                    ? "All media requirements met. This product is ready for activation."
                                    : "Complete these requirements before listing this product as Active."}
                            </p>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide border shrink-0 ${activationReadiness.canActivate ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                            {activationReadiness.canActivate ? "Ready" : "Draft only"}
                        </div>
                    </div>

                    {!activationReadiness.canActivate && (
                        <div className="mt-5">
                            <div className="flex justify-between text-[10px] font-bold text-stone-500 mb-1.5">
                                <span>Progress</span>
                                <span>
                                    {activationReadiness.items.filter((i) => i.complete).length} of {activationReadiness.items.length} completed
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-clay-500 transition-all duration-500 ease-out"
                                    style={{
                                        width: `${(activationReadiness.items.filter((i) => i.complete).length / activationReadiness.items.length) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 sm:p-6 bg-white">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 select-none">
                        {activationReadiness.items.map((item) => (
                            <div
                                key={item.key}
                                className={`relative rounded-xl border p-4 transition-all ${item.complete ? "border-emerald-100 bg-emerald-50/30" : "border-stone-200 bg-white hover:border-stone-300"}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 shrink-0">
                                        {item.complete ? (
                                            <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                        ) : (
                                            <div className="h-5 w-5 rounded-full border-2 border-stone-300 flex items-center justify-center">
                                                <div className="h-1.5 w-1.5 rounded-full bg-stone-300"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${item.complete ? "text-gray-900" : "text-gray-700"}`}>
                                            {item.label}
                                        </p>
                                        <p className={`mt-0.5 text-xs ${item.complete ? "text-emerald-600 font-medium" : "text-stone-500"}`}>
                                            {item.complete ? "Completed" : item.detail}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Media Upload Header with Fullscreen Carousel Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <h4 className="text-sm font-bold text-stone-900">Media Uploads</h4>
                <div className="flex items-center gap-2">
                    {allPhotos.length > 0 && (
                        <button
                            type="button"
                            onClick={() => openLightbox(0, "image")}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 shadow-2xs transition min-h-[44px] cursor-pointer"
                        >
                            <Maximize2 size={14} className="text-clay-600" />
                            <span>View Carousel ({allPhotos.length})</span>
                        </button>
                    )}
                    {has3D && (
                        <button
                            type="button"
                            onClick={() => openLightbox(0, "3d")}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-clay-700 bg-clay-50 hover:bg-clay-100 border border-clay-200 shadow-2xs transition min-h-[44px] cursor-pointer"
                        >
                            <Cuboid size={14} />
                            <span>Preview 3D</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Upload Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cover Photo */}
                <div>
                    <InputLabel value="Cover Photo (Main)" className="mb-2" />
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-clay-400 transition group bg-gray-50">
                        {previews?.cover ? (
                            <>
                                <img
                                    src={previews.cover}
                                    alt="Cover"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/images/placeholder.svg';
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-3">
                                    <button
                                        type="button"
                                        onClick={() => openLightbox(0, "image")}
                                        className="bg-white text-stone-800 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-lg hover:bg-stone-50 transition min-h-[44px] flex items-center gap-1.5 cursor-pointer"
                                        title="View in Carousel"
                                    >
                                        <Eye size={14} className="text-clay-600" />
                                        <span>View</span>
                                    </button>
                                    <label className="bg-white text-stone-800 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-lg hover:bg-stone-50 transition cursor-pointer min-h-[44px] flex items-center justify-center">
                                        Replace
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/webp,image/jpeg,image/png"
                                            onChange={(e) => handleFileChange(e, "cover_photo")}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleRemoveCover}
                                        className="bg-white text-rose-600 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-lg hover:bg-rose-50 transition min-h-[44px] cursor-pointer"
                                        title="Remove Cover Photo"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </>
                        ) : (
                            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer min-h-[44px]">
                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                                    <Plus className="text-clay-600" />
                                </div>
                                <span className="text-sm font-bold text-gray-600">
                                    Upload Cover
                                </span>
                                <span className="text-[10px] text-gray-400 mt-1">
                                    WebP/JPG/PNG, Max 5MB (WebP recommended)
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/webp,image/jpeg,image/png"
                                    onChange={(e) => handleFileChange(e, "cover_photo")}
                                />
                            </label>
                        )}
                    </div>
                    <InputError message={errors.cover_photo} className="mt-2" />
                </div>

                {/* Gallery & 3D */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <InputLabel value="Gallery Images" />
                            <span className={`text-[10px] font-bold ${previews?.gallery?.length < 3 ? "text-orange-500" : previews?.gallery?.length > 5 ? "text-rose-500" : "text-emerald-600"}`}>
                                {previews?.gallery?.length < 3
                                    ? `Add ${3 - previews.gallery.length} more (Min 3)`
                                    : previews?.gallery?.length > 5
                                    ? `Exceeds max (Max 5)`
                                    : "Perfect (3-5 images)"}
                            </span>
                        </div>

                        <div className="flex flex-row overflow-x-auto gap-3 pb-3 scrollbar-thin flex-nowrap sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:flex-wrap">
                            {previews?.gallery?.map((preview, idx) => (
                                <div key={idx} className="relative w-28 h-28 sm:w-auto sm:h-auto sm:aspect-square rounded-xl overflow-hidden border border-gray-200 group flex-shrink-0">
                                    <img
                                        src={preview}
                                        className="w-full h-full object-cover"
                                        alt={`Preview ${idx + 1}`}
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = '/images/placeholder.svg';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 p-2">
                                        <button
                                            type="button"
                                            onClick={() => openLightbox(idx + (previews.cover ? 1 : 0), "image")}
                                            className="w-9 h-9 flex items-center justify-center bg-white text-stone-700 rounded-full shadow-lg hover:bg-stone-50 transition drop-shadow min-h-[36px] min-w-[36px] cursor-pointer"
                                            title="View in carousel"
                                        >
                                            <Eye size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveGalleryImage(idx)}
                                            className="w-9 h-9 flex items-center justify-center bg-white text-rose-600 rounded-full shadow-lg hover:bg-rose-50 transition drop-shadow min-h-[36px] min-w-[36px] cursor-pointer"
                                            title="Remove image"
                                        >
                                            <X size={15} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {(!previews?.gallery || previews.gallery.length < 5) && (
                                <label className="w-28 h-28 sm:w-auto sm:h-auto sm:aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-clay-400 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition min-h-[44px] flex-shrink-0">
                                    <Plus size={20} className="text-gray-400 mb-1" />
                                    <span className="text-[10px] font-bold text-gray-500">
                                        Add
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        accept="image/webp,image/jpeg,image/png"
                                        onChange={(e) => handleFileChange(e, "gallery")}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <InputLabel value="3D Model" className="mb-2" />
                        {data.model_3d ? (
                            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-2xs shrink-0">
                                        <Check size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-emerald-800 truncate max-w-[140px] sm:max-w-[180px]">
                                            {data.model_3d instanceof File ? data.model_3d.name : (typeof data.model_3d === 'string' ? data.model_3d.split('/').pop() : '3D Model')}
                                        </p>
                                        <p className="text-[10px] text-emerald-600">
                                            Ready to upload
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => openLightbox(0, "3d")}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-100/60 transition min-h-[36px] cursor-pointer"
                                        title="Preview 3D Model"
                                    >
                                        Preview
                                    </button>
                                    <label className="cursor-pointer text-xs font-bold text-emerald-700 hover:underline min-h-[36px] px-2 flex items-center justify-center">
                                        Replace
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".glb,.gltf"
                                            onChange={(e) => handleFileChange(e, "model_3d")}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleRemoveModel3D}
                                        className="text-emerald-600 hover:text-emerald-800 p-2 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                                        title="Remove 3D Model"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : data.model_3d_path ? (
                            <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-100 rounded-xl">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-white rounded-lg text-sky-600 shadow-2xs shrink-0">
                                        <Cuboid size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-sky-800">
                                            Current Saved Model
                                        </p>
                                        <p className="text-[10px] text-sky-600">
                                            Available in 3D & scale viewer.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => openLightbox(0, "3d")}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-sky-800 bg-white border border-sky-200 hover:bg-sky-100/60 transition min-h-[36px] cursor-pointer"
                                        title="Preview 3D Model"
                                    >
                                        Preview
                                    </button>
                                    <label className="cursor-pointer text-xs font-bold text-sky-600 hover:underline min-h-[36px] px-2 flex items-center justify-center">
                                        Replace
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".glb,.gltf"
                                            onChange={(e) => handleFileChange(e, "model_3d")}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleRemoveModel3D}
                                        className="text-stone-400 hover:text-rose-600 p-2 min-h-[36px] min-w-[36px] flex items-center justify-center transition cursor-pointer"
                                        title="Remove 3D Model"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-clay-400 hover:bg-gray-50 transition group min-h-[44px]">
                                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white group-hover:shadow-xs transition">
                                    <Cuboid size={20} className="text-gray-400 group-hover:text-clay-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-700">
                                        Upload .glb / .gltf
                                    </p>
                                    <p className="text-[10px] text-gray-400 group-hover:text-clay-500">
                                        Required before the product can be listed as Active.
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".glb,.gltf"
                                    onChange={(e) => handleFileChange(e, "model_3d")}
                                />
                            </label>
                        )}
                        <InputError message={errors.model_3d} className="mt-2" />

                        {/* External 3D AI Tool recommendation banner */}
                        <div className="mt-3">
                            <External3DToolLink />
                        </div>

                        {/* Optional 3D Assets Directory Selection */}
                        {Boolean(data.model_3d) && (
                            <div className="mt-4 animate-fadeIn border-t border-stone-200 pt-4 space-y-2">
                                <div>
                                    <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                                        <FolderOpen size={14} className="text-clay-600 shrink-0" />
                                        Model Textures / Assets Folder <span className="text-[10px] text-stone-400 font-medium">(Optional)</span>
                                    </h4>
                                    <p className="text-[11px] text-stone-500 mt-0.5 leading-normal">
                                        Required if your <code className="font-mono text-[10px]">.gltf</code> model references external textures or binary files (<code className="font-mono text-[10px]">.bin</code>, images).
                                    </p>
                                </div>

                                <label className="flex items-center justify-between gap-3 p-3.5 border border-stone-200 bg-stone-50/70 hover:bg-stone-100/80 rounded-xl cursor-pointer transition group min-h-[44px]">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-white rounded-lg text-clay-600 shadow-2xs border border-stone-150 shrink-0">
                                            <Folder size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-stone-800 truncate">
                                                {data.model_3d_assets?.length > 0
                                                    ? `${data.model_3d_assets.length} external asset files loaded`
                                                    : "Select asset folder (with textures/bins)"}
                                            </p>
                                            {data.model_3d_asset_paths?.length > 0 && (
                                                <p className="text-[10px] text-stone-500 mt-0.5 max-h-12 overflow-y-auto font-mono">
                                                    {data.model_3d_asset_paths.slice(0, 3).join(", ")}
                                                    {data.model_3d_asset_paths.length > 3 ? "..." : ""}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="px-3.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-bold text-clay-700 group-hover:bg-clay-600 group-hover:text-white group-hover:border-clay-600 transition shrink-0 shadow-2xs">
                                        Browse
                                    </span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        webkitdirectory="true"
                                        directory="true"
                                        multiple
                                        onChange={handleModelAssetFolderChange}
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox Carousel Modal: Provides expansive, un-cramped photo carousel and 3D preview with real-life scale */}
            {isLightboxOpen && (
                <ProductImageLightboxModal
                    isOpen={isLightboxOpen}
                    onClose={() => setIsLightboxOpen(false)}
                    productName={data.name || "Handcrafted Product"}
                    gallery={allPhotos}
                    activeIndex={lightboxIndex}
                    onChangeIndex={setLightboxIndex}
                    has3D={has3D}
                    modelUrl={model3dUrl}
                    dimensions={{
                        height: data.height,
                        width: data.width,
                    }}
                    initialMode={lightboxMode}
                />
            )}
        </div>
    );
}
