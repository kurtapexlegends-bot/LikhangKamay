/* global route */
import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
    ArrowLeft, Search, X, ShoppingBag, Store, 
    HelpCircle, ChevronDown, Link2, Check, 
    ThumbsUp, ThumbsDown, ArrowRight, MessageSquare, Mail,
    Package, ShieldCheck, CreditCard, RefreshCw, FileText,
    ChevronsUpDown, ChevronUp
} from 'lucide-react';
import SupportContactModal from '@/Components/Consumer/Help/SupportContactModal';

const CATEGORY_ICONS = {
    'Ordering & Cavite Delivery': Package,
    'Pottery Care & Breakage': ShieldCheck,
    'Returns & Disputes': RefreshCw,
    'Payments & Invoices': CreditCard,
    'Account & Biometrics': ShieldCheck,
    'Studio Onboarding & Legal': FileText,
    'POS & In-Store Sales': Store,
    'Payouts & Finance': CreditCard,
    'Inventory & Supplies': Package,
};

export default function HelpCenter({
    buyerFaqs = [],
    artisanFaqs = [],
    initialTab = 'buyer',
    allowedPersona = 'buyer',
    initialSearch = '',
}) {
    // If persona is strictly locked, lock the active tab
    const effectiveInitialTab = useMemo(() => {
        if (allowedPersona === 'artisan') return 'artisan';
        if (allowedPersona === 'buyer') return 'buyer';
        return initialTab === 'artisan' ? 'artisan' : 'buyer';
    }, [allowedPersona, initialTab]);

    const [activeTab, setActiveTab] = useState(effectiveInitialTab);
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [copiedId, setCopiedId] = useState(null);
    const [feedbackState, setFeedbackState] = useState({});
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    // Anchor hash link handler on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            setExpandedIds(new Set([hash]));
            setTimeout(() => {
                const el = document.getElementById(hash);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 150);
        }
    }, []);

    const currentFaqList = useMemo(() => {
        return activeTab === 'artisan' ? artisanFaqs : buyerFaqs;
    }, [activeTab, artisanFaqs, buyerFaqs]);

    // Unique categories with counts
    const categoriesWithCounts = useMemo(() => {
        const counts = {};
        currentFaqList.forEach((f) => {
            counts[f.category] = (counts[f.category] || 0) + 1;
        });
        const list = Object.keys(counts).map((cat) => ({
            name: cat,
            count: counts[cat],
            icon: CATEGORY_ICONS[cat] || HelpCircle,
        }));
        return [{ name: 'All', count: currentFaqList.length, icon: HelpCircle }, ...list];
    }, [currentFaqList]);

    // Switch tabs and reset category
    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSelectedCategory('All');
        setExpandedIds(new Set());
    };

    // Filtered FAQ list based on category and search
    const filteredFaqs = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return currentFaqList.filter((faq) => {
            const matchesCategory =
                selectedCategory === 'All' || faq.category === selectedCategory;

            if (!matchesCategory) return false;
            if (!query) return true;

            const inQuestion = faq.question.toLowerCase().includes(query);
            const inAnswer = faq.answer.toLowerCase().includes(query);
            const inTags = faq.tags?.some((t) => t.toLowerCase().includes(query));
            const inCategory = faq.category.toLowerCase().includes(query);

            return inQuestion || inAnswer || inTags || inCategory;
        });
    }, [currentFaqList, searchTerm, selectedCategory]);

    // Expand / Collapse toggling
    const toggleFaq = (id) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const isAllExpanded = useMemo(() => {
        if (filteredFaqs.length === 0) return false;
        return filteredFaqs.every((f) => expandedIds.has(f.id));
    }, [filteredFaqs, expandedIds]);

    const handleToggleExpandAll = () => {
        if (isAllExpanded) {
            setExpandedIds(new Set());
        } else {
            setExpandedIds(new Set(filteredFaqs.map((f) => f.id)));
        }
    };

    const handleCopyAnchor = (e, id) => {
        e.stopPropagation();
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        url.hash = id;
        navigator.clipboard?.writeText(url.toString()).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const handleFeedback = (faqId, type) => {
        setFeedbackState((prev) => ({ ...prev, [faqId]: type }));
    };

    return (
        <div className="min-h-screen bg-stone-50/60 font-sans text-stone-800 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
            <Head title="Help Center & FAQ - LikhangKamay" />

            <div className="max-w-6xl mx-auto">
                {/* Back Link */}
                <div className="mb-4 sm:mb-6">
                    <Link
                        href={activeTab === 'artisan' ? route('dashboard') : route('shop.index')}
                        className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-900 transition-colors text-xs sm:text-sm font-bold"
                    >
                        <ArrowLeft size={15} />
                        {activeTab === 'artisan' ? 'Back to Studio Dashboard' : 'Back to Shop'}
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Sticky Sidebar (4 columns on desktop) */}
                    <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
                        {/* Header Block */}
                        <div className="border-b border-stone-200/70 pb-4">
                            <span className="text-[10px] font-bold tracking-widest text-clay-700 uppercase">
                                {activeTab === 'artisan' ? 'Artisan Studio • Help Hub' : 'Customer Support • Help Hub'}
                            </span>
                            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-0.5">
                                {activeTab === 'artisan' ? 'Artisan Help Center' : 'Help Center'}
                            </h1>
                            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                                {activeTab === 'artisan'
                                    ? 'Answers on Cavite pottery studio operations, payouts, BIR VAT, and dispatch.'
                                    : 'Answers on Cavite pottery delivery, fragile warranty, return windows, and orders.'}
                            </p>
                        </div>

                        {/* Persona Switcher Tabs - Strictly rendered ONLY for administrators who audit both */}
                        {allowedPersona === 'all' && (
                            <div className="bg-stone-100 p-1 rounded-xl flex items-center border border-stone-200/70">
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('buyer')}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                        activeTab === 'buyer'
                                            ? 'bg-white text-clay-700 shadow-xs'
                                            : 'text-stone-500 hover:text-stone-900'
                                    }`}
                                >
                                    <ShoppingBag size={13} />
                                    <span>Buyer Guide</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('artisan')}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                        activeTab === 'artisan'
                                            ? 'bg-white text-clay-700 shadow-xs'
                                            : 'text-stone-500 hover:text-stone-900'
                                    }`}
                                >
                                    <Store size={13} />
                                    <span>Artisan Guide</span>
                                </button>
                            </div>
                        )}

                        {/* Desktop Table of Contents */}
                        <div className="hidden lg:block">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2 px-2.5">
                                Topics & Categories
                            </p>
                            <nav className="space-y-0.5">
                                {categoriesWithCounts.map((cat) => {
                                    const isSelected = selectedCategory === cat.name;
                                    const IconComponent = cat.icon;
                                    return (
                                        <button
                                            key={cat.name}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat.name)}
                                            className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-between gap-2 ${
                                                isSelected
                                                    ? 'bg-clay-700 text-white shadow-xs font-bold'
                                                    : 'text-stone-600 hover:text-clay-700 hover:bg-stone-100/70'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2 truncate">
                                                <IconComponent size={13} className={isSelected ? 'text-white' : 'text-stone-400'} />
                                                <span className="truncate">{cat.name}</span>
                                            </span>
                                            <span
                                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                    isSelected
                                                        ? 'bg-clay-900 text-clay-100'
                                                        : 'bg-stone-200/70 text-stone-600'
                                                }`}
                                            >
                                                {cat.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Desktop Escalation Card */}
                        <div className="hidden lg:block bg-white border border-stone-200/70 p-4 rounded-xl shadow-xs space-y-2.5">
                            <div>
                                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                    <HelpCircle size={13} className="text-clay-600" />
                                    {activeTab === 'artisan' ? 'Need Studio Assistance?' : 'Still need assistance?'}
                                </h4>
                                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                                    {activeTab === 'artisan'
                                        ? 'Access your workshop fulfillment or contact our artisan merchant desk.'
                                        : 'Message the pottery workshop directly or contact platform support.'}
                                </p>
                            </div>

                            {activeTab === 'artisan' ? (
                                <Link
                                    href={route('orders.index')}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-clay-700 hover:bg-clay-800 text-white rounded-lg font-bold transition text-xs shadow-xs"
                                >
                                    <Package size={13} />
                                    <span>Studio Orders & Fulfillment</span>
                                </Link>
                            ) : (
                                <Link
                                    href={route('my-orders.index')}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-clay-700 hover:bg-clay-800 text-white rounded-lg font-bold transition text-xs shadow-xs"
                                >
                                    <MessageSquare size={13} />
                                    <span>Message Artisan (My Purchases)</span>
                                </Link>
                            )}

                            <button
                                type="button"
                                onClick={() => setIsContactModalOpen(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-lg font-semibold transition text-xs border border-stone-200/80"
                            >
                                <Mail size={13} className="text-stone-500" />
                                <span>{activeTab === 'artisan' ? 'Artisan Merchant Desk' : 'Email Platform Support'}</span>
                            </button>

                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                                <Link href={route('terms')} className="hover:text-stone-700 hover:underline">
                                    Terms
                                </Link>
                                <span>•</span>
                                <Link href={route('privacy')} className="hover:text-stone-700 hover:underline">
                                    Privacy
                                </Link>
                                <span>•</span>
                                <Link href={route('seller.agreement')} className="hover:text-stone-700 hover:underline">
                                    Seller Agreement
                                </Link>
                            </div>
                        </div>
                    </aside>

                    {/* Right Main Content Pane (8 columns on desktop) */}
                    <main className="lg:col-span-8 bg-white border border-stone-200/70 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                        {/* Compact Search Bar */}
                        <div className="relative">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search questions (e.g. Cavite delivery, broken pottery, VAT invoice)..."
                                className="w-full pl-9 pr-8 py-2 bg-stone-50/80 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1.5 focus:ring-clay-500 focus:bg-white transition-all"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded-md"
                                    aria-label="Clear search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Mobile Horizontal Category Pills Strip (lg:hidden) */}
                        <div className="lg:hidden -mx-4 px-4 overflow-x-auto pb-1 scrollbar-none flex items-center gap-1.5 border-b border-stone-100 pt-1">
                            {categoriesWithCounts.map((cat) => {
                                const isSelected = selectedCategory === cat.name;
                                return (
                                    <button
                                        key={cat.name}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat.name)}
                                        className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                            isSelected
                                                ? 'bg-clay-700 text-white shadow-xs font-bold'
                                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
                                        }`}
                                    >
                                        <span>{cat.name}</span>
                                        <span className={`ml-1 text-[10px] ${isSelected ? 'text-clay-100' : 'text-stone-400'}`}>
                                            ({cat.count})
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Status Bar with Expand All / Collapse All */}
                        <div className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-100 pb-2.5 pt-0.5">
                            <div className="flex items-center gap-2 truncate">
                                <span className="font-medium truncate">
                                    {selectedCategory === 'All' ? 'All Questions' : selectedCategory} ({filteredFaqs.length})
                                </span>
                                {(searchTerm || selectedCategory !== 'All') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSelectedCategory('All');
                                        }}
                                        className="text-clay-700 hover:underline font-bold text-[11px] shrink-0"
                                    >
                                        Clear filter
                                    </button>
                                )}
                            </div>

                            {filteredFaqs.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleToggleExpandAll}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-clay-700 hover:text-clay-900 transition shrink-0 hover:underline"
                                >
                                    {isAllExpanded ? (
                                        <>
                                            <ChevronUp size={13} />
                                            <span>Collapse All</span>
                                        </>
                                    ) : (
                                        <>
                                            <ChevronsUpDown size={13} />
                                            <span>Expand All</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Accordion List */}
                        {filteredFaqs.length > 0 ? (
                            <div className="divide-y divide-stone-100">
                                {filteredFaqs.map((faq) => {
                                    const isOpen = expandedIds.has(faq.id);
                                    const isCopied = copiedId === faq.id;
                                    const feedback = feedbackState[faq.id];

                                    return (
                                        <div
                                            key={faq.id}
                                            id={faq.id}
                                            className="py-2.5 sm:py-3 first:pt-0 last:pb-0 transition-colors"
                                        >
                                            {/* Question Header */}
                                            <button
                                                type="button"
                                                onClick={() => toggleFaq(faq.id)}
                                                className="w-full text-left flex items-start justify-between gap-3 group focus:outline-none"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                        <span className="text-[10px] font-bold text-clay-700 bg-clay-50 px-2 py-0.5 rounded border border-clay-200/50 uppercase tracking-wide">
                                                            {faq.category}
                                                        </span>
                                                        {faq.tags && faq.tags.slice(0, 2).map((tag) => (
                                                            <span key={tag} className="text-[10px] text-stone-400 font-medium hidden sm:inline">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <h3 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-clay-700 transition-colors leading-snug">
                                                        {faq.question}
                                                    </h3>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopyAnchor(e, faq.id)}
                                                        title="Copy direct link to this answer"
                                                        aria-label="Copy direct link to this answer"
                                                        className="p-1 rounded text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition"
                                                    >
                                                        {isCopied ? (
                                                            <Check size={13} className="text-emerald-600" />
                                                        ) : (
                                                            <Link2 size={13} />
                                                        )}
                                                    </button>
                                                    <div className="p-1 text-stone-400">
                                                        <ChevronDown
                                                            size={15}
                                                            className={`transition-transform duration-200 ${
                                                                isOpen ? 'rotate-180 text-clay-700' : ''
                                                            }`}
                                                        />
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Compact Answer Body */}
                                            {isOpen && (
                                                <div className="mt-2 text-xs sm:text-[13px] text-stone-700 leading-relaxed space-y-2.5 bg-stone-50/70 p-3 sm:p-3.5 rounded-xl border border-stone-200/60 animate-in fade-in duration-150">
                                                    <p className="whitespace-pre-line">{faq.answer}</p>

                                                    {/* In-App Deep Link Action */}
                                                    {faq.deep_link && (
                                                        <div className="pt-1">
                                                            <Link
                                                                href={route(faq.deep_link.route)}
                                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-clay-700 hover:text-clay-900 hover:underline transition group bg-white border border-stone-200/80 px-2.5 py-1 rounded-lg shadow-2xs"
                                                            >
                                                                <span>{faq.deep_link.label}</span>
                                                                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                                            </Link>
                                                        </div>
                                                    )}

                                                    {/* Micro Feedback Bar */}
                                                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                                                        <span>Was this answer helpful?</span>
                                                        {feedback ? (
                                                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                                                Thank you for your feedback!
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFeedback(faq.id, 'yes')}
                                                                    className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1 transition text-[11px] font-semibold"
                                                                >
                                                                    <ThumbsUp size={10} />
                                                                    <span>Yes</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFeedback(faq.id, 'no')}
                                                                    className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1 transition text-[11px] font-semibold"
                                                                >
                                                                    <ThumbsDown size={10} />
                                                                    <span>No</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <HelpCircle size={28} className="text-stone-300 mx-auto mb-1.5" />
                                <h4 className="text-xs sm:text-sm font-bold text-stone-800">
                                    No questions found
                                </h4>
                                <p className="text-xs text-stone-500 mt-0.5 max-w-xs mx-auto">
                                    Try different keywords or reset your topic filter.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedCategory('All');
                                    }}
                                    className="mt-2.5 px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition"
                                >
                                    Clear search & filter
                                </button>
                            </div>
                        )}
                    </main>

                    {/* Mobile Support Escalation Card (placed below content on mobile) */}
                    <div className="lg:hidden col-span-1 bg-white border border-stone-200/70 p-4 rounded-xl shadow-xs space-y-2.5">
                        <div>
                            <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                <HelpCircle size={13} className="text-clay-600" />
                                {activeTab === 'artisan' ? 'Need Studio Assistance?' : 'Still need assistance?'}
                            </h4>
                            <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                                {activeTab === 'artisan'
                                    ? 'Access your workshop fulfillment or contact our artisan merchant desk.'
                                    : 'Message the pottery workshop directly or contact platform support.'}
                            </p>
                        </div>

                        {activeTab === 'artisan' ? (
                            <Link
                                href={route('orders.index')}
                                className="w-full flex items-center justify-center gap-1.5 py-2 bg-clay-700 hover:bg-clay-800 text-white rounded-lg font-bold transition text-xs shadow-xs"
                            >
                                <Package size={13} />
                                <span>Studio Orders & Fulfillment</span>
                            </Link>
                        ) : (
                            <Link
                                href={route('my-orders.index')}
                                className="w-full flex items-center justify-center gap-1.5 py-2 bg-clay-700 hover:bg-clay-800 text-white rounded-lg font-bold transition text-xs shadow-xs"
                            >
                                <MessageSquare size={13} />
                                <span>Message Artisan (My Purchases)</span>
                            </Link>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsContactModalOpen(true)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-lg font-semibold transition text-xs border border-stone-200/80"
                        >
                            <Mail size={13} className="text-stone-500" />
                            <span>{activeTab === 'artisan' ? 'Artisan Merchant Desk' : 'Email Platform Support'}</span>
                        </button>

                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                            <Link href={route('terms')} className="hover:text-stone-700 hover:underline">
                                Terms
                            </Link>
                            <span>•</span>
                            <Link href={route('privacy')} className="hover:text-stone-700 hover:underline">
                                Privacy
                            </Link>
                            <span>•</span>
                            <Link href={route('seller.agreement')} className="hover:text-stone-700 hover:underline">
                                Seller Agreement
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Direct Support Modal (Bypasses desktop mail app popups with direct Gmail Web integration) */}
            <SupportContactModal
                show={isContactModalOpen}
                initialPersona={activeTab}
                lockedPersona={allowedPersona !== 'all' ? allowedPersona : null}
                onClose={() => setIsContactModalOpen(false)}
            />
        </div>
    );
}
