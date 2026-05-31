import React from 'react';
import { Link } from '@inertiajs/react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GuestLayout({ children, image, quote, quoteAuthor }) {
    // Premium Pottery Theme Image
    const bgImage = image || "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?q=80&w=1969&auto=format&fit=crop";

    return (
        // 1. FULL VIEWPORT CANVAS
        <div className="fixed inset-0 z-50 flex items-stretch font-sans overflow-hidden bg-stone-950">
            
            {/* --- LEFT SIDE: CINEMATIC ARTWORK GRID (Hidden on Mobile) --- */}
            <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="hidden lg:flex lg:w-1/2 relative bg-stone-900 flex-col justify-between p-12 overflow-hidden border-r border-stone-800"
            >
                {/* Architectural Ceramic Showcase Background */}
                <img 
                    src={bgImage} 
                    alt="Artisan Craft" 
                    className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-luminosity scale-105 hover:scale-100 transition-transform duration-10000 ease-out"
                    onError={(e) => {
                        e.target.style.opacity = 0;
                    }}
                />
                
                {/* Terracotta/Clay Glaze Filter */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-clay-950/20 z-10"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(215,108,61,0.15),transparent_50%)] z-10"></div>

                {/* Top Section: Logo & Branding */}
                <div className="relative z-20 flex items-center gap-3">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2.5 rounded-xl shadow-inner">
                        <img src="/images/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
                    </div>
                    <span className="font-serif font-bold text-xl tracking-wider text-amber-50">LikhangKamay</span>
                </div>

                {/* Middle Section: Editorial Text */}
                <div className="relative z-20 my-auto max-w-lg">
                    <span className="text-[10px] font-sans tracking-[0.25em] uppercase text-clay-400 font-bold mb-3 block">Artisan Craftsmanship</span>
                    <h2 className="font-serif text-5xl font-bold text-white leading-[1.15] mb-6 tracking-tight">
                        Earth shaped by hand, <br/>
                        fired by soul.
                    </h2>
                    <div className="h-px w-20 bg-clay-500/50 mb-6"></div>
                </div>

                {/* Bottom Section: Glassmorphic Manifesto Card */}
                <div className="relative z-20 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-2xl max-w-md shadow-2xl">
                    <blockquote className="font-serif text-lg leading-relaxed italic text-stone-200 mb-4">
                        "{quote || 'Crafting the future of local pottery.'}"
                    </blockquote>
                    <div className="flex items-center gap-3">
                        <div className="h-0.5 w-4 bg-clay-500"></div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-clay-400 font-bold">
                            {quoteAuthor || 'LikhangKamay'}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* --- RIGHT SIDE: FORM WORKSPACE WITH AMBIENT KILN GLOW --- */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="w-full lg:w-1/2 bg-[#FAF7F2] flex flex-col relative overflow-y-auto px-6 sm:px-12 lg:px-20 py-12 auth-scroll-container"
            >
                {/* Soft Kiln-ambient Glow in background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-clay-500/[0.06] blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }}></div>
                    <div className="absolute bottom-[10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-clay-100/30 blur-[100px] mix-blend-multiply"></div>
                </div>

                {/* Abstract organic pottery watermark SVG in background */}
                <div className="absolute right-[-5%] bottom-[-5%] w-64 h-64 opacity-[0.035] pointer-events-none text-clay-950 select-none z-0">
                    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.8">
                        <path d="M50,10 C35,10 30,25 30,45 C30,70 38,90 50,90 C62,90 70,70 70,45 C70,25 65,10 50,10 Z" />
                        <path d="M30,30 C30,30 40,35 50,35 C60,35 70,30 70,30" />
                        <path d="M30,60 C30,60 40,65 50,65 C60,65 70,60 70,60" />
                        <path d="M50,10 L50,90" strokeDasharray="1 3" />
                    </svg>
                </div>

                <style dangerouslySetInnerHTML={{ __html: `
                    .auth-scroll-container::-webkit-scrollbar { display: none; }
                `}} />
                
                {/* CLOSE BUTTON (X) - Elegant & Minimal */}
                <Link 
                    href="/" 
                    className="absolute top-6 right-6 p-2.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100/50 rounded-full transition-all duration-300 active:scale-95 z-30 border border-stone-200/40 shadow-sm bg-white/50 backdrop-blur-sm"
                    title="Close"
                >
                    <X size={18} />
                </Link>

                {/* Form Content Injected Here */}
                <div className="w-full max-w-md mx-auto relative z-10 my-auto">
                    
                    {/* MOBILE HEADER (Visible only on small screens) */}
                    <div className="lg:hidden flex flex-col items-center mb-8 justify-center text-center">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="bg-clay-50 border border-clay-100/50 p-2 rounded-xl shadow-sm">
                                <img src="/images/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
                            </div>
                            <span className="font-serif font-bold text-xl tracking-wider text-stone-900">LikhangKamay</span>
                        </div>
                        <div className="h-0.5 w-10 bg-clay-500/30 rounded-full"></div>
                    </div>

                    {children}
                </div>
            </motion.div>

        </div>
    );
}
