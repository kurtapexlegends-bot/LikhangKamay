/* global route */
import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, Box, ClipboardList, LogOut, 
    Menu, X, Building2, ExternalLink, ChevronDown, User, ShieldCheck
} from 'lucide-react';
import Dropdown from '@/Components/Dropdown';

export default function SupplierLayout({ children, active = 'dashboard' }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        {
            key: 'dashboard',
            label: 'Overview',
            href: route('supplier.dashboard'),
            icon: LayoutDashboard,
        },
        {
            key: 'materials',
            label: 'Wholesale Materials',
            href: route('supplier.materials.index'),
            icon: Box,
        },
        {
            key: 'orders',
            label: 'Workshop Orders',
            href: route('supplier.orders.index'),
            icon: ClipboardList,
        },
    ];

    return (
        <div className="min-h-screen bg-[#FDFBF9] text-stone-800 font-sans">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Brand & Portal Badge */}
                    <div className="flex items-center gap-4">
                        <Link href={route('supplier.dashboard')} className="flex items-center gap-2.5">
                            <img
                                src="/images/logo.png"
                                alt="LikhangKamay"
                                className="h-8 w-8 object-contain"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/logo.png';
                                }}
                            />
                            <div className="flex flex-col">
                                <span className="font-serif text-lg font-bold tracking-tight text-stone-900 leading-none">
                                    LikhangKamay
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                    B2B Supplier Portal
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Nav Pills */}
                        <nav className="hidden md:flex items-center gap-1.5 ml-6 border-l border-stone-200 pl-6">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = active === item.key;
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                            isActive
                                                ? 'bg-clay-600 text-white shadow-sm'
                                                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                                        }`}
                                    >
                                        <Icon size={15} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Right Tray: Supplier Shop Name & Profile Dropdown */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col text-right">
                            <span className="text-xs font-bold text-stone-900 truncate max-w-[200px]">
                                {user?.shop_name || user?.name}
                            </span>
                            <span className="text-[11px] text-stone-500 flex items-center justify-end gap-1">
                                <ShieldCheck size={12} className="text-emerald-600" /> Verified Supplier
                            </span>
                        </div>

                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 p-1.5 sm:px-3 hover:bg-stone-100 transition-colors"
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-clay-100 text-clay-700 font-bold text-xs">
                                        {(user?.name || 'S').charAt(0).toUpperCase()}
                                    </div>
                                    <ChevronDown size={14} className="text-stone-500 hidden sm:block" />
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content width="48">
                                <div className="px-4 py-2 border-b border-stone-100 text-xs">
                                    <p className="font-bold text-stone-900 truncate">{user?.name}</p>
                                    <p className="text-stone-500 truncate">{user?.email}</p>
                                </div>
                                <Dropdown.Link href={route('profile.edit')}>
                                    <User size={14} className="inline mr-2" /> Profile Settings
                                </Dropdown.Link>
                                <div className="border-t border-stone-100 my-1" />
                                <Dropdown.Link href={route('logout')} method="post" as="button" className="text-red-600 hover:bg-red-50">
                                    <LogOut size={14} className="inline mr-2" /> Log Out
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>

                        {/* Mobile Menu Trigger */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100"
                            aria-label="Toggle Navigation Menu"
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Drawer */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-2 pb-4 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = active === item.key;
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                                        isActive
                                            ? 'bg-clay-600 text-white'
                                            : 'text-stone-700 hover:bg-stone-100'
                                    }`}
                                >
                                    <Icon size={18} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </header>

            {/* Main Content Viewport */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
