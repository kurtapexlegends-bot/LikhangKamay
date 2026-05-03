import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { FolderTree, Plus, Edit2, Trash2, Tag, AlertTriangle, Save, X } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import Modal from '@/Components/Modal';

export default function Taxonomy({ categories }) {
    const { addToast } = useToast();
    
    // State for Add Modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isProcessingAdd, setIsProcessingAdd] = useState(false);

    // State for Edit
    const [editingCategory, setEditingCategory] = useState(null);
    const [editName, setEditName] = useState('');
    const [isProcessingEdit, setIsProcessingEdit] = useState(false);

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        setIsProcessingAdd(true);
        router.post(route('admin.taxonomy.store'), { name: newCategoryName }, {
            preserveScroll: true,
            onSuccess: () => {
                setNewCategoryName('');
                setIsAddOpen(false);
                addToast('Category added successfully.', 'success');
            },
            onError: (errors) => {
                if (errors.name) addToast(errors.name, 'error');
            },
            onFinish: () => setIsProcessingAdd(false)
        });
    };

    const handleUpdateCategory = (category) => {
        if (!editName.trim() || editName === category.name) {
            setEditingCategory(null);
            return;
        }

        if (!confirm(`Are you sure you want to rename "${category.name}" to "${editName}"? This will instantly update ${category.products_count} existing products.`)) {
            return;
        }

        setIsProcessingEdit(true);
        router.patch(route('admin.taxonomy.update', category.id), { name: editName }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingCategory(null);
                addToast('Category renamed successfully.', 'success');
            },
            onError: (errors) => {
                if (errors.name) addToast(errors.name, 'error');
            },
            onFinish: () => setIsProcessingEdit(false)
        });
    };

    const handleDeleteCategory = (category) => {
        if (category.products_count > 0) {
            addToast('Cannot delete category because it contains active products.', 'error');
            return;
        }

        if (confirm(`Are you sure you want to permanently delete the category "${category.name}"?`)) {
            router.delete(route('admin.taxonomy.destroy', category.id), {
                preserveScroll: true,
                onSuccess: () => addToast('Category deleted.', 'success')
            });
        }
    };

    return (
        <AdminLayout title="Global Taxonomy Engine">
            <Head title="Taxonomy Engine" />

            <div className="max-w-5xl">
                
                {/* HEADER & ADD BUTTON */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-stone-900">Category Management</h1>
                        <p className="text-sm text-stone-500 mt-1 max-w-xl">
                            Manage the global list of product categories. Renaming a category here will automatically update all existing products currently using it.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsAddOpen(true)}
                        className="bg-clay-600 hover:bg-clay-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus size={16} /> Add Category
                    </button>
                </div>

                {/* CATEGORIES TABLE */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-stone-50 border-b border-stone-100">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-stone-500 uppercase tracking-widest w-1/2">Category Name</th>
                                    <th className="px-6 py-3 text-xs font-bold text-stone-500 uppercase tracking-widest w-1/4">Products Linked</th>
                                    <th className="px-6 py-3 text-xs font-bold text-stone-500 uppercase tracking-widest w-1/4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {categories.length > 0 ? (
                                    categories.map((category) => (
                                        <tr key={category.id} className="hover:bg-stone-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                {editingCategory === category.id ? (
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="w-full px-3 py-1.5 bg-white border border-clay-300 rounded-lg text-sm focus:ring-2 focus:ring-clay-500/20 outline-none"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-1.5 bg-stone-100 rounded-lg text-stone-500">
                                                            <FolderTree size={16} strokeWidth={2} />
                                                        </div>
                                                        <span className="font-bold text-stone-900">{category.name}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${category.products_count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                                                    <Tag size={12} />
                                                    {category.products_count} product{category.products_count !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editingCategory === category.id ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => setEditingCategory(null)}
                                                            className="p-1.5 text-stone-400 hover:text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateCategory(category)}
                                                            disabled={isProcessingEdit}
                                                            className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition disabled:opacity-50"
                                                        >
                                                            <Save size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingCategory(category.id);
                                                                setEditName(category.name);
                                                            }}
                                                            className="p-1.5 text-clay-600 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 rounded-lg transition"
                                                            title="Rename Category"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteCategory(category)}
                                                            disabled={category.products_count > 0}
                                                            className={`p-1.5 rounded-lg transition ${category.products_count > 0 ? 'text-stone-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                                                            title={category.products_count > 0 ? "Cannot delete category with active products" : "Delete Category"}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-12 text-center text-stone-400">
                                            <FolderTree size={32} className="mx-auto mb-3 text-stone-300" />
                                            <p>No categories found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ADD MODAL */}
            <Modal show={isAddOpen} onClose={() => setIsAddOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-stone-900 mb-1">Add New Category</h2>
                    <p className="text-xs text-stone-500 mb-5">Create a new global category for the marketplace.</p>

                    <form onSubmit={handleAddCategory}>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-widest mb-2">
                                Category Name
                            </label>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="e.g., Ceramic Mugs"
                                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-clay-500/20 focus:border-clay-400 outline-none transition"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsAddOpen(false)}
                                className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessingAdd || !newCategoryName.trim()}
                                className="bg-clay-600 hover:bg-clay-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                            >
                                {isProcessingAdd ? 'Saving...' : 'Add Category'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

        </AdminLayout>
    );
}