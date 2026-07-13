import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Head, usePage } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';
import NotificationDropdown from '@/Components/NotificationDropdown';
import { useRealtime } from '@/hooks/useRealtime';
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
    Shield,
    Activity,
    FolderTree,
    Clock3,
    RotateCcw,
    Lock,
    Loader2,
    ShoppingBag,
    Star,
    MessageSquare,
    Trash2
} from 'lucide-react';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';

import GlobalSearch from '@/Components/Consumer/GlobalSearch';

const MotionLink = motion(Link);

const GROUPS_STORAGE_KEY = 'admin_sidebar_expanded_groups_v1';

const isTabActive = (routeName, tabName = null) => {
    if (typeof window === 'undefined') {
        return route().current(routeName);
    }
    const isCurrentRoute = route().current(routeName);
    if (!isCurrentRoute) return false;
    if (!tabName) return true;
    const currentTab = new URLSearchParams(window.location.search).get('tab');
    const defaultTabMap = {
        'admin.users.manager': 'directory',
        'admin.compliance': 'flags',
        'admin.catalog.index': 'taxonomy'
    };
    const activeTab = currentTab || defaultTabMap[routeName] || '';
    return activeTab === tabName;
};

const resolveActiveGroup = (path, search = '') => {
    const params = new URLSearchParams(search);
    const tab = params.get('tab') || '';
    if (tab === 'monetization') return 'Operations Hub';

    if (path.includes('dashboard') || path.includes('insights') || path.includes('operations')) return 'Operations Hub';
    if (path.includes('users') || path.includes('pending') || path.includes('catalog')) return 'Marketplace';
    if (path.includes('moderation') || path.includes('compliance') || path.includes('disputes')) return 'Safety & Compliance';
    if (path.includes('settings')) return 'System Settings';
    return null;
};

