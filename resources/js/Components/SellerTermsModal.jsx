import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';
import Modal from '@/Components/Modal';

export default function SellerTermsModal({ show, onClose, onAccept, onBack, type = 'seller', step = null, totalSteps = null, hasNextStep = null, policies = null }) {
    const contentRef = useRef(null);
    const [hasReachedBottom, setHasReachedBottom] = useState(false);
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
    const autoAdvanceTimerRef = useRef(null);
    const isPrivacy = type === 'sellerPrivacy' || type === 'supplierPrivacy';
    const isSupplier = type === 'supplier' || type === 'supplierPrivacy';
    const policyKey = isSupplier 
        ? (isPrivacy ? 'supplier_privacy' : 'supplier_agreement')
        : (isPrivacy ? 'seller_privacy' : 'seller_agreement');
    const dynamicPolicy = policies?.[policyKey] || null;
    const dynamicSections = Array.isArray(dynamicPolicy?.sections) && dynamicPolicy.sections.length > 0
        ? dynamicPolicy.sections
        : null;
    const hasNext = hasNextStep !== null ? hasNextStep : (step ? step < totalSteps : !isPrivacy);
    const nextLabel = isPrivacy 
        ? (isSupplier ? 'Next: Supplier Agreement' : 'Next: Seller Agreement') 
        : (isSupplier ? 'Next: Supplier Privacy Policy' : 'Next: Data Privacy Policy');

    const clearAutoAdvanceTimer = () => {
        if (autoAdvanceTimerRef.current) {
            clearTimeout(autoAdvanceTimerRef.current);
            autoAdvanceTimerRef.current = null;
        }
        setIsAutoAdvancing(false);
    };

    useEffect(() => {
        clearAutoAdvanceTimer();
        if (show) {
            setHasReachedBottom(false);
            if (contentRef.current) {
                contentRef.current.scrollTop = 0;
                requestAnimationFrame(() => {
                    if (contentRef.current) {
                        const { scrollHeight, clientHeight } = contentRef.current;
                        if (scrollHeight <= clientHeight + 10) {
                            setHasReachedBottom(true);
                        }
                    }
                });
            }
        }
        return () => clearAutoAdvanceTimer();
    }, [type, show]);

    const handleScroll = (e) => {
        const el = e.currentTarget;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 24;

        if (atBottom) {
            if (!hasReachedBottom) {
                setHasReachedBottom(true);
            }

            // If there is a next document and not already transitioning, automatically advance
            if (hasNext && !autoAdvanceTimerRef.current) {
                setIsAutoAdvancing(true);
                autoAdvanceTimerRef.current = setTimeout(() => {
                    autoAdvanceTimerRef.current = null;
                    setIsAutoAdvancing(false);
                    handleAccept();
                }, 700);
            }
        } else if (isAutoAdvancing) {
            clearAutoAdvanceTimer();
        }
    };

    const handleAccept = () => {
        clearAutoAdvanceTimer();
        if (!hasReachedBottom) return;
        const shouldClose = onAccept ? onAccept() : true;
        if (shouldClose !== false) {
            onClose?.();
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            {/* Modal Content */}
            <div className="bg-[#FAF7F2] h-[82vh] max-h-[82vh] flex flex-col overflow-hidden rounded-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-200/60 flex justify-between items-center bg-[#FAF7F2] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {step && totalSteps ? (
                            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${step === totalSteps ? 'bg-sage-100 text-sage-800' : 'bg-clay-100 text-clay-800'}`}>
                                Step {step} of {totalSteps}
                            </span>
                        ) : null}
                        {step === 2 && onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="text-xs text-clay-700 hover:text-clay-800 font-semibold underline transition-colors"
                            >
                                ← Previous
                            </button>
                        )}
                        <h3 className="text-lg font-serif font-bold text-stone-900">
                            {dynamicPolicy?.title || (
                                isSupplier 
                                    ? (isPrivacy ? 'Supplier Data Privacy Policy' : 'Wholesale Supplier Agreement')
                                    : (isPrivacy ? 'Seller Data Privacy Policy' : 'Artisan Seller Agreement')
                            )}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Scrollable Legal Text */}
                <div ref={contentRef} onScroll={handleScroll} className="p-6 overflow-y-auto text-sm text-stone-600 leading-relaxed space-y-6 flex-1 min-h-0" style={{ scrollbarWidth: 'thin' }}>
                    <p className="font-bold text-stone-900">
                        {dynamicPolicy ? `Version ${dynamicPolicy.version} • Last Updated: ${dynamicPolicy.published_at_formatted || 'September 2026'}` : 'Last Updated: September 2026'}
                    </p>

                    {dynamicSections ? (
                        <>
                            {dynamicPolicy?.intro && (
                                <p className="text-stone-600 leading-relaxed">{dynamicPolicy.intro}</p>
                            )}
                            {dynamicSections.map((sec, idx) => (
                                <section key={idx}>
                                    <h4 className="font-bold text-stone-900 mb-2">{idx + 1}. {sec.title}</h4>
                                    <p className="whitespace-pre-line">{sec.content}</p>
                                </section>
                            ))}
                        </>
                    ) : isSupplier ? (
                        isPrivacy ? (
                            <>
                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">1. Commercial Data We Collect</h4>
                                    <p>We collect corporate details (registered business name, trade name, DTI/SEC certificate, Mayor's Permit, Tax Identification Number), primary contact information (authorized representative name, corporate email, mobile dispatch number), warehouse physical coordinates (for logistics pickup matching), and settlement banking/e-wallet credentials.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">2. Studio Delivery Data Restrictions (RA 10173)</h4>
                                    <p>To facilitate raw material dispatches, suppliers and their authorized drivers receive recipient studio information (workshop name, delivery address, recipient contact name, and phone number). In accordance with Republic Act 10173, suppliers agree to utilize this studio data strictly for material delivery and order coordination. Retaining studio recipient data for unauthorized marketing or sharing it with external entities is strictly prohibited.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">3. How We Use Supplier Data</h4>
                                    <p>Supplier information is processed solely to: authenticate business legitimacy and tax compliance, manage warehouse logistics routing and dispatch tracking, disburse escrow payments, generate statutory BIR tax receipts, and resolve commercial delivery claims.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">4. Security of Commercial Information</h4>
                                    <p>All corporate documents, business registration files, and settlement bank accounts are stored using bank-grade encryption in transit and at rest. Payment processing is managed via PCI-DSS certified financial partners. Access to vendor documentation is restricted strictly to authorized platform auditors.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">5. Data Retention Periods</h4>
                                    <p>Commercial supplier records are retained throughout active partnership and for a statutory period of 5 years following account closure to comply with Philippine Bureau of Internal Revenue (BIR) accounting and audit standards.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">6. Your Rights Under RA 10173</h4>
                                    <p>Authorized enterprise representatives maintain the right to: inspect recorded corporate information, update or rectify warehouse/contact details, request documentation erasure upon settlement of all commercial obligations, and lodge privacy inquiries with our Data Protection Officer (likhangkamaybusiness@gmail.com) or the National Privacy Commission.</p>
                                </section>
                            </>
                        ) : (
                            <>
                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">1. Acceptance of Wholesale Terms</h4>
                                    <p>This Wholesale Supplier Agreement governs commercial vendors, distributors, and raw material suppliers providing bulk pottery clay, glazes, raw minerals, kiln hardware, and pottery tools through the LikhangKamay B2B Supply Hub.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">2. Supplier Eligibility & Verification</h4>
                                    <p>To register as a Wholesale Supplier, you must operate a registered business entity, provide a valid Mayor's/Business Permit or DTI/SEC registration, supply an active Tax Identification Number (TIN), maintain an active dispatch warehouse in Cavite or Greater Manila Area, and agree to comply with Philippine commercial and tax laws.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">3. Material Quality & Industrial Grading</h4>
                                    <p>All raw pottery clay, feldspar, silica, slips, glazes, stains, and ceramic equipment listed must strictly conform to professional grade specifications. Suppliers warrant that listings accurately declare firing temperature ranges (e.g., Cone 06 to Cone 10), moisture percentages, mesh sizes, and non-hazardous safety grading.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">4. Minimum Order Quantities (MOQ) & Wholesale Pricing</h4>
                                    <p>Suppliers have full discretion over wholesale unit pricing and Minimum Order Quantities (MOQs), specified in industrial trade units (e.g., per 25kg bag, 50kg sack, metric ton, or case). Arbitrary price adjustments on already-confirmed bulk orders are strictly prohibited.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">5. Packaging & Palletized Freight Standards</h4>
                                    <p>Suppliers are responsible for secure commercial packaging suitable for regional transport. Bulk dry powders must be packed in heavy-duty multi-ply moisture-resistant sacks. Liquid glazes must be secured in sealed industrial pails. Palletized shipments must be shrink-wrapped and strapped to prevent moisture damage or spillage during dispatch.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">6. Studio Delivery & 24-Hour Inspection Window</h4>
                                    <p>Upon physical drop-off at the artisan studio workshop, the receiving artisan studio is granted a 24-hour verification window to inspect bags, sacks, and equipment for transit spillage, moisture damage, or grade discrepancies before final order completion.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">7. Escrow Settlement & Payouts</h4>
                                    <p>Payments for wholesale orders are held securely in platform escrow and cleared upon expiration of the 24-hour inspection window. Net payouts are transferred weekly to the supplier's verified business settlement account. Wholesale suppliers are exempt from artisan monthly subscription tiers.</p>
                                </section>

                                <section>
                                    <h4 className="font-bold text-stone-900 mb-2">8. Defective Goods & Spillage Claims</h4>
                                    <p>In the event that raw materials arrive damaged, torn, or chemically off-spec, supported by photo/video documentation submitted within the 24-hour inspection window, the supplier agrees to promptly dispatch a replacement batch or authorize a proportional credit adjustment.</p>
                                </section>
                            </>
                        )
                    ) : isPrivacy ? (
                        <>
                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">1. Seller Data We Collect</h4>
                                <p>We collect personal information (name, government ID, contact details), business information (shop name, business registration, bank and settlement details, TIN), and studio product data (listings, product photography, 3D models, sales analytics, and transaction logs) solely for operating and securing your artisan storefront.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">2. Customer Data Access & Restrictions</h4>
                                <p>To fulfill customer orders, you receive limited customer information (recipient name, delivery address, contact number, and item specifications). You agree under RA 10173 to use customer data strictly for order fulfillment and shipping. Storing customer information beyond transaction needs, repurposing it for unauthorized marketing, or sharing it with third parties is strictly prohibited.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">3. Studio Staff & Attendance Data (Republic Act 10173)</h4>
                                <p>For artisans using Studio Staff Management, employee timekeeping records—including quick face check photos and store location coordinates captured during clock-in and clock-out—are processed strictly for employment attendance verification under Republic Act 10173. This sensitive verification data is encrypted, accessible only to authorized studio administrators, never shared with third-party advertisers or commercial entities, and retained solely for statutory labor record requirements.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">4. How We Use Seller Data</h4>
                                <p>Your information is used to: verify artisan identity and shop eligibility, process customer and wholesale orders, calculate and transfer weekly payouts, provide studio performance analytics, communicate critical policy updates, adjudicate customer dispute resolutions, and maintain BIR statutory compliance.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">5. Data Sharing & Third Parties</h4>
                                <p>We share seller information only with: Marketplace Buyers (public shop name, ratings, and studio profile), Payment Processors (bank/e-wallet details for automated payouts), Integrated Logistics Partners (pickup coordinates for Lalamove or studio couriers), and Philippine Tax/Regulatory Authorities when legally required. We never sell your personal or commercial data.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">6. Financial Data Security</h4>
                                <p>Bank and e-wallet settlement accounts are protected via encryption at rest and in transit. Payments and payouts are processed via PCI-DSS certified partners (PayMongo). Complete card numbers and raw banking credentials are never stored on platform servers.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">7. Seller Analytics & Performance</h4>
                                <p>We provide studio analytics including sales trends, popular products, and customer conversion rates derived directly from your transactions to help scale your craft business.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">8. Data Retention Periods</h4>
                                <p>Seller data is retained throughout active platform selling, plus 5 years for financial transaction records to satisfy Philippine Bureau of Internal Revenue (BIR) auditing standards, and 3 years for dispute resolution records.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">9. Your Rights Under RA 10173</h4>
                                <p>Under the Data Privacy Act of 2012, you hold the right to access your stored data, rectify inaccurate records, request account erasure upon settlement of obligations, export your records in a portable format, and file concerns with the National Privacy Commission.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">10. Data Breach Notification & Response</h4>
                                <p>In the event of a verified data breach, LikhangKamay notifies affected artisans within 72 hours, submits required reports to the National Privacy Commission, and implements immediate mitigation safeguards.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">11. Contact Our Data Protection Officer</h4>
                                <p>For privacy inquiries or data rights requests: Email <strong>likhangkamaybusiness@gmail.com</strong> | National Privacy Commission: <strong>complaints@privacy.gov.ph</strong></p>
                            </section>
                        </>
                    ) : (
                        <>
                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">1. Acceptance of Terms</h4>
                                <p>By registering as a Seller ("Artisan") on LikhangKamay ("Platform"), you agree to be bound by this Agreement. This Platform is operated in accordance with the laws of the Republic of the Philippines.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">2. Artisan Eligibility & Verification</h4>
                                <p>2.1. You represent that you are at least 18 years old and capable of forming a binding contract.</p>
                                <p>2.2. You certify that all products listed are <strong>handcrafted, locally sourced, or artisan-made</strong> in Cavite or surrounding regions. Reselling mass-produced items from third-party manufacturers is strictly prohibited and grounds for immediate account termination.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">3. Product Listings & Content</h4>
                                <p>3.1. You grant LikhangKamay a non-exclusive, royalty-free license to use your product images for platform marketing and promotion.</p>
                                <p>3.2. You warrant that your 3D models (if uploaded) and product descriptions are accurate and do not infringe on any intellectual property rights.</p>
                                <p>3.3. Prohibited items: Illegal substances, hazardous materials, or items that violate Philippine cultural heritage laws.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">4. Commission, Subscriptions & Payouts</h4>
                                <p>4.1. LikhangKamay charges <strong>0% Platform Sales Commission</strong> on merchandise sales, allowing artisans to keep 100% of their merchandise earnings. Platform operations and promotional services are supported through optional monthly artisan subscription tiers (Standard, Premium, Elite).</p>
                                <p>4.2. Payouts are processed weekly via GCash or Maya upon customer confirmation of receipt or delivery warranty clearance.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">5. Data Privacy (Republic Act 10173)</h4>
                                <p>5.1. LikhangKamay collects your personal data (Name, DTI Registration, Contact Info) solely for verification and transaction processing in compliance with the Data Privacy Act of 2012.</p>
                                <p>5.2. As a Seller, you agree to handle Customer Data (Names, Addresses) strictly for order fulfillment and shipping. You may not use customer data for unauthorized marketing or share it with third parties.</p>
                                <p>5.3. If you use Studio Staff Management, employee attendance data—including quick face photos and store location coordinates captured during clock-in and clock-out—is processed strictly for employment verification under RA 10173 and must never be exported, repurposed, or shared.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">6. Shipping & Fulfillment</h4>
                                <p>6.1. You are responsible for packaging items securely to prevent breakage, especially for ceramic/clay products.</p>
                                <p>6.2. Failure to ship orders within 5 days of confirmation may result in order cancellation and penalties.</p>
                                <p>6.3. Fulfillment may be conducted via integrated third-party couriers (Lalamove) or authorized in-house studio drivers with electronic proof of delivery. Orders marked delivered undergo a 24-hour customer inspection period before automated order completion.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">7. Return & Refund Policy</h4>
                                <p>7.1. Customers have the right to request a refund for broken/damaged items upon arrival, provided photo or video proof of unboxing is submitted within 24 hours of delivery.</p>
                                <p>7.2. You agree to shoulder the cost of refund or replacement for items proven to be damaged due to inadequate packaging.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">8. Account Standing & Studio Guidelines</h4>
                                <p>8.1. LikhangKamay enforces a <strong>3-Stage Account Review System</strong>: <em>Stage 1: Advisory Notice</em> with policy guidance; <em>Stage 2: Temporary Hold (3 to 30 days)</em> pausing storefront discovery while active customer orders must still be fulfilled; <em>Stage 3: Account Closure</em>.</p>
                                <p>8.2. Zero-tolerance violations (such as mass fraud, counterfeit items, or harassment) bypass progressive stages and trigger immediate account closure.</p>
                            </section>

                            <section>
                                <h4 className="font-bold text-stone-900 mb-2">9. B2B Supply Hub & Wholesale Procurement</h4>
                                <p>9.1. Raw materials, glazes, packaging, and tools traded through the B2B Supply Hub must meet stated quality, safety, and grading specifications with transparent minimum order quantities.</p>
                                <p>9.2. Delivered supplies automatically synchronize into the purchasing artisan's studio inventory upon delivery confirmation. Supply return or damage claims must be filed within 24 hours of delivery.</p>
                            </section>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-[#FCFBF9] border-t border-stone-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
                    <div className="text-xs font-medium">
                        {isAutoAdvancing ? (
                            <span className="flex items-center gap-1.5 text-clay-700 font-semibold animate-pulse">
                                <Check size={14} className="text-emerald-600" />
                                <span>{isPrivacy ? 'Continuing to Seller Agreement...' : 'Continuing to Data Privacy Policy...'}</span>
                            </span>
                        ) : !hasReachedBottom ? (
                            <span className="flex items-center gap-1.5 text-stone-500">
                                <ArrowDown size={14} className="text-clay-600 animate-bounce" />
                                <span>Scroll to the bottom to continue</span>
                            </span>
                        ) : hasNext ? (
                            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <Check size={14} className="text-emerald-600" />
                                <span>Document completed. Click next or scroll to continue</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <Check size={14} className="text-emerald-600" />
                                <span>End of document reached</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 bg-white border border-stone-300 rounded-lg text-stone-700 font-medium hover:bg-stone-50 transition text-sm"
                        >
                            Close
                        </button>
                        <button 
                            type="button" 
                            onClick={handleAccept} 
                            disabled={!hasReachedBottom}
                            className="px-4 py-2 bg-clay-600 text-white rounded-lg font-bold hover:bg-clay-700 transition shadow-sm text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
                        >
                            <span>{hasNext ? nextLabel : 'I Understand & Agree'}</span>
                            {hasNext && <ArrowRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}