import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Html, useProgress } from '@react-three/drei';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import Modal from '@/Components/Modal';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';
import SellerHeader from '@/Components/SellerHeader';
import External3DToolLink from '@/Components/External3DToolLink';
import GLTFModel from '@/Components/GLTFModel';
import { ThreeDModelBoundary, ThreeDModelUnavailable } from '@/Components/ThreeDModelBoundary';
import ReadOnlyCapabilityNotice from '@/Components/ReadOnlyCapabilityNotice';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import {
    UploadCloud, Cuboid, Rotate3d, Trash2, Search,
    X, Check, Package, AlertTriangle,
} from 'lucide-react';

function Loader() {
    const { progress } = useProgress();
    return (
        <Html center>
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-clay-200 border-t-clay-600 rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-gray-500">{progress.toFixed(0)}%</span>
            </div>
        </Html>
    );
}

const DemoPottery = (props) => {
    return (
        <mesh {...props}>
            <torusKnotGeometry args={[1, 0.3, 100, 16]} />
            <meshStandardMaterial color="#c07251" roughness={0.3} metalness={0.1} />
        </mesh>
    );
};

const revokeBlobUrl = (url) => {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
};

export default function ThreeDManager({ auth, models = [], products = [], storage = { percent: 0, used: '0MB', max: '500MB' } }) {
    const [selectedModelId, setSelectedModelId] = useState(models[0]?.id ?? null);
    const [searchQuery, setSearchQuery] = useState('');
    const { openSidebar } = useSellerWorkspaceShell();
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileError, setFileError] = useState('');
    const [deleteCandidate, setDeleteCandidate] = useState(null);
    const { canEdit: canEditThreeD, isReadOnly: isThreeDReadOnly } = useSellerModuleAccess('3d');

    const { data, setData, processing, reset, errors } = useForm({
        model: null,
        model_assets: [],
        model_asset_paths: [],
        product_id: '',
    });

    const filteredModels = useMemo(() => (
        models.filter((model) =>
            model.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    ), [models, searchQuery]);

    const selectedModel = useMemo(() => (
        filteredModels.find((model) => model.id === selectedModelId) || null
    ), [filteredModels, selectedModelId]);

    const selectedUploadProduct = useMemo(() => (
        products.find((product) => String(product.id) === String(data.product_id)) || null
    ), [products, data.product_id]);

    useEffect(() => {
        if (!models.length) {
            setSelectedModelId(null);
            return;
        }

        if (!models.some((model) => model.id === selectedModelId)) {
            setSelectedModelId(models[0].id);
        }
    }, [models, selectedModelId]);

    useEffect(() => {
        if (!filteredModels.length) {
            return;
        }

        if (!filteredModels.some((model) => model.id === selectedModelId)) {
            setSelectedModelId(filteredModels[0].id);
        }
    }, [filteredModels, selectedModelId]);

    useEffect(() => {
        return () => revokeBlobUrl(previewUrl);
    }, [previewUrl]);

    const closeUploadModal = () => {
        revokeBlobUrl(previewUrl);
        setShowUploadModal(false);
        setPreviewUrl(null);
        setFileError('');
        setDragActive(false);
        reset();
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
                closeUploadModal();
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
        if (!file) {
            return;
        }

        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!['glb', 'gltf'].includes(extension)) {
            clearSelectedFile();
            setFileError('Please upload a .glb or .gltf file.');
            return;
        }

        revokeBlobUrl(previewUrl);
        setFileError('');
        setData('model', file);
        setData('model_assets', []);
        setData('model_asset_paths', []);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const clearSelectedFile = () => {
        revokeBlobUrl(previewUrl);
        setData('model', null);
        setData('model_assets', []);
        setData('model_asset_paths', []);
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

        setData('model_assets', normalizedFiles.map(({ file }) => file));
        setData('model_asset_paths', normalizedFiles.map(({ relativePath }) => relativePath));
    };

    const handleDelete = (productId) => {
        if (!canEditThreeD) return;
        setDeleteCandidate(productId);
    };

    return (
        <>
            <Head title="3D Asset Manager" />
            <SellerHeader
                title="3D Asset Manager"
                subtitle="Manage your digital twins and AR assets"
                auth={auth}
                onMenuClick={openSidebar}
                actions={(
                    <button
                        onClick={() => canEditThreeD && setShowUploadModal(true)}
                        disabled={!canEditThreeD}
                        className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-clay-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <UploadCloud size={15} />
                        Upload Model
                    </button>
                )}
            />

                <main className="flex-1 p-5 overflow-hidden flex flex-col gap-4">
                    {isThreeDReadOnly && (
                        <ReadOnlyCapabilityNotice label="3D assets are read only for your account. Upload and delete actions are disabled." />
                    )}
                    <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
                    <div className="flex-1 bg-gradient-to-b from-gray-50 to-gray-100 rounded-3xl border border-gray-200 relative overflow-hidden shadow-inner flex flex-col group">
                        {selectedModel ? (
                            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-2 shadow-sm">
                                <div className={`w-2 h-2 rounded-full ${selectedModel.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                                {selectedModel.name}
                            </div>
                        ) : (
                            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-gray-200 text-xs font-bold text-gray-400 shadow-sm">
                                No Model Selected
                            </div>
                        )}

                        {selectedModel && (
                            <button
                                type="button"
                                onClick={() => handleDelete(selectedModel.id)}
                                disabled={!canEditThreeD}
                                className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur border border-gray-200 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-500 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                title="Delete Asset"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}

                        <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
                            <ThreeDModelBoundary
                                resetKey={selectedModel?.url || 'empty'}
                                fallback={({ onRetry }) => (
                                    <ThreeDModelUnavailable
                                        title="Saved 3D asset unavailable"
                                        description="This model is missing files or could not be loaded from storage."
                                        onRetry={onRetry}
                                        className="h-full"
                                    />
                                )}
                            >
                                <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 50 }}>
                                    <Suspense fallback={<Loader />}>
                                        <Stage environment="city" intensity={0.5}>
                                            {selectedModel?.url ? (
                                                <GLTFModel url={selectedModel.url} scale={1.0} />
                                            ) : (
                                                <DemoPottery scale={0.65} />
                                            )}
                                        </Stage>
                                        <OrbitControls autoRotate autoRotateSpeed={2} enableZoom={true} />
                                    </Suspense>
                                </Canvas>
                            </ThreeDModelBoundary>
                        </div>

                        <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                            <span className="inline-flex items-center gap-1.5 bg-black/50 text-white px-2.5 py-1 rounded-full text-[10px] font-medium">
                                <Rotate3d size={12} /> Drag to rotate
                            </span>
                        </div>
                    </div>

                    <div className="w-full lg:w-[320px] flex flex-col gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Storage</span>
                                <span className="text-[10px] font-bold text-clay-600">{storage.used} / {storage.max}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-clay-500 h-full rounded-full transition-all duration-500" style={{ width: `${storage.percent}%` }}></div>
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search assets..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-medium focus:ring-2 focus:ring-clay-100 focus:border-clay-300 transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {filteredModels.length > 0 ? (
                                    filteredModels.map((model) => (
                                        <div
                                            key={model.id}
                                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition group ${
                                                selectedModelId === model.id
                                                    ? 'bg-clay-50 border border-clay-100 shadow-sm'
                                                    : 'hover:bg-gray-50 border border-transparent'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setSelectedModelId(model.id)}
                                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                            >
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${selectedModelId === model.id ? 'bg-white text-clay-600 shadow-sm' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:shadow-sm'}`}>
                                                    <Cuboid size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-xs font-bold truncate ${selectedModelId === model.id ? 'text-gray-900' : 'text-gray-700'}`}>{model.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] text-gray-400">{model.size || '0MB'}</span>
                                                        <span className="text-[9px] text-gray-300">&bull;</span>
                                                        <span className="text-[9px] text-gray-400">{model.date}</span>
                                                    </div>
                                                </div>
                                                {selectedModelId === model.id && (
                                                    <div className="w-1.5 h-1.5 bg-clay-500 rounded-full"></div>
                                                )}
                                            </button>
                                            <Link
                                                href={route('products.index')}
                                                className="shrink-0 text-[9px] font-bold text-clay-600 hover:underline flex items-center gap-0.5 uppercase tracking-wide"
                                            >
                                                Products Module <Package size={10} />
                                            </Link>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 rotate-12">
                                            <Cuboid size={32} className="text-gray-300" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">No 3D models found</p>
                                        <p className="text-[10px] text-gray-400 mt-1 max-w-[150px] leading-relaxed">
                                            Upload .glb or .gltf files to showcase your products in 3D
                                        </p>
                                        <button
                                            onClick={() => canEditThreeD && setShowUploadModal(true)}
                                            disabled={!canEditThreeD}
                                            className="mt-4 px-4 py-2 bg-clay-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-clay-200 hover:bg-clay-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Upload Asset
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    </div>
                </main>

            <Modal show={showUploadModal} onClose={closeUploadModal} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Upload 3D Model</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Attach a .glb or .gltf file to one of your products</p>
                        </div>
                        <button onClick={closeUploadModal} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleUpload} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Product</label>
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
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">3D Model File (.glb or .gltf)</label>
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
                                                <ThreeDModelBoundary
                                                    resetKey={previewUrl || 'preview'}
                                                    fallback={() => (
                                                        <ThreeDModelUnavailable
                                                            compact
                                                            title="Preview unavailable"
                                                            description="This file could not be previewed locally."
                                                            className="h-full"
                                                        />
                                                    )}
                                                >
                                                    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 50 }}>
                                                        <Suspense fallback={null}>
                                                            <Stage environment="city" intensity={0.5}>
                                                                {previewUrl ? <GLTFModel url={previewUrl} scale={1.08} /> : null}
                                                            </Stage>
                                                        </Suspense>
                                                        <OrbitControls autoRotate autoRotateSpeed={2} enableZoom={true} />
                                                    </Canvas>
                                                </ThreeDModelBoundary>
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

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={closeUploadModal}
                                className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
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

            <Modal show={deleteCandidate !== null} onClose={() => setDeleteCandidate(null)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <AlertTriangle size={22} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Remove 3D model?</h2>
                    <p className="mt-2 text-sm text-gray-500">
                        This will remove the saved 3D model from the selected product.
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => setDeleteCandidate(null)}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!canEditThreeD) return;
                                router.delete(route('3d.destroy', deleteCandidate), {
                                    onSuccess: () => {
                                        setDeleteCandidate(null);
                                    },
                                });
                            }}
                            disabled={!canEditThreeD}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

ThreeDManager.layout = (page) => <SellerWorkspaceLayout active="3d">{page}</SellerWorkspaceLayout>;
