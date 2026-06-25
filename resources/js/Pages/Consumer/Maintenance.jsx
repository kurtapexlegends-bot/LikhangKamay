import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Clock, Mail, Phone } from 'lucide-react';

export default function Maintenance() {
    const { platform } = usePage().props;

    return (
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-stone-800">
            <Head title="Maintenance Mode" />

            {/* Content Card */}
            <div className="max-w-xl w-full bg-white rounded-3xl border border-stone-200/60 p-8 md:p-12 shadow-sm text-center space-y-8 relative overflow-hidden">
                <div className="flex flex-col items-center gap-8">
                    {/* Logo & Title */}
                    <div className="flex flex-col items-center gap-3">
                        <img 
                            src={platform.logo} 
                            alt={platform.name} 
                            className="h-14 w-auto object-contain"
                        />
                        <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
                            {platform.name}
                        </h1>
                    </div>

                    {/* Clean Earthy Icon & Message */}
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-clay-50/50 text-clay-700 rounded-full flex items-center justify-center border border-clay-100/60 mx-auto">
                            <Clock size={28} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-stone-900 tracking-tight">System Refinement in Progress</h2>
                            <p className="text-stone-500 text-xs font-medium leading-relaxed max-w-sm mx-auto">
                                We are currently performing scheduled maintenance to refine the artisan experience. 
                                We will be back shortly with a better, more robust platform.
                            </p>
                        </div>
                    </div>

                    {/* Meta Info Grid with Clean Separators */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8 border-t border-stone-100 divide-y divide-stone-100 md:divide-y-0 md:divide-x divide-stone-100">
                        <div className="flex flex-col items-center gap-1 md:px-2">
                            <Clock size={16} className="text-stone-400 mb-1" />
                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Expected Back</p>
                            <p className="text-xs font-bold text-stone-900">1-2 Hours</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 md:px-2 pt-4 md:pt-0">
                            <Mail size={16} className="text-stone-400 mb-1" />
                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Support</p>
                            <p className="text-xs font-bold text-stone-900 break-all select-all">{platform.contact.email}</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 md:px-2 pt-4 md:pt-0">
                            <Phone size={16} className="text-stone-400 mb-1" />
                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Inquiries</p>
                            <p className="text-xs font-bold text-stone-900">{platform.contact.phone || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Footer Link */}
                <div className="pt-4 border-t border-stone-100/50">
                    <Link 
                        href="/login" 
                        className="text-[9px] font-bold text-stone-400 uppercase tracking-widest hover:text-clay-600 transition-colors duration-250"
                    >
                        Administrator Access
                    </Link>
                </div>
            </div>

            {/* SEO Footnote */}
            <p className="mt-8 text-[10px] text-stone-400 font-medium tracking-wide">
                Thank you for your patience and for supporting local Filipino artisans.
            </p>
        </div>
    );
}
