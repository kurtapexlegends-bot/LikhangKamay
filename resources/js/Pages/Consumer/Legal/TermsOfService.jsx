import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { X, ChevronDown, ChevronUp, FileText, Shield, Store, Lock, Box, Check } from 'lucide-react';

export default function TermsOfService() {
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (index) => {
        setExpandedSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const sections = [
        {
            title: "Acceptance of Terms",
            content: "By creating an account, browsing products, or making purchases on LikhangKamay, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please discontinue use of our services immediately."
        },
        {
            title: "Eligibility",
            content: "You must be at least 18 years of age to create an account and use our services. By using LikhangKamay, you represent and warrant that you meet this age requirement and have the legal capacity to enter into binding agreements."
        },
        {
            title: "User Accounts",
            content: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration. LikhangKamay reserves the right to suspend or terminate accounts that contain false or misleading information."
        },
        {
            title: "Platform Services",
            content: "LikhangKamay is an online marketplace that connects buyers with local Filipino artisans specializing in handcrafted pottery, ceramics, and clay products. We facilitate transactions but are not a party to the sale agreement between buyers and sellers. The Platform provides product listings, secure payment processing, messaging services, and order tracking."
        },
        {
            title: "Purchases and Payments",
            content: "All prices are displayed in Philippine Peso (₱) and are inclusive of applicable taxes unless otherwise stated. We accept various payment methods including cash on delivery and online payment options. All purchases are subject to product availability. Once an order is confirmed, it constitutes a binding agreement between the buyer and seller."
        },
        {
            title: "Shipping and Delivery",
            content: "Shipping costs and delivery times vary depending on the seller's location and the shipping method selected. Sellers are responsible for packaging items securely, especially fragile pottery items. LikhangKamay is not liable for delays caused by shipping carriers or events beyond our control."
        },
        {
            title: "Returns and Refunds",
            content: "Returns are accepted for items that arrive damaged, defective, or significantly different from their description. Buyers must report issues within 7 days of delivery with photographic evidence. Refunds will be processed within 14 business days of approval. Custom or personalized items may not be eligible for returns unless defective."
        },
        {
            title: "User Conduct",
            content: "Users agree not to: post false, misleading, or fraudulent information; harass, abuse, or threaten other users; manipulate reviews, ratings, or feedback; circumvent fees by conducting transactions outside the Platform; use the Platform for any illegal purposes; or attempt to gain unauthorized access to other accounts or systems."
        },
        {
            title: "Intellectual Property",
            content: "All content on LikhangKamay, including logos, text, graphics, images, and software, is the property of LikhangKamay or its content suppliers and is protected by Philippine and international intellectual property laws. Users retain ownership of content they submit but grant LikhangKamay a non-exclusive, royalty-free license to use and display such content on the Platform."
        },
        {
            title: "Limitation of Liability",
            content: "LikhangKamay shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. We do not guarantee the quality, safety, or legality of products sold by third-party sellers. Our total liability shall not exceed the amount paid by you for the specific transaction in question."
        },
        {
            title: "Dispute Resolution",
            content: "Any disputes arising from these Terms or your use of the Platform shall first be attempted to be resolved through our internal dispute resolution process. If unresolved, disputes shall be subject to the exclusive jurisdiction of the courts of the Philippines."
        },
        {
            title: "Modifications to Terms",
            content: "LikhangKamay reserves the right to modify these Terms at any time. We will notify users of material changes via email or through the Platform. Your continued use of the Platform after such modifications constitutes acceptance of the updated Terms."
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-clay-50 via-white to-amber-50 flex items-center justify-center p-4">
            <Head title="Terms of Service" />
            
            {/* Modal Container */}
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-clay-600 to-clay-700 p-6 text-white relative overflow-hidden">
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
                                <FileText size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="font-serif text-2xl font-bold">Terms of Service</h1>
                                <p className="text-clay-100 text-sm mt-1">Last updated: January 2026</p>
                            </div>
                        </div>
                        <Link 
                            href={route('register')} 
                            className="p-2 hover:bg-white/20 rounded-lg transition"
                        >
                            <X size={24} />
                        </Link>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
                    <p className="text-gray-600 mb-6">
                        Welcome to LikhangKamay. By accessing and using our platform, you agree to be bound by these Terms of Service.
                    </p>

                    <div className="space-y-3">
                        {sections.map((section, index) => (
                            <div 
                                key={index}
                                className="border border-gray-200 rounded-xl overflow-hidden hover:border-clay-300 transition"
                            >
                                <button
                                    onClick={() => toggleSection(index)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="w-7 h-7 bg-clay-100 text-clay-700 rounded-lg flex items-center justify-center text-sm font-bold">
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

                    {/* Contact */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center">
                        <p className="text-sm text-gray-500">
                            Questions? Contact us at <span className="font-semibold text-clay-600">likhangkamaybusiness@gmail.com</span>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <Link 
                        href={route('register')}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-clay-600 hover:bg-clay-700 text-white rounded-xl font-bold transition shadow-lg shadow-clay-500/20"
                    >
                        <Check size={20} />
                        I Understand, Continue to Register
                    </Link>
                </div>
            </div>
        </div>
    );
}
