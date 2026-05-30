import React from 'react';
import { usePage } from '@inertiajs/react';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import AnnouncementBanner from '@/Layouts/AnnouncementBanner';
import Footer from '@/Layouts/Footer';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';
import MobileDock from '@/Layouts/MobileDock';

export default function ShopLayout({ children }) {
    const { globalAnnouncement } = usePage().props;

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800 flex flex-col">
            <ImpersonationBanner />
            <AnnouncementBanner announcement={globalAnnouncement} />
            {/* --- CONSISTENT HEADER (Using BuyerNavbar) --- */}
            <BuyerNavbar />

            {/* --- MAIN PAGE CONTENT --- */}
            <main className="flex-1 animate-page-enter">
                {children}
            </main>

            {/* --- MOBILE NAVIGATION DOCK --- */}
            <MobileDock />

            {/* --- FOOTER --- */}
            <Footer />
        </div>
    );
}