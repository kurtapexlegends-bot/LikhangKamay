import React, { useState, useEffect } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { Plus, AlertCircle } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import SellerHeader from '@/Layouts/SellerHeader';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import useConstraintValidation from '@/hooks/useConstraintValidation';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useFlashToast from '@/hooks/useFlashToast';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';

// Import refactored domain components using absolute path aliases
import ProcurementMetrics from '@/Components/Seller/Procurement/ProcurementMetrics';
import SuppliesTable from '@/Components/Seller/Procurement/SuppliesTable';
import AddSupplyModal from '@/Components/Seller/Procurement/AddSupplyModal';
import RestockSupplyModal from '@/Components/Seller/Procurement/RestockSupplyModal';
import RequestRestockModal from '@/Components/Seller/Procurement/RequestRestockModal';
import DeleteSupplyModal from '@/Components/Seller/Procurement/DeleteSupplyModal';

const FALLBACK_CATEGORIES = ['Finished Goods', 'Tools', 'Packaging', 'Glazes', 'Other'];
const FALLBACK_UNITS = ['pcs', 'kg', 'liters', 'bags', 'boxes', 'sets'];

const generateSKU = () =>
    "LK-" +
    Math.floor(Math.random() * 0xffff)
        .toString(16)
        .toUpperCase()
        .padStart(4, "0");

