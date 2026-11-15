/* global route */
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { 
    X, Mail, Copy, Check, ExternalLink, 
    MessageSquare, Clock, ShieldCheck, HelpCircle,
    ChevronDown, Store, ShoppingBag, Package
} from 'lucide-react';

const SUPPORT_EMAIL = 'likhangkamaybusiness@gmail.com';

const BUYER_TOPICS = [
    {
        id: 'order',
        label: 'Order or Delivery Issue',
        subject: '[LikhangKamay Buyer] Order / Delivery Inquiry',
        body: 'Hello LikhangKamay Support Team,\n\nI need assistance with my order.\nOrder Number (if applicable): \nArtisan / Shop Name: \nDetails of issue: \n\nThank you!',
    },
    {
        id: 'damage',
        label: 'Damaged / Broken Pottery',
        subject: '[LikhangKamay Buyer] Fragile Item Damage Report',
        body: 'Hello LikhangKamay Support Team,\n\nI received a damaged or broken handcrafted item.\nOrder Number: \nDelivery Date & Time: \nDescription of damage: \n(Attaching unboxing photos/video to this email)\n\nThank you!',
    },
    {
        id: 'payment',
        label: 'Payment or Refund Status',
        subject: '[LikhangKamay Buyer] Payment / Refund Verification',
        body: 'Hello LikhangKamay Support Team,\n\nI have a question regarding a payment or refund.\nReference / Transaction ID: \nPayment Method (GCash / Maya / Card / COD): \nDetails: \n\nThank you!',
    },
    {
        id: 'biometric',
        label: 'Face Check / Account Issue',
        subject: '[LikhangKamay Buyer] Account & Face Check Assistance',
        body: 'Hello LikhangKamay Support Team,\n\nI need help with my account or face verification.\nAccount Email: \nDevice / Browser: \nDetails: \n\nThank you!',
    },
    {
        id: 'general',
        label: 'General Inquiry / Feedback',
        subject: '[LikhangKamay Buyer] General Platform Inquiry',
        body: 'Hello LikhangKamay Support Team,\n\nI would like to inquire about: \n\nThank you!',
    },
];

const ARTISAN_TOPICS = [
    {
        id: 'payout',
        label: 'Studio Payout & Disbursement',
        subject: '[LikhangKamay Artisan] Studio Payout & Disbursement Inquiry',
        body: 'Hello LikhangKamay Merchant Desk,\n\nI have an inquiry regarding my workshop payout or disbursement schedule.\nStudio / Workshop Name: \nRegistered Account (GCash / Maya / Bank): \nPayout Batch Date / Amount: \nDetails: \n\nThank you!',
    },
    {
        id: 'vat',
        label: 'BIR VAT & Sales Invoices',
        subject: '[LikhangKamay Artisan] BIR Sales Invoice & Tax Ledger',
        body: 'Hello LikhangKamay Merchant Desk,\n\nI need assistance with BIR VAT tax ledgers, 12% calculation, or sales invoice generation.\nStudio Name: \nTIN Number: \nOrder Number (if applicable): \nQuestion: \n\nThank you!',
    },
    {
        id: 'courier',
        label: 'Lalamove Courier Dispatch',
        subject: '[LikhangKamay Artisan] Courier / Rider Dispatch Assistance',
        body: 'Hello LikhangKamay Merchant Desk,\n\nI need support with rider dispatch, pickup location pin, or delivery delay.\nOrder Number: \nPickup Location: \nTracking / Lalamove Order ID: \nDetails: \n\nThank you!',
    },
    {
        id: 'verification',
        label: 'Studio Permits & Verification',
        subject: '[LikhangKamay Artisan] Studio Verification & Compliance',
        body: 'Hello LikhangKamay Merchant Desk,\n\nI have a question regarding workshop verification, DTI/Mayor\'s permits, or Cavite workshop address.\nStudio Name: \nCavite Municipality: \nDetails: \n\nThank you!',
    },
    {
        id: 'pos',
        label: 'Walk-In POS & Receipts',
        subject: '[LikhangKamay Artisan] Studio POS & Inventory Sync',
        body: 'Hello LikhangKamay Merchant Desk,\n\nI have a question regarding walk-in POS receipts, barcode checkout, or atomic stock deduction.\nStudio Name: \nQuestion: \n\nThank you!',
    },
    {
        id: 'supply',
        label: 'Supply Hub Wholesale Orders',
        subject: '[LikhangKamay Artisan] Supply Hub Sourcing Inquiry',
        body: 'Hello LikhangKamay Merchant Desk,\n\nI have an inquiry regarding raw material supplies, glaze procurement, or wholesale orders.\nStudio Name: \nOrder / Material SKU: \nDetails: \n\nThank you!',
    },
];

