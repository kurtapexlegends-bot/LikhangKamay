import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

export default function HeroSection() {
    return (
        <>
            {/* HERO BANNER - DESKTOP/TABLET (Original Full-bleed backdrop overlay) */}
            <div className="hidden md:block w-full h-[360px] rounded-xl overflow-hidden relative group shadow-lg">
                <img 
                    src="https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&q=80&w=1600" 
                    alt="Handcrafted Pottery" 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-10">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">The Art of Clay</h1>
                    <p className="text-white/80 text-sm md:text-base mb-5 max-w-lg">
                        Discover handcrafted masterpieces from Cavite's finest artisans. Support local, buy authentic.
                    </p>
                    <Link 
                        href={route('shop.index')} 
                        className="bg-white text-gray-800 px-6 py-3 rounded-sm text-sm font-medium w-fit hover:bg-clay-50 transition shadow flex items-center gap-2 min-h-[44px]"
                    >
                        Shop Collection <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {/* HERO BANNER - MOBILE (Touch-optimized beautiful split layout) */}
            <div className="block md:hidden w-full relative overflow-hidden rounded-2xl shadow-md border border-stone-200/50 bg-[#FAF8F5]">
                <div className="flex flex-col-reverse items-stretch min-h-[280px]">
                    {/* Text Column */}
                    <div className="flex-1 p-6 flex flex-col justify-center bg-gradient-to-t from-stone-50/90 via-white/80 to-transparent relative z-10">
                        <span className="inline-block text-[9px] font-black uppercase tracking-[0.25em] text-clay-600 mb-2">Curated Cavite Pottery</span>
                        <h1 className="text-2xl font-serif font-black text-stone-900 mb-2.5 leading-tight">The Art of Clay</h1>
                        <p className="text-stone-600 text-xs mb-5 max-w-sm leading-relaxed">
                            Discover handcrafted masterpieces from Cavite's finest artisans. Support local, buy authentic.
                        </p>
                        <Link 
                            href={route('shop.index')} 
                            className="bg-stone-900 text-white hover:bg-stone-850 px-5 py-3 rounded-xl text-xs font-black w-fit transition shadow-md active:scale-95 flex items-center justify-center gap-2 border border-stone-900 hover:border-stone-850 min-h-[44px]"
                        >
                            Shop Collection <ArrowRight size={14} />
                        </Link>
                    </div>
                    {/* Image Column */}
                    <div className="w-full h-[180px] overflow-hidden relative">
                        <img 
                            src="https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&q=80&w=1600" 
                            alt="Handcrafted Pottery" 
                            className="w-full h-full object-cover transform hover:scale-105 transition duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5] via-transparent to-transparent"></div>
                    </div>
                </div>
            </div>
        </>
    );
}
