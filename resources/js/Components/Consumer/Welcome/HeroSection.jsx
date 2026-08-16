import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

export default function HeroSection() {
    return (
        <>
            {/* HERO BANNER - DESKTOP/TABLET (Full-bleed backdrop overlay with responsive heights) */}
            <div className="hidden md:block w-full h-[320px] md:h-[360px] lg:h-[400px] rounded-2xl overflow-hidden relative group shadow-md border border-stone-200/40">
                <img 
                    src="https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&q=80&w=1600" 
                    alt="Handcrafted Pottery" 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-900/40 to-transparent flex flex-col justify-end p-6 md:p-8 lg:p-10">
                    <span className="inline-block text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-clay-200 mb-2">
                        Authentic Philippine Pottery
                    </span>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white mb-2 leading-tight">
                        The Art of Clay
                    </h1>
                    <p className="text-stone-200 text-xs sm:text-sm md:text-base mb-5 max-w-lg leading-relaxed">
                        Discover handcrafted masterpieces from Cavite's finest artisans. Support local, buy authentic.
                    </p>
                    <Link 
                        href={route('shop.index')} 
                        className="bg-white hover:bg-stone-100 text-stone-900 px-6 py-3 rounded-xl text-xs md:text-sm font-bold w-fit transition shadow-md active:scale-95 flex items-center gap-2 min-h-[44px]"
                    >
                        Shop Collection <ArrowRight size={15} />
                    </Link>
                </div>
            </div>

            {/* HERO BANNER - MOBILE (Touch-optimized split card) */}
            <div className="block md:hidden w-full relative overflow-hidden rounded-2xl shadow-xs border border-stone-200/60 bg-[#FAF8F5]">
                <div className="flex flex-col-reverse items-stretch">
                    {/* Text Column */}
                    <div className="p-5 sm:p-6 flex flex-col justify-center bg-gradient-to-t from-stone-50/90 via-white/80 to-transparent relative z-10">
                        <span className="inline-block text-[9px] font-black uppercase tracking-[0.25em] text-clay-700 mb-1.5">
                            Curated Artisan Pottery
                        </span>
                        <h1 className="text-2xl font-serif font-black text-stone-900 mb-2 leading-tight">
                            The Art of Clay
                        </h1>
                        <p className="text-stone-600 text-xs mb-4 leading-relaxed">
                            Discover handcrafted masterpieces from Cavite's finest artisans. Support local, buy authentic.
                        </p>
                        <Link 
                            href={route('shop.index')} 
                            className="bg-stone-900 text-white hover:bg-stone-850 px-5 py-3 rounded-xl text-xs font-bold w-full sm:w-fit transition shadow-xs active:scale-95 flex items-center justify-center gap-2 border border-stone-900 min-h-[44px]"
                        >
                            Shop Collection <ArrowRight size={14} />
                        </Link>
                    </div>
                    {/* Image Column */}
                    <div className="w-full h-[160px] sm:h-[180px] overflow-hidden relative">
                        <img 
                            src="https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&q=80&w=1600" 
                            alt="Handcrafted Pottery" 
                            className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5] via-transparent to-transparent"></div>
                    </div>
                </div>
            </div>
        </>
    );
}
