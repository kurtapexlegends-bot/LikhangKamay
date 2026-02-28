import React from 'react';
import { Link } from '@inertiajs/react';
import Footer from '@/Components/Footer';

export default function MainLayout({ children, auth }) {
    return (
        <div className="min-h-screen bg-[#FDFBF7] font-sans text-gray-600 selection:bg-clay-200 selection:text-clay-900">
            {/* PLATFORM HEADER */}
            <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex justify-between items-center h-24 gap-8"> {/* Increased height from h-20 to h-24 for breathing room */}
                        
                        {/* 1. Platform Identity (FIXED LOGO) */}
                        <Link href="/" className="flex-shrink-0 flex items-center gap-4 group">
                            {/* Logo Image: Increased size, removed heavy rounding that cuts corners */}
                            <img 
                                className="h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
                                src="/images/logo.png" 
                                alt="LikhangKamay Logo" 
                            />
                            
                            {/* Text: Adjusted size and spacing to match the bigger logo */}
                            <div className="flex flex-col justify-center">
                                <span className="font-serif text-2xl font-bold text-gray-900 leading-none tracking-tight">
                                    LikhangKamay
                                </span>
                                <span className="text-[10px] uppercase tracking-widest text-clay-600 font-medium mt-1">
                                    Cavite's Pottery Hub
                                </span>
                            </div>
                        </Link>

                        {/* 2. Global Search (Soft & Rounded) */}
                        <div className="hidden md:flex flex-1 max-w-xl relative mx-8">
                            <input 
                                type="text" 
                                placeholder="Search artisans, workshops, or products..." 
                                className="w-full pl-6 pr-12 py-3 rounded-full border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-clay-200 focus:border-clay-300 transition text-sm shadow-sm"
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full text-clay-500 hover:text-clay-700 shadow-sm border border-gray-100 transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </button>
                        </div>

                        {/* 3. User Actions */}
                        <div className="flex items-center gap-6">
                            <Link href="/artisan/register" className="hidden lg:block text-sm font-medium text-gray-500 hover:text-clay-600 transition">
                                Sell on LikhangKamay
                            </Link>

                            {auth?.user ? (
                                // LOGIC UPDATE: Check Role to decide destination
                                auth.user.role === 'artisan' ? (
                                    <Link href="/dashboard" className="text-sm font-bold text-gray-900 hover:text-clay-600">
                                        Seller Centre
                                    </Link>
                                ) : (
                                    <Link href={route('profile.edit')} className="text-sm font-bold text-gray-900 hover:text-clay-600">
                                        My Account
                                    </Link>
                                )
                            ) : (
                                <div className="flex items-center gap-4">
                                    <Link href={route('login')} className="text-sm font-bold text-gray-800 hover:text-clay-600 transition">
                                        Log in
                                    </Link>
                                    <Link href={route('register')} className="px-6 py-2.5 bg-clay-500 text-white text-sm font-medium rounded-full hover:bg-clay-600 transition shadow-lg shadow-clay-500/20">
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Added padding-top to compensate for taller navbar */}
            <main className="pt-24">
                {children}
            </main>

            {/* FOOTER */}
            <Footer />
        </div>
    );
}