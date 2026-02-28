import React from 'react';

export default function SellerTermsModal({ show, onClose }) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-gray-900/75 transition-opacity" onClick={onClose}></div>

            {/* Modal Content */}
            <div className="bg-white rounded-xl shadow-xl transform transition-all sm:w-full sm:max-w-2xl max-h-[85vh] flex flex-col relative z-50">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-serif font-bold text-gray-900">Artisan Seller Agreement</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Scrollable Legal Text */}
                <div className="p-6 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-6">
                    <p className="font-bold text-gray-900">Last Updated: January 4, 2026</p>
                    
                    <section>
                        <h4 className="font-bold text-gray-900 mb-2">1. Acceptance of Terms</h4>
                        <p>By registering as a Seller ("Artisan") on LikhangKamay ("Platform"), you agree to be bound by this Agreement. This Platform is operated in accordance with the laws of the Republic of the Philippines.</p>
                    </section>

                    <section>
                        <h4 className="font-bold text-gray-900 mb-2">2. Artisan Eligibility & Verification</h4>
                        <p>2.1. You represent that you are at least 18 years old and capable of forming a binding contract.</p>
                        <p>2.2. You certify that all products listed are <strong>handcrafted, locally sourced, or artisan-made</strong> in Cavite or surrounding regions. Reselling mass-produced items from third-party manufacturers is strictly prohibited and grounds for immediate account termination.</p>
                    </section>

                    <section>
                        <h4 className="font-bold text-gray-900 mb-2">3. Product Listings & Content</h4>
                        <p>3.1. You grant LikhangKamay a non-exclusive, royalty-free license to use your product images for platform marketing and promotion.</p>
                        <p>3.2. You warrant that your 3D models (if uploaded) and product descriptions are accurate and do not infringe on any intellectual property rights.</p>
                        <p>3.3. Prohibited items: Illegal substances, hazardous materials, or items that violate Philippine cultural heritage laws.</p>
                    </section>

                    <section>
                        <h4 className="font-bold text-gray-900 mb-2">4. Commission & Payments</h4>
                        <p>4.1. Creating a shop is free. LikhangKamay charges a <strong>5% Commission Fee</strong> on the final sale price of every completed transaction to cover platform maintenance.</p>
                        <p>4.2. Payouts are processed weekly via GCash or Bank Transfer upon customer confirmation of receipt.</p>
                    </section>

                    <section>
                        <h4 className="font-bold text-gray-900 mb-2">5. Data Privacy (Republic Act 10173)</h4>
                        <p>5.1. LikhangKamay collects your personal data (Name, DTI Registration, Contact Info) solely for verification and transaction processing in compliance with the Data Privacy Act of 2012.</p>
                        <p>5.2. As a Seller, you agree to handle Customer Data (Names, Addresses) strictly for order fulfillment and shipping. You may not use customer data for unauthorized marketing or share it with third parties.</p>
                    </section>

                    <section>
                        <h4 className="font-bold text-gray-900 mb-2">6. Shipping & Fulfillment</h4>
                        <p>6.1. You are responsible for packaging items securely to prevent breakage, especially for ceramic/clay products.</p>
                        <p>6.2. Failure to ship orders within 5 days of confirmation may result in order cancellation and penalties.</p>
                    </section>

                    <section>
                        <h4 className="font-bold text-gray-900 mb-2">7. Return & Refund Policy</h4>
                        <p>7.1. Customers have the right to request a refund for broken/damaged items upon arrival, provided video proof of unboxing is submitted within 24 hours.</p>
                        <p>7.2. You agree to shoulder the cost of refund for items proven to be damaged due to poor packaging.</p>
                    </section>

                    <section>
                        <h4 className="font-bold text-gray-900 mb-2">8. Termination</h4>
                        <p>LikhangKamay reserves the right to suspend or terminate shops that violate these terms, engage in fraudulent activity, or receive consistently poor ratings (below 2.0 stars).</p>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
                        Close
                    </button>
                    <button onClick={onClose} className="px-4 py-2 bg-clay-600 text-white rounded-lg font-bold hover:bg-clay-700 transition shadow-md">
                        I Understand & Agree
                    </button>
                </div>
            </div>
        </div>
    );
}