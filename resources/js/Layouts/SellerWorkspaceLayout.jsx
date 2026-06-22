import React, { createContext, useContext, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import SellerSidebar from '@/Layouts/SellerSidebar';
import AnnouncementBanner from '@/Layouts/AnnouncementBanner';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';

const SellerWorkspaceShellContext = createContext({
    openSidebar: () => {},
    closeSidebar: () => {},
});

export default function SellerWorkspaceLayout({ active, children, sidebarUser = null }) {
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

    // Gesture-based sidebar reveal (Swipe from left edge)
    React.useEffect(() => {
        let touchStartX = 0;
        const edgeThreshold = 40; // Sensitivity area from left edge
        const swipeThreshold = 60; // Minimum distance to trigger open

        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
        };

        const handleTouchEnd = (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            // Only trigger if starting from the far left edge and swiping right
            if (touchStartX < edgeThreshold && touchEndX - touchStartX > swipeThreshold) {
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

    return (
        <SellerWorkspaceShellContext.Provider value={shell}>
            <ImpersonationBanner />
            <div className="h-screen overflow-hidden bg-[#FDFBF9] flex font-sans text-gray-800 relative">
                {/* Subtle Gradient Mesh Background */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-40">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-clay-100 blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-amber-50 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                <SellerSidebar
                    active={active}
                    user={sidebarUser ?? auth?.user}
                    mobileOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={handleToggleCollapse}
                />

                <div 
                    scroll-region="true" 
                    className={`flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain transition-all duration-300 ${
                        isCollapsed ? 'lg:ml-16' : 'lg:ml-52'
                    }`}
                >
                    <div className="max-w-[90rem] mx-auto w-full flex-1 flex flex-col min-w-0">
                        {children}
                    </div>
                </div>
            </div>
        </SellerWorkspaceShellContext.Provider>
    );
}

export function useSellerWorkspaceShell() {
    return useContext(SellerWorkspaceShellContext);
}
