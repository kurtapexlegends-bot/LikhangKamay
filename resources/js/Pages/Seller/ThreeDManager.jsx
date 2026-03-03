import React, { useState, Suspense } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Canvas } from '@react-three/fiber';
import SellerSidebar from '@/Components/SellerSidebar';
import { OrbitControls, Stage, PresentationControls, Float, useGLTF, Html, useProgress } from '@react-three/drei';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import Modal from '@/Components/Modal';
import { 
    LayoutDashboard, Package, ShoppingBag, BarChart3, Box, 
    UploadCloud, MoreVertical, Scan, Smartphone, Cuboid,
    Move3d, Sun, Eye, Trash2, Search,
    ChevronDown, User, LogOut, X, Check, Menu
} from 'lucide-react';

// --- LOADING INDICATOR ---
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

// --- GLTF MODEL LOADER ---
function GLTFModel({ url, scale = 1, ...props }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene.clone()} scale={scale} {...props} />;
}

// --- PLACEHOLDER MODEL (when no real model) ---
const DemoPottery = (props) => {
    return (
        <mesh {...props}>
            <torusKnotGeometry args={[1, 0.3, 100, 16]} />
            <meshStandardMaterial color="#c07251" roughness={0.3} metalness={0.1} />
        </mesh>
    );
};

