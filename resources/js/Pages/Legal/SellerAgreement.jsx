import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { X, ChevronDown, ChevronUp, Store, Box, Check, AlertTriangle } from 'lucide-react';

export default function SellerAgreement() {
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (index) => {
        setExpandedSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const sections = [
        {
            title: "Seller Eligibility",
            content: "To become a seller on LikhangKamay, you must: be at least 18 years old, be a legitimate artisan producing handmade pottery/ceramics, provide valid government-issued identification, have the legal right to sell the products listed, and comply with all applicable Philippine laws."
        },
        {
            title: "Product Listings",
            content: "All products listed must be authentic, handcrafted items made by you or your artisan team. Provide accurate descriptions including dimensions, materials, care instructions, and high-quality images. Listings must not contain misleading information or prohibited items."
        },
        {
            title: "Pricing and Fees",
            content: "You are solely responsible for setting product prices. LikhangKamay charges a commission fee of 5% on each successful sale. This covers platform maintenance, payment processing, customer support, and marketing. Fees are automatically deducted before payout."
        },
        {
            title: "Order Fulfillment",
            content: "Upon receiving an order, you agree to: confirm within 24 hours, process within 3 business days, ship within 7 business days (unless custom times stated), provide tracking when available, and use appropriate packaging for fragile items."
        },
        {
            title: "Quality Standards",
            content: "Products must meet professional quality standards. Items should be free from defects unless marketed as 'seconds' or intentionally distressed. Maintain a rating of at least 4.0 stars. Consistent quality issues may result in account review or termination."
        },
        {
            title: "Returns and Refunds",
            content: "Accept returns for items that: arrive damaged, are significantly different from description, or are defective. Process returns within 7 days of customer request. Seller Protection Program may cover refunds for transit damage with proper packaging evidence."
        },
        {
            title: "Communication Standards",
            content: "Respond to customer inquiries within 24 hours during business days. All communications must be professional, courteous, and helpful. Resolve disputes through our resolution center. Abusive communication will result in immediate suspension."
        },
        {
            title: "Payments and Payouts",
            content: "Earnings are calculated after deducting platform commission. Payouts are processed weekly for balances exceeding ₱500. Provide valid bank account details. LikhangKamay is not responsible for delays from incorrect banking information."
        },
        {
            title: "Prohibited Activities",
            content: "Sellers may not: sell counterfeit or mass-produced items, manipulate reviews, create fake transactions, circumvent platform fees with off-platform deals, share customer information, or engage in fraudulent or illegal activities."
        },
        {
            title: "Account Suspension & Termination",
            content: "LikhangKamay may suspend or terminate accounts for: Agreement violations, ratings below 3.5 stars, failure to fulfill orders, fraudulent activities, or inactivity exceeding 6 months. Pending payouts released after resolving disputes."
        },
        {
            title: "Intellectual Property",
            content: "You retain ownership of your designs and content. By listing on LikhangKamay, you grant us a non-exclusive license to display and promote your products. You warrant that listings do not infringe on others' intellectual property."
        },
        {
            title: "Modifications to Agreement",
            content: "LikhangKamay may update this Agreement periodically. We will notify sellers via email at least 14 days before changes take effect. Continued platform use constitutes acceptance of the modified Agreement."
        },
        {
            title: "Contact Seller Support",
            content: "For questions about this Agreement: Email sellers@likhangkamay.ph | Seller Hotline available in Seller Dashboard | Address: Metro Manila, Philippines"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
            <Head title="Seller Agreement" />
            
            {/* Modal Container */}
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                            </pattern>
                            <rect width="100" height="100" fill="url(#grid)" />
                        </svg>
                    </div>
                    <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                                <Store size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="font-serif text-2xl font-bold">Seller Agreement</h1>
                                <p className="text-amber-100 text-sm mt-1">Last updated: January 2026</p>
                            </div>
                        </div>
                        <Link 
                            href="/artisan/register" 
                            className="p-2 hover:bg-white/20 rounded-lg transition"
                        >
                            <X size={24} />
                        </Link>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
                    <p className="text-gray-600 mb-6">
                        This Agreement governs your use of the LikhangKamay platform as a seller. By registering as an artisan, you agree to these terms.
                    </p>

                    <div className="space-y-3">
                        {sections.map((section, index) => (
                            <div 
                                key={index}
                                className="border border-gray-200 rounded-xl overflow-hidden hover:border-amber-300 transition"
                            >
                                <button
                                    onClick={() => toggleSection(index)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="font-semibold text-gray-800">{section.title}</span>
                                    </span>
                                    {expandedSections[index] ? (
                                        <ChevronUp size={20} className="text-gray-400" />
                                    ) : (
                                        <ChevronDown size={20} className="text-gray-400" />
                                    )}
                                </button>
                                {expandedSections[index] && (
                                    <div className="px-4 pb-4 pt-0 text-gray-600 text-sm leading-relaxed border-t border-gray-100 bg-gray-50/50">
                                        <p className="pt-4">{section.content}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* 3D REQUIREMENT - MANDATORY */}
                    <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            MANDATORY
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-500 rounded-xl">
                                <Box size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-amber-800 text-lg mb-2">14. 3D Product Showcase Requirement</h3>
                                <p className="text-amber-700 text-sm mb-3">
                                    All sellers must upload <strong>3D models</strong> of their products using our 3D Manager tool for an immersive shopping experience.
                                </p>
                                <ul className="text-amber-700 text-sm space-y-2">
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="mt-0.5 flex-shrink-0" />
                                        Each listing must include a 3D model in <strong>.glb or .gltf format</strong>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="mt-0.5 flex-shrink-0" />
                                        Products remain in <strong>Draft</strong> until a 3D model is uploaded
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                        Products without 3D models cannot be listed as <strong>Active</strong>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="mt-0.5 flex-shrink-0" />
                                        Free training & smartphone 3D scanning tutorials available
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center">
                        <p className="text-sm text-gray-500">
                            Questions? Contact <span className="font-semibold text-amber-600">sellers@likhangkamay.ph</span>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <Link 
                        href="/artisan/register"
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition shadow-lg shadow-gray-500/20"
                    >
                        <Check size={20} />
                        I Agree, Continue to Register
                    </Link>
                </div>
            </div>
        </div>
    );
}
