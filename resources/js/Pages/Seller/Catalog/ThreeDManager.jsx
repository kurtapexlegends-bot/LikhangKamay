import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import SellerHeader from '@/Layouts/SellerHeader';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import {
    UploadCloud, Cuboid, Rotate3d, Trash2, Search,
    Package, AlertTriangle
} from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import ThreeDCanvasViewer from '@/Components/Seller/Catalog/ThreeDCanvasViewer';
import ThreeDUploadModal from '@/Components/Seller/Catalog/ThreeDUploadModal';

export default function ThreeDManager({ auth, models = [], products = [], storage = { percent: 0, used: '0MB', max: '500MB' } }) {
    const [selectedModelId, setSelectedModelId] = useState(models[0]?.id ?? null);
    const [searchQuery, setSearchQuery] = useState('');
    const { openSidebar } = useSellerWorkspaceShell();
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [deleteCandidate, setDeleteCandidate] = useState(null);
    const { canEdit: canEditThreeD, isReadOnly: isThreeDReadOnly } = useSellerModuleAccess('3d');

    const filteredModels = useMemo(() => (
        models.filter((model) =>
            model.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    ), [models, searchQuery]);

    const selectedModel = useMemo(() => (
        filteredModels.find((model) => model.id === selectedModelId) || null
    ), [filteredModels, selectedModelId]);

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

    const handleDelete = (productId) => {
        if (!canEditThreeD) return;
        setDeleteCandidate(productId);
    };

    const handleDeleteConfirm = () => {
        if (!canEditThreeD) return;
        router.delete(route('3d.destroy', deleteCandidate), {
            onSuccess: () => {
                setDeleteCandidate(null);
            },
        });
    };

    return (
        <>
            <Head title="3D Asset Manager" />
            <SellerHeader
                title="3D Asset Manager"
                subtitle="Manage 3D models and augmented reality assets."
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
                    <div className="flex-1 bg-gradient-to-b from-stone-50 to-stone-100 rounded-3xl border border-stone-200 relative overflow-hidden shadow-inner flex flex-col group">
                        {selectedModel ? (
                            <div className="absolute top-4 left-4 z-10 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-600 flex items-center gap-2 shadow-sm">
                                <div className={`w-2 h-2 rounded-full ${selectedModel.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                                {selectedModel.name}
                            </div>
                        ) : (
                            <div className="absolute top-4 left-4 z-10 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-400 shadow-sm">
                                No Model Selected
                            </div>
                        )}

                        {selectedModel && (
                            <button
                                type="button"
                                onClick={() => handleDelete(selectedModel.id)}
                                disabled={!canEditThreeD}
                                className="absolute top-4 right-4 z-10 p-2 bg-white/70 backdrop-blur-md border border-stone-200 rounded-xl text-stone-600 hover:bg-rose-50 hover:text-rose-500 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                title="Delete Asset"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}

                        <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
                            <ThreeDCanvasViewer modelUrl={selectedModel?.url} />
                        </div>

                        <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                            <span className="inline-flex items-center gap-1.5 bg-black/50 text-white px-2.5 py-1 rounded-full text-[10px] font-medium">
                                <Rotate3d size={12} /> Drag to rotate
                            </span>
                        </div>
                    </div>

                    <div className="w-full lg:w-[320px] flex flex-col gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Storage</span>
                                <span className="text-[10px] font-black text-clay-600 uppercase tracking-widest">{storage.used} / {storage.max}</span>
                            </div>
                            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-clay-500 h-full rounded-full transition-all duration-500" style={{ width: `${storage.percent}%` }}></div>
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-2xl border border-stone-100 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-3 border-b border-stone-50 bg-stone-50/50">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        type="text"
                                        placeholder="Search assets..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-[10px] font-bold focus:ring-2 focus:ring-clay-100 focus:border-clay-300 transition-all shadow-sm placeholder:text-stone-300"
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
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${selectedModelId === model.id ? 'bg-white text-clay-600 shadow-sm' : 'bg-stone-100 text-stone-400 group-hover:bg-white group-hover:shadow-sm'}`}>
                                                    <Cuboid size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-xs font-bold truncate ${selectedModelId === model.id ? 'text-stone-900' : 'text-stone-700'}`}>{model.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] font-bold text-stone-400">{model.size || '0MB'}</span>
                                                        <span className="text-[9px] text-stone-300">&bull;</span>
                                                        <span className="text-[9px] font-bold text-stone-400">{model.date}</span>
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
                                    <WorkspaceEmptyState
                                        icon={Cuboid}
                                        title="No 3D models found"
                                        description="Upload .glb or .gltf files to showcase your products in 3D"
                                        actionLabel="Upload Asset"
                                        onAction={() => canEditThreeD && setShowUploadModal(true)}
                                        compact={true}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <ThreeDUploadModal
                show={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                products={products}
                canEditThreeD={canEditThreeD}
            />

            <Modal show={deleteCandidate !== null} onClose={() => setDeleteCandidate(null)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                        <AlertTriangle size={22} />
                    </div>
                    <h2 className="text-lg font-bold text-stone-900">Remove 3D model?</h2>
                    <p className="mt-2 text-sm text-stone-500 font-medium">
                        This will remove the saved 3D model from the selected product.
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => setDeleteCandidate(null)}
                            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteConfirm}
                            disabled={!canEditThreeD}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50"
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
