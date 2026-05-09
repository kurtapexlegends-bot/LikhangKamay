import React from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { 
    Trash2, 
    RotateCcw, 
    AlertTriangle,
    Package,
    FolderTree,
    ShoppingBag,
    History,
    ChevronRight,
    Search
} from 'lucide-react';
import ConfirmationModal from '@/Components/ConfirmationModal';

export default function Trash({ trashQueue, stats }) {
    const [confirmingRestore, setConfirmingRestore] = React.useState(null);
    const [confirmingDelete, setConfirmingDelete] = React.useState(null);

    const handleRestore = () => {
        if (!confirmingRestore) return;
        
        router.post(route('admin.trash.restore'), {
            id: confirmingRestore.id,
            type: confirmingRestore.type
        }, {
            onFinish: () => setConfirmingRestore(null)
        });
    };

    const handlePermanentDelete = () => {
        if (!confirmingDelete) return;
        
        router.post(route('admin.trash.permanent-delete'), {
            id: confirmingDelete.id,
            type: confirmingDelete.type
        }, {
            onFinish: () => setConfirmingDelete(null)
        });
    };

    return (
        <AdminLayout title="Restoration Center">
            <Head title="Restoration Center" />

            <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Trash" value={stats.totalItems} icon={Trash2} color="text-gray-600" />
                    <StatCard title="Deleted Products" value={stats.products} icon={Package} color="text-clay-600" />
                    <StatCard title="Deleted Categories" value={stats.categories} icon={FolderTree} color="text-indigo-600" />
                    <StatCard title="Deleted Orders" value={stats.orders} icon={ShoppingBag} color="text-amber-600" />
                </div>

                {/* Main Queue */}
                <div className="bg-white rounded-3xl border border-clay-100 overflow-hidden shadow-sm">
                    <div className="px-8 py-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Trash Queue</h3>
                            <p className="text-xs text-gray-500 font-medium">Deleted items are held for 30 days before permanent removal</p>
                        </div>
                        
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search trash..."
                                className="pl-10 pr-4 py-2 bg-stone-50 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-clay-500/20 w-full sm:w-64"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Item Type</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Name / Identifier</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Deleted By / Context</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Auto-Purge In</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {trashQueue.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center">
                                                    <History className="text-stone-300" size={24} />
                                                </div>
                                                <p className="text-sm font-bold text-gray-400">Trash is empty</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    trashQueue.map((item) => (
                                        <tr key={`${item.type}-${item.id}`} className="group hover:bg-stone-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                    item.type === 'Product' ? 'bg-clay-50 text-clay-700' :
                                                    item.type === 'Category' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                                                }`}>
                                                    {item.type === 'Product' && <Package size={10} />}
                                                    {item.type === 'Category' && <FolderTree size={10} />}
                                                    {item.type === 'Order' && <ShoppingBag size={10} />}
                                                    {item.type}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-xs font-bold text-gray-900">{item.name}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-xs font-medium text-gray-500 italic">{item.context}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-mono font-bold text-gray-700">
                                                        {Math.ceil((new Date(item.expires_at) - new Date()) / (1000 * 60 * 60 * 24))} Days
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-medium">Expires: {new Date(item.expires_at).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => setConfirmingRestore(item)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Restore Item"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmingDelete(item)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Permanently Delete"
                                                    >
                                                        <Trash2 size={16} />
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
            </div>

            {/* Confirmation Modals */}
            <ConfirmationModal 
                isOpen={!!confirmingRestore}
                onClose={() => setConfirmingRestore(null)}
                onConfirm={handleRestore}
                title={`Restore ${confirmingRestore?.type}?`}
                message={`This will return "${confirmingRestore?.name}" to the active database. It will be visible to users again.`}
                icon={RotateCcw}
                iconBg="bg-indigo-100 text-indigo-600"
                confirmText="Restore Item"
                confirmColor="bg-indigo-600 hover:bg-indigo-700"
            />

            <ConfirmationModal 
                isOpen={!!confirmingDelete}
                onClose={() => setConfirmingDelete(null)}
                onConfirm={handlePermanentDelete}
                title="Permanent Deletion"
                message={`Are you absolutely sure? This will permanently erase "${confirmingDelete?.name}" from the system. This action CANNOT be undone.`}
                icon={AlertTriangle}
                iconBg="bg-red-100 text-red-600"
                confirmText="Permanently Delete"
                confirmColor="bg-red-600 hover:bg-red-700"
            />
        </AdminLayout>
    );
}

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-2xl border border-clay-100 p-6">
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-stone-50 ${color}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
            </div>
        </div>
    </div>
);
