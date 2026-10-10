import React, { createContext, useContext, useMemo, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import SellerSidebar from '@/Layouts/SellerSidebar';
import DisciplinaryStatusBanner from '@/Components/DisciplinaryStatusBanner';
import SellerTermsModal from '@/Components/SellerTermsModal';
import ScrollToTop from '@/Components/ScrollToTop';
import { useResizableSidebar } from '@/hooks/useResizableSidebar';

const SellerWorkspaceShellContext = createContext({
    openSidebar: () => {},
    closeSidebar: () => {},
});

export default function SellerWorkspaceLayout({ active, children, sidebarUser = null, overflowHidden = false }) {
    const { auth } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('seller_sidebar_collapsed_v1') === 'true';
    });

    const handleToggleCollapse = (value) => {
        setIsCollapsed(value);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('seller_sidebar_collapsed_v1', value ? 'true' : 'false');
        }
    };

    const {
        width: sidebarWidth,
        isDragging: isSidebarDragging,
        isDesktop,
        startResizing: handleStartSidebarResize,
        resetWidth: handleResetSidebarWidth,
    } = useResizableSidebar({
        storageKey: 'seller_sidebar_width_v1',
        collapseStorageKey: 'seller_sidebar_collapsed_v1',
        defaultWidth: 220,
        minExpandedWidth: 180,
        maxWidth: 360,
        collapsedWidth: 64,
        snapThreshold: 130,
        isCollapsed,
        onToggleCollapse: handleToggleCollapse,
    });

    // Reset scroll position on route transitions across persistent layout pages
    React.useEffect(() => {
        const mainContent = document.getElementById('seller-main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }, [active]);

    // Gesture-based sidebar reveal (Swipe from left edge)
    React.useEffect(() => {
        let touchStartX = 0;
        let touchStartY = 0;
        const edgeThreshold = 40; // Sensitivity area from left edge
        const swipeThreshold = 50; // Minimum distance to trigger open

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
            // Only trigger if horizontal swipe starting from far left edge and not vertical scrolling
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

    const handleAcceptTerms = () => {
        router.post(route('artisan.accept-terms'), {}, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const handleRejectTerms = () => {
        router.visit('/');
    };

    return (
        <SellerWorkspaceShellContext.Provider value={shell}>
            <a
                href="#seller-main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[100] px-4 py-2 bg-clay-700 text-white text-xs font-semibold rounded-lg shadow-lg ring-2 ring-clay-500 focus:outline-none transition-transform"
            >
                Skip to main content
            </a>
            <DisciplinaryStatusBanner />
            <div className="h-screen overflow-hidden bg-[#FDFBF9] flex font-sans text-gray-800 relative" style={{ '--sidebar-width': `${sidebarWidth}px` }}>
                {/* Clean Subtle Background (No infinite heavy GPU blur repaints) */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
                    <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] rounded-full bg-clay-100/60 blur-[60px]" />
                    <div className="absolute bottom-[-5%] right-[-5%] w-[25%] h-[25%] rounded-full bg-amber-50/60 blur-[40px]" />
                </div>

                <SellerSidebar
                    active={active}
                    user={sidebarUser ?? auth?.user}
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

                <main 
                    scroll-region="true" 
                    id="seller-main-content"
                    tabIndex={-1}
                    style={isDesktop ? { marginLeft: `${sidebarWidth}px` } : undefined}
                    className={`flex min-w-0 flex-1 flex-col overscroll-contain focus:outline-none ${
                        isSidebarDragging ? 'transition-none' : 'transition-[margin] duration-300 cubic-bezier(0.4, 0, 0.2, 1)'
                    } ${
                        overflowHidden ? 'overflow-hidden' : 'overflow-y-auto [scrollbar-gutter:stable]'
                    }`}
                >
                    <div className={`max-w-[90rem] mx-auto w-full flex-1 flex flex-col min-w-0 ${
                        overflowHidden ? 'min-h-0 overflow-hidden' : ''
                    }`}>
                        {children}
                    </div>
                </main>
            </div>

            <ScrollToTop targetSelector='[scroll-region="true"]' />

            {!auth?.hasAcceptedCompliance && (
                <SellerTermsModal
                    show={true}
                    onClose={handleRejectTerms}
                    onAccept={handleAcceptTerms}
                />
            )}
        </SellerWorkspaceShellContext.Provider>
    );
}

export function useSellerWorkspaceShell() {
    return useContext(SellerWorkspaceShellContext);
}