export default function SupportContactModal({
    show = false,
    initialPersona = 'buyer',
    lockedPersona = null,
    onClose = () => {},
}) {
    const effectivePersona = lockedPersona || initialPersona;
    const [persona, setPersona] = useState(effectivePersona === 'artisan' ? 'artisan' : 'buyer');
    const [selectedTopicId, setSelectedTopicId] = useState(
        effectivePersona === 'artisan' ? 'payout' : 'order'
    );
    const [copied, setCopied] = useState(false);
    const [showDesktopMailto, setShowDesktopMailto] = useState(false);

    // Sync with initialPersona or lockedPersona when modal opens
    useEffect(() => {
        if (show) {
            const nextPersona = (lockedPersona || initialPersona) === 'artisan' ? 'artisan' : 'buyer';
            setPersona(nextPersona);
            setSelectedTopicId(nextPersona === 'artisan' ? 'payout' : 'order');
            setShowDesktopMailto(false);
        }
    }, [show, initialPersona, lockedPersona]);

    const topics = useMemo(() => {
        return persona === 'artisan' ? ARTISAN_TOPICS : BUYER_TOPICS;
    }, [persona]);

    const activeTopic = useMemo(() => {
        return topics.find((t) => t.id === selectedTopicId) || topics[0];
    }, [topics, selectedTopicId]);

    // Handle persona change
    const handlePersonaChange = (newPersona) => {
        setPersona(newPersona);
        setSelectedTopicId(newPersona === 'artisan' ? 'payout' : 'order');
    };

    // Construct direct Gmail web compose URL (prevents native Windows Outlook prompts)
    const gmailComposeUrl = useMemo(() => {
        const base = 'https://mail.google.com/mail/?view=cm&fs=1';
        const params = new URLSearchParams({
            to: SUPPORT_EMAIL,
            su: activeTopic.subject,
            body: activeTopic.body,
        });
        return `${base}&${params.toString()}`;
    }, [activeTopic]);

    // Fallback standard mailto for users who explicitly want desktop Outlook / Mail app
    const nativeMailtoUrl = useMemo(() => {
        const params = new URLSearchParams({
            subject: activeTopic.subject,
            body: activeTopic.body,
        });
        return `mailto:${SUPPORT_EMAIL}?${params.toString()}`;
    }, [activeTopic]);

    const handleCopyEmail = () => {
        if (typeof window === 'undefined') return;
        navigator.clipboard?.writeText(SUPPORT_EMAIL).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
        });
    };

    return (
        <Modal
            show={show}
            onClose={onClose}
            maxWidth="lg"
            bottomSheet={true}
            panelClassName="bg-white rounded-3xl sm:rounded-2xl shadow-xl overflow-hidden"
        >
            <div className="p-5 sm:p-6 space-y-4">
                {/* Header with Persona Switcher */}
                <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3.5">
                    <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-clay-700 uppercase tracking-widest">
                            <ShieldCheck size={13} className="text-clay-600" />
                            <span>{persona === 'artisan' ? 'Artisan Merchant Desk' : 'Customer Support Channel'}</span>
                        </div>
                        <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
                            {persona === 'artisan' ? 'Artisan Studio Support' : 'Email Platform Support'}
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                            {persona === 'artisan'
                                ? 'Dedicated assistance for payouts, BIR VAT invoicing, permits, and courier dispatch.'
                                : 'Connect directly via webmail or copy our official support address.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Persona Mode Switcher Pill - Hidden when strictly locked */}
                {!lockedPersona && (
                    <div className="bg-stone-100 p-1 rounded-xl flex items-center border border-stone-200/70">
                        <button
                            type="button"
                            onClick={() => handlePersonaChange('buyer')}
                            className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                persona === 'buyer'
                                    ? 'bg-white text-clay-700 shadow-xs'
                                    : 'text-stone-500 hover:text-stone-900'
                            }`}
                        >
                            <ShoppingBag size={13} />
                            <span>Buyer Support</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePersonaChange('artisan')}
                            className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                persona === 'artisan'
                                    ? 'bg-white text-clay-700 shadow-xs'
                                    : 'text-stone-500 hover:text-stone-900'
                            }`}
                        >
                            <Store size={13} />
                            <span>Artisan Merchant Desk</span>
                        </button>
                    </div>
                )}

                {/* Persona-Specific Callout Banner */}
                {persona === 'buyer' ? (
                    <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 flex items-start gap-2.5">
                        <MessageSquare size={16} className="text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-900 leading-snug">
                            <span className="font-bold">Need help with an active order?</span> For order changes, workshop pickups, or pottery breakage, messaging the artisan workshop directly through{' '}
                            <Link
                                href={route('my-orders.index')}
                                className="font-bold underline text-amber-950 hover:text-clay-700 transition"
                            >
                                My Purchases
                            </Link>{' '}
                            is usually the fastest resolution.
                        </div>
                    </div>
                ) : (
                    <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3 flex items-start gap-2.5">
                        <Package size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                        <div className="text-xs text-emerald-900 leading-snug">
                            <span className="font-bold">Active order fulfillment or rider delay?</span> You can manage packing, rider tracking, and customer chats directly inside{' '}
                            <Link
                                href={route('orders.index')}
                                className="font-bold underline text-emerald-950 hover:text-clay-700 transition"
                            >
                                Studio Orders & Fulfillment
                            </Link>.
                        </div>
                    </div>
                )}

                {/* Inquiry Topic Selection */}
                <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        {persona === 'artisan' ? 'Select Artisan Topic:' : 'What is your inquiry about?'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {topics.map((topic) => {
                            const isSelected = selectedTopicId === topic.id;
                            return (
                                <button
                                    key={topic.id}
                                    type="button"
                                    onClick={() => setSelectedTopicId(topic.id)}
                                    className={`px-2.5 py-1.5 text-left text-xs rounded-lg border transition-all ${
                                        isSelected
                                            ? 'bg-clay-700 text-white border-clay-700 font-bold shadow-xs'
                                            : 'bg-stone-50 text-stone-600 border-stone-200/80 hover:bg-stone-100'
                                    }`}
                                >
                                    <span className="truncate block">{topic.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Official Support Card with Copy Button */}
                <div className="bg-stone-50/80 border border-stone-200/70 rounded-xl p-3 sm:p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                            {persona === 'artisan' ? 'Artisan Priority Desk' : 'Support Email'}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-stone-500">
                            <Clock size={12} className="text-stone-400" />
                            <span>Response within 24–48h</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white border border-stone-200 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 truncate">
                            <Mail size={15} className="text-clay-600 shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold text-stone-900 font-mono select-all truncate">
                                {SUPPORT_EMAIL}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyEmail}
                            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                                copied
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check size={12} />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={12} />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                    {/* Primary Button: Open in Gmail Web */}
                    <a
                        href={gmailComposeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-clay-700 hover:bg-clay-800 text-white rounded-xl font-bold transition text-xs sm:text-sm shadow-xs group"
                    >
                        <img
                            src="/images/google-icon.svg"
                            alt="Google"
                            className="w-4 h-4 bg-white rounded-full p-0.5 shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <span>Open in Gmail (Web)</span>
                        <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    {/* Secondary Action: Copy Address button */}
                    <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition text-xs border border-stone-200/80"
                    >
                        <Copy size={13} />
                        <span>{copied ? 'Email Address Copied to Clipboard' : 'Copy Email Address'}</span>
                    </button>
                </div>

                {/* Subtle Desktop App Accordion Link (For users who specifically use Outlook/Mail) */}
                <div className="pt-2 border-t border-stone-100 text-center">
                    {!showDesktopMailto ? (
                        <button
                            type="button"
                            onClick={() => setShowDesktopMailto(true)}
                            className="text-[11px] text-stone-400 hover:text-stone-600 inline-flex items-center gap-1"
                        >
                            <span>Using desktop mail app (Outlook, Apple Mail)?</span>
                            <ChevronDown size={12} />
                        </button>
                    ) : (
                        <div className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-200/60 space-y-1">
                            <p>To open your computer's default email client:</p>
                            <a
                                href={nativeMailtoUrl}
                                className="font-bold text-clay-700 hover:underline inline-flex items-center gap-1"
                            >
                                <Mail size={12} />
                                <span>Launch Desktop Email Client</span>
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
