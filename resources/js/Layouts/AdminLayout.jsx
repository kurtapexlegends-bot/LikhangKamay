import React, { useState } from 'react';
import { Link, Head, usePage } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import { 
    LayoutDashboard, 
    Users, 
    Store, 
    LogOut, 
    Menu, 
    X, 
    Bell,
    Settings,
    ChevronDown,
    User
} from 'lucide-react';

export default function AdminLayout({ title, children }) {
    const { pendingArtisanCount, auth } = usePage().props;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: route('admin.dashboard'), icon: LayoutDashboard, current: route().current('admin.dashboard') },
        { name: 'User Management', href: route('admin.users'), icon: Users, current: route().current('admin.users') },
        { 
            name: 'Pending Artisans', 
            href: route('admin.pending'), 
            icon: Store, 
            current: route().current('admin.pending'),
            badge: pendingArtisanCount > 0 ? pendingArtisanCount : null 
        },
    ];

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans flex text-gray-800">
            <Head title={title ? `${title} - Admin` : 'Admin Panel'} />

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-clay-100 transition-transform duration-300 ease-in-out
                lg:translate-x-0 lg:static flex flex-col
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand Header */}
                <div className="px-5 py-4 border-b border-gray-50 shrink-0 bg-white/50 backdrop-blur-sm relative flex items-center justify-between h-20">
                    <div className="flex items-center gap-2.5">
                        <img 
                            src="/images/logo.png" 
                            alt="LikhangKamay" 
                            className="w-7 h-7 object-contain"
                        />
                        <span className="font-serif text-lg font-bold text-gray-900 tracking-tight">LikhangKamay</span>
                    </div>

                    {/* Mobile Close Button */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-1">Admin Menu</p>
                    
                    <div className="space-y-1">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                                    flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200
                                    ${item.current 
                                        ? 'bg-clay-600 text-white shadow-md shadow-clay-200' 
                                        : 'text-gray-500 hover:bg-clay-50 hover:text-clay-700'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon 
                                        size={18} 
                                        strokeWidth={2.5}
                                        className={item.current ? 'text-white' : 'text-gray-400 group-hover:text-clay-600'} 
                                    />
                                    {item.name}
                                </div>
                                {item.badge && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                        item.current ? 'bg-white text-clay-600' : 'bg-clay-100 text-clay-600'
                                    }`}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Header (Desktop & Mobile) */}
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition lg:hidden"
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                            {title === 'Dashboard' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Overview of platform performance</p>}
                            {title === 'User Management' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Manage artisans and buyers</p>}
                            {title === 'Pending Artisans' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Review artisan applications</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        {/* Notifications */}
                         {pendingArtisanCount > 0 && (
                            <Link href={route('admin.pending')} className="relative p-2 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-xl transition group" title="Pending Applications">
                                <Bell size={20} />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                            </Link>
                         )}

                         {/* Divider */}
                         <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

                        {/* User Profile Dropdown */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-bold text-gray-900">{auth.user.name}</p>
                                                <p className="text-[10px] text-gray-500">Super Admin</p>
                                            </div>
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold border shadow-sm overflow-hidden ${auth.user.avatar ? 'bg-white border-clay-200' : 'bg-clay-100 text-clay-700 border-clay-200 uppercase'}`}>
                                                {auth.user.avatar ? (
                                                    <img 
                                                        src={auth.user.avatar.startsWith('http') ? auth.user.avatar : `/storage/${auth.user.avatar}`} 
                                                        alt={auth.user.name} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    auth.user.name?.charAt(0) || 'A'
                                                )}
                                            </div>
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    {/* <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link> */}
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                                        <LogOut size={16} /> Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto [scrollbar-gutter:stable] p-4 sm:p-6 lg:p-8 bg-[#FDFBF9]">
                    <div className="max-w-7xl mx-auto pb-20 lg:pb-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
