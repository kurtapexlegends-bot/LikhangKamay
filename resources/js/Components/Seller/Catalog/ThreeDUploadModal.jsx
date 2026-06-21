import React, { useEffect, useMemo, useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import External3DToolLink from '@/Components/ThreeD/External3DToolLink';
import { ThreeDModelUnavailable } from '@/Components/ThreeD/ThreeDModelBoundary';
import ThreeDCanvasViewer from '@/Components/Seller/Catalog/ThreeDCanvasViewer';
import { UploadCloud, Rotate3d, X, Check } from 'lucide-react';

export default function ThreeDUploadModal({ show, onClose, products = [], canEditThreeD }) {
    const { data, setData, processing, reset, errors } = useForm({
        model: null,
        model_assets: [],
        model_asset_paths: [],
        product_id: '',
    });

    const [dragActive, setDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileError, setFileError] = useState('');

    const selectedUploadProduct = useMemo(() => (
        products.find((product) => String(product.id) === String(data.product_id)) || null
    ), [products, data.product_id]);

    useEffect(() => {
        return () => {
            if (previewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleClose = () => {
        if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setFileError('');
        setDragActive(false);
        reset();
        onClose();
    };

    const handleUpload = (e) => {
        e.preventDefault();
        if (!canEditThreeD) return;

        const formData = new FormData();
        formData.append('model', data.model);
        formData.append('product_id', data.product_id);
        (data.model_assets || []).forEach((file, index) => {
            formData.append('model_assets[]', file);
            formData.append('model_asset_paths[]', data.model_asset_paths?.[index] || file.name);
        });

        router.post(route('3d.upload'), formData, {
            onSuccess: () => {
                handleClose();
            },
        });
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (file) => {
        if (!canEditThreeD) return;
        if (!file) return;

        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!['glb', 'gltf'].includes(extension)) {
            clearSelectedFile();
            setFileError('Please upload a .glb or .gltf file.');
            return;
        }

        if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setFileError('');
        
        setData({
            ...data,
            model: file,
            model_assets: [],
            model_asset_paths: [],
        });
        setPreviewUrl(URL.createObjectURL(file));
    };

    const clearSelectedFile = () => {
        if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setData({
            ...data,
            model: null,
            model_assets: [],
            model_asset_paths: [],
        });
        setPreviewUrl(null);
        setFileError('');
    };

    const handleAssetFolderSelect = (files) => {
        if (!canEditThreeD) return;
        const normalizedFiles = Array.from(files || [])
            .filter((file) => file.name !== data.model?.name)
            .map((file) => ({
                file,
                relativePath: (
                    file.webkitRelativePath
                        ? file.webkitRelativePath.split(/[\\/]/).filter(Boolean).join('/')
                        : file.name
                ) || file.name,
            }))
            .filter(({ relativePath }) => Boolean(relativePath));

        setData({
            ...data,
            model_assets: normalizedFiles.map(({ file }) => file),
            model_asset_paths: normalizedFiles.map(({ relativePath }) => relativePath),
        });
    };

    return (
        <Modal show={show} onClose={handleClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-stone-900">Upload 3D Model</h3>
                        <p className="text-xs text-stone-500 mt-0.5 font-medium">Attach a .glb or .gltf file to one of your products</p>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                        <InputLabel value="Select Product" />
                        <select
                            value={data.product_id}
                            disabled={!canEditThreeD}
                            onChange={(e) => setData('product_id', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clay-100 focus:border-clay-300"
                            required
                        >
                            <option value="">Choose a product...</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}{product.model_3d_path ? ' - Replace current 3D' : ''}
                                </option>
                            ))}
                        </select>
                        {errors.product_id && <p className="text-xs text-red-500 mt-1">{errors.product_id}</p>}
                        {selectedUploadProduct?.model_3d_path && (
                            <p className="mt-1 text-[11px] font-medium text-amber-600">
                                Uploading here will replace the current 3D model for this product.
                            </p>
                        )}
                    </div>

                    <div>
                        <InputLabel value="3D Model File (.glb or .gltf)" />
                        <div
                            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                                dragActive ? 'border-clay-500 bg-clay-50' : 'border-gray-200 hover:border-clay-300'
                            }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                id="model-file-input"
                                accept=".glb,.gltf"
                                disabled={!canEditThreeD}
                                onChange={(e) => handleFileSelect(e.target.files[0])}
                                className="hidden"
                            />
                            {data.model ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden relative">
                                        {data.model.name.toLowerCase().endsWith('.glb') ? (
                                            <ThreeDCanvasViewer
                                                modelUrl={previewUrl}
                                                scale={1.08}
                                                showDemoFallback={false}
                                                resetKey={previewUrl || 'preview'}
                                                suspenseFallback={null}
                                                fallback={() => (
                                                    <ThreeDModelUnavailable
                                                        compact
                                                        title="Preview unavailable"
                                                        description="This file could not be previewed locally."
                                                        className="h-full"
                                                    />
                                                )}
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center px-4 text-center">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700">GLTF preview after upload</p>
                                                    <p className="mt-1 text-[11px] text-gray-500">
                                                        Companion <code>.bin</code> and texture files are loaded from the uploaded asset folder.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearSelectedFile();
                                            }}
                                            className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-red-50 hover:text-red-500 transition shadow-sm z-10"
                                        >
                                            <X size={14} />
                                        </button>
                                        {data.model.name.toLowerCase().endsWith('.glb') && (
                                            <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                                                <span className="inline-flex items-center gap-1.5 bg-black/50 text-white px-2 py-1 rounded-full text-[10px] font-medium">
                                                    <Rotate3d size={11} /> Drag to rotate
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center">
                                        <p className="text-sm font-bold text-gray-900">{data.model.name}</p>
                                        <p className="text-xs text-gray-500">{(data.model.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                            ) : (
                                <label htmlFor={canEditThreeD ? 'model-file-input' : undefined} className={`block py-4 ${canEditThreeD ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${dragActive ? 'bg-clay-200 text-clay-700' : 'bg-gray-50 text-gray-400'}`}>
                                        <UploadCloud size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-600">
                                        {dragActive ? 'Drop file here' : 'Click or Drag & Drop'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">GLB or GLTF up to 50MB</p>
                                </label>
                            )}
                        </div>
                        {(errors.model || fileError) && <p className="text-xs text-red-500 mt-1">{errors.model || fileError}</p>}
                        {data.model?.name?.toLowerCase().endsWith('.gltf') && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-amber-800">GLTF companion files</p>
                                        <p className="mt-1 text-[11px] text-amber-700">
                                            Upload the asset folder too if this model references external <code>.bin</code> or textures.
                                        </p>
                                    </div>
                                    <label className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${canEditThreeD ? 'cursor-pointer border-amber-300 bg-white text-amber-700 hover:bg-amber-100' : 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-500'}`}>
                                        Upload Asset Folder
                                        <input
                                            type="file"
                                            className="hidden"
                                            multiple
                                            webkitdirectory=""
                                            directory=""
                                            disabled={!canEditThreeD}
                                            onChange={(e) => handleAssetFolderSelect(e.target.files)}
                                        />
                                    </label>
                                </div>
                                <p className="mt-2 text-[11px] font-medium text-amber-800">
                                    {data.model_assets?.length
                                        ? `${data.model_assets.length} companion file${data.model_assets.length > 1 ? 's' : ''} ready for upload.`
                                        : 'Skip this only if the .gltf is fully embedded.'}
                                </p>
                                {errors.model_assets && <p className="mt-2 text-xs text-red-500">{errors.model_assets}</p>}
                            </div>
                        )}
                        <External3DToolLink />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !data.model || !data.product_id || !canEditThreeD}
                            className="flex items-center gap-2 px-5 py-2.5 bg-clay-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-clay-200 hover:bg-clay-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Check size={16} /> Upload Model
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
