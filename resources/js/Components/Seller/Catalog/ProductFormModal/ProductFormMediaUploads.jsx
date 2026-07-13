import React from "react";
import InputLabel from "@/Components/InputLabel";
import InputError from "@/Components/InputError";
import External3DToolLink from "@/Components/ThreeD/External3DToolLink";
import { CheckCircle, ListTodo, Check, Plus, Cuboid, X } from "lucide-react";

export default function ProductFormMediaUploads({
    data,
    setData,
    errors,
    activationReadiness,
    previews,
    handleFileChange,
    handleModelAssetFolderChange,
    handleRemoveGalleryImage,
}) {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden mb-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cover Photo */}
                <div>
                    <InputLabel value="Cover Photo (Main)" className="mb-2" />
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-clay-400 transition group bg-gray-50">
                        {previews.cover ? (
                            <>
                                <img
                                    src={previews.cover}
                                    alt="Cover"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setData("cover_photo", null);
                                            handleFileChange({ target: { files: [] } }, "cover_photo");
                                        }}
                                        className="bg-white text-rose-600 px-4 py-3.5 rounded-xl text-xs font-bold shadow-lg hover:bg-rose-50 transition min-h-[44px]"
                                    >
                                        Remove Photo
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
                            <span className={`text-[10px] font-bold ${previews.gallery.length < 3 ? "text-orange-500" : previews.gallery.length > 5 ? "text-rose-500" : "text-emerald-600"}`}>
                                {previews.gallery.length < 3
                                    ? `Add ${3 - previews.gallery.length} more (Min 3)`
                                    : previews.gallery.length > 5
                                    ? `Exceeds max (Max 5)`
                                    : "Perfect (3-5 images)"}
                            </span>
                        </div>

                        {/* grid-to-scroll applied for mobile: horizontal scrolling overflow-x-auto flex-nowrap */}
                        <div className="flex flex-row overflow-x-auto gap-3 pb-3 scrollbar-thin flex-nowrap sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:flex-wrap">
                            {previews.gallery.map((preview, idx) => (
                                <div key={idx} className="relative w-28 h-28 sm:w-auto sm:h-auto sm:aspect-square rounded-lg overflow-hidden border border-gray-200 group flex-shrink-0">
                                    <img
                                        src={preview}
                                        className="w-full h-full object-cover"
                                        alt={`Preview ${idx + 1}`}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveGalleryImage(idx)}
                                            className="w-10 h-10 flex items-center justify-center bg-white text-rose-600 rounded-full shadow-lg hover:bg-rose-50 transition drop-shadow min-h-[44px] min-w-[44px]"
                                            title="Remove image"
                                        >
                                            <X size={16} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {previews.gallery.length < 5 && (
                                <label className="w-28 h-28 sm:w-auto sm:h-auto sm:aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-clay-400 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition min-h-[44px] flex-shrink-0">
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
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm">
                                        <Check size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-emerald-800 truncate max-w-[150px]">
                                            {data.model_3d.name}
                                        </p>
                                        <p className="text-[10px] text-emerald-600">
                                            Ready to upload
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setData("model_3d", null)}
                                    className="text-emerald-600 hover:text-emerald-800 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : data.model_3d_path ? (
                            <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-100 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-sky-600 shadow-sm">
                                        <Cuboid size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-sky-800">
                                            Current Model
                                        </p>
                                        <p className="text-[10px] text-sky-600">
                                            Replace it with a new file.
                                        </p>
                                    </div>
                                </div>
                                <label className="cursor-pointer text-xs font-bold text-sky-600 hover:underline min-h-[44px] min-w-[44px] flex items-center justify-center">
                                    Replace
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".glb,.gltf"
                                        onChange={(e) => handleFileChange(e, "model_3d")}
                                    />
                                </label>
                            </div>
                        ) : (
                            <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-clay-400 hover:bg-gray-50 transition group min-h-[44px]">
                                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white group-hover:shadow-sm transition">
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

                        {/* Optional 3D Assets Directory Selection */}
                        {Boolean(data.model_3d) && (
                            <div className="mt-4 animate-fadeIn border-t border-stone-150 pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <InputLabel value="Model Textures / Assets Folder (Optional)" />
                                        <p className="text-[10px] text-stone-500">
                                            Required if your model references external textures (.bin, images).
                                        </p>
                                    </div>
                                    <External3DToolLink />
                                </div>
                                <label className="flex items-center gap-3 p-3 border border-stone-250 bg-stone-50/50 rounded-xl cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition group min-h-[44px]">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-stone-700">
                                            {data.model_3d_assets?.length > 0
                                                ? `${data.model_3d_assets.length} external assets loaded`
                                                : "Select asset folder (with textures/bins)"}
                                        </p>
                                        {data.model_3d_asset_paths?.length > 0 && (
                                            <p className="text-[10px] text-stone-500 mt-1 max-h-16 overflow-y-auto font-mono">
                                                {data.model_3d_asset_paths.slice(0, 3).join(", ")}
                                                {data.model_3d_asset_paths.length > 3 ? "..." : ""}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-clay-600 hover:text-clay-700">
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
        </div>
    );
}
