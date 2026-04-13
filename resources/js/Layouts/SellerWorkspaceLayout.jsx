import React, { createContext, useContext, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';

const SellerWorkspaceShellContext = createContext({
    openSidebar: () => {},
    closeSidebar: () => {},
});

export default function SellerWorkspaceLayout({ active, children, sidebarUser = null }) {
    const { auth } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const shell = useMemo(() => ({
        openSidebar: () => setSidebarOpen(true),
        closeSidebar: () => setSidebarOpen(false),
    }), []);

    return (
        <SellerWorkspaceShellContext.Provider value={shell}>
            <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
                <SellerSidebar
                    active={active}
                    user={sidebarUser ?? auth?.user}
                    mobileOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                    {children}
                </div>
            </div>
        </SellerWorkspaceShellContext.Provider>
    );
}

export function useSellerWorkspaceShell() {
    return useContext(SellerWorkspaceShellContext);
}
