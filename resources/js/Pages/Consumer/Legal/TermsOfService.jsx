import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
    FileText, CheckCircle2, UserCheck, Lock, Store, CreditCard, 
    Truck, RefreshCw, AlertOctagon, Scale, Edit3, ShieldAlert, ArrowLeft
} from 'lucide-react';

export default function TermsOfService() {
    const sections = [
        {
            title: "Acceptance of Terms",
            icon: CheckCircle2,
            content: "By creating an account, browsing products, or making purchases on LikhangKamay, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please discontinue use of our services immediately."
        },
        {
            title: "Eligibility",
            icon: UserCheck,
            content: "You must be at least 18 years of age to create an account and use our services. By using LikhangKamay, you represent and warrant that you meet this age requirement and have the legal capacity to enter into binding agreements."
        },
        {
            title: "User Accounts",
            icon: Lock,
            content: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration. LikhangKamay reserves the right to suspend or terminate accounts that contain false or misleading information."
        },
        {
            title: "Platform Services",
            icon: Store,
            content: "LikhangKamay is an online marketplace that connects buyers with local Filipino artisans specializing in handcrafted pottery, ceramics, and clay products. We facilitate transactions but are not a party to the sale agreement between buyers and sellers. The Platform provides product listings, secure payment processing, messaging services, and order tracking."
        },
        {
            title: "Purchases and Payments",
            icon: CreditCard,
            content: "All prices are displayed in Philippine Peso (₱) and are inclusive of applicable taxes unless otherwise stated. We accept various payment methods including cash on delivery and online payment options. All purchases are subject to product availability. Once an order is confirmed, it constitutes a binding agreement between the buyer and seller."
        },
        {
            title: "Shipping and Delivery",
            icon: Truck,
            content: "Shipping costs and delivery times vary depending on the seller's location and the shipping method selected. Sellers are responsible for packaging items securely, especially fragile pottery items. LikhangKamay is not liable for delays caused by shipping carriers or events beyond our control."
        },
        {
            title: "Returns and Refunds",
            icon: RefreshCw,
            content: "Returns are accepted for items that arrive damaged, defective, or significantly different from their description. Buyers must report issues within 1 day of delivery with photographic evidence. Refunds will be processed within 1 business day of approval. Custom or personalized items may not be eligible for returns unless defective."
        },
        {
            title: "User Conduct",
            icon: AlertOctagon,
            content: "Users agree not to: post false, misleading, or fraudulent information; harass, abuse, or threaten other users; manipulate reviews, ratings, or feedback; circumvent fees by conducting transactions outside the Platform; use the Platform for any illegal purposes; or attempt to gain unauthorized access to other accounts or systems."
        },
        {
            title: "Intellectual Property",
            icon: FileText,
            content: "All content on LikhangKamay, including logos, text, graphics, images, and software, is the property of LikhangKamay or its content suppliers and is protected by Philippine and international intellectual property laws. Users retain ownership of content they submit but grant LikhangKamay a non-exclusive, royalty-free license to use and display such content on the Platform."
        },
        {
            title: "Limitation of Liability",
            icon: ShieldAlert,
            content: "LikhangKamay shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. We do not guarantee the quality, safety, or legality of products sold by third-party sellers. Our total liability shall not exceed the amount paid by you for the specific transaction in question."
        },
        {
            title: "Dispute Resolution",
            icon: Scale,
            content: "Any disputes arising from these Terms or your use of the Platform shall first be attempted to be resolved through our internal dispute resolution process. If unresolved, disputes shall be subject to the exclusive jurisdiction of the courts of the Philippines."
        },
        {
            title: "Modifications to Terms",
            icon: Edit3,
            content: "LikhangKamay reserves the right to modify these Terms at any time. We will notify users of material changes via email or through the Platform. Your continued use of the Platform after such modifications constitutes acceptance of the updated Terms."
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
            <Head title="Terms of Service" />
            
            <div className="max-w-6xl mx-auto">
                {/* Back Button for Desktop/Mobile */}
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
                    
                    {/* Sidebar / Left Column (4 cols) */}
                    <aside className="lg:col-span-4 lg:sticky lg:top-8 space-y-6 print:hidden">
                        <div className="border-b border-stone-200/80 pb-5">
                            <span className="text-[10px] font-bold tracking-widest text-clay-600 uppercase">Legal Agreement</span>
                            <h1 className="font-serif text-3xl font-bold text-stone-900 mt-1">Terms of Service</h1>
                            <p className="text-xs text-stone-500 mt-1.5 font-medium">Last updated: January 2026</p>
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

                        {/* Quick Register Action Card */}
                        <div className="bg-white border border-stone-200/60 p-5 rounded-2xl shadow-sm space-y-4">
                            <div>
                                <h4 className="text-xs font-bold text-stone-900">Agreement Confirmation</h4>
                                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                                    By registering an account with LikhangKamay, you accept and agree to all terms outlined in this document.
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

                    {/* Main Legal Content Pane (8 cols) */}
                    <main className="lg:col-span-8 bg-white border border-stone-200/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
                        {/* Mobile Header (Hidden on Desktop & Print) */}
                        <div className="lg:hidden border-b border-stone-200/80 pb-5 mb-6">
                            <span className="text-[9px] font-bold tracking-widest text-clay-600 uppercase">Legal Agreement</span>
                            <h1 className="font-serif text-2xl font-bold text-stone-900 mt-0.5">Terms of Service</h1>
                            <p className="text-[10px] text-stone-500 mt-1">Last updated: January 2026</p>
                        </div>

                        <p className="text-stone-600 text-sm leading-relaxed pb-4 border-b border-stone-100">
                            Welcome to LikhangKamay. These Terms of Service govern your access and use of our platform. Please read them carefully before creating an account or making any transactions.
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
                                            <span className="w-7 h-7 bg-clay-50 text-clay-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border border-clay-100">
                                                {idx + 1}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <SectionIcon size={16} className="text-clay-500 shrink-0" />
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
