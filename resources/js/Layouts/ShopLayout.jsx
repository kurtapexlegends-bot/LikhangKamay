import React from 'react';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import Footer from '@/Layouts/Footer';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';
import MobileDock from '@/Layouts/MobileDock';

export default function ShopLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800 flex flex-col">
            <ImpersonationBanner />
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