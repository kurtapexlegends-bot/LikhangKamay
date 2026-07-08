import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
    UserCheck, Box, Percent, Truck, Award, 
    RefreshCw, MessageSquare, Banknote, ShieldAlert, AlertTriangle, 
    FileText, Edit3, Mail, ArrowLeft, CreditCard
} from 'lucide-react';


export default function SellerAgreement() {
    const sections = [
        {
            title: "Seller Eligibility",
            icon: UserCheck,
            content: "To become a seller on LikhangKamay, you must: be at least 18 years old, be a legitimate artisan producing handmade pottery/ceramics, provide valid government-issued identification, have the legal right to sell the products listed, and comply with all applicable Philippine laws."
        },
        {
            title: "Product Listings",
            icon: Box,
            content: "All products listed must be authentic, handcrafted items made by you or your artisan team. Provide accurate descriptions including dimensions, materials, care instructions, and high-quality images. Listings must not contain misleading information or prohibited items."
        },
        {
            title: "Pricing and Fees",
            icon: Percent,
            content: "You are solely responsible for setting product prices. LikhangKamay charges a commission fee of 5% on each successful sale. This covers platform maintenance, payment processing, customer support, and marketing. Fees are automatically deducted before payout."
        },
        {
            title: "Membership Tiers & Subscriptions",
            icon: CreditCard,
            content: "Artisans may subscribe to Standard (Free), Premium, or Elite membership tiers. Subscription fees are billed monthly, processed via PayMongo, and are strictly non-refundable once processed. Upgrades take effect immediately. Downgrades apply at the end of the billing period and enforce strict active product limits (3 for Standard, 10 for Premium, 50 for Elite) and suspend linked staff accounts. Pending billing transactions can be cancelled at any time."
        },
        {
            title: "Order Fulfillment",
            icon: Truck,
            content: "Upon receiving an order, you agree to: confirm within 24 hours, process within 3 business days, ship within 7 business days (unless custom times stated), provide tracking when available, and use appropriate packaging for fragile items."
        },
        {
            title: "Quality Standards",
            icon: Award,
            content: "Products must meet professional quality standards. Items should be free from defects unless marketed as 'seconds' or intentionally distressed. Maintain a rating of at least 4.0 stars. Consistent quality issues may result in account review or termination."
        },
        {
            title: "Returns and Refunds",
            icon: RefreshCw,
            content: "Accept returns for items that: arrive damaged, are significantly different from description, or are defective. Process returns within 1 day of customer request. Seller Protection Program may cover refunds for transit damage with proper packaging evidence."
        },
        {
            title: "Communication Standards",
            icon: MessageSquare,
            content: "Respond to customer inquiries within 24 hours during business days. All communications must be professional, courteous, and helpful. Resolve disputes through our resolution center. Abusive communication will result in immediate suspension."
        },
        {
            title: "Payments and Payouts",
            icon: Banknote,
            content: "Earnings are calculated after deducting platform commission. Payouts are processed weekly for balances exceeding ₱500. Provide valid bank account details. LikhangKamay is not responsible for delays from incorrect banking information."
        },
        {
            title: "Prohibited Activities",
            icon: ShieldAlert,
            content: "Sellers may not: sell counterfeit or mass-produced items, manipulate reviews, create fake transactions, circumvent platform fees with off-platform deals, share customer information, or engage in fraudulent or illegal activities."
        },
        {
            title: "Account Suspension & Termination",
            icon: AlertTriangle,
            content: "LikhangKamay may suspend or terminate accounts for: Agreement violations, ratings below 3.5 stars, failure to fulfill orders, fraudulent activities, or inactivity exceeding 6 months. Pending payouts released after resolving disputes."
        },
        {
            title: "Intellectual Property",
            icon: FileText,
            content: "You retain ownership of your designs and content. By listing on LikhangKamay, you grant us a non-exclusive license to display and promote your products. You warrant that listings do not infringe on others' intellectual property."
        },
        {
            title: "Modifications to Agreement",
            icon: Edit3,
            content: "LikhangKamay may update this Agreement periodically. We will notify sellers via email at least 14 days before changes take effect. Continued platform use constitutes acceptance of the modified Agreement."
        },
        {
            title: "Contact Seller Support",
            icon: Mail,
            content: "For questions about this Agreement: Email likhangkamaybusiness@gmail.com | Seller Hotline available in Seller Dashboard | Address: Metro Manila, Philippines"
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
            <Head title="Seller Agreement" />
            
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
                            <span className="text-[10px] font-bold tracking-widest text-clay-600 uppercase">Artisan Partner</span>
                            <h1 className="font-serif text-3xl font-bold text-stone-900 mt-1">Seller Agreement</h1>
                            <p className="text-xs text-stone-500 mt-1.5 font-medium">Last updated: January 2026</p>
                        </div>

                        {/* 3D Product Showcase Alert (Highly Visible in Sidebar) */}
                        <div className="bg-stone-100/50 border border-stone-200/80 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <Box size={18} className="text-clay-600 shrink-0" />
                                <h4 className="text-xs font-bold text-stone-900">3D Model Requirement</h4>
                            </div>
                            <p className="text-[11px] text-stone-600 leading-relaxed">
                                All sellers must upload 3D models (<strong>.glb / .gltf</strong>) using our 3D Manager. Listings remain in Draft until a 3D asset is supplied.
                            </p>
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
                                        <h4 className="text-xs font-bold text-stone-900">Artisan Registration</h4>
                                        <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                                            By proceeding, you agree to comply with all rules and standards defined in this partnership agreement.
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
                            <span className="text-[9px] font-bold tracking-widest text-clay-600 uppercase">Artisan Partner</span>
                            <h1 className="font-serif text-2xl font-bold text-stone-900 mt-0.5">Seller Agreement</h1>
                            <p className="text-[10px] text-stone-500 mt-1">Last updated: January 2026</p>
                        </div>

                        <p className="text-stone-600 text-sm leading-relaxed pb-4 border-b border-stone-100">
                            This agreement governs your status as an artisan partner on LikhangKamay. Please read this carefully to understand your obligations regarding product quality, fulfillment, payouts, and compliance.
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
