/* global route */
import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import SupplierLayout from '@/Layouts/SupplierLayout';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { compressImage } from '@/utils/imageCompressor';
import { 
    Box, Plus, Search, Edit3, Trash2, X, AlertCircle, 
    Layers, Package, Check, Tag 
} from 'lucide-react';

export default function SupplierMaterialsIndex({ materials, availableCategories = [], availableUnits = {}, filters = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [categoryFilter, setCategoryFilter] = useState(filters.category || 'All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [fileError, setFileError] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false);

    // Form for Add / Edit
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        category: availableCategories[1] || 'Raw Clay & Slips',
        description: '',
        price: '',
        stock: '',
        moq: '1',
        wholesale_price: '',
        wholesale_min_qty: '',
        supply_unit: 'kg',
        weight: '1',
        cover_photo: null,
    });

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('supplier.materials.index'), {
            search,
            category: categoryFilter,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleCoverPhotoChange = async (e) => {
        const file = e.target.files?.[0];
        setFileError(null);
        if (!file) {
            setData('cover_photo', null);
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            setFileError('File exceeds maximum allowable size (15MB). Please upload a smaller image.');
            e.target.value = '';
            setData('cover_photo', null);
            return;
        }

        setIsCompressing(true);
        try {
            const compressed = await compressImage(file, 1600, 1600, 0.85);
            if (compressed.size > 4 * 1024 * 1024) {
                setFileError('Image is too large (max 4MB after compression). Please select a smaller photo.');
                e.target.value = '';
                setData('cover_photo', null);
            } else {
                setData('cover_photo', compressed);
            }
        } catch {
            if (file.size > 4 * 1024 * 1024) {
                setFileError('Image is too large (max 4MB). Please select a smaller photo.');
                e.target.value = '';
                setData('cover_photo', null);
            } else {
                setData('cover_photo', file);
            }
        } finally {
            setIsCompressing(false);
        }
    };

    const openAddModal = () => {
        clearErrors();
        setFileError(null);
        reset();
        setEditingMaterial(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (material) => {
        clearErrors();
        setFileError(null);
        setEditingMaterial(material);
        setData({
            name: material.name || '',
            category: material.category || availableCategories[1],
            description: material.description || '',
            price: material.price?.toString() || '',
            stock: material.stock?.toString() || '',
            moq: material.moq?.toString() || '1',
            wholesale_price: material.wholesale_price ? material.wholesale_price.toString() : '',
            wholesale_min_qty: material.wholesale_min_qty ? material.wholesale_min_qty.toString() : '',
            supply_unit: material.supply_unit || 'kg',
            weight: material.weight ? material.weight.toString() : '1',
            cover_photo: null,
        });
        setIsAddModalOpen(true);
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingMaterial(null);
        setFileError(null);
        reset();
    };

    const submitMaterial = (e) => {
        e.preventDefault();
        if (fileError || isCompressing) return;
        if (data.cover_photo && data.cover_photo.size > 4 * 1024 * 1024) {
            setFileError('Image exceeds the 4MB limit.');
            return;
        }
        if (editingMaterial) {
            post(route('supplier.materials.update', editingMaterial.slug || editingMaterial.id), {
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('supplier.materials.store'), {
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        }
    };

    const deleteMaterial = (material) => {
        const targetKey = typeof material === 'object' ? (material.slug || material.id) : material;
        if (confirm('Are you sure you want to remove this raw material listing from the B2B Supply Hub?')) {
            router.delete(route('supplier.materials.destroy', targetKey), {
                preserveScroll: true,
            });
        }
    };

    return (
        <SupplierLayout active="materials">
            <Head title="Wholesale Materials Inventory" />

            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-serif">
                        Wholesale Materials
                    </h1>
                    <p className="mt-1 text-xs text-stone-600">
                        Manage bulk raw crafting supplies, Minimum Order Quantities (MOQ), and volume discount tiers.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openAddModal}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-clay-700 transition-colors active:scale-95 self-start sm:self-auto"
                >
                    <Plus size={16} /> Add Bulk Material
                </button>
            </div>

            {/* Filter Bar */}
            <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
                <form onSubmit={handleSearch} className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search materials by name, SKU, or category..."
                        className="w-full rounded-xl border border-stone-200 pl-10 pr-4 py-2 text-xs focus:border-clay-500 focus:ring-clay-500"
                    />
                </form>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                        value={categoryFilter}
                        onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            router.get(route('supplier.materials.index'), {
                                search,
                                category: e.target.value,
                            }, { preserveState: true, preserveScroll: true });
                        }}
                        className="w-full md:w-48 rounded-xl border border-stone-200 py-2 px-3 text-xs focus:border-clay-500 focus:ring-clay-500"
                    >
                        {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Materials Table */}
            <div className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-stone-200 bg-stone-50/75 text-stone-600 font-bold uppercase tracking-wider">
                            <tr>
                                <th className="py-3 px-4">Material</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4 text-right">Base Price</th>
                                <th className="py-3 px-4 text-center">Unit</th>
                                <th className="py-3 px-4 text-center">MOQ</th>
                                <th className="py-3 px-4">Wholesale Tier</th>
                                <th className="py-3 px-4 text-right">In Stock</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {materials.data.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-stone-400">
                                        <Box size={32} className="mx-auto mb-2 opacity-40" />
                                        <p className="font-medium">No wholesale materials found.</p>
                                        <p className="text-[11px] text-stone-400 mt-1">Click "Add Bulk Material" to list raw supplies.</p>
                                    </td>
                                </tr>
                            ) : (
                                materials.data.map((item) => (
                                    <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                {item.cover_photo_url ? (
                                                    <img
                                                        src={item.cover_photo_url}
                                                        alt={item.name}
                                                        className="h-10 w-10 rounded-lg object-cover border border-stone-200"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                                                        <Box size={18} />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-stone-900">{item.name}</p>
                                                    <p className="text-[10px] text-stone-400 font-mono">{item.sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-stone-600">{item.category}</td>
                                        <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-serif">
                                            ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className="inline-block px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono text-[11px]">
                                                {item.supply_unit}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center font-bold text-stone-800">
                                            {item.moq}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {item.wholesale_price && item.wholesale_min_qty ? (
                                                <div className="text-[11px]">
                                                    <span className="font-bold text-emerald-700">
                                                        ₱{item.wholesale_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-stone-500"> for {item.wholesale_min_qty}+ {item.supply_unit}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-stone-400">None set</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <span className={`inline-block px-2 py-0.5 rounded font-extrabold text-[11px] ${
                                                item.stock <= 10
                                                    ? 'bg-amber-100 text-amber-900'
                                                    : 'bg-emerald-50 text-emerald-800'
                                            }`}>
                                                {item.stock} {item.supply_unit}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(item)}
                                                    className="p-1.5 text-stone-500 hover:text-clay-600 rounded-lg hover:bg-stone-100 transition-colors"
                                                    title="Edit material"
                                                >
                                                    <Edit3 size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteMaterial(item)}
                                                    className="p-1.5 text-stone-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                    title="Delete material"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Add / Edit Material */}
            <Modal show={isAddModalOpen} onClose={closeModal} maxWidth="2xl">
                <form onSubmit={submitMaterial} className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                        <h2 className="text-lg font-bold text-stone-900 font-serif">
                            {editingMaterial ? 'Edit Bulk Raw Material' : 'List New Wholesale Material'}
                        </h2>
                        <button type="button" onClick={closeModal} className="text-stone-400 hover:text-stone-600">
                            <X size={18} />
                        </button>
                    </div>

                    <div>
                        <InputLabel htmlFor="name" value="Material Name" />
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="e.g., Red Terracotta Clay Bulk"
                            className="mt-1 block w-full text-xs"
                            required
                        />
                        <InputError message={errors.name} className="mt-1" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="category" value="Category" />
                            <select
                                id="category"
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-xs"
                                required
                            >
                                {availableCategories.filter((c) => c !== 'All').map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <InputError message={errors.category} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="supply_unit" value="Packaging Unit" />
                            <select
                                id="supply_unit"
                                value={data.supply_unit}
                                onChange={(e) => setData('supply_unit', e.target.value)}
                                className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-xs font-mono"
                                required
                            >
                                {Object.entries(availableUnits).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            <InputError message={errors.supply_unit} className="mt-1" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <InputLabel htmlFor="price" value="Base Unit Price (₱)" />
                            <TextInput
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.price}
                                onChange={(e) => setData('price', e.target.value)}
                                placeholder="0.00"
                                className="mt-1 block w-full text-xs"
                                required
                            />
                            <InputError message={errors.price} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="stock" value="Stock on Hand" />
                            <TextInput
                                id="stock"
                                type="number"
                                min="0"
                                value={data.stock}
                                onChange={(e) => setData('stock', e.target.value)}
                                placeholder="Total units"
                                className="mt-1 block w-full text-xs"
                                required
                            />
                            <InputError message={errors.stock} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="moq" value="Minimum Order (MOQ)" />
                            <TextInput
                                id="moq"
                                type="number"
                                min="1"
                                value={data.moq}
                                onChange={(e) => setData('moq', e.target.value)}
                                placeholder="Min order qty"
                                className="mt-1 block w-full text-xs"
                                required
                            />
                            <InputError message={errors.moq} className="mt-1" />
                        </div>
                    </div>

                    {/* Wholesale Volume Discount Tier */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50/75 p-3.5 space-y-3">
                        <div className="flex items-center gap-1.5">
                            <Tag size={15} className="text-clay-600" />
                            <span className="text-xs font-bold text-stone-800">Volume Discount Tier (Optional)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <InputLabel htmlFor="wholesale_min_qty" value="Min Quantity for Discount" />
                                <TextInput
                                    id="wholesale_min_qty"
                                    type="number"
                                    min="2"
                                    value={data.wholesale_min_qty}
                                    onChange={(e) => setData('wholesale_min_qty', e.target.value)}
                                    placeholder="e.g., 20"
                                    className="mt-1 block w-full text-xs"
                                />
                                <InputError message={errors.wholesale_min_qty} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="wholesale_price" value="Discounted Price per Unit (₱)" />
                                <TextInput
                                    id="wholesale_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.wholesale_price}
                                    onChange={(e) => setData('wholesale_price', e.target.value)}
                                    placeholder="e.g., 380.00"
                                    className="mt-1 block w-full text-xs"
                                />
                                <InputError message={errors.wholesale_price} className="mt-1" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="description" value="Material Description / Specifications" />
                        <textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={3}
                            placeholder="Specify moisture content, mesh size, firing temperature, or origin..."
                            className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-xs"
                        />
                        <InputError message={errors.description} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="cover_photo" value="Material Photo (Optional, Max 4MB)" />
                        <input
                            id="cover_photo"
                            type="file"
                            accept="image/*"
                            onChange={handleCoverPhotoChange}
                            disabled={isCompressing}
                            className="mt-1 block w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
                        />
                        {isCompressing && (
                            <p className="mt-1 text-xs text-clay-600 font-medium">Optimizing image size...</p>
                        )}
                        <InputError message={fileError || errors.cover_photo} className="mt-1" />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                        <SecondaryButton onClick={closeModal} type="button">Cancel</SecondaryButton>
                        <PrimaryButton disabled={processing || isCompressing || !!fileError}>
                            {processing ? 'Saving...' : isCompressing ? 'Compressing...' : editingMaterial ? 'Update Listing' : 'Publish Material'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </SupplierLayout>
    );
}
