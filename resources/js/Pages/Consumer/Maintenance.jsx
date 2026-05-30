import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { ShieldAlert, Clock, Mail, Phone, MapPin } from 'lucide-react';

export default function Maintenance() {
    const { platform } = usePage().props;

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans flex flex-col items-center justify-center p-6 text-stone-800">
            <Head title="Maintenance Mode" />

            {/* Content Card */}
            <div className="max-w-2xl w-full bg-white rounded-[40px] border border-clay-100 p-8 md:p-12 shadow-xl shadow-clay-200/20 text-center space-y-10 relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-amber-400" />
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-50" />
                <div className="absolute -left-10 -top-10 w-32 h-32 bg-clay-50 rounded-full blur-2xl opacity-50" />

                <div className="relative z-10 flex flex-col items-center gap-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-4">
                        <img 
                            src={platform.logo} 
                            alt={platform.name} 
                            className="h-16 w-auto object-contain animate-pulse-slow"
                        />
                        <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
                            {platform.name}
                        </h1>
                    </div>

                    {/* Icon & Message */}
                    <div className="space-y-4">
                        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mx-auto shadow-inner border border-amber-100 animate-bounce-subtle">
                            <ShieldAlert size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">System Refinement in Progress</h2>
                        <p className="text-stone-500 font-medium leading-relaxed max-w-md mx-auto">
                            We're currently performing scheduled maintenance to enhance your artisan experience. 
                            We'll be back shortly with a better, more robust platform.
                        </p>
                    </div>

                    {/* Meta Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8 border-t border-stone-50">
                        <div className="flex flex-col items-center gap-2">
                            <Clock size={18} className="text-clay-600" />
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Expected Back</p>
                            <p className="text-xs font-bold text-stone-900">1-2 Hours</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Mail size={18} className="text-clay-600" />
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Support</p>
                            <p className="text-xs font-bold text-stone-900">{platform.contact.email}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Phone size={18} className="text-clay-600" />
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Inquiries</p>
                            <p className="text-xs font-bold text-stone-900">{platform.contact.phone || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Footer Link */}
                <div className="relative z-10 pt-4">
                    <Link 
                        href="/login" 
                        className="text-[10px] font-black text-clay-600 uppercase tracking-widest hover:text-clay-700 transition-colors"
                    >
                        Administrator Access
                    </Link>
                </div>
            </div>

            {/* SEO Footnote */}
            <p className="mt-8 text-[11px] text-stone-400 font-medium italic">
                Thank you for your patience and for supporting local Filipino artisans.
            </p>
        </div>
    );
}
