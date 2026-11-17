/* global route */
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import SupplierSidebar from '@/Layouts/SupplierSidebar';
import SupplierHeader from '@/Layouts/SupplierHeader';
import ScrollToTop from '@/Components/ScrollToTop';
import { useResizableSidebar } from '@/hooks/useResizableSidebar';

const SupplierWorkspaceShellContext = createContext({
    openSidebar: () => {},
    closeSidebar: () => {},
});

export default function SupplierLayout({
    children,
    active = 'dashboard',
    title = null,
    subtitle = null,
    badge = null,
    actions = null,
    breadcrumbs = null,
    showHeader = true
}) {
    const { auth } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('supplier_sidebar_collapsed_v1') === 'true';
    });

    const handleToggleCollapse = (value) => {
        setIsCollapsed(value);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('supplier_sidebar_collapsed_v1', value ? 'true' : 'false');
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = parseInt(window.localStorage.getItem('supplier_sidebar_width_v1'), 10);
            if (stored && (stored > 240 || stored < 180)) {
                window.localStorage.setItem('supplier_sidebar_width_v1', '220');
            }
        }
    }, []);

    const {
        width: sidebarWidth,
        isDragging: isSidebarDragging,
        isDesktop,
        startResizing: handleStartSidebarResize,
        resetWidth: handleResetSidebarWidth,
    } = useResizableSidebar({
        storageKey: 'supplier_sidebar_width_v1',
        collapseStorageKey: 'supplier_sidebar_collapsed_v1',
        defaultWidth: 220,
        minExpandedWidth: 180,
        maxWidth: 360,
        collapsedWidth: 64,
        snapThreshold: 130,
        isCollapsed,
        onToggleCollapse: handleToggleCollapse,
    });

    // Reset scroll on navigation across supplier pages
    useEffect(() => {
        const mainContent = document.getElementById('supplier-main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }, [active]);

    // Touch gesture reveal for mobile sidebar
    useEffect(() => {
        let touchStartX = 0;
        let touchStartY = 0;
        const edgeThreshold = 40;
        const swipeThreshold = 50;

        const handleTouchStart = (e) => {
            if (!e.touches || e.touches.length === 0) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchEnd = (e) => {
            if (!e.changedTouches || e.changedTouches.length === 0) return;
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = Math.abs(touchEndY - touchStartY);

            if (touchStartX < edgeThreshold && deltaX > swipeThreshold && deltaX > deltaY) {
                setSidebarOpen(true);
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    const shell = useMemo(() => ({
        openSidebar: () => setSidebarOpen(true),
        closeSidebar: () => setSidebarOpen(false),
    }), []);

    // Intelligent default headers based on active page
    const defaultHeaders = useMemo(() => {
        const user = auth?.user;
        const companyName = user?.shop_name || user?.name || 'Wholesale Supplier';

        if (active === 'dashboard' || active === 'overview') {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
            return {
                title: `${greeting}, ${companyName}`,
                subtitle: `Cavite B2B Wholesale Hub • ${user?.city || 'General Trias'}, Cavite`,
                badge: { label: 'Verified Supplier', iconColor: 'text-emerald-400' }
            };
        }

        if (active === 'materials') {
            return {
                title: 'Wholesale Materials Inventory',
                subtitle: 'Manage bulk raw crafting supplies, Minimum Order Quantities (MOQ), and volume pricing tiers.',
                badge: { label: 'Supply Catalog', iconColor: 'text-teal-400' }
            };
        }

        if (active === 'orders') {
            return {
                title: 'Artisan Workshop Orders',
                subtitle: 'Inbound raw material procurement orders placed by Cavite artisan studios.',
                badge: { label: 'B2B Procurement', iconColor: 'text-amber-400' }
            };
        }

        return {
            title: companyName,
            subtitle: 'Cavite B2B Supply Network',
            badge: { label: 'Supplier Portal', iconColor: 'text-teal-400' }
        };
    }, [active, auth?.user]);

    const resolvedTitle = title || defaultHeaders.title;
    const resolvedSubtitle = subtitle || defaultHeaders.subtitle;
    const resolvedBadge = badge || defaultHeaders.badge;

    return (
        <SupplierWorkspaceShellContext.Provider value={shell}>
            <a
                href="#supplier-main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[100] px-4 py-2 bg-clay-700 text-white text-xs font-semibold rounded-lg shadow-lg ring-2 ring-clay-500 focus:outline-none transition-transform"
            >
                Skip to main content
            </a>

            <div 
                className="h-screen overflow-hidden bg-[#FDFBF9] flex font-sans text-stone-800 relative"
                style={{ '--sidebar-width': `${sidebarWidth}px` }}
            >
                {/* Ambient Decorative Gradient Spheres (Lightweight, No Repaint Bottlenecks) */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-35">
                    <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] rounded-full bg-teal-100/50 blur-[60px]" />
                    <div className="absolute bottom-[-5%] right-[-5%] w-[25%] h-[25%] rounded-full bg-clay-100/40 blur-[50px]" />
                </div>

                {/* Left Workspace Sidebar */}
                <SupplierSidebar
                    active={active}
                    user={auth?.user}
                    mobileOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={handleToggleCollapse}
                    sidebarWidth={sidebarWidth}
                    isDragging={isSidebarDragging}
                    isDesktop={isDesktop}
                    onStartResize={handleStartSidebarResize}
                    onResetWidth={handleResetSidebarWidth}
                />

                {/* Main Content Area */}
                <main
                    scroll-region="true"
                    id="supplier-main-content"
                    tabIndex={-1}
                    style={isDesktop ? { marginLeft: `${isCollapsed ? 64 : sidebarWidth}px` } : undefined}
                    className={`flex min-w-0 flex-1 flex-col overscroll-contain focus:outline-none overflow-y-auto [scrollbar-gutter:stable] ${
                        isSidebarDragging ? 'transition-none' : 'transition-[margin] duration-300 cubic-bezier(0.4, 0, 0.2, 1)'
                    }`}
                >
                    {/* Top Header */}
                    {showHeader && (
                        <SupplierHeader
                            title={resolvedTitle}
                            subtitle={resolvedSubtitle}
                            badge={resolvedBadge}
                            actions={actions}
                            breadcrumbs={breadcrumbs}
                            onMenuClick={() => setSidebarOpen(true)}
                        />
                    )}

                    {/* Page Content Container */}
                    <div className="max-w-[90rem] mx-auto w-full flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
                        {children}
                    </div>
                </main>
            </div>

            <ScrollToTop targetSelector='[scroll-region="true"]' />
        </SupplierWorkspaceShellContext.Provider>
    );
}

export function useSupplierWorkspaceShell() {
    return useContext(SupplierWorkspaceShellContext);
}
