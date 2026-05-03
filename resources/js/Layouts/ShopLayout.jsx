import React from 'react';
import { usePage } from '@inertiajs/react';
import BuyerNavbar from '@/Components/BuyerNavbar';
import AnnouncementBanner from '@/Components/AnnouncementBanner';
import Footer from '@/Components/Footer';
import ImpersonationBanner from '@/Components/ImpersonationBanner';

export default function ShopLayout({ children }) {
    const { globalAnnouncement } = usePage().props;

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800 flex flex-col">
            <AnnouncementBanner announcement={globalAnnouncement} />
            {/* --- CONSISTENT HEADER (Using BuyerNavbar) --- */}
            <BuyerNavbar />

            {/* --- MAIN PAGE CONTENT --- */}
            <main className="flex-1 animate-page-enter">
                {children}
            </main>

            {/* --- FOOTER --- */}
            <Footer />
        </div>
    );
}