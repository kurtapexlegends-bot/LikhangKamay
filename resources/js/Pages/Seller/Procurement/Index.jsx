import React, { useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';

// Actually, looking at the code, there's no explicit toast import. I should check how notifications are handled or just use a simple alert/flash message display if no toast lib is installed.
// Based on typical Inertia setup, flash messages are passed as props.
// I will check if there is a Toast component or if I need to implement a simple useEffect for flash messages.
// For now, I'll stick to the Imports.
import SellerSidebar from '@/Components/SellerSidebar';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import Modal from '@/Components/Modal';
import { 
    Package, AlertTriangle, TrendingUp, Plus, Search, ChevronDown, 
    User, LogOut, Building2, Edit2, Trash2, RefreshCw, Box, Menu, 
    Banknote, Check, Wallet, Users, CheckCircle, AlertCircle, 
    FileText, Clock, X // Added X
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';

const CATEGORIES = ['Finished Goods', 'Tools', 'Packaging', 'Glazes', 'Other']; // Phase 1: Removed Raw Materials
const UNITS = ['pcs', 'kg', 'liters', 'bags', 'boxes', 'sets'];

export default function ProcurementIndex({ auth, supplies, requests, finances, totalItems, lowStockItems, totalValue, categories, initTab }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showRestockModal, setShowRestockModal] = useState(false);
    const [showConfirmRequest, setShowConfirmRequest] = useState(false);
    const [selectedSupply, setSelectedSupply] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [supplyToDelete, setSupplyToDelete] = useState(null);
    const [supplyToRequest, setSupplyToRequest] = useState(null);
    const [requestQuantity, setRequestQuantity] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    // --- FLASH MESSAGE HANDLING ---
    const { flash } = usePage().props;
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); // 'success' or 'error'

    React.useEffect(() => {
        if (flash.success) {
            setToastType('success');
            setToastMessage(flash.success);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
        if (flash.error) {
            setToastType('error');
            setToastMessage(flash.error);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
        }
    }, [flash]);

    // --- TABS & FINANCE STATE ---
    const [activeTab, setActiveTab] = useState(initTab || 'inventory');

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        const url = new URL(window.location);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url);
    };

    // Form for adding new supply
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        category: 'Finished Goods', // Phase 1: Default
        quantity: 0,
        unit: 'pcs',
        min_stock: 10,
        max_stock: 500, // Phase 1: Added max_stock
        unit_cost: '',
        supplier: '',
        notes: '',
    });

    // Restock form
    const restockForm = useForm({ quantity: 0 });

    // Filter supplies
    const filteredSupplies = supplies.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = filterCategory === 'all' || s.category === filterCategory;
        return matchSearch && matchCategory;
    });

    const handleAdd = (e) => {
        e.preventDefault();
        post(route('supplies.store'), {
            onSuccess: () => {
                reset();
                setShowAddModal(false);
            },
        });
    };

    const handleRestock = (e) => {
        e.preventDefault();
        restockForm.post(route('supplies.restock', selectedSupply.id), {
            onSuccess: () => {
                restockForm.reset();
                setShowRestockModal(false);
                setSelectedSupply(null);
            },
        });
    };

    const handleDelete = (supply) => {
        setSupplyToDelete(supply);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        router.delete(route('supplies.destroy', supplyToDelete.id), {
            onSuccess: () => {
                setShowDeleteModal(false);
                setSupplyToDelete(null);
            }
        });
    };

    const openRestockModal = (supply) => {
        setSelectedSupply(supply);
        setShowRestockModal(true);
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Inventory" />
            
            {/* SIDEBAR */}
            <SellerSidebar active="procurement" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* TOAST NOTIFICATION */}
            {showToast && (
                <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom duration-300 ${toastType === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                    {toastType === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    <p className="font-bold text-sm">{toastMessage}</p>
                    <button onClick={() => setShowToast(false)} className="ml-2 hover:opacity-80"><X size={16} /></button>
                </div>
            )}

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                
                {/* --- HEADER (Standardized) --- */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40">
                    <div className="flex min-w-0 items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-lg sm:text-xl font-bold text-gray-900">Inventory</h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-900 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                                    <Building2 size={10} className="text-blue-400" /> Enterprise
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">
                                Manage your inventory and supplies
                            </p>
                        </div>
                    </div>

                                        
                    <div className="flex items-center gap-2 sm:gap-6">
                        {/* Actions */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button 
                                onClick={() => setShowAddModal(true)} 
                                className="flex items-center gap-2 px-4 py-2 bg-clay-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-clay-200 hover:bg-clay-700 transition transform active:scale-95"
                            >
                                <Plus size={16} /> <span className="hidden sm:inline">Add Supply</span>
                            </button>
                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block h-8 w-px bg-gray-200"></div>

                        {/* Profile Dropdown */}
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
                                    <WorkspaceLogoutLink className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <LogOut size={16} /> Log Out
                                    </WorkspaceLogoutLink>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-6 space-y-6">
                    



                    {/* --- INVENTORY TAB --- */}
                    {activeTab === 'inventory' && (
                        <>
                    


                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Items</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</h3>
                            </div>
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <Box size={20} />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Low Stock Alerts</p>
                                <h3 className={`text-2xl font-bold mt-1 ${lowStockItems > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowStockItems}</h3>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${lowStockItems > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                <AlertTriangle size={20} />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Value</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">₱{parseFloat(totalValue).toLocaleString()}</h3>
                            </div>
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                    </div>

                    {/* SUPPLIES TABLE */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                        
                        {/* Table Header / Toolbar */}
                        <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-gray-900 text-sm">Supply Inventory</h3>
                                <select 
                                    value={filterCategory}
                                    onChange={e => setFilterCategory(e.target.value)}
                                    className="text-[10px] border-gray-200 rounded-lg focus:ring-clay-500 focus:border-clay-500 py-1"
                                >
                                    <option value="all">All Categories</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Search supplies..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-clay-500 focus:border-clay-500 transition-shadow"
                                />
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full min-w-[900px] text-left">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">Item Name</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Stock</th>
                                        <th className="px-4 py-3">Unit Cost</th>
                                        <th className="px-4 py-3">Supplier</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredSupplies.length > 0 ? (
                                        filteredSupplies.map((supply) => (
                                            <tr key={supply.id} className="hover:bg-gray-50/50 transition duration-150">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-clay-100 flex items-center justify-center text-clay-700 overflow-hidden border border-clay-200">
                                                            {supply.product && supply.product.img ? (
                                                                <img src={supply.product.img} alt={supply.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package size={14} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-xs">{supply.name}</p>
                                                            {supply.notes && <p className="text-[10px] text-gray-500">{supply.notes}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[10px] text-gray-600">{supply.category}</td>
                                                <td className="px-4 py-3 font-bold text-gray-900 text-xs">
                                                    {supply.quantity} {supply.unit}
                                                </td>
                                                <td className="px-4 py-3 text-[10px] text-gray-600">
                                                    {supply.unit_cost ? `₱${parseFloat(supply.unit_cost).toLocaleString()}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-[10px] text-gray-600">{supply.supplier || '-'}</td>
                                                <td className="px-4 py-3">
                                                    {supply.quantity <= supply.min_stock ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                            <AlertTriangle size={10} /> Low Stock
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                            In Stock
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openRestockModal(supply)}
                                                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                            title="Restock"
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSupplyToRequest(supply);
                                                                setRequestQuantity(supply.min_stock * 2);
                                                                setShowConfirmRequest(true);
                                                            }}
                                                            className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                                                            title="Request Restock"
                                                        >
                                                            <Banknote size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(supply)}
                                                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                                        <Package size={32} className="text-gray-300" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Supplies Found</h3>
                                                    <p className="text-sm text-gray-500 mb-6">Start by adding your first inventory item.</p>
                                                    <button onClick={() => setShowAddModal(true)} className="text-clay-600 font-bold hover:underline text-sm">Add New Supply</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    </>
                    )}



                </main>
            </div>




            {/* ADD SUPPLY MODAL */}
            <Modal show={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="md">
                <form onSubmit={handleAdd} className="p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-900">Add New Supply</h2>
                        <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 mb-1">Item Name</label>
                                <input 
                                    type="text" 
                                    className="w-full border-gray-300 rounded-lg text-xs py-1.5 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                    placeholder="e.g., Terracotta Clay"
                                    value={data.name} 
                                    onChange={e => setData('name', e.target.value)} 
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 mb-1">Category</label>
                                <select 
                                    className="w-full border-gray-300 rounded-lg text-xs py-1.5 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                    value={data.category} 
                                    onChange={e => setData('category', e.target.value)}
                                >
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 mb-1">Quantity</label>
                                <input 
                                    type="number" 
                                    className="w-full border-gray-300 rounded-lg text-xs py-1.5 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                    value={data.quantity} 
                                    onChange={e => setData('quantity', e.target.value)} 
                                    required 
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 mb-1">Unit</label>
                                <select 
                                    className="w-full border-gray-300 rounded-lg text-xs py-1.5 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                    value={data.unit} 
                                    onChange={e => setData('unit', e.target.value)}
                                >
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 mb-1">Unit Cost (₱)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full border-gray-300 rounded-lg text-xs py-1.5 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                    placeholder="0.00"
                                    value={data.unit_cost} 
                                    onChange={e => setData('unit_cost', e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 mb-1">Supplier</label>
                                <input 
                                    type="text" 
                                    className="w-full border-gray-300 rounded-lg text-xs py-1.5 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                                    placeholder="Supplier name"
                                    value={data.supplier} 
                                    onChange={e => setData('supplier', e.target.value)} 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-700 mb-1">Notes</label>
                            <textarea 
                                className="w-full border-gray-300 rounded-lg text-xs py-1.5 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition resize-none" 
                                rows={2}
                                placeholder="Optional notes..."
                                value={data.notes} 
                                onChange={e => setData('notes', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                        <button type="submit" disabled={processing} className="px-4 py-1.5 text-xs bg-clay-600 text-white rounded-lg font-bold hover:bg-clay-700 transition shadow-sm">
                            {processing ? 'Adding...' : 'Add Supply'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* RESTOCK MODAL */}
            <Modal show={showRestockModal} onClose={() => setShowRestockModal(false)} maxWidth="sm">
                <form onSubmit={handleRestock} className="p-5">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Restock Supply</h2>
                    <p className="text-xs text-gray-500 mb-4">
                        Add stock to <strong>{selectedSupply?.name}</strong>
                    </p>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">Quantity to Add</label>
                        <input 
                            type="number" 
                            className="w-full border-gray-300 rounded-lg text-xs py-1.5 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition" 
                            value={restockForm.data.quantity} 
                            onChange={e => restockForm.setData('quantity', e.target.value)} 
                            required 
                            min="1"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Current: {selectedSupply?.quantity} {selectedSupply?.unit}</p>
                    </div>

                    <div className="mt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setShowRestockModal(false)} className="px-3 py-1.5 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                        <button type="submit" disabled={restockForm.processing} className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">
                            {restockForm.processing ? 'Adding...' : 'Add Stock'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* CONFIRMATION MODAL FOR REQUEST */}
            <Modal 
                show={showConfirmRequest} 
                onClose={() => setShowConfirmRequest(false)}
                maxWidth="sm"
            >
                <div className="p-5">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-3 text-amber-600 mx-auto">
                        <Banknote size={20} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Request Restock?</h2>
                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                            This will create a purchase request for <strong>{supplyToRequest?.name}</strong>.
                            <br/>
                            The request will be sent to <strong>Accounting</strong> for budget approval.
                        </p>

                        <div className="mb-4 text-left">
                            <label className="block text-[10px] font-bold text-gray-700 mb-1">Quantity to Request</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border-gray-300 rounded-lg text-xs py-1.5 focus:border-amber-500 focus:ring-amber-500 shadow-sm transition pr-12 font-bold" 
                                    value={requestQuantity} 
                                    onChange={e => setRequestQuantity(e.target.value)} 
                                    required 
                                    min="1"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">{supplyToRequest?.unit}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Recommended: {supplyToRequest ? supplyToRequest.min_stock * 2 : 0} {supplyToRequest?.unit}</p>
                        </div>
                    </div>

                    <div className="flex justify-center gap-3">
                        <button onClick={() => setShowConfirmRequest(false)} className="px-3 py-1.5 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                        <button 
                            onClick={() => {
                                router.post(route('supplies.request', supplyToRequest.id), { quantity: requestQuantity }, { 
                                    preserveScroll: true,
                                    onSuccess: () => setShowConfirmRequest(false)
                                });
                            }} 
                            className="px-4 py-1.5 text-xs bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition shadow-sm"
                        >
                            Submit Request
                        </button>
                    </div>
                </div>
            </Modal>
            
            {/* DELETE CONFIRMATION MODAL */}
            <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm animate-pulse-slow">
                        <Trash2 size={28} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Supply?</h2>
                    <p className="text-xs text-gray-500 mb-6 leading-relaxed px-2">
                        Are you sure you want to delete <strong className="text-gray-900">"{supplyToDelete?.name}"</strong>? 
                        <br/><br/>
                        This action is irreversible and will remove high-level tracking for this item from your inventory.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 px-4">
                        <button 
                            onClick={() => setShowDeleteModal(false)}
                            className="w-full sm:w-auto px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition duration-200"
                        >
                            Cancel, Keep it
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition duration-200 shadow-lg shadow-red-200 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} /> Yes, Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}


