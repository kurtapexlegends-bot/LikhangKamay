import React from 'react';
import BuyerNavbar from '@/Components/BuyerNavbar';
import Footer from '@/Components/Footer';

export default function ShopLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            
            {/* --- CONSISTENT HEADER (Using BuyerNavbar) --- */}
            <BuyerNavbar />

            {/* --- MAIN PAGE CONTENT --- */}
            <main>
                {children}
            </main>

            {/* --- FOOTER --- */}
            <Footer />
        </div>
    );
}