export default function ProcurementIndex({ auth, supplies, totalItems, lowStockItems, totalValue, initTab, availableCategories = [], availableUnits = [] }) {
    const { addToast } = useToast();
    const { canEdit: canEditProcurement, isReadOnly: isProcurementReadOnly } = useSellerModuleAccess('procurement');
    const { canEdit: canEditStockRequests } = useSellerModuleAccess('stock_requests');
    const { openSidebar } = useSellerWorkspaceShell();
    const { flash, filters = {} } = usePage().props;

    const [showAddModal, setShowAddModal] = useState(false);
    const [showRestockModal, setShowRestockModal] = useState(false);
    const [showConfirmRequest, setShowConfirmRequest] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [selectedSupply, setSelectedSupply] = useState(null);
    const [supplyToDelete, setSupplyToDelete] = useState(null);
    const [supplyToRequest, setSupplyToRequest] = useState(null);
    
    const [requestQuantity, setRequestQuantity] = useState(0);
    const [actionNotice, setActionNotice] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [filterCategory, setFilterCategory] = useState('all');
    const [isNavigating, setIsNavigating] = useState(false);

    const [shouldAnimateKPI, setShouldAnimateKPI] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const unbindStart = router.on('start', () => setIsNavigating(true));
        const unbindFinish = router.on('finish', () => setIsNavigating(false));
        return () => { unbindStart(); unbindFinish(); };
    }, []);

    // Sync search from URL (for Global Search support)
    useEffect(() => {
        if (filters.search && filters.search !== searchTerm) {
            setSearchTerm(filters.search);
        }
    }, [filters.search]);

    useFlashToast(flash, addToast);

    // Form for adding new supply
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        category: 'Finished Goods',
        quantity: 0,
        unit: 'pcs',
        min_stock: 10,
        max_stock: 500,
        unit_cost: '',
        supplier: '',
        notes: '',
        sku: '',
    });

    const categoriesList = availableCategories.length > 0 ? availableCategories : FALLBACK_CATEGORIES;
    const unitsList = availableUnits.length > 0 ? availableUnits : FALLBACK_UNITS;

    const skuValidation = useConstraintValidation('supply_sku_uniqueness', data.sku);

    // Restock form
    const restockForm = useForm({ quantity: 0 });

    const openAddModal = () => {
        reset();
        setData({
            name: '',
            category: 'Finished Goods',
            quantity: 0,
            unit: 'pcs',
            min_stock: 10,
            max_stock: 500,
            unit_cost: '',
            supplier: '',
            notes: '',
            sku: generateSKU()
        });
        setShowAddModal(true);
    };

    const handleAddSubmit = (e) => {
        e.preventDefault();
        if (!canEditProcurement) return;
        post(route('supplies.store'), {
            onSuccess: () => {
                reset();
                setShowAddModal(false);
                setActionNotice(null);
            },
            onError: () => {
                setActionNotice('Supply could not be saved yet. Review the form and try again.');
                addToast('Supply could not be saved yet.', 'error');
            },
        });
    };

    const handleRestockSubmit = (e) => {
        e.preventDefault();
        if (!canEditProcurement) return;
        restockForm.post(route('supplies.restock', selectedSupply.id), {
            onSuccess: () => {
                restockForm.reset();
                setShowRestockModal(false);
                setSelectedSupply(null);
                setActionNotice(null);
            },
            onError: () => {
                setActionNotice('Restock update failed. Try again once the quantity looks correct.');
                addToast('Restock update failed.', 'error');
            },
        });
    };

    const handleDeleteClick = (supply) => {
        if (!canEditProcurement) return;
        setSupplyToDelete(supply);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        if (!canEditProcurement) return;
        router.delete(route('supplies.destroy', supplyToDelete.id), {
            onSuccess: () => {
                setShowDeleteModal(false);
                setSupplyToDelete(null);
                setActionNotice(null);
            },
            onError: () => {
                setActionNotice('This supply could not be deleted right now.');
                addToast('Delete failed.', 'error');
            },
        });
    };

    const handleRequestRestockClick = (supply) => {
        setSupplyToRequest(supply);
        setRequestQuantity(supply.min_stock * 2);
        setShowConfirmRequest(true);
    };

    const handleRequestRestockSubmit = () => {
        if (!canEditStockRequests) return;
        router.post(route('supplies.request', supplyToRequest.id), { quantity: requestQuantity }, { 
            preserveScroll: true,
            onSuccess: () => {
                setShowConfirmRequest(false);
                setActionNotice(null);
            },
            onError: () => {
                setActionNotice('Restock request could not be submitted right now.');
                addToast('Restock request failed.', 'error');
            }
        });
    };

    const handleQuickRestock = (supply, amount) => {
        if (!canEditProcurement) return;
        router.post(route('supplies.restock', supply.id), { 
            quantity: amount 
        }, {
            preserveScroll: true,
            onSuccess: () => {
                addToast(`Added ${amount} ${supply.unit} to ${supply.name}`, 'success');
            },
            onError: () => {
                addToast('Failed to update stock', 'error');
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Inventory" />

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <SellerHeader 
                    title="Inventory"
                    subtitle="Track raw materials, inventory levels, and stock purchase orders."
                    auth={auth}
                    onMenuClick={openSidebar}
                    badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
                    actions={(
                        <button 
                            onClick={() => canEditProcurement && openAddModal()} 
                            disabled={!canEditProcurement}
                            className="flex items-center gap-1.5 bg-clay-600 text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-clay-500 active:scale-95 transition-all shadow-lg shadow-clay-600/20 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
                        >
                            <Plus size={14} strokeWidth={3} /> Add Supply
                        </button>
                    )}
                />

                <main className="p-4 sm:p-6 space-y-6">
                    {isProcurementReadOnly && (
                        <ReadOnlyCapabilityNotice label="Inventory are read only for your account. Supply updates are disabled." />
                    )}

                    {actionNotice && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
                            <AlertCircle size={13} />
                            {actionNotice}
                        </div>
                    )}
                    
                    <ProcurementMetrics 
                        totalItems={totalItems}
                        lowStockItems={lowStockItems}
                        totalValue={totalValue}
                        shouldAnimateKPI={shouldAnimateKPI}
                    />

                    <SuppliesTable 
                        supplies={supplies}
                        categoriesList={categoriesList}
                        canEditProcurement={canEditProcurement}
                        canEditStockRequests={canEditStockRequests}
                        isNavigating={isNavigating}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filterCategory={filterCategory}
                        setFilterCategory={setFilterCategory}
                        onQuickRestock={handleQuickRestock}
                        onRequestRestock={handleRequestRestockClick}
                        onDelete={handleDeleteClick}
                        onOpenAddSupply={openAddModal}
                    />
                </main>
            </div>

            {/* Modal Subcomponents */}
            <AddSupplyModal 
                show={showAddModal}
                onClose={() => setShowAddModal(false)}
                canEditProcurement={canEditProcurement}
                categoriesList={categoriesList}
                unitsList={unitsList}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                onSubmit={handleAddSubmit}
                skuValidation={skuValidation}
            />

            <RestockSupplyModal 
                show={showRestockModal}
                onClose={() => {
                    setShowRestockModal(false);
                    setSelectedSupply(null);
                }}
                canEditProcurement={canEditProcurement}
                selectedSupply={selectedSupply}
                restockForm={restockForm}
                onSubmit={handleRestockSubmit}
            />

            <RequestRestockModal 
                show={showConfirmRequest}
                onClose={() => {
                    setShowConfirmRequest(false);
                    setSupplyToRequest(null);
                }}
                canEditStockRequests={canEditStockRequests}
                supply={supplyToRequest}
                requestQuantity={requestQuantity}
                setRequestQuantity={setRequestQuantity}
                onSubmit={handleRequestRestockSubmit}
            />

            <DeleteSupplyModal 
                show={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSupplyToDelete(null);
                }}
                canEditProcurement={canEditProcurement}
                supply={supplyToDelete}
                onConfirm={confirmDelete}
            />
        </div>
    );
}

ProcurementIndex.layout = (page) => <SellerWorkspaceLayout active="procurement">{page}</SellerWorkspaceLayout>;
