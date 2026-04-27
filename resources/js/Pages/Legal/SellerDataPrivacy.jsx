import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { X, ChevronDown, ChevronUp, Shield, Lock, Check } from 'lucide-react';

export default function SellerDataPrivacy() {
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (index) => {
        setExpandedSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const sections = [
        {
            title: "Seller Data We Collect",
            content: "We collect: Personal info (name, ID, contact), Business info (shop name, registration, bank details, TIN), and Product data (listings, images, 3D models, sales analytics, transaction records)."
        },
        {
            title: "Customer Data Access",
            content: "To fulfill orders, you receive limited customer info: name, shipping address, contact number, and order details. This data must only be used for order fulfillment, not stored beyond the transaction, and never shared with third parties."
        },
        {
            title: "How We Use Seller Data",
            content: "Your data is used to: verify identity, process orders, calculate and transfer earnings, provide analytics, communicate about orders and policies, investigate disputes, and comply with tax/legal requirements."
        },
        {
            title: "Data Sharing",
            content: "We share seller data with: Buyers (shop name, ratings, public profile), Payment Processors (bank details for payouts), Shipping Partners (pickup addresses), Government Authorities (tax records as required), and Service Providers (platform operations). We never sell seller data."
        },
        {
            title: "Financial Data Security",
            content: "Your banking info is protected through: encryption at rest and in transit, PCI-DSS compliant payment processors, limited access on need-to-know basis, and regular security audits. We never store complete credit card numbers."
        },
        {
            title: "Seller Analytics",
            content: "We provide analytics including: sales trends, customer demographics (aggregated/anonymized), popular products, and conversion rates. This data helps you grow your business and is derived from your transactions."
        },
        {
            title: "Data Retention",
            content: "Seller data is retained for duration of active selling plus: 5 years for financial records (BIR requirement), 3 years for dispute records, and indefinitely for aggregated analytics. Upon deletion request, we remove personal data while retaining legally required records."
        },
        {
            title: "Your Rights as a Seller",
            content: "Under RA 10173, you have the right to: access your data, correct inaccurate info, request erasure, receive data in portable format, object to processing, and withdraw consent for optional uses."
        },
        {
            title: "Data Breach Response",
            content: "In case of a data breach, we will: notify affected sellers within 72 hours, report to the National Privacy Commission, take immediate steps to mitigate, and provide protective guidance."
        },
        {
            title: "Contact for Seller Privacy",
            content: "For seller-specific privacy inquiries: Email likhangkamaybusiness@gmail.com | Data Protection Officer available via Seller Dashboard | NPC: complaints@privacy.gov.ph"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
            <Head title="Seller Data Privacy Policy" />
            
            {/* Modal Container */}
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white relative overflow-hidden">
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
                                <Shield size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="font-serif text-2xl font-bold">Seller Data Privacy</h1>
                                <p className="text-purple-100 text-sm mt-1">Last updated: January 2026</p>
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

                {/* DPA Notice */}
                <div className="px-6 pt-6">
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
                        <Lock size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
                        <p className="text-purple-800 text-sm">
                            This supplements our general Privacy Policy with seller-specific data handling, compliant with <strong>Data Privacy Act of 2012 (RA 10173)</strong>.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
                    <p className="text-gray-600 mb-6">
                        As an artisan seller on LikhangKamay, you entrust us with personal and business information. This policy explains how we handle seller-specific data.
                    </p>

                    <div className="space-y-3">
                        {sections.map((section, index) => (
                            <div 
                                key={index}
                                className="border border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 transition"
                            >
                                <button
                                    onClick={() => toggleSection(index)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="w-7 h-7 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center text-sm font-bold">
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
                            Questions? Contact <span className="font-semibold text-purple-600">likhangkamaybusiness@gmail.com</span>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <Link 
                        href="/artisan/register"
                        className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition shadow-lg shadow-purple-500/20"
                    >
                        <Check size={20} />
                        I Understand, Continue to Register
                    </Link>
                </div>
            </div>
        </div>
    );
}
