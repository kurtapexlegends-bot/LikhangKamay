import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
    Shield, Lock, Database, Settings, Share2, Scale, 
    Cookie, Clock, AlertOctagon, Edit3, Mail, ArrowLeft
} from 'lucide-react';

export default function PrivacyPolicy() {
    const sections = [
        {
            title: "Information We Collect",
            icon: Database,
            content: "We collect personal information (name, email, phone, addresses), payment information processed securely by partners, and automatically collected data like device info, IP address, browsing history, and purchase records on our Platform."
        },
        {
            title: "How We Use Your Information",
            icon: Settings,
            content: "We use your data to process and fulfill orders, communicate about purchases and updates, improve the Platform, personalize recommendations, prevent fraud, ensure security, and comply with legal obligations."
        },
        {
            title: "Information Sharing",
            icon: Share2,
            content: "We share data with: Sellers (shipping info for orders), Payment Processors (for transactions), Shipping Partners (for delivery), Service Providers (platform operations), and Legal Authorities (when required by law). We never sell your personal information."
        },
        {
            title: "Data Security",
            icon: Lock,
            content: "We implement SSL/TLS encryption, secure server infrastructure, regular security audits, and strict access controls limiting data access to authorized personnel only."
        },
        {
            title: "Your Rights Under the Data Privacy Act",
            icon: Scale,
            content: "Under RA 10173, you have the right to: be informed about data processing, access your personal data, correct inaccurate data, request erasure, object to processing, receive data in portable format, and file complaints with the National Privacy Commission."
        },
        {
            title: "Cookies and Tracking",
            icon: Cookie,
            content: "We use cookies to enhance browsing experience, remember preferences, analyze traffic, and deliver personalized content. You can manage cookie settings through your browser, though disabling may affect functionality."
        },
        {
            title: "Data Retention",
            icon: Clock,
            content: "We retain data as long as your account is active or needed for services. After deletion, certain information may be kept for 5 years for legal, tax, or regulatory compliance as required by Philippine law."
        },
        {
            title: "Children's Privacy",
            icon: AlertOctagon,
            content: "LikhangKamay is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If discovered, we will delete such data promptly."
        },
        {
            title: "Changes to Policy",
            icon: Edit3,
            content: "We may update this Privacy Policy periodically. We will notify you of material changes via email or Platform notification. Continued use constitutes acceptance of updates."
        },
        {
            title: "Contact Our Data Protection Officer",
            icon: Mail,
            content: "For privacy inquiries or to exercise your data rights, contact: likhangkamaybusiness@gmail.com | Data Protection Officer: LikhangKamay Privacy Team | Address: Metro Manila, Philippines"
        }
    ];

    const scrollToSection = (idx) => {
        const element = document.getElementById(`section-${idx}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="min-h-screen bg-stone-50/50 font-sans text-stone-800 py-12 px-4 sm:px-6 lg:px-8">
            <Head title="Privacy Policy" />
            
            <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <div className="mb-8 print:hidden">
                    <Link 
                        href={route('register')} 
                        className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-sm font-bold"
                    >
                        <ArrowLeft size={16} />
                        Back to Register
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Sidebar / Left Column */}
                    <aside className="lg:col-span-4 lg:sticky lg:top-8 space-y-6 print:hidden">
                        <div className="border-b border-stone-200/80 pb-5">
                            <span className="text-[10px] font-bold tracking-widest text-sage-600 uppercase">Legal Policy</span>
                            <h1 className="font-serif text-3xl font-bold text-stone-900 mt-1">Privacy Policy</h1>
                            <p className="text-xs text-stone-500 mt-1.5 font-medium">Last updated: January 2026</p>
                        </div>

                        {/* DPA Notice */}
                        <div className="bg-stone-100/50 border border-stone-200/80 rounded-2xl p-4 flex items-start gap-3">
                            <Lock size={18} className="text-clay-600 mt-0.5 flex-shrink-0" />
                            <div className="text-[11px] text-stone-600 leading-relaxed">
                                Compliant with the <strong>Data Privacy Act of 2012 (RA 10173)</strong> of the Philippines.
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
                            <div>
                                <h4 className="text-xs font-bold text-stone-900">Privacy Commitment</h4>
                                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                                    Your personal information is secure with us. We do not sell your personal data to anyone.
                                </p>
                            </div>
                            <Link 
                                href={route('register')}
                                className="w-full flex items-center justify-center py-2.5 bg-clay-600 hover:bg-clay-700 text-white rounded-xl font-bold transition text-xs shadow-sm"
                            >
                                Accept & Continue
                            </Link>
                        </div>
                    </aside>

                    {/* Main Legal Content Pane */}
                    <main className="lg:col-span-8 bg-white border border-stone-200/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
                        {/* Mobile Header */}
                        <div className="lg:hidden border-b border-stone-200/80 pb-5 mb-6">
                            <span className="text-[9px] font-bold tracking-widest text-sage-600 uppercase">Legal Policy</span>
                            <h1 className="font-serif text-2xl font-bold text-stone-900 mt-0.5">Privacy Policy</h1>
                            <p className="text-[10px] text-stone-500 mt-1">Last updated: January 2026</p>
                        </div>

                        <p className="text-stone-600 text-sm leading-relaxed pb-4 border-b border-stone-100">
                            LikhangKamay is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you interact with our platform.
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
