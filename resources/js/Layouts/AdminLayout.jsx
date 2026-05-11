import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
    FolderTree,
    Clock3,
    RotateCcw
} from 'lucide-react';
import ImpersonationBanner from '@/Components/ImpersonationBanner';

import GlobalSearch from '@/Components/GlobalSearch';

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
                { name: 'SLA Monitoring', href: route('admin.sla'), icon: Clock3, current: route().current('admin.sla') },
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
                { name: 'Restoration Center', href: route('admin.trash'), icon: RotateCcw, current: route().current('admin.trash') },
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
                    <Link href={route('admin.dashboard')} className="flex items-center gap-2.5 group">
                        <img
                            src={usePage().props.platform.logo}
                            alt={usePage().props.platform.name}
                            className="w-7 h-7 object-contain transition-transform group-hover:scale-110"
                        />
                        <span className="font-serif text-lg font-bold text-gray-900 tracking-tight">{usePage().props.platform.name}</span>
                    </Link>

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
                                {group.items.map((item) => {
                                    const MotionLink = motion(Link);
                                    return (
                                        <MotionLink
                                            key={item.name}
                                            href={item.href}
                                            prefetch="hover"
                                            whileTap={{ scale: 0.98, x: 2 }}
                                            className={`
                                                flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors duration-200
                                                ${item.current
                                                    ? 'bg-clay-600 text-white shadow-[0_4px_12px_rgba(182,107,76,0.25)]'
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
                                        </MotionLink>
                                    );
                                })}
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
                            <h1 className="truncate text-xl font-bold text-gray-900">
                                {title === 'Platform Insights' ? 'Insights' :
                                 title === 'Diagnostics Command Center' ? 'Diagnostics' :
                                 title === 'User Management' ? 'User Directory' :
                                 title === 'Pending Artisans' ? 'Artisan Applications' :
                                 title === 'Global Taxonomy Engine' ? 'Taxonomy Engine' :
                                 title === 'Sponsorship Requests' ? 'Sponsorships' :
                                 title === 'System Announcements' ? 'Global Alerts' :
                                 title === 'Monetization' ? 'Platform Revenue' :
                                 title}
                            </h1>
                            
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5 hidden sm:block">
                                {title === 'Overview' && "Overview of platform performance"}
                                {title === 'Monetization' && "Track revenue and subscription metrics"}
                                {title === 'Platform Insights' && "Revenue forecasts and performance analytics"}
                                {title === 'User Management' && "Manage buyers, artisans, staff, and admins"}
                                {title === 'Review Moderation' && "Handle seller-submitted review moderation requests"}
                                {title === 'Pending Artisans' && "Review artisan applications"}
                                {title === 'Sponsorship Requests' && "Manage artisan product sponsorship requests"}
                                {title === 'System Announcements' && "Manage global alerts and messages"}
                                {title === 'Moderation Queue' && "Review flagged products and user content"}
                                {title === 'Diagnostics Command Center' && "Monitor system memory, cache, and heartbeats"}
                                {title === 'Global Taxonomy Engine' && "Manage the global product category list"}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-6">
                        <GlobalSearch />
                        
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
