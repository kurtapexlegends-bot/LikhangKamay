import React from 'react';
import { usePage } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import Breadcrumbs from '@/Components/Breadcrumbs';
import { Menu, ChevronDown, User, Building2, LogOut, HelpCircle, Package, ClipboardList } from 'lucide-react';
import { useSupplierWorkspaceShell } from '@/Layouts/SupplierLayout';

export default function SupplierHeader({
    title,
    subtitle,
    badge = null,
    actions = null,
    breadcrumbs = null,
    onMenuClick = null
}) {
    const { auth } = usePage().props;
    const { openSidebar } = useSupplierWorkspaceShell();
    const handleMenuClick = onMenuClick || openSidebar;

    return (
        <header className="bg-white border-b border-stone-200/80 flex items-center justify-between px-3.5 py-2.5 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-2xs gap-2 sm:gap-4 min-w-0">
            {/* Left: Mobile Menu & Dynamic Title */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3 flex-1">
                <button
                    type="button"
                    onClick={handleMenuClick}
                    aria-label="Open navigation menu"
                    className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 hover:text-clay-600 transition-colors active:scale-95 shrink-0"
                >
                    <Menu size={22} />
                </button>

                <div className="min-w-0 flex-1">
                    {breadcrumbs && (
                        <Breadcrumbs items={breadcrumbs} className="mb-0.5" />
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-base sm:text-lg lg:text-xl font-bold text-stone-900 truncate tracking-tight">
                            {title}
                        </h1>
                        {badge && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-900 text-[10px] font-bold uppercase tracking-wider text-stone-200 shrink-0">
                                <Building2 size={10} className={badge.iconColor || 'text-teal-400'} /> {badge.label || 'Wholesale Supplier'}
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-xs text-stone-500 font-medium mt-0.5 hidden md:block truncate">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {/* Right: Actions, Notifications & Profile Dropdown */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {actions && <div className="flex items-center gap-2">{actions}</div>}

                <NotificationDropdown />

                <div className="h-6 sm:h-8 w-px bg-stone-200 hidden sm:block" />

                {/* Profile Dropdown */}
                <div className="relative">
                    <Dropdown>
                        <Dropdown.Trigger>
                            <span className="inline-flex rounded-xl">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 px-1 sm:px-2 py-1 border border-transparent text-sm leading-4 font-bold rounded-xl text-stone-600 bg-transparent hover:bg-stone-50 hover:text-stone-800 focus:outline-none transition-all duration-300 active:scale-95"
                                >
                                    {auth?.user && (
                                        <>
                                            <WorkspaceAccountSummary user={auth.user} className="hidden xl:block text-right" />
                                            <UserAvatar user={auth.user} />
                                            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                                        </>
                                    )}
                                </button>
                            </span>
                        </Dropdown.Trigger>

                        <Dropdown.Content>
                            <Dropdown.Link
                                href={route("profile.edit")}
                                className="flex items-center gap-2"
                            >
                                <User size={16} /> Warehouse Profile
                            </Dropdown.Link>
                            <Dropdown.Link
                                href={route("supplier.materials.index")}
                                className="flex items-center gap-2"
                            >
                                <Package size={16} /> Wholesale Catalog
                            </Dropdown.Link>
                            <Dropdown.Link
                                href={route("supplier.orders.index")}
                                className="flex items-center gap-2"
                            >
                                <ClipboardList size={16} /> Workshop Orders
                            </Dropdown.Link>
                            <Dropdown.Link
                                href={route("help.index", { tab: 'supplier' })}
                                className="flex items-center gap-2"
                            >
                                <HelpCircle size={16} /> Help & Documentation
                            </Dropdown.Link>
                            <WorkspaceLogoutLink className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                <LogOut size={16} /> Sign Out
                            </WorkspaceLogoutLink>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
}
