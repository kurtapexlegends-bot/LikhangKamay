import React from 'react';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import Footer from '@/Layouts/Footer';

export default function ShopLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800 flex flex-col">
            {/* --- CONSISTENT HEADER (Using BuyerNavbar which embeds MobileDock) --- */}
            <BuyerNavbar />

            {/* --- MAIN PAGE CONTENT --- */}
            <main id="main-content" tabIndex={-1} className="flex-1 animate-page-enter focus:outline-none">
                {children}
            </main>

            {/* --- FOOTER --- */}
            <Footer />
        </div>
    );
}