export default function ThreeDManager({ auth, models = [], products = [], storage = { percent: 0, used: '0MB', max: '500MB' } }) {
    const [selectedModelIndex, setSelectedModelIndex] = useState(0);
    const [autoRotate, setAutoRotate] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Upload form
    const { data, setData, post, processing, reset, errors } = useForm({
        model: null,
        product_id: '',
    });

    // Safety check: ensure we have a valid selected model, or default to null
    const selectedModel = models.length > 0 ? models[selectedModelIndex] : null;

    // Filter Logic
    const filteredModels = models.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle upload
    const handleUpload = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('model', data.model);
        formData.append('product_id', data.product_id);
        
        router.post(route('3d.upload'), formData, {
            onSuccess: () => {
                reset();
                setShowUploadModal(false);
            },
        });
    };

    // Handle Drag & Drop
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
        if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
            setData('model', file);
            // Create preview URL
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            alert('Please upload a .glb or .gltf file');
        }
    };

    // Clean up preview URL when modal closes
    const closeUploadModal = () => {
        setShowUploadModal(false);
        setPreviewUrl(null);
        reset();
    };

    // Handle delete
    const handleDelete = (productId) => {
        if (confirm('Remove 3D model from this product?')) {
            router.delete(route('3d.destroy', productId));
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="3D Asset Manager" />
            <SellerSidebar active="3d" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                
                {/* --- HEADER (Standardized) --- */}
                <header className="h-[72px] bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-clay-600">
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">3D Asset Manager</h1>
                            <p className="text-[10px] text-gray-500 font-medium mt-0.5 hidden sm:block">Manage your digital twins & AR assets</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 border border-clay-200 bg-white text-clay-700 rounded-lg text-[10px] font-bold shadow-sm hover:bg-clay-50 transition transform active:scale-95 uppercase tracking-wide"
                            >
                                <UploadCloud size={14} /> Upload Model
                            </button>
                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-gray-200"></div>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-2 p-1 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs font-bold text-gray-900 leading-none">{auth.user.shop_name || auth.user.name}</p>
                                                <p className="text-[9px] text-gray-500 mt-0.5">Seller Account</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden">
                                                {auth.user.avatar ? (
                                                    <img 
                                                        src={auth.user.avatar.startsWith('http') || auth.user.avatar.startsWith('/storage') ? auth.user.avatar : `/storage/${auth.user.avatar}`} 
                                                        alt={auth.user.name} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (auth.user.shop_name || auth.user.name).charAt(0)
                                                )}
                                            </div>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2 text-xs">
                                        <User size={14} /> Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700 text-xs">
                                        <LogOut size={14} /> Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-5 overflow-hidden flex flex-col lg:flex-row gap-5 h-[calc(100vh-72px)]">
                    
                    {/* --- LEFT: THE STUDIO (3D Viewer) --- */}
                    <div className="flex-1 bg-gradient-to-b from-gray-50 to-gray-100 rounded-3xl border border-gray-200 relative overflow-hidden shadow-inner flex flex-col group">
                        
                        {/* Toolbar (Floating) */}
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white/90 backdrop-blur p-1.5 rounded-xl border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button 
                                onClick={() => setAutoRotate(!autoRotate)}
                                className={`p-2 rounded-lg transition ${autoRotate ? 'bg-clay-100 text-clay-700' : 'hover:bg-gray-100 text-gray-600'}`} 
                                title="Auto Rotate"
                            >
                                <Move3d size={18} />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Lighting">
                                <Sun size={18} />
                            </button>
                            <div className="w-6 h-px bg-gray-200 my-0.5 mx-auto"></div>
                            <button 
                                onClick={() => selectedModel && handleDelete(selectedModel.id)}
                                className="p-2 hover:bg-red-50 text-gray-600 hover:text-red-500 rounded-lg" 
                                title="Delete Asset"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        {/* Status Badge */}
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

                        {/* THE 3D CANVAS */}
                        <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
                            <Canvas dpr={[1, 2]} camera={{ fov: 45 }}>
                                <Suspense fallback={<Loader />}>
                                    <PresentationControls speed={1.5} global zoom={0.5} polar={[-0.1, Math.PI / 4]}>
                                        <Stage environment="city" intensity={0.6} contactShadow={false}>
                                            <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                                                {selectedModel?.url ? (
                                                    <GLTFModel url={selectedModel.url} scale={1} />
                                                ) : (
                                                    <DemoPottery scale={0.6} />
                                                )}
                                            </Float>
                                        </Stage>
                                    </PresentationControls>
                                    <OrbitControls autoRotate={autoRotate} autoRotateSpeed={1.5} enableZoom={true} />
                                </Suspense>
                            </Canvas>
                        </div>


                    </div>

                    {/* --- RIGHT: ASSET LIST & STATS --- */}
                    <div className="w-full lg:w-[320px] flex flex-col gap-4">
                        
                        {/* Storage Stat */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Storage</span>
                                <span className="text-[10px] font-bold text-clay-600">{storage.used} / {storage.max}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-clay-500 h-full rounded-full transition-all duration-500" style={{ width: `${storage.percent}%` }}></div>
                            </div>
                        </div>

                        {/* Asset Library List */}
                        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                            {/* Search Header */}
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

                            {/* List Items */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {filteredModels.length > 0 ? (
                                    filteredModels.map((model, idx) => {
                                        // Match the index in the original array to keep selection sync
                                        const originalIndex = models.indexOf(model); 
                                        return (
                                            <button 
                                                key={model.id || idx}
                                                onClick={() => setSelectedModelIndex(originalIndex)}
                                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition group ${
                                                    selectedModelIndex === originalIndex 
                                                    ? 'bg-clay-50 border border-clay-100 shadow-sm' 
                                                    : 'hover:bg-gray-50 border border-transparent'
                                                }`}
                                            >
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${selectedModelIndex === originalIndex ? 'bg-white text-clay-600 shadow-sm' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:shadow-sm'}`}>
                                                    <Cuboid size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-xs font-bold truncate ${selectedModelIndex === originalIndex ? 'text-gray-900' : 'text-gray-700'}`}>{model.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] text-gray-400">{model.size || '0MB'}</span>
                                                        <span className="text-[9px] text-gray-300">•</span>
                                                        <a 
                                                            href={route('product.show', model.product_id || 1)} 
                                                            target="_blank"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-[9px] font-bold text-clay-600 hover:underline flex items-center gap-0.5 uppercase tracking-wide"
                                                        >
                                                            Product Link <Move3d size={10} />
                                                        </a>
                                                    </div>
                                                </div>
                                                {selectedModelIndex === originalIndex && (
                                                    <div className="w-1.5 h-1.5 bg-clay-500 rounded-full"></div>
                                                )}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 rotate-12">
                                            <Cuboid size={32} className="text-gray-300" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">No 3D models found</p>
                                        <p className="text-[10px] text-gray-400 mt-1 max-w-[150px] leading-relaxed">
                                            Upload .GLB files to showcase your products in 3D
                                        </p>
                                        <button 
                                            onClick={() => setShowUploadModal(true)} 
                                            className="mt-4 px-4 py-2 bg-clay-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-clay-200 hover:bg-clay-700 transition"
                                        >
                                            Upload Asset
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>



                    </div>

                </main>
            </div>

            {/* UPLOAD MODAL */}
            <Modal show={showUploadModal} onClose={() => setShowUploadModal(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Upload 3D Model</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Attach a .GLB file to one of your products</p>
                        </div>
                        <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleUpload} className="space-y-4">
                        {/* Product Selection */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Product</label>
                            <select
                                value={data.product_id}
                                onChange={(e) => setData('product_id', e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clay-100 focus:border-clay-300"
                                required
                            >
                                <option value="">Choose a product...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {errors.product_id && <p className="text-xs text-red-500 mt-1">{errors.product_id}</p>}
                        </div>

                        {/* File Upload Area */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">3D Model File (.glb)</label>
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
                                    onChange={(e) => handleFileSelect(e.target.files[0])}
                                    className="hidden"
                                />
                                {data.model ? (
                                    <div className="flex flex-col items-center gap-4">
                                        {/* PREVIEW CANVAS */}
                                        <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden relative">
                                            <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
                                                <ambientLight intensity={0.5} />
                                                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                                                <Suspense fallback={null}>
                                                    <Stage intensity={0.5} environment="city">
                                                        {previewUrl && <GLTFModel url={previewUrl} />}
                                                    </Stage>
                                                </Suspense>
                                                <OrbitControls autoRotate />
                                            </Canvas>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setData('model', null);
                                                    setPreviewUrl(null);
                                                }}
                                                className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-red-50 hover:text-red-500 transition shadow-sm z-10"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>

                                        <div className="text-center">
                                            <p className="text-sm font-bold text-gray-900">{data.model.name}</p>
                                            <p className="text-xs text-gray-500">{(data.model.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                ) : (
                                    <label htmlFor="model-file-input" className="cursor-pointer block py-4">
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
                            {errors.model && <p className="text-xs text-red-500 mt-1">{errors.model}</p>}
                        </div>

                        {/* Actions */}
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
                                disabled={processing || !data.model || !data.product_id}
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
        </div>
    );
}