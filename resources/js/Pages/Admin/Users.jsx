import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { 
    Users, Store, Search, Filter, CheckCircle, XCircle, 
    Clock, ChevronLeft, ChevronRight, LogOut, Shield
} from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/UserAvatar';

export default function AdminUsers({ users, filters }) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('admin.users'), { search, role: filters.role }, { preserveState: true });
    };

    const handleRoleFilter = (role) => {
        router.get(route('admin.users'), { search, role }, { preserveState: true });
    };

    return (
        <AdminLayout title="User Management">

            {/* Filters & Search - Floating Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-8 sticky top-20 z-30 mt-2">
                <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex-1 w-full sm:w-auto relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email, or shop..."
                            className="w-full pl-11 pr-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-clay-500/20 text-gray-900 placeholder-gray-400 transition-all font-medium"
                        />
                    </form>

                    {/* Role Filter Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-stone-100/50 rounded-xl w-full sm:w-auto overflow-x-auto">
                        {['all', 'artisan', 'buyer', 'super_admin'].map(role => (
                            <button
                                key={role}
                                onClick={() => handleRoleFilter(role)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap flex items-center gap-2 ${
                                    filters.role === role
                                        ? 'bg-white text-clay-700 shadow-sm ring-1 ring-black/5'
                                        : 'text-gray-500 hover:bg-stone-200/50 hover:text-gray-700'
                                }`}
                            >
                                {role === 'all' && 'All Users'}
                                {role === 'artisan' && <><Store size={14} /> Artisans</>}
                                {role === 'buyer' && <><Users size={14} /> Buyers</>}
                                {role === 'super_admin' && <><Shield size={14} /> Admins</>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-stone-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">User Identity</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shop Details</th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verification</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Join Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.data.map(user => (
                                <tr key={user.id} className="hover:bg-stone-50 transition group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={user} className="w-10 h-10 border border-clay-200 shadow-sm transition-all" />
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.shop_name ? (
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{user.shop_name}</p>
                                                <Link href={route('shop.seller', user.shop_slug || '#')} className="text-[10px] text-clay-600 font-bold hover:underline">
                                                    View Shop →
                                                </Link>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 text-xs italic">No shop</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold border shadow-sm uppercase tracking-wider ${
                                            user.role === 'artisan' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                            user.role === 'super_admin' ? 'bg-gray-900 text-white border-gray-900' :
                                            'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                            {user.role === 'artisan' && <Store size={14} />}
                                            {user.role === 'super_admin' && <Shield size={14} />}
                                            {user.role === 'buyer' && <Users size={14} />}
                                            
                                            {user.role === 'artisan' && 'Artisan'}
                                            {user.role === 'super_admin' && 'Admin'}
                                            {user.role === 'buyer' && 'Buyer'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {user.role === 'artisan' ? (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border shadow-sm ${
                                                user.artisan_status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                user.artisan_status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                'bg-amber-100 text-amber-800 border-amber-200'
                                            }`}>
                                                {user.artisan_status === 'approved' && <CheckCircle size={12} />}
                                                {user.artisan_status === 'rejected' && <XCircle size={12} />}
                                                {user.artisan_status === 'pending' && <Clock size={12} />}
                                                
                                                {user.artisan_status === 'approved' && 'Verified'}
                                                {user.artisan_status === 'rejected' && 'Rejected'}
                                                {user.artisan_status === 'pending' && 'Pending'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-xs font-medium">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                                        {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
                        <p className="text-xs text-gray-500 font-medium">
                            Displaying {users.from}-{users.to} of {users.total} total users
                        </p>
                        <div className="flex items-center gap-2">
                            {users.prev_page_url && (
                                <Link href={users.prev_page_url} className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-clay-100 hover:text-clay-700 transition text-[10px] uppercase font-bold tracking-wider">
                                    Previous
                                </Link>
                            )}
                            {users.next_page_url && (
                                <Link href={users.next_page_url} className="px-3 py-1.5 rounded-lg bg-clay-600 text-white hover:bg-clay-700 transition text-[10px] uppercase font-bold shadow-sm shadow-clay-200 tracking-wider">
                                    Next Page
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
