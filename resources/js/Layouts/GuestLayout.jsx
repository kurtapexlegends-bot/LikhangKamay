import React from 'react';
import { Link } from '@inertiajs/react';
import { X } from 'lucide-react';

export default function GuestLayout({ children, image, quote, quoteAuthor }) {
    // Default Pottery Theme Image
    const bgImage = image || "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?q=80&w=1969&auto=format&fit=crop";

    return (
        // 1. FULL SCREEN WRAPPER (Fixed)
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
            
            {/* 2. BACKDROP (Dimmed & Blurred like Lazada) */}
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm">
                <img 
                    src="https://images.unsplash.com/photo-1459156212016-c812468e2115?q=80&w=2000&auto=format&fit=crop" 
                    className="w-full h-full object-cover opacity-20" 
                    alt="Background"
                />
            </div>

            {/* 3. THE MODAL CARD (Split Layout) */}
            <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[90vh] animate-fade-in-up">
                
                {/* --- LEFT SIDE: IMAGE / BRANDING (Hidden on Mobile) --- */}
                <div className="hidden md:flex md:w-5/12 relative bg-clay-800 text-white flex-col justify-between p-8 overflow-hidden">
                    {/* Background Image for Left Side */}
                    <img 
                        src={bgImage} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay transition-opacity duration-300"
                        onError={(e) => {
                            e.target.style.opacity = 0;
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-clay-900/90 to-transparent"></div>

                    {/* Logo/Brand (Top Left) */}
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="bg-white/20 backdrop-blur border border-white/30 p-2 rounded-lg">
                            <img src="/images/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="font-serif font-bold text-lg tracking-wide">LikhangKamay</span>
                    </div>

                    {/* Quote (Bottom Left) */}
                    <div className="relative z-10">
                        <blockquote className="font-serif text-2xl leading-snug italic mb-4">
                            "{quote || 'Crafting the future of local pottery.'}"
                        </blockquote>
                        <p className="text-xs uppercase tracking-widest opacity-70 font-bold">
                            — {quoteAuthor || 'LikhangKamay'}
                        </p>
                    </div>
                </div>

                {/* --- RIGHT SIDE: FORM (Hidden Scrollbar) --- */}
                <div 
                    className="w-full md:w-7/12 bg-white p-6 lg:p-10 pt-8 relative flex flex-col overflow-y-auto"
                    style={{ 
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                >
                    {/* MOBILE HEADER (Visible only on small screens) */}
                    <div className="md:hidden flex items-center justify-center gap-2 mb-6 text-clay-800">
                        <img src="/images/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                        <span className="font-serif font-bold text-xl tracking-wide">LikhangKamay</span>
                    </div>
                    {/* Hide webkit scrollbar */}
                    <style dangerouslySetInnerHTML={{ __html: `
                        .auth-scroll-container::-webkit-scrollbar { display: none; }
                    `}} />
                    
                    {/* CLOSE BUTTON (X) - Top Right */}
                    <Link 
                        href="/" 
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                        title="Close"
                    >
                        <X size={20} />
                    </Link>

                    {/* Form Content Injected Here */}
                    {children}
                </div>

            </div>
        </div>
    );
}