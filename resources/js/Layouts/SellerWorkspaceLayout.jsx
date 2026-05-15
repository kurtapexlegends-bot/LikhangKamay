import React, { createContext, useContext, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import AnnouncementBanner from '@/Components/AnnouncementBanner';
import ImpersonationBanner from '@/Components/ImpersonationBanner';

const SellerWorkspaceShellContext = createContext({
    openSidebar: () => {},
    closeSidebar: () => {},
});

import { useRealtime } from '@/hooks/useRealtime';

export default function SellerWorkspaceLayout({ active, children, sidebarUser = null }) {
    const { auth } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Enable Real-time synchronization
    useRealtime();

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
                />

                <div scroll-region="true" className="flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:ml-52 animate-page-enter">
                    {children}
                </div>
            </div>
        </SellerWorkspaceShellContext.Provider>
    );
}

export function useSellerWorkspaceShell() {
    return useContext(SellerWorkspaceShellContext);
}
