import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronDown, ChevronUp, FileText, Shield, Store, Lock, Box, Check, AlertTriangle } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, onAccept, type = 'terms' }) {
    const [expandedSections, setExpandedSections] = useState({});
    const [hasReachedBottom, setHasReachedBottom] = useState(false);
    const contentRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setExpandedSections({});
            setHasReachedBottom(false);

            const frame = window.requestAnimationFrame(() => {
                const container = contentRef.current;

                if (!container) {
                    return;
                }

                const isScrollable = container.scrollHeight > container.clientHeight + 4;
                setHasReachedBottom(!isScrollable);
            });

            return () => window.cancelAnimationFrame(frame);
        }
    }, [isOpen, type]);

    if (!isOpen) return null;

    const toggleSection = (index) => {
        setExpandedSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const handleAccept = () => {
        if (!hasReachedBottom) {
            return;
        }

        if (onAccept) {
            onAccept();
        }
        onClose();
    };

    const handleContentScroll = (event) => {
        const container = event.currentTarget;
        const reachedBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 8;

        if (reachedBottom) {
            setHasReachedBottom(true);
        }
    };

    // Content configurations - All using clay color scheme for consistency
    const content = {
        terms: {
            title: "Terms of Service",
            icon: FileText,
            sections: [
                { title: "Acceptance of Terms", content: "By creating an account, browsing products, or making purchases on LikhangKamay, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy." },
                { title: "Eligibility", content: "You must be at least 18 years of age to create an account and use our services. By using LikhangKamay, you represent and warrant that you meet this age requirement." },
                { title: "User Accounts", content: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Provide accurate information during registration." },
                { title: "Platform Services", content: "LikhangKamay is an online marketplace connecting buyers with local Filipino artisans specializing in handcrafted pottery, ceramics, and clay products." },
                { title: "Purchases and Payments", content: "All prices are in Philippine Peso (₱). We accept various payment methods including cash on delivery and online payments. Orders are subject to availability." },
                { title: "Shipping and Delivery", content: "Shipping costs vary by seller location. Sellers are responsible for secure packaging. LikhangKamay is not liable for carrier delays." },
                { title: "Returns and Refunds", content: "Returns accepted for damaged, defective, or misrepresented items. Report issues within 1 day of delivery with photos. Refunds processed within 1 business day." },
                { title: "User Conduct", content: "Users agree not to post false information, harass others, manipulate reviews, or engage in illegal activities on the Platform." },
                { title: "Intellectual Property", content: "All content on LikhangKamay is protected by Philippine and international intellectual property laws." },
                { title: "Limitation of Liability", content: "LikhangKamay shall not be liable for indirect, incidental, or consequential damages arising from Platform use." },
                { title: "Dispute Resolution", content: "Disputes shall be resolved through our internal process first. Unresolved disputes are subject to Philippine courts." },
                { title: "Modifications", content: "We may modify these Terms at any time. Continued use constitutes acceptance of updates." }
            ]
        },
        privacy: {
            title: "Privacy Policy",
            icon: Shield,
            dpaNotice: true,
            sections: [
                { title: "Information We Collect", content: "Personal information (name, email, phone, addresses), payment info processed by partners, and automatically collected data (device info, browsing history, purchases)." },
                { title: "How We Use Your Information", content: "Process orders, communicate about purchases, improve the Platform, personalize recommendations, prevent fraud, and comply with legal obligations." },
                { title: "Information Sharing", content: "Shared with: Sellers (shipping info), Payment Processors, Shipping Partners, and Legal Authorities when required. We never sell your personal information." },
                { title: "Data Security", content: "SSL/TLS encryption, secure servers, regular security audits, and strict access controls protect your data." },
                { title: "Your Rights (DPA 2012)", content: "Right to: be informed, access your data, rectify errors, request erasure, object to processing, data portability, and file NPC complaints." },
                { title: "Cookies", content: "We use cookies to enhance browsing, remember preferences, and analyze traffic. Manage via browser settings." },
                { title: "Data Retention", content: "Data retained while account is active. Some records kept up to 5 years for legal/tax compliance." },
                { title: "Children's Privacy", content: "Not intended for users under 18. We do not knowingly collect minor's data." },
                { title: "Policy Changes", content: "We may update this policy. Continued use constitutes acceptance." },
                { title: "Contact", content: "Email: privacy@likhangkamay.ph | Dasmarinas, Cavite, Philippines" }
            ]
        },
        seller: {
            title: "Seller Agreement",
            icon: Store,
            has3DRequirement: true,
            sections: [
                { title: "Seller Eligibility", content: "Must be 18+, a legitimate artisan producing handmade pottery/ceramics, provide valid ID, and comply with Philippine laws." },
                { title: "Product Listings", content: "All products must be authentic handcrafted items. Provide accurate descriptions, dimensions, materials, and high-quality images." },
                { title: "Order Fulfillment", content: "Confirm orders within 24 hours, process within 3 business days, ship within 7 business days, and use appropriate packaging for fragile items." },
                { title: "Quality Standards", content: "Products must meet professional quality standards. Maintain a rating of at least 4.0 stars." },
                { title: "Returns and Refunds", content: "Accept returns for damaged, misrepresented, or defective items. Process within 1 day of customer request." },
                { title: "Communication", content: "Respond to inquiries within 24 hours. All communications must be professional and courteous." },
                { title: "Prohibited Activities", content: "No counterfeit items, fake reviews, off-platform transactions, or sharing customer data." },
                { title: "Account Termination", content: "Accounts may be suspended for violations, low ratings below 3.5, order fulfillment failures, or fraud." },
                { title: "Intellectual Property", content: "You retain ownership of designs. You grant LikhangKamay a license to display and promote your products." },
                { title: "Agreement Changes", content: "We may update this agreement with 14 days notice. Continued use constitutes acceptance." },
                { title: "Contact", content: "Email: sellers@likhangkamay.ph | Dasmarinas, Cavite, Philippines" }
            ]
        },
        sellerPrivacy: {
            title: "Seller Data Privacy",
            icon: Shield,
            dpaNotice: true,
            sections: [
                { title: "Seller Data We Collect", content: "Personal info (name, ID, contact), business info (shop name, bank details, TIN), and product data (listings, 3D models, sales analytics)." },
                { title: "Customer Data Access", content: "You receive limited customer info for order fulfillment only. Do not store beyond transaction or share with third parties." },
                { title: "How We Use Seller Data", content: "Verify identity, process orders, transfer earnings, provide analytics, communicate updates, and comply with legal requirements." },
                { title: "Seller Analytics", content: "We provide sales trends, customer demographics (anonymized), popular products, and conversion rates." },
                { title: "Data Retention", content: "Retained during active selling plus 5 years for financial records (BIR requirement), 3 years for dispute records." },
                { title: "Your Rights", content: "Access, correct, request erasure, export data, object to processing, and withdraw consent under RA 10173." },
                { title: "Data Breach Response", content: "We notify affected sellers within 72 hours and report to the National Privacy Commission." },
                { title: "Contact", content: "Email: seller-privacy@likhangkamay.ph | NPC: complaints@privacy.gov.ph" }
            ]
        }
    };

    const doc = content[type];
    const Icon = doc.icon;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-slide-up overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Consistent clay color */}
                <div className="bg-gradient-to-r from-clay-600 to-clay-700 p-5 text-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 backdrop-blur rounded-xl">
                                <Icon size={24} />
                            </div>
                            <div>
                                <h3 className="font-serif text-xl font-bold">{doc.title}</h3>
                                <p className="text-white/70 text-xs mt-0.5">Last updated: January 2026</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* DPA Notice for privacy policies */}
                {doc.dpaNotice && (
                    <div className="px-5 pt-4 flex-shrink-0">
                        <div className="bg-clay-50 border border-clay-200 rounded-lg p-3 flex items-start gap-2">
                            <Lock size={16} className="text-clay-700 mt-0.5 flex-shrink-0" />
                            <p className="text-clay-700 text-xs">
                                Compliant with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>.
                            </p>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div 
                    ref={contentRef}
                    onScroll={handleContentScroll}
                    className="flex-1 overflow-y-auto p-5 space-y-3"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
                >
                    {doc.sections.map((section, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden hover:border-clay-300 transition">
                            <button
                                onClick={() => toggleSection(idx)}
                                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="w-6 h-6 bg-clay-100 text-clay-700 rounded-lg flex items-center justify-center text-xs font-bold">
                                        {idx + 1}
                                    </span>
                                    <span className="font-medium text-gray-800 text-sm">{section.title}</span>
                                </span>
                                {expandedSections[idx] ? (
                                    <ChevronUp size={18} className="text-gray-400" />
                                ) : (
                                    <ChevronDown size={18} className="text-gray-400" />
                                )}
                            </button>
                            {expandedSections[idx] && (
                                <div className="px-3 pb-3 text-gray-600 text-xs leading-relaxed border-t border-gray-100 bg-gray-50/50">
                                    <p className="pt-3">{section.content}</p>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* 3D Requirement for Seller Agreement */}
                    {doc.has3DRequirement && (
                        <div className="bg-gradient-to-br from-clay-50 to-amber-50 border-2 border-clay-400 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-clay-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                MANDATORY
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-clay-600 rounded-lg">
                                    <Box size={20} className="text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-clay-800 text-sm mb-1.5">3D Product Showcase Requirement</h4>
                                    <p className="text-clay-700 text-xs mb-2">
                                        All sellers must upload <strong>3D models (.glb/.gltf)</strong> of products using our 3D Manager.
                                    </p>
                                    <ul className="text-clay-700 text-xs space-y-1">
                                        <li className="flex items-start gap-1.5">
                                            <Check size={12} className="mt-0.5 flex-shrink-0" />
                                            Upload within 30 days of listing
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                                            Products may be delisted without 3D models
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <Check size={12} className="mt-0.5 flex-shrink-0" />
                                            Free training & scanning tutorials available
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
                    {!hasReachedBottom && (
                        <p className="mb-3 text-xs font-medium text-stone-500">
                            Scroll to the bottom of this document before continuing.
                        </p>
                    )}
                    <button
                        onClick={handleAccept}
                        disabled={!hasReachedBottom}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-clay-600 hover:bg-clay-700 text-white rounded-xl font-bold transition text-sm disabled:cursor-not-allowed disabled:bg-clay-300"
                    >
                        <Check size={18} />
                        I Understand
                    </button>
                </div>
            </div>

            {/* Animation styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.2s ease-out; }
                .animate-slide-up { animation: slideUp 0.3s ease-out; }
            `}} />
        </div>
    );
}
