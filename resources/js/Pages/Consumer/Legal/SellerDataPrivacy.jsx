import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
    Shield, Lock, Database, Settings, Share2, Scale, 
    Clock, AlertTriangle, Mail, ArrowLeft, BarChart3, UserCheck, Check
} from 'lucide-react';

export default function SellerDataPrivacy() {
    const sections = [
        {
            title: "Seller Data We Collect",
            icon: Database,
            content: "We collect: Personal info (name, ID, contact), Business info (shop name, registration, bank details, TIN), and Product data (listings, images, 3D models, sales analytics, transaction records)."
        },
        {
            title: "Customer Data Access",
            icon: UserCheck,
            content: "To fulfill orders, you receive limited customer info: name, shipping address, contact number, and order details. This data must only be used for order fulfillment, not stored beyond the transaction, and never shared with third parties."
        },
        {
            title: "How We Use Seller Data",
            icon: Settings,
            content: "Your data is used to: verify identity, process orders, calculate and transfer earnings, provide analytics, communicate about orders and policies, investigate disputes, and comply with tax/legal requirements."
        },
        {
            title: "Data Sharing",
            icon: Share2,
            content: "We share seller data with: Buyers (shop name, ratings, public profile), Payment Processors (bank details for payouts), Shipping Partners (pickup addresses), Government Authorities (tax records as required), and Service Providers (platform operations). We never sell seller data."
        },
        {
            title: "Financial Data Security",
            icon: Lock,
            content: "Your banking info is protected through: encryption at rest and in transit, PCI-DSS compliant payment processors, limited access on need-to-know basis, and regular security audits. We never store complete credit card numbers."
        },
        {
            title: "Seller Analytics",
            icon: BarChart3,
            content: "We provide analytics including: sales trends, customer demographics (aggregated/anonymized), popular products, and conversion rates. This data helps you grow your business and is derived from your transactions."
        },
        {
            title: "Data Retention",
            icon: Clock,
            content: "Seller data is retained for duration of active selling plus: 5 years for financial records (BIR requirement), 3 years for dispute records, and indefinitely for aggregated analytics. Upon deletion request, we remove personal data while retaining legally required records."
        },
        {
            title: "Your Rights as a Seller",
            icon: Scale,
            content: "Under RA 10173, you have the right to: access your data, correct inaccurate info, request erasure, receive data in portable format, object to processing, and withdraw consent for optional uses."
        },
        {
            title: "Data Breach Response",
            icon: AlertTriangle,
            content: "In case of a data breach, we will: notify affected sellers within 72 hours, report to the National Privacy Commission, take immediate steps to mitigate, and provide protective guidance."
        },
        {
            title: "Contact for Seller Privacy",
            icon: Mail,
            content: "For seller-specific privacy inquiries: Email likhangkamaybusiness@gmail.com | Data Protection Officer available via Seller Dashboard | NPC: complaints@privacy.gov.ph"
        }
    ];

    const scrollToSection = (idx) => {
        const element = document.getElementById(`section-${idx}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const fromSource = params ? params.get('from') : null;
    const isFromRegister = fromSource === 'register';

    return (
        <div className="min-h-screen bg-stone-50/50 font-sans text-stone-800 py-12 px-4 sm:px-6 lg:px-8">
            <Head title="Seller Data Privacy Policy" />
            
            <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <div className="mb-8 print:hidden">
                    <Link 
                        href={isFromRegister ? '/profile' : '/'} 
                        className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-sm font-bold"
                    >
                        <ArrowLeft size={16} />
                        {isFromRegister ? 'Back to Setup' : 'Back to Home'}
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Sidebar / Left Column */}
                    <aside className="lg:col-span-4 lg:sticky lg:top-8 space-y-6 print:hidden">
                        <div className="border-b border-stone-200/80 pb-5">
                            <span className="text-[10px] font-bold tracking-widest text-sage-600 uppercase">Artisan Partner</span>
                            <h1 className="font-serif text-3xl font-bold text-stone-900 mt-1">Seller Privacy</h1>
                            <p className="text-xs text-stone-500 mt-1.5 font-medium">Last updated: January 2026</p>
                        </div>

                        {/* DPA Notice */}
                        <div className="bg-stone-100/50 border border-stone-200/80 rounded-2xl p-4 flex items-start gap-3">
                            <Lock size={18} className="text-clay-600 mt-0.5 flex-shrink-0" />
                            <div className="text-[11px] text-stone-600 leading-relaxed">
                                This supplements our general Privacy Policy, compliant with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>.
                            </div>
                        </div>

                        {/* Navigation Table of Contents */}
                        <div className="hidden lg:block">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-3 px-3">Table of Contents</p>
                            <nav className="space-y-1">
                                {sections.map((section, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => scrollToSection(idx)}
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-stone-600 hover:text-clay-600 hover:bg-stone-100/50 rounded-xl transition-all flex items-center gap-2.5"
                                    >
                                        <span className="w-5 h-5 bg-stone-200/60 text-stone-600 rounded-lg flex items-center justify-center text-[10px]">
                                            {idx + 1}
                                        </span>
                                        <span className="truncate">{section.title}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Action Card */}
                        <div className="bg-white border border-stone-200/60 p-5 rounded-2xl shadow-sm space-y-4">
                            {isFromRegister ? (
                                <>
                                    <div>
                                        <h4 className="text-xs font-bold text-stone-900">Privacy Confirmation</h4>
                                        <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                                            By registering as an artisan, you agree to these data handling terms.
                                        </p>
                                    </div>
                                    <Link 
                                        href="/profile"
                                        className="w-full flex items-center justify-center py-2.5 bg-clay-600 hover:bg-clay-700 text-white rounded-xl font-bold transition text-xs shadow-sm"
                                    >
                                        Agree & Register
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <h4 className="text-xs font-bold text-stone-900">Partner with Us</h4>
                                        <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                                            Showcase your pottery and grow your artisan business on our platform.
                                        </p>
                                    </div>
                                    <Link 
                                        href="/artisan/register"
                                        className="w-full flex items-center justify-center py-2.5 bg-clay-600 hover:bg-clay-700 text-white rounded-xl font-bold transition text-xs shadow-sm"
                                    >
                                        Become an Artisan
                                    </Link>
                                </>
                            )}
                        </div>
                    </aside>

                    {/* Main Legal Content Pane */}
                    <main className="lg:col-span-8 bg-white border border-stone-200/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
                        {/* Mobile Header */}
                        <div className="lg:hidden border-b border-stone-200/80 pb-5 mb-6">
                            <span className="text-[9px] font-bold tracking-widest text-sage-600 uppercase">Artisan Partner</span>
                            <h1 className="font-serif text-2xl font-bold text-stone-900 mt-0.5">Seller Data Privacy</h1>
                            <p className="text-[10px] text-stone-500 mt-1">Last updated: January 2026</p>
                        </div>

                        <p className="text-stone-600 text-sm leading-relaxed pb-4 border-b border-stone-100">
                            As a partner artisan on LikhangKamay, we process your business and personal data to support your operations and remain compliant with local regulations.
                        </p>

                        <div className="space-y-8">
                            {sections.map((section, idx) => {
                                const SectionIcon = section.icon;
                                return (
                                    <section 
                                        key={idx} 
                                        id={`section-${idx}`}
                                        className="scroll-mt-6 border-b border-stone-50 pb-6 last:border-0 last:pb-0"
                                    >
                                        <h2 className="font-serif text-base sm:text-lg font-bold text-stone-900 flex items-center gap-3">
                                            <span className="w-7 h-7 bg-sage-50 text-sage-600 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border border-sage-100">
                                                {idx + 1}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <SectionIcon size={16} className="text-sage-500 shrink-0" />
                                                {section.title}
                                            </span>
                                        </h2>
                                        <p className="text-stone-600 text-sm leading-relaxed mt-3 pl-0 sm:pl-10">
                                            {section.content}
                                        </p>
                                    </section>
                                );
                            })}
                        </div>
                    </main>

                </div>
            </div>
        </div>
    );
}
