import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { X, ChevronDown, ChevronUp, Shield, Lock, Check } from 'lucide-react';

export default function PrivacyPolicy() {
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (index) => {
        setExpandedSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const sections = [
        {
            title: "Information We Collect",
            content: "We collect personal information (name, email, phone, addresses), payment information processed securely by partners, and automatically collected data like device info, IP address, browsing history, and purchase records on our Platform."
        },
        {
            title: "How We Use Your Information",
            content: "We use your data to process and fulfill orders, communicate about purchases and updates, improve the Platform, personalize recommendations, prevent fraud, ensure security, and comply with legal obligations."
        },
        {
            title: "Information Sharing",
            content: "We share data with: Sellers (shipping info for orders), Payment Processors (for transactions), Shipping Partners (for delivery), Service Providers (platform operations), and Legal Authorities (when required by law). We never sell your personal information."
        },
        {
            title: "Data Security",
            content: "We implement SSL/TLS encryption, secure server infrastructure, regular security audits, and strict access controls limiting data access to authorized personnel only."
        },
        {
            title: "Your Rights Under the Data Privacy Act",
            content: "Under RA 10173, you have the right to: be informed about data processing, access your personal data, correct inaccurate data, request erasure, object to processing, receive data in portable format, and file complaints with the National Privacy Commission."
        },
        {
            title: "Cookies and Tracking",
            content: "We use cookies to enhance browsing experience, remember preferences, analyze traffic, and deliver personalized content. You can manage cookie settings through your browser, though disabling may affect functionality."
        },
        {
            title: "Data Retention",
            content: "We retain data as long as your account is active or needed for services. After deletion, certain information may be kept for 5 years for legal, tax, or regulatory compliance as required by Philippine law."
        },
        {
            title: "Children's Privacy",
            content: "LikhangKamay is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If discovered, we will delete such data promptly."
        },
        {
            title: "Changes to Policy",
            content: "We may update this Privacy Policy periodically. We will notify you of material changes via email or Platform notification. Continued use constitutes acceptance of updates."
        },
        {
            title: "Contact Our Data Protection Officer",
            content: "For privacy inquiries or to exercise your data rights, contact: privacy@likhangkamay.ph | Data Protection Officer: LikhangKamay Privacy Team | Address: Metro Manila, Philippines"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
            <Head title="Privacy Policy" />
            
            {/* Modal Container */}
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white relative overflow-hidden">
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
                                <h1 className="font-serif text-2xl font-bold">Privacy Policy</h1>
                                <p className="text-green-100 text-sm mt-1">Last updated: January 2026</p>
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

                {/* DPA Notice */}
                <div className="px-6 pt-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                        <Lock size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-blue-800 text-sm">
                            Compliant with the <strong>Data Privacy Act of 2012 (RA 10173)</strong> of the Philippines.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[55vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
                    <p className="text-gray-600 mb-6">
                        LikhangKamay is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.
                    </p>

                    <div className="space-y-3">
                        {sections.map((section, index) => (
                            <div 
                                key={index}
                                className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-300 transition"
                            >
                                <button
                                    onClick={() => toggleSection(index)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="w-7 h-7 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-sm font-bold">
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
                            Questions? Contact us at <span className="font-semibold text-green-600">privacy@likhangkamay.ph</span>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <Link 
                        href={route('register')}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition shadow-lg shadow-green-500/20"
                    >
                        <Check size={20} />
                        I Understand, Continue to Register
                    </Link>
                </div>
            </div>
        </div>
    );
}
