import React from 'react';
import { router, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Lock, 
    LogOut, 
    Store, 
    ShieldCheck, 
    Clock3, 
    Sparkles, 
    CheckCircle2, 
    ArrowRight,
    CreditCard,
    BadgeCheck
} from 'lucide-react';
import SubscriptionPlans from './SubscriptionPlans';

export default function SubscriptionPaywallGate({
    plans,
    currentPlan,
    previousPlanKey = 'free',
    shopName = 'Your Workshop',
    shopAvatar = null,
    isProcessing = false,
    handleUpgrade,
    handleStartTrial = null,
    canStartTrial = false,
    hasUsedTrial = false,
    billingCycle = 'monthly',
    setBillingCycle,
    annualDiscount = 20,
    pendingUpgrade = null,
    onOpenComparison,
    daysRemaining = null,
    formattedExpirationDate = null,
}) {
    const handleLogout = () => {
        router.post(route('logout'));
    };

    return (
        <div className="min-h-screen bg-stone-50/70 text-stone-900 selection:bg-amber-500/20 flex flex-col justify-between">
            {/* Minimalist Top App Bar */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3.5 shadow-2xs">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center font-serif font-black text-lg tracking-tight group-hover:bg-stone-800 transition shadow-2xs">
                                LK
                            </div>
                            <span className="font-serif font-black text-lg tracking-tight text-stone-900 hidden sm:inline">
                                LikhangKamay
                            </span>
                        </Link>
                        <div className="h-5 w-px bg-stone-200 hidden sm:block" />
                        <span className="text-xs font-bold text-stone-500 tracking-wide uppercase hidden sm:inline">
                            Artisan Workspace Gate
                        </span>
                    </div>

                    {/* Shop Identity & Actions */}
                    <div className="flex items-center gap-2.5 sm:gap-4">
                        <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-stone-100 border border-stone-200/80">
                            {shopAvatar ? (
                                <img
                                    src={shopAvatar}
                                    alt={shopName}
                                    className="w-6 h-6 rounded-full object-cover border border-stone-300"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-[11px] font-black uppercase">
                                    {shopName?.charAt(0) || 'W'}
                                </div>
                            )}
                            <span className="text-xs font-bold text-stone-800 truncate max-w-[120px] sm:max-w-[180px]">
                                {shopName}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                                <Lock className="w-2.5 h-2.5" />
                                Inactive
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-700 bg-white border border-stone-200 hover:bg-stone-100 hover:text-stone-900 transition shadow-2xs min-h-[36px]"
                            title="Log Out of Artisan Account"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Log Out</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Paywall Workspace Body */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Hero Guidance Section */}
                <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black uppercase tracking-wider mb-4 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>{canStartTrial ? 'Artisan Plan Selection' : 'Reactivate Workshop Access'}</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-stone-900 tracking-tight leading-tight">
                        {canStartTrial ? 'Choose Your Workshop Plan' : 'Choose a Plan to Reopen Your Workshop'}
                    </h1>
                    <p className="mt-3 sm:mt-4 text-stone-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                        {canStartTrial
                            ? 'Welcome to LikhangKamay! Select our 14-day Basic Free Trial to begin setting up your studio, or choose a Premium or Elite tier to unlock advanced operational and dispatch tools.'
                            : 'Your subscription has concluded. Select an artisan subscription tier below to immediately restore your store, reactivate your product listings, and reopen full workspace tools.'}
                    </p>
                </div>

                {/* Subscription Plans Matrix */}
                <div className="mt-4">
                    <SubscriptionPlans
                        plans={plans}
                        currentPlan={currentPlan}
                        pendingUpgrade={pendingUpgrade}
                        activeProductsCount={0}
                        limit={0}
                        isProcessing={isProcessing}
                        handleUpgrade={handleUpgrade}
                        handleStartTrial={handleStartTrial}
                        canStartTrial={canStartTrial}
                        hasUsedTrial={hasUsedTrial}
                        initiateDowngrade={() => {}}
                        handleScheduleRenewal={() => {}}
                        pendingDowngradeTier={null}
                        daysRemaining={0}
                        subscriptionExpiresAt={null}
                        handleScroll={() => {}}
                        activePageIndex={0}
                        pendingUpgradeDate={null}
                        onOpenComparison={onOpenComparison}
                        isOnTrial={false}
                        trialEndsAt={null}
                        trialDaysRemaining={0}
                        hasSubscriptionHistory={!canStartTrial}
                        isNewApprovedArtisan={canStartTrial}
                        isCancelled={false}
                        isExpired={!canStartTrial}
                        billingCycle={billingCycle}
                        setBillingCycle={setBillingCycle}
                        annualDiscount={annualDiscount}
                    />
                </div>

                {/* Trust & Guarantee Strip */}
                <div className="mt-10 max-w-4xl mx-auto border-t border-stone-200/90 pt-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center">
                                <CreditCard className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-stone-900">Encrypted PayMongo Checkout</span>
                            <span className="text-[11px] text-stone-500">Pay securely via GCash, Maya, or Credit/Debit Cards</span>
                        </div>

                        <div className="flex flex-col items-center gap-1.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-stone-900">Instant Workspace Reactivation</span>
                            <span className="text-[11px] text-stone-500">Workspace tools & products unlock immediately upon payment</span>
                        </div>

                        <div className="flex flex-col items-center gap-1.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                                <Store className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-stone-900">Cavite Artisan Network</span>
                            <span className="text-[11px] text-stone-500">Official verified marketplace for provincial artisans</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Subtle Footer */}
            <footer className="border-t border-stone-200/70 bg-white py-4 px-6 text-center">
                <p className="text-xs text-stone-500 font-medium">
                    Need assistance or billing support? Reach our support team at <a href="mailto:support@likhangkamay.com" className="font-bold text-stone-800 underline hover:text-stone-900">support@likhangkamay.com</a>
                </p>
            </footer>
        </div>
    );
}
