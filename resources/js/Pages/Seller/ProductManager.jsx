import React, { useState, useMemo, useEffect } from 'react';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import { useToast } from '@/Components/ToastContext';
import SellerSidebar from '@/Components/SellerSidebar';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import Checkbox from '@/Components/Checkbox';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import { 
    Package, Search, AlertCircle, Cuboid, 
    TrendingUp, X, Tag, Image as ImageIcon,
    AlertTriangle, ChevronUp, ChevronDown,
    User, LogOut, Menu, MoreVertical, RotateCcw,
    Check, CheckCircle, Plus, Edit3, RefreshCw, Archive, Crown
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';

const KPICard = ({ title, value, icon: Icon, color, bg }) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
        <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wide mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
        </div>
        <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center`}>
            <Icon size={20} />
        </div>
    </div>
);

// --- HELPER: SORTABLE HEADER ---
const SortableHeader = ({ label, sortKey, currentSort, onSort }) => {
    const isSorted = currentSort.key === sortKey;
    const isAsc = currentSort.direction === 'asc';
    
    return (
        <th 
            className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition group select-none" 
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-2 text-gray-600 font-bold text-xs uppercase tracking-wider">
                <span>{label}</span>
                <div className="flex flex-col -space-y-1.5">
                    <ChevronUp 
                        size={12} 
                        strokeWidth={4}
                        className={`transition-all ${isSorted && isAsc ? 'text-clay-600 opacity-100' : 'text-gray-300 opacity-50 group-hover:opacity-100'}`} 
                    />
                    <ChevronDown 
                        size={12} 
                        strokeWidth={4}
                        className={`transition-all ${isSorted && !isAsc ? 'text-clay-600 opacity-100' : 'text-gray-300 opacity-50 group-hover:opacity-100'}`} 
                    />
                </div>
            </div>
        </th>
    );
};

const STANDARD_PRODUCT_CATEGORIES = [
    'Tableware',
    'Drinkware',
    'Vases & Jars',
    'Planters & Pots',
    'Home Decor',
    'Kitchenware',
    'Artisan Sets',
];

export default function ProductManager({ auth, products: dbProducts = [], categories: serverCategories = [], subscription }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [products, setProducts] = useState(dbProducts);
    useEffect(() => { setProducts(dbProducts); }, [dbProducts]);

    const categories = useMemo(() => (
        Array.isArray(serverCategories) && serverCategories.length > 0
            ? serverCategories
            : STANDARD_PRODUCT_CATEGORIES
    ), [serverCategories]);
    const defaultCategory = categories[0] || STANDARD_PRODUCT_CATEGORIES[0];

    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    const { addToast } = useToast();

    // --- FLASH MESSAGE HANDLING ---
    const { flash } = usePage().props;

    useEffect(() => {
        if (flash.success) {
            addToast(flash.success, 'success');
        }
        if (flash.error) {
            addToast(flash.error, 'error');
        }
    }, [flash]);

    // --- MODAL STATES ---
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [restockAmount, setRestockAmount] = useState('');
    const [activeFormTab, setActiveFormTab] = useState('Essentials');

    // --- FORM SETUP ---
    const { data, setData, post, processing, errors, reset, clearErrors, hasErrors } = useForm({
        id: null,
        sku: '',
        name: '',
        description: '',
        category: defaultCategory,
        clay_type: 'Stoneware',
        glaze_type: 'Matte',
        firing_method: 'Electric Kiln',
        food_safe: true,
        colors: [],
        colorInput: '',
        height: '',
        width: '',
        weight: '',
        price: '',
        cost_price: '',
        stock: '',
        lead_time: 3,
        status: 'Active',
        cover_photo: null,
        gallery: [],
        model_3d: null,
    });

    // Deduction Form (Phase 1)
    const [deductModalOpen, setDeductModalOpen] = useState(false);
    const deductForm = useForm({
        quantity: '',
        reason: 'Physical Store Sale',
    });

    const [previews, setPreviews] = useState({ cover: null, gallery: [] });

    // --- SORT LOGIC ---
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processedProducts = useMemo(() => {
        let result = [...products];

        // 1. Filter
        if (activeTab !== 'All') {
            if (activeTab === 'Low Stock') result = result.filter(p => p.stock < 10 && p.status !== 'Archived');
            else result = result.filter(p => p.status === activeTab);
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(lowerQuery) || 
                p.category.toLowerCase().includes(lowerQuery) ||
                p.sku.toLowerCase().includes(lowerQuery)
            );
        }

        // 2. Sort
        if (sortConfig.key) {
            result.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                
                if (['price', 'stock', 'sold'].includes(sortConfig.key)) {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [products, activeTab, searchQuery, sortConfig]);

    // --- HANDLERS ---
    const generateSKU = () => 'LK-' + Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');

    const openAddModal = () => {
        setSelectedProduct(null);
        reset(); 
        clearErrors();
        setActiveFormTab('Essentials');
        setPreviews({ cover: null, gallery: [] });
        setData({
            ...data,
            id: null,
            sku: generateSKU(),
            cost_price: '',
            category: defaultCategory,
            clay_type: 'Stoneware',
            glaze_type: 'Matte',
            firing_method: 'Electric Kiln',
            status: 'Active',
            lead_time: 3,
            colors: [],
            retained_gallery: [],
            gallery: [],
            track_as_supply: false,
        });
        setProductModalOpen(true);
    };

    const openEditModal = (product) => {
        setSelectedProduct(product);
        clearErrors();
        setActiveFormTab('Essentials');
        setData({
            ...product,
            category: categories.includes(product.category) ? product.category : defaultCategory,
            cost_price: product.cost_price || '',
            colorInput: '',
            description: product.description || '',
            colors: product.colors || [],
            retained_gallery: product.gallery_paths || [],
            cover_photo: null, 
            gallery: [],
            model_3d: null,
            track_as_supply: product.track_as_supply || false,
        });
        setPreviews({
            cover: product.img, 
            gallery: product.gallery_paths ? product.gallery_paths.map(path => `/storage/${path}`) : [] 
        });
        setProductModalOpen(true);
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (field === 'gallery') {
            const files = Array.from(e.target.files);
            // Append new files instead of replacing
            setData('gallery', [...(data.gallery || []), ...files]);
            // Append previews (can be blob URLs or existing string paths)
            setPreviews(prev => ({ 
                ...prev, 
                gallery: [...(prev.gallery || []), ...files.map(f => URL.createObjectURL(f))] 
            }));
        } else if (field === 'cover_photo') {
            setData('cover_photo', file);
            setPreviews(prev => ({ ...prev, cover: file ? URL.createObjectURL(file) : null }));
        } else {
            setData(field, file);
        }
    };

    const handleRemoveGalleryImage = (indexToRemove) => {
        const retainedCount = (data.retained_gallery || []).length;
        
        if (indexToRemove < retainedCount) {
            // Remove from existing/retained images
            const updatedRetained = [...data.retained_gallery];
            updatedRetained.splice(indexToRemove, 1);
            setData('retained_gallery', updatedRetained);
        } else {
            // Remove from newly uploaded files
            const newFileIndex = indexToRemove - retainedCount;
            const updatedFiles = [...(data.gallery || [])];
            updatedFiles.splice(newFileIndex, 1);
            setData('gallery', updatedFiles);
        }

        // Remove from previews
        setPreviews(prev => {
            const updatedPreviews = [...prev.gallery];
            updatedPreviews.splice(indexToRemove, 1);
            return { ...prev, gallery: updatedPreviews };
        });
    };

    const handleColorAdd = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            if (data.colorInput && data.colorInput.trim()) {
                const newColor = data.colorInput.trim();
                if (!data.colors.includes(newColor)) {
                    setData({
                        ...data,
                        colors: [...data.colors, newColor],
                        colorInput: '' 
                    });
                }
            }
        }
    };

    const removeColor = (colorToRemove) => {
        setData('colors', data.colors.filter(c => c !== colorToRemove));
    };

    // --- SUBMIT LOGIC ---
    const submitProduct = (e) => {
        e.preventDefault();
        
        // Frontend Limit Check
        const isAddingNewActive = !data.id && data.status === 'Active';
        const isActivatingExisting = data.id && selectedProduct?.status !== 'Active' && data.status === 'Active';

        if ((isAddingNewActive || isActivatingExisting) && subscription?.activeCount >= subscription?.limit) {
            setLimitModalOpen(true);
            return;
        }

        const options = {
            onSuccess: () => {
                setProductModalOpen(false);
                reset();
                addToast('Product saved successfully', 'success');
            },
            onError: (err) => {
                console.error("Validation Failed:", err);
                if (err.limit) {
                    setLimitModalOpen(true);
                } else {
                    addToast('Failed to save product. Please check the form for errors.', 'error');
                }
                // Auto-switch to tab with error
                const essentialsKeys = ['name', 'category', 'price', 'stock'];
                const detailsKeys = ['clay_type', 'glaze_type', 'colors'];
                const mediaKeys = ['cover_photo', 'model_3d'];

                if (essentialsKeys.some(k => err[k])) setActiveFormTab('Essentials');
                else if (detailsKeys.some(k => err[k])) setActiveFormTab('Details');
                else if (mediaKeys.some(k => err[k])) setActiveFormTab('Media');
            },
            forceFormData: true,
        };

        if (data.id) {
            post(route('products.update', data.id), options);
        } else {
            post(route('products.store'), options);
        }
    };

    const confirmRestock = () => { 
        if (restockAmount > 0) {
            router.post(route('products.restock', selectedProduct.id), { amount: restockAmount }, { 
                onSuccess: () => {
                    setRestockModalOpen(false);
                    addToast(`Successfully restocked ${selectedProduct.name}`, 'success');
                } 
            }); 
        }
    };
    
    const confirmArchive = () => { 
        if (selectedProduct.status === 'Archived') {
            if (subscription?.activeCount >= subscription?.limit) {
                setArchiveModalOpen(false);
                setLimitModalOpen(true);
                return;
            }
            router.post(route('products.activate', selectedProduct.id), {}, { 
                onSuccess: () => {
                    setArchiveModalOpen(false);
                    addToast(`Activated ${selectedProduct.name}`, 'success');
                } 
            });
        } else {
            router.post(route('products.archive', selectedProduct.id), {}, { 
                onSuccess: () => {
                    setArchiveModalOpen(false);
                    addToast(`Archived ${selectedProduct.name}`, 'success');
                }
            }); 
        }
    };
    
    const openRestockModal = (p) => { setSelectedProduct(p); setRestockAmount(''); setRestockModalOpen(true); };
    const openArchiveModal = (p) => { setSelectedProduct(p); setArchiveModalOpen(true); };
    
    // Phase 1: Open Deduct Modal
    const openDeductModal = (p) => {
        setSelectedProduct(p);
        deductForm.reset();
        setDeductModalOpen(true);
    };

    const handleDeduct = (e) => {
        e.preventDefault();
        deductForm.post(route('products.deduct', selectedProduct.id), {
            onSuccess: () => {
                setDeductModalOpen(false);
                deductForm.reset();
                addToast('Stock manually deducted successfully', 'success');
            },
            onError: (err) => {
                console.error("Deduction Failed:", err);
                addToast('Failed to deduct stock', 'error');
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Product Manager" />
            
            <SellerSidebar active="products" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                
                {/* --- HEADER (UPDATED TO CLASSIC STYLE) --- */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40">
                    <div className="flex min-w-0 items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg sm:text-xl font-bold text-gray-900">Products</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Manage your inventory</p>
                        </div>
                    </div>

                                        
                    <div className="flex items-center gap-2 sm:gap-6">
                        {/* 1. Actions */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button 
                                onClick={openAddModal} 
                                className="flex items-center gap-2 bg-clay-600 hover:bg-clay-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-clay-500/20 transition-all hover:scale-105 active:scale-95"
                            >
                                <Plus size={16} /><span className="hidden sm:inline">Add Product</span>
                            </button>

                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block h-8 w-px bg-gray-200"></div>

                        {/* 2. Profile Dropdown */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-2 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <div className="hidden lg:block">
                                                <WorkspaceAccountSummary user={auth.user} />
                                            </div>
                                            <UserAvatar user={auth.user} />
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <LogOut size={16} /> Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* METRICS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        <KPICard title="Total Products" value={products.length} icon={Package} color="text-blue-600" bg="bg-blue-50" />
                        <KPICard title="Total Sold Units" value={products.reduce((acc, curr) => acc + (parseInt(curr.sold) || 0), 0)} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
                        <KPICard title="Low Stock Alerts" value={products.filter(p => p.stock < 10).length} icon={AlertCircle} color="text-red-600" bg="bg-red-50" />
                    </div>

                    {/* TABLE AREA */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[500px]">
                        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg w-full overflow-x-auto sm:w-fit">
                                {['All', 'Active', 'Draft', 'Archived', 'Low Stock'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); setSortConfig({ key: 'name', direction: 'asc' }); }}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${activeTab === tab ? 'bg-white text-clay-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="relative flex-1 sm:w-64">
                                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-6 py-2 bg-gray-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-clay-500/20 w-full" />
                                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                            </div>
                        </div>

                        {/* --- DESKTOP TABLE --- */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full min-w-[900px] text-left">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <SortableHeader label="Product" sortKey="name" currentSort={sortConfig} onSort={requestSort} />
                                        <SortableHeader label="Price" sortKey="price" currentSort={sortConfig} onSort={requestSort} />
                                        <SortableHeader label="Stock" sortKey="stock" currentSort={sortConfig} onSort={requestSort} />
                                        <SortableHeader label="Sold" sortKey="sold" currentSort={sortConfig} onSort={requestSort} />
                                        
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {processedProducts.length > 0 ? (
                                        processedProducts.map((product) => (
                                            <tr key={product.id} className="hover:bg-gray-50/50 transition">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <img src={product.img || '/images/no-image.png'} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200" />
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm">{product.name}</p>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <Tag size={10} className="text-gray-400" />
                                                                <p className="text-[10px] text-gray-400 font-mono tracking-wide">{product.sku}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 font-bold text-gray-700 text-sm">₱{product.price}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${product.stock < 10 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                                            {product.stock} units
                                                        </span>
                                                        {product.stock < 10 && <AlertCircle size={12} className="text-red-500" />}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-sm font-medium text-gray-600">{product.sold}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-col items-start gap-1">
                                                        {product.stock < 10 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-wide">Low Stock</span>}
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${product.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : product.status === 'Archived' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>{product.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button onClick={() => openRestockModal(product)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition" title="Restock"><RefreshCw size={14} /></button>
                                                        <button onClick={() => openDeductModal(product)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md transition" title="Manual Deduct"><TrendingUp size={14} className="rotate-180" /></button>
                                                        <button onClick={() => openEditModal(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition" title="Edit"><Edit3 size={14} /></button>
                                                        {product.status === 'Archived' ? (
                                                            <button onClick={() => openArchiveModal(product)} className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition" title="Unarchive"><RotateCcw size={14} /></button>
                                                        ) : (
                                                            <button onClick={() => openArchiveModal(product)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition" title="Archive"><Archive size={14} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center">
                                                    <Package size={48} className="mb-3 opacity-50" />
                                                    <p>No products found.</p>
                                                    <button onClick={openAddModal} className="mt-2 text-clay-600 font-bold hover:underline">Create your first product</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* --- MOBILE CARD VIEW --- */}
                        <div className="md:hidden divide-y divide-gray-100">
                             {processedProducts.length > 0 ? (
                                processedProducts.map((product) => (
                                    <div key={product.id} className="p-4 flex gap-4">
                                        <img src={product.img || '/images/no-image.png'} alt={product.name} className="w-20 h-20 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-sm truncate pr-2">{product.name}</h3>
                                                    <p className="text-[10px] text-gray-400 font-mono tracking-wide">{product.sku}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${product.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : product.status === 'Archived' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                                    {product.status}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center justify-between mt-3">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-bold text-gray-900">₱{product.price}</span>
                                                    <span className="text-xs text-gray-500">Sold: {product.sold}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-1">
                                                     <div className="text-xs text-gray-500 mr-2">Stock: {product.stock}</div>
                                                     <button onClick={() => openEditModal(product)} className="p-1.5 text-blue-600 bg-blue-50 rounded-lg"><Edit3 size={14} /></button>
                                                </div>
                                            </div>
                                            
                                            {product.stock < 10 && (
                                                <div className="flex items-center gap-1 mt-2 text-red-600 text-[10px] font-bold">
                                                    <AlertCircle size={10} /> Low Stock
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                             ) : (
                                <div className="py-12 text-center text-gray-400">
                                    <Package size={40} className="mb-2 opacity-50 mx-auto" />
                                    <p className="text-sm">No products found.</p>
                                </div>
                             )}
                        </div>
                    </div>
                </main>
            </div>

            {/* --- DEDUCTION MODAL (Phase 1) --- */}
            <Modal show={deductModalOpen} onClose={() => setDeductModalOpen(false)} maxWidth="sm">
                <form onSubmit={handleDeduct} className="p-5 sm:p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Update Stock (Deduct)</h2>
                        <button type="button" onClick={() => setDeductModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-4">
                        Manually remove items from inventory (e.g., physical store sales, breakage).
                    </p>

                    <div className="space-y-4">
                        <div>
                            <InputLabel value="Quantity to Remove" />
                            <TextInput 
                                type="number" 
                                className="w-full mt-1" 
                                value={deductForm.data.quantity} 
                                onChange={e => deductForm.setData('quantity', e.target.value)}
                                autoFocus
                                min="1"
                                max={selectedProduct?.stock}
                            />
                            <InputError message={deductForm.errors.quantity} className="mt-2" />
                        </div>
                        
                        <div>
                            <InputLabel value="Reason" />
                            <select 
                                className="w-full mt-1 border-gray-300 rounded-xl shadow-sm focus:border-clay-500 focus:ring-clay-500"
                                value={deductForm.data.reason}
                                onChange={e => deductForm.setData('reason', e.target.value)}
                            >
                                <option value="Physical Store Sale">Physical Store Sale</option>
                                <option value="Damaged/Breakage">Damaged / Breakage</option>
                                <option value="Lost/Stolen">Lost / Stolen</option>
                                <option value="Other">Other</option>
                            </select>
                            <InputError message={deductForm.errors.reason} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={() => setDeductModalOpen(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition">Cancel</button>
                        <PrimaryButton disabled={deductForm.processing} className="bg-orange-600 hover:bg-orange-700">
                            Confirm Deduction
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* --- ADD/EDIT MODAL --- */}
            <Modal show={productModalOpen} onClose={() => setProductModalOpen(false)} maxWidth="2xl">
                <form onSubmit={submitProduct} className="p-5 sm:p-6 max-h-[82dvh] sm:max-h-[85vh] overflow-y-auto">
                    
                    {/* --- TABBED FORM HEADER --- */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-gray-900">{data.id ? 'Edit Product' : 'New Product'}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">SKU:</span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 font-mono text-xs rounded border border-gray-200">{data.sku}</span>
                            </div>
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            {['Essentials', 'Details', 'Media'].map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveFormTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeFormTab === tab ? 'bg-white text-clay-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="min-h-[400px]">
                        {/* TAB 1: ESSENTIALS */}
                        {activeFormTab === 'Essentials' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <InputLabel value="Product Name *" />
                                        <TextInput 
                                            className="w-full mt-1 font-bold text-lg" 
                                            value={data.name} 
                                            onChange={(e) => setData('name', e.target.value)} 
                                            placeholder="e.g. Handcrafted Stoneware Vase"
                                            autoFocus
                                        />
                                        <InputError message={errors.name} className="mt-2" />
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <InputLabel value="Description" />
                                        <textarea 
                                            className="w-full mt-1 border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm text-sm" 
                                            rows="4" 
                                            value={data.description} 
                                            onChange={(e) => setData('description', e.target.value)} 
                                            placeholder="Describe the texture, story, and details..."
                                        />
                                    </div>

                                    <div>
                                        <InputLabel value="Category *" />
                                        <select 
                                            className="w-full mt-1 border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm" 
                                            value={data.category} 
                                            onChange={(e) => setData('category', e.target.value)}
                                        >
                                            <option value="" disabled>Select Category</option>
                                            {categories.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <InputError message={errors.category} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel value="Status" />
                                        <select 
                                            className="w-full mt-1 border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm" 
                                            value={data.status} 
                                            onChange={(e) => setData('status', e.target.value)}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Draft">Draft</option>
                                            <option value="Archived">Archived</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2 border-t border-gray-100 pt-6 mt-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inventory & Pricing</h3>
                                            

                                        </div>

                                        <div className="grid grid-cols-3 gap-5">
                                            <div>
                                                <InputLabel value="Price (₱) *" />
                                                <div className="relative mt-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                                                    <TextInput 
                                                        type="number" 
                                                        className="w-full pl-7" 
                                                        value={data.price} 
                                                        onChange={(e) => setData('price', e.target.value)} 
                                                    />
                                                </div>
                                                <InputError message={errors.price} className="mt-2" />
                                            </div>
                                            <div>
                                                <InputLabel value="Cost Price (₱)" />
                                                <div className="relative mt-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                                                    <TextInput 
                                                        type="number" 
                                                        className="w-full pl-7 bg-gray-50 border-gray-200" 
                                                        value={data.cost_price} 
                                                        onChange={(e) => setData('cost_price', e.target.value)} 
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1">Private. For profit calculation.</p>
                                            </div>
                                            <div>
                                                <InputLabel value="Stock *" />
                                                <TextInput type="number" className="w-full mt-1" value={data.stock} onChange={(e) => setData('stock', e.target.value)} />
                                                <InputError message={errors.stock} className="mt-2" />
                                            </div>
                                            <div>
                                                <InputLabel value="Lead Time (Days)" />
                                                <TextInput type="number" className="w-full mt-1" value={data.lead_time} onChange={(e) => setData('lead_time', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: DETAILS */}
                        {activeFormTab === 'Details' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <InputLabel value="Clay Type" />
                                        <select className="w-full mt-1 border-gray-300 rounded-xl shadow-sm text-sm" value={data.clay_type} onChange={(e) => setData('clay_type', e.target.value)}>
                                            {['Earthenware', 'Stoneware', 'Porcelain'].map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <InputLabel value="Firing Method" />
                                        <select className="w-full mt-1 border-gray-300 rounded-xl shadow-sm text-sm" value={data.firing_method} onChange={(e) => setData('firing_method', e.target.value)}>
                                            {['Electric Kiln', 'Wood-fired', 'Gas Kiln', 'Raku'].map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <InputLabel value="Glaze Type" />
                                        <select className="w-full mt-1 border-gray-300 rounded-xl shadow-sm text-sm" value={data.glaze_type} onChange={(e) => setData('glaze_type', e.target.value)}>
                                            {['Matte', 'Glossy', 'Satin', 'Crackle', 'Unglazes'].map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="flex items-center pt-6">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <Checkbox name="food_safe" checked={data.food_safe} onChange={(e) => setData('food_safe', e.target.checked)} />
                                            <div>
                                                <span className="text-sm font-bold text-gray-700 group-hover:text-clay-600 transition">Food Safe</span>
                                                <p className="text-xs text-gray-500">Safe for eating / Lead-free</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <InputLabel value="Available Colors" />
                                    <div className="mt-2 flex flex-wrap gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50/50">
                                        {data.colors.map((color, idx) => (
                                            <span key={idx} className="flex items-center gap-1.5 bg-white text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 shadow-sm">
                                                <div className="w-2 h-2 rounded-full bg-clay-400"></div>
                                                {color}
                                                <button type="button" onClick={() => removeColor(color)} className="text-gray-400 hover:text-red-500 ml-1"><X size={12}/></button>
                                            </span>
                                        ))}
                                        <input 
                                            type="text" 
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-1 min-w-[150px] placeholder-gray-400" 
                                            placeholder="Type color & press Enter..." 
                                            value={data.colorInput} 
                                            onChange={(e) => setData('colorInput', e.target.value)} 
                                            onKeyDown={handleColorAdd}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Dimensions</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div><InputLabel value="Height (cm)" /><TextInput type="number" className="w-full mt-1" value={data.height} onChange={(e) => setData('height', e.target.value)} /></div>
                                        <div><InputLabel value="Width (cm)" /><TextInput type="number" className="w-full mt-1" value={data.width} onChange={(e) => setData('width', e.target.value)} /></div>
                                        <div><InputLabel value="Weight (g)" /><TextInput type="number" className="w-full mt-1" value={data.weight} onChange={(e) => setData('weight', e.target.value)} /></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: MEDIA */}
                        {activeFormTab === 'Media' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 flex gap-3">
                                    <ImageIcon className="text-blue-500 shrink-0" size={20} />
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        High-quality photos significantly increase sales. We recommend using natural lighting and a neutral background.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Cover Photo */}
                                    <div>
                                        <InputLabel value="Cover Photo (Main)" className="mb-2" />
                                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-clay-400 transition group bg-gray-50">
                                            {previews.cover ? (
                                                <>
                                                    <img src={previews.cover} alt="Cover" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => { setData('cover_photo', null); setPreviews(prev => ({ ...prev, cover: null })) }} 
                                                            className="bg-white text-red-600 px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-red-50 transition"
                                                        >
                                                            Remove Photo
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                                                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                                                        <Plus className="text-clay-600" />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-600">Upload Cover</span>
                                                    <span className="text-[10px] text-gray-400 mt-1">JPG/PNG, Max 5MB</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'cover_photo')} />
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
                                                <span className={`text-[10px] font-bold ${previews.gallery.length < 3 ? 'text-orange-500' : previews.gallery.length > 5 ? 'text-red-500' : 'text-green-600'}`}>
                                                    {previews.gallery.length < 3 
                                                        ? `Add ${3 - previews.gallery.length} more (Min 3)`
                                                        : previews.gallery.length > 5 
                                                        ? `Exceeds max (Max 5)`
                                                        : 'Perfect (3-5 images)'}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2">
                                                {previews.gallery.map((preview, idx) => (
                                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                                        <img src={preview} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleRemoveGalleryImage(idx)}
                                                                className="w-8 h-8 flex items-center justify-center bg-white text-red-600 rounded-full shadow-lg hover:bg-red-50 transition drop-shadow"
                                                                title="Remove image"
                                                            >
                                                                <X size={16} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                {previews.gallery.length < 5 && (
                                                    <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-clay-400 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                                                        <Plus size={20} className="text-gray-400 mb-1" />
                                                        <span className="text-[10px] font-bold text-gray-500">Add</span>
                                                        <input type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'gallery')} />
                                                    </label>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2 text-right">{previews.gallery.length} images selected</p>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100">
                                            <InputLabel value="3D Model *" className="mb-2" />
                                            
                                            {/* Case 1: New File Selected */}
                                            {data.model_3d ? (
                                                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-lg text-green-600 shadow-sm"><Check size={16} /></div>
                                                        <div>
                                                            <p className="text-sm font-bold text-green-800 truncate max-w-[150px]">{data.model_3d.name}</p>
                                                            <p className="text-[10px] text-green-600">New file selected</p>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => setData('model_3d', null)} className="text-green-600 hover:text-green-800"><X size={16}/></button>
                                                </div>
                                            ) : (
                                                // Case 2: Existing Model (Edit Mode)
                                                data.model_3d_path ? (
                                                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><Cuboid size={16} /></div>
                                                            <div>
                                                                <p className="text-sm font-bold text-blue-800">Current Model Active</p>
                                                                <p className="text-[10px] text-blue-600">You can keep this or upload a new one.</p>
                                                            </div>
                                                        </div>
                                                        <label className="cursor-pointer text-xs font-bold text-blue-600 hover:underline">
                                                            Replace
                                                            <input type="file" className="hidden" accept=".glb,.gltf" onChange={(e) => handleFileChange(e, 'model_3d')} />
                                                        </label>
                                                    </div>
                                                ) : (
                                                    // Case 3: No Model (Show Upload)
                                                    <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-clay-400 hover:bg-gray-50 transition group">
                                                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white group-hover:shadow-sm transition"><Cuboid size={20} className="text-gray-400 group-hover:text-clay-600" /></div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-gray-700">Upload .glb / .gltf</p>
                                                            <p className="text-[10px] text-gray-400 group-hover:text-clay-500">Required. Bring your product to life in 3D.</p>
                                                        </div>
                                                        <input type="file" className="hidden" accept=".glb,.gltf" onChange={(e) => handleFileChange(e, 'model_3d')} />
                                                    </label>
                                                )
                                            )}
                                            <InputError message={errors.model_3d} className="mt-2" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setProductModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-sm px-2">Cancel</button>
                        
                        <div className="flex gap-3">
                            {activeFormTab !== 'Essentials' && (
                                <button 
                                    type="button" 
                                    onClick={() => setActiveFormTab(activeFormTab === 'Media' ? 'Details' : 'Essentials')}
                                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Previous
                                </button>
                            )}
                            
                            {activeFormTab === 'Media' ? (
                                <PrimaryButton type="submit" className="px-8 py-2.5 rounded-xl shadow-lg shadow-clay-500/20" disabled={processing}>
                                    {processing ? 'Saving...' : (data.id ? 'Save Changes' : 'Publish Product')}
                                </PrimaryButton>
                            ) : (
                                <button 
                                    type="button" 
                                    onClick={() => setActiveFormTab(activeFormTab === 'Essentials' ? 'Details' : 'Media')}
                                    className="px-6 py-2.5 bg-clay-600 text-white rounded-xl text-sm font-bold hover:bg-clay-700 transition shadow-lg shadow-clay-500/20"
                                >
                                    Next Step
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>
            
            {/* RESTOCK & ARCHIVE MODALS */}
            <Modal show={restockModalOpen} onClose={() => setRestockModalOpen(false)} maxWidth="sm">
                <div className="p-5 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Restock {selectedProduct?.name}</h2>
                    <div className="mb-6"><InputLabel value="Quantity to Add" /><TextInput type="number" className="w-full mt-1" value={restockAmount} onChange={(e) => setRestockAmount(e.target.value)} autoFocus /></div>
                    <div className="flex justify-end gap-3"><button onClick={() => setRestockModalOpen(false)} className="text-gray-500 font-bold text-sm">Cancel</button><PrimaryButton onClick={confirmRestock}>Confirm</PrimaryButton></div>
                </div>
            </Modal>
            <Modal show={archiveModalOpen} onClose={() => setArchiveModalOpen(false)} maxWidth="sm">
                <div className="p-5 sm:p-6 text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${selectedProduct?.status === 'Archived' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                        {selectedProduct?.status === 'Archived' ? <RotateCcw size={24} /> : <Archive size={24} />}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">
                        {selectedProduct?.status === 'Archived' ? 'Unarchive Product?' : 'Archive Product?'}
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        {selectedProduct?.status === 'Archived' 
                            ? 'This will make the product visible in your dashboard again.' 
                            : 'This will hide the product from your shop. You can unarchive it later.'}
                    </p>
                    <div className="flex justify-center gap-3">
                        <button onClick={() => setArchiveModalOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-bold">Cancel</button>
                        <button 
                            onClick={confirmArchive} 
                            className={`px-4 py-2 text-white rounded-lg text-sm font-bold ${selectedProduct?.status === 'Archived' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {selectedProduct?.status === 'Archived' ? 'Yes, Unarchive' : 'Yes, Archive'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* LIMIT INTERCEPT MODAL */}
            <Modal show={limitModalOpen} onClose={() => setLimitModalOpen(false)} maxWidth="sm">
                <div className="p-5 sm:p-6 text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-50 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-200 to-transparent opacity-50"></div>
                        <Crown size={28} className="text-amber-500 relative z-10" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Upgrade to Add More</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        You have reached your {subscription?.plan === 'free' ? 'Standard' : 'Premium'} plan limit of <span className="font-bold text-gray-900">{subscription?.limit} active products</span>. Upgrade your plan to activate more products and boost your sales!
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link 
                            href={route('seller.subscription')}
                            className="w-full inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-stone-900 to-clay-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 hover:scale-[1.02] transition-transform"
                        >
                            View Subscription Plans
                        </Link>
                        <button 
                            type="button" 
                            onClick={() => {
                                setLimitModalOpen(false);
                                setData('status', 'Draft');
                            }} 
                            className="w-full px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Save as Draft for Now
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}

