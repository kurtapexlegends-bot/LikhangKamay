import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
    const { platform } = usePage().props;

    return (
        <footer className="bg-white border-t border-gray-100 mt-8 md:mt-12 py-6 md:py-10 pb-24 md:pb-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-sm">
                    {/* Brand Column: Full width on mobile, 1 col on desktop */}
                    <div className="col-span-2 md:col-span-1 text-left">
                        <div className="flex items-center justify-between md:justify-start gap-2 mb-2 md:mb-4">
                            <div className="flex items-center gap-2">
                                <img src={platform.logo} className="h-7 md:h-8 w-auto" alt={platform.name} />
                                <span className="font-serif text-lg md:text-xl font-bold text-gray-900">{platform.name}</span>
                            </div>
                            
                            {/* Social Media Links (Mobile: Inline with Brand) */}
                            <div className="flex md:hidden items-center gap-3">
                                {platform.socials?.facebook && (
                                    <a 
                                        href={platform.socials.facebook} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-stone-400 hover:text-clay-650 transition active:scale-95"
                                        aria-label="Facebook"
                                    >
                                        <Facebook size={15} />
                                    </a>
                                )}
                                {platform.socials?.instagram && (
                                    <a 
                                        href={platform.socials.instagram} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-stone-400 hover:text-clay-650 transition active:scale-95"
                                        aria-label="Instagram"
                                    >
                                        <Instagram size={15} />
                                    </a>
                                )}
                                {platform.socials?.twitter && (
                                    <a 
                                        href={platform.socials.twitter} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-stone-400 hover:text-clay-650 transition active:scale-95"
                                        aria-label="Twitter"
                                    >
                                        <Twitter size={15} />
                                    </a>
                                )}
                            </div>
                        </div>

                        <p className="text-gray-500 leading-relaxed max-w-xs text-xs hidden md:block">
                            {platform.seo.description}
                        </p>
                        
                        {/* Social Media Links (Desktop: Below Description) */}
                        <div className="hidden md:flex items-center gap-4 mt-5">
                            {platform.socials?.facebook && (
                                <a 
                                    href={platform.socials.facebook} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-stone-400 hover:text-clay-650 hover:scale-110 transition"
                                    aria-label="Facebook"
                                >
                                    <Facebook size={16} />
                                </a>
                            )}
                            {platform.socials?.instagram && (
                                <a 
                                    href={platform.socials.instagram} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-stone-400 hover:text-clay-650 hover:scale-110 transition"
                                    aria-label="Instagram"
                                >
                                    <Instagram size={16} />
                                </a>
                            )}
                            {platform.socials?.twitter && (
                                <a 
                                    href={platform.socials.twitter} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-stone-400 hover:text-clay-650 hover:scale-110 transition"
                                    aria-label="Twitter"
                                >
                                    <Twitter size={16} />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Platform Navigation */}
                    <div className="text-left">
                        <h4 className="font-bold text-gray-900 mb-2 md:mb-4 uppercase tracking-wider text-[11px] md:text-xs">Platform</h4>
                        <div className="flex flex-col gap-1.5 md:gap-3 text-xs md:text-sm text-gray-500">
                            <Link href={route('shop.index')} className="hover:text-clay-600 transition">Shop Ceramics</Link>
                            <Link href="/artisan/register" className="hover:text-clay-600 transition">Sell on LikhangKamay</Link>
                        </div>
                    </div>

                    {/* Legal & Support Navigation */}
                    <div className="text-left">
                        <h4 className="font-bold text-gray-900 mb-2 md:mb-4 uppercase tracking-wider text-[11px] md:text-xs">Support</h4>
                        <div className="flex flex-col gap-1.5 md:gap-3 text-xs md:text-sm text-gray-500">
                            <Link href={route('seller.agreement')} className="hover:text-clay-600 transition">Seller Agreement</Link>
                            <Link href={route('privacy')} className="hover:text-clay-600 transition">Privacy Policy</Link>
                            <Link href={route('terms')} className="hover:text-clay-600 transition">Terms of Service</Link>
                        </div>
                    </div>

                    {/* Contact Information: Full width on mobile, 1 col on desktop */}
                    <div className="col-span-2 md:col-span-1 text-left pt-2 md:pt-0 border-t border-gray-100 md:border-t-0">
                        <h4 className="font-bold text-gray-900 mb-2 md:mb-4 uppercase tracking-wider text-[11px] md:text-xs">Contact Us</h4>
                        <div className="flex flex-wrap md:flex-col gap-x-5 gap-y-1.5 md:gap-3 text-gray-500 text-xs">
                            {platform.contact?.email && (
                                <a href={`mailto:${platform.contact.email}`} className="flex items-center gap-1.5 hover:text-clay-600 transition">
                                    <Mail size={13} className="text-stone-400 shrink-0" />
                                    <span className="truncate">{platform.contact.email}</span>
                                </a>
                            )}
                            {platform.contact?.phone && (
                                <a href={`tel:${platform.contact.phone}`} className="flex items-center gap-1.5 hover:text-clay-600 transition">
                                    <Phone size={13} className="text-stone-400 shrink-0" />
                                    <span>{platform.contact.phone}</span>
                                </a>
                            )}
                            {platform.contact?.address && (
                                <div className="flex items-start gap-1.5 w-full">
                                    <MapPin size={13} className="text-stone-400 shrink-0 mt-0.5" />
                                    <span className="leading-relaxed text-[11px] md:text-xs">{platform.contact.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Copyright */}
                <div className="mt-5 md:mt-8 pt-4 md:pt-6 border-t border-gray-50 text-center md:text-left text-[11px] md:text-xs text-gray-400">
                    © {new Date().getFullYear()} {platform.name}. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
