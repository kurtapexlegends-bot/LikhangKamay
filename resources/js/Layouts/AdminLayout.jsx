import React, { useState } from 'react';
import { Link, Head, usePage } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';
import NotificationDropdown from '@/Components/NotificationDropdown';
import AnnouncementBanner from '@/Components/AnnouncementBanner';
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
    User,
    Award,
    TrendingUp,
    BarChart2,
    ShieldAlert,
    Activity,
    FolderTree
} from 'lucide-react';
import ImpersonationBanner from '@/Components/ImpersonationBanner';

export default function AdminLayout({ title, children }) {
    const { pendingArtisanCount, auth, globalAnnouncement } = usePage().props;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // ... navigationGroups omitted for brevity ...
    // Note: I will only replace the top of the file up to isMobileMenuOpen, then I'll use another replace for the render part.

    const navigationGroups = [
        {
            title: 'Platform Pulse',
            items: [
                { name: 'Overview', href: route('admin.dashboard'), icon: LayoutDashboard, current: route().current('admin.dashboard') },
                { name: 'Insights', href: route('admin.insights'), icon: BarChart2, current: route().current('admin.insights') },
                { name: 'Diagnostics', href: route('admin.diagnostics'), icon: Activity, current: route().current('admin.diagnostics') },
            ]
        },
        {
            title: 'User Accounts',
            items: [
                { name: 'User Directory', href: route('admin.users'), icon: Users, current: route().current('admin.users') },
                {
                    name: 'Artisan Applications',
                    href: route('admin.pending'),
                    icon: Store,
                    current: route().current('admin.pending'),
                    badge: pendingArtisanCount > 0 ? pendingArtisanCount : null
                },
            ]
        },
        {
            title: 'Product Catalog',
            items: [
                { name: 'Taxonomy Engine', href: route('admin.taxonomy.index'), icon: FolderTree, current: route().current('admin.taxonomy.*') },
                { name: 'Sponsorships', href: route('admin.sponsorships'), icon: Award, current: route().current('admin.sponsorships') },
            ]
        },
        {
            title: 'Trust & Safety',
            items: [
                { name: 'Moderation Queue', href: route('admin.moderation'), icon: ShieldAlert, current: route().current('admin.moderation') },
                { name: 'Global Alerts', href: route('admin.announcements'), icon: Bell, current: route().current('admin.announcements*') },
            ]
        },
        {
            title: 'Business Config',
            items: [
                { name: 'Platform Revenue', href: route('admin.monetization'), icon: TrendingUp, current: route().current('admin.monetization') },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans flex flex-col text-gray-800">
            <ImpersonationBanner />
            <AnnouncementBanner announcement={globalAnnouncement} />
            <div className="flex-1 flex">
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
                fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-clay-100 transition-transform duration-300 ease-in-out
                lg:translate-x-0 flex flex-col
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand Header */}
                <div className="px-5 py-3 border-b border-gray-50 shrink-0 bg-white/50 backdrop-blur-sm relative flex items-center justify-between">
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
                        className="lg:hidden text-gray-400 hover:text-gray-600 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-3 py-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {navigationGroups.map((group, index) => (
                        <div key={group.title} className={index > 0 ? 'mt-6' : 'mt-2'}>
                            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                {group.title}
                            </p>
                            <div className="space-y-0.5">
                                {group.items.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        prefetch="hover"
                                        className={`
                                            flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95
                                            ${item.current
                                                ? 'bg-clay-600 text-white shadow-md shadow-clay-200'
                                                : 'text-gray-500 hover:bg-clay-50 hover:text-clay-700 group'}
                                        `}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <item.icon
                                                size={16}
                                                strokeWidth={2.5}
                                                className={item.current ? 'text-white' : 'text-gray-400 group-hover:text-clay-600'}
                                            />
                                            {item.name}
                                        </div>
                                        {item.badge && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.current ? 'bg-white text-clay-600' : 'bg-clay-100 text-clay-600'
                                                }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                {/* Header (Desktop & Mobile) */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40 transition-all duration-300">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all active:scale-95 lg:hidden"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-bold text-gray-900">{title}</h1>
                            {title === 'Overview' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Overview of platform performance</p>}
                            {title === 'Monetization' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Track revenue and subscription metrics</p>}
                            {title === 'Platform Insights' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Deep dive into revenue forecasts, category performance, and platform health</p>}
                            {title === 'User Management' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Manage buyers, artisans, staff, and admins</p>}
                            {title === 'Review Moderation' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Handle seller-submitted review moderation requests</p>}
                            {title === 'Pending Artisans' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Review artisan applications</p>}
                            {title === 'Sponsorship Requests' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Review and manage artisan product sponsorship requests</p>}
                            {title === 'System Announcements' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Manage global alerts and messages across the marketplace.</p>}
                            {title === 'Moderation Queue' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Review flagged products and user content.</p>}
                            {title === 'Diagnostics Command Center' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Monitor platform memory, cache, and external API heartbeat.</p>}
                            {title === 'Global Taxonomy Engine' && <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Manage the global list of product categories.</p>}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-6">
                        {/* Notifications */}
                        <div className="flex items-center gap-2">
                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

                        {/* User Profile Dropdown */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <WorkspaceAccountSummary user={auth.user} className="hidden lg:block text-right" />
                                            <UserAvatar user={auth.user} />
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                                        <LogOut size={16} /> Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 w-full px-4 pt-4 pb-8 sm:px-6 lg:px-8 space-y-6 animate-page-enter">
                    {children}
                </main>
            </div>
            </div>
        </div>
    );
}