const getInitialExpandedGroups = () => {
    const defaultGroups = {
        'Operations Hub': true,
        'Marketplace': true,
        'Safety & Compliance': true,
        'System Settings': true,
    };

    if (typeof window === 'undefined') return defaultGroups;

    try {
        const raw = window.localStorage.getItem(GROUPS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        
        // Auto-expand group based on current URL
        const activeGroup = resolveActiveGroup(window.location.pathname, window.location.search);

        if (parsed && typeof parsed === 'object') {
            return {
                ...defaultGroups,
                ...parsed,
                ...(activeGroup ? { [activeGroup]: true } : {}),
            };
        }
    } catch {
        // Ignore invalid localStorage data
    }

    return defaultGroups;
};

export default function AdminLayout({ title, children }) {
    // Enable Real-time synchronization
    useRealtime();

    const { pendingArtisanCount, auth } = usePage().props;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState(() => getInitialExpandedGroups());
    const [isImpersonating, setIsImpersonating] = useState(false);

    useEffect(() => {
        const handleStartImpersonation = () => setIsImpersonating(true);
        window.addEventListener('start-impersonation-loading', handleStartImpersonation);
        return () => window.removeEventListener('start-impersonation-loading', handleStartImpersonation);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(expandedGroups));
    }, [expandedGroups]);

    const toggleGroup = (title) => {
        setExpandedGroups(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    const navigationGroups = [
        {
            title: 'Operations Hub',
            items: [
                { name: 'Overview', href: route('admin.dashboard'), icon: LayoutDashboard, current: isTabActive('admin.dashboard') },
                { name: 'Insights', href: route('admin.insights'), icon: BarChart2, current: isTabActive('admin.insights') },
                { name: 'Monetization', href: route('admin.settings.index', { tab: 'monetization' }), icon: TrendingUp, current: isTabActive('admin.settings.index', 'monetization') },
                { name: 'Audit Logs', href: route('admin.operations'), icon: Shield, current: isTabActive('admin.operations') },
            ]
        },
        {
            title: 'Marketplace',
            items: [
                { name: 'User Directory', href: route('admin.users.manager', { tab: 'directory' }), icon: Users, current: isTabActive('admin.users.manager', 'directory') },
                {
                    name: 'Artisan Applications',
                    href: route('admin.users.manager', { tab: 'approvals' }),
                    icon: Award,
                    current: isTabActive('admin.users.manager', 'approvals'),
                    badge: pendingArtisanCount > 0 ? pendingArtisanCount : null
                },
                { name: 'Product Moderation', href: route('admin.catalog.index', { tab: 'moderation' }), icon: ShoppingBag, current: isTabActive('admin.catalog.index', 'moderation') },
                { name: 'Sponsorships', href: route('admin.catalog.index', { tab: 'sponsorships' }), icon: Star, current: isTabActive('admin.catalog.index', 'sponsorships') },
            ]
        },
        {
            title: 'Safety & Compliance',
            items: [
                { name: 'Moderation Queue', href: route('admin.compliance', { tab: 'flags' }), icon: ShieldAlert, current: isTabActive('admin.compliance', 'flags') },
                { name: 'Review Disputes', href: route('admin.compliance', { tab: 'disputes' }), icon: MessageSquare, current: isTabActive('admin.compliance', 'disputes') },
                { name: 'Escalated Disputes', href: route('admin.disputes.index'), icon: RotateCcw, current: isTabActive('admin.disputes.index') },
            ]
        },
        {
            title: 'System Settings',
            items: [
                { name: 'System Config', href: route('admin.settings.index'), icon: Settings, current: isTabActive('admin.settings.index') && !isTabActive('admin.settings.index', 'monetization') },
            ]
        }
    ];

    const activeItem = useMemo(() => {
        return navigationGroups
            .flatMap(g => g.items)
            .find(item => item.current);
    }, [navigationGroups]);

    const resolvedTitle = activeItem ? activeItem.name : title;

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans flex flex-col text-stone-800">
            <ImpersonationBanner />
            <div className="flex-1 flex">
                <Head title={resolvedTitle ? `${resolvedTitle} - Admin` : 'Admin Panel'} />

                {/* Mobile Sidebar Overlay */}
                {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-52 bg-white border-r border-clay-100 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                lg:translate-x-0 flex flex-col
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand Header */}
                <div className="px-5 py-4 border-b border-stone-50 shrink-0 bg-white/50 backdrop-blur-sm relative flex items-center justify-between">
                    <Link href={route('admin.dashboard')} className="flex items-center gap-2.5 group">
                        <img
                            src={usePage().props.platform.logo}
                            alt={usePage().props.platform.name}
                            className="w-7 h-7 object-contain transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
                        />
                        <span className="font-serif text-lg font-bold text-stone-900 tracking-tight">{usePage().props.platform.name}</span>
                    </Link>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden text-stone-400 hover:text-stone-600 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
                    {navigationGroups.map((group, index) => (
                        <CategoryGroup
                            key={group.title}
                            title={group.title}
                            open={!!expandedGroups[group.title]}
                            onToggle={() => toggleGroup(group.title)}
                            isFirst={index === 0}
                        >
                            {group.items.map((item) => (
                                <NavItem
                                    key={item.name}
                                    href={item.href}
                                    icon={item.icon}
                                    active={item.current}
                                    badge={item.badge}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item.name}
                                </NavItem>
                            ))}
                        </CategoryGroup>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-52 transition-all duration-500 ease-in-out">
                {/* Header (Desktop & Mobile) */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-stone-100 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40 transition-all duration-300">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-all active:scale-95 lg:hidden"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-bold text-stone-900 tracking-tight">
                                {resolvedTitle}
                            </h1>
                            
                            <p className="text-[11px] text-stone-500 font-medium mt-0.5 hidden sm:block">
                                {{
                                    'Overview': "Monitor platform metrics and performance.",
                                    'Insights': "View revenue forecasts and platform analytics.",
                                    'Monetization': "View platform subscriptions, sponsorships, and financial performance.",
                                    'Audit Logs': "Track background jobs, logs, and system SLAs.",
                                    'User Directory': "Manage platform users, staff profiles, and onboarding applications.",
                                    'Artisan Applications': "Approve or reject artisan registration applications.",
                                    'Product Moderation': "Review, approve, and moderate artisan product listings.",
                                    'Taxonomy Engine': "Manage product categories, tags, and taxonomy.",
                                    'Sponsorships': "Manage sponsored product campaigns.",
                                    'Moderation Queue': "Review flagged listings, reviews, and user content.",
                                    'Review Disputes': "Moderate customer review disputes.",
                                    'Escalated Disputes': "Moderate and resolve escalated customer disputes.",
                                    'Restoration Center': "Restore or permanently delete removed database records.",
                                    'System Config': "Configure platform settings, payment gateways, and fees."
                                }[resolvedTitle] || ""}
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
                        <div className="h-8 w-px bg-stone-200 hidden sm:block"></div>

                        {/* User Profile Dropdown */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-stone-500 bg-transparent hover:text-stone-700 focus:outline-none transition ease-in-out duration-150">
                                            <WorkspaceAccountSummary user={auth.user} className="hidden lg:block text-right" />
                                            <UserAvatar user={auth.user} />
                                            <ChevronDown size={16} className="text-stone-400" />
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
                    <div className="max-w-[90rem] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
            </div>

            {/* GLOBAL IMPERSONATION OVERLAY (TRULY FULL SCREEN) */}
            {isImpersonating && (
                <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-stone-900/60 backdrop-blur-xl animate-in fade-in duration-700">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Lock size={24} className="text-stone-400 animate-pulse" />
                        </div>
                        <Loader2 className="h-24 w-24 animate-spin text-stone-400/20" strokeWidth={1.5} />
                    </div>
                    
                    <div className="mt-8 text-center">
                        <h3 className="text-xl font-black tracking-[0.2em] text-white uppercase italic">Securing Session</h3>
                        <p className="mt-2 text-[10px] font-bold text-stone-400/60 uppercase tracking-[0.3em]">Synchronizing marketplace identity...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

const CategoryGroup = ({ title, open, onToggle, isFirst, children }) => (
    <div className={isFirst ? 'mt-1.5' : 'mt-4'}>
        <motion.button
            type="button"
            onClick={onToggle}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400 transition-all hover:text-stone-600 focus:outline-none"
        >
            <span>{title}</span>
            <ChevronDown
                size={12}
                className={`transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${open ? '' : '-rotate-90'}`}
            />
        </motion.button>
        <AnimatePresence initial={false}>
            {open && (
                <motion.div
                    initial={{ height: 0, opacity: 0, y: -4 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -4 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden space-y-1 pt-1.5"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

const NavItem = ({ href, icon: Icon, active, badge, onClick, children }) => {
    return (
        <MotionLink
            href={href}
            prefetch="hover"
            preserveScroll
            onClick={onClick}
            whileTap={{ scale: 0.98 }}
            className={`
                flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300
                ${active
                    ? 'bg-clay-600 text-white shadow-[0_4px_12px_rgba(182,107,76,0.25)]'
                    : 'text-stone-500 hover:bg-clay-50 hover:text-clay-700 group'}
            `}
        >
            <div className="flex items-center gap-3">
                <Icon
                    size={16}
                    strokeWidth={2.5}
                    className={`transition-colors duration-300 ${active ? 'text-white' : 'text-stone-400 group-hover:text-clay-600'}`}
                />
                {children}
            </div>
            {badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors duration-300 ${active ? 'bg-white/20 text-white ring-1 ring-white/30' : 'bg-clay-100 text-clay-700'
                    }`}>
                    {badge}
                </span>
            )}
        </MotionLink>
    );
};
