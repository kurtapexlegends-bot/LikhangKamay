import React, { useMemo } from 'react';
import Modal from '@/Components/Modal';
import { CheckCircle2, Lock, Sparkles, Crown, Package, Layers, ShieldCheck, X } from 'lucide-react';

export default function SubscriptionComparisonModal({ isOpen, onClose, currentPlan, planSettings = {} }) {
    const comparisonGroups = useMemo(() => {
        const freeLimit = planSettings?.free_limit ?? 3;
        const freeStaffLimit = planSettings?.free_staff_limit ?? 0;
        const premiumPrice = planSettings?.premium_price ?? 199;
        const premiumLimit = planSettings?.premium_limit ?? 10;
        const premiumStaffLimit = planSettings?.premium_staff_limit ?? 3;
        const superPremiumPrice = planSettings?.super_premium_price ?? 399;
        const superPremiumLimit = planSettings?.super_premium_limit ?? 50;
        const superPremiumStaffLimit = planSettings?.super_premium_staff_limit ?? 15;

        const isModuleEnabled = (tier, moduleId, fallback = false) => {
            if (planSettings?.modules?.[tier]?.[moduleId] !== undefined) {
                return Boolean(planSettings.modules[tier][moduleId]);
            }
            return fallback;
        };

        const getFeatureName = (moduleId, fallback) => {
            return (
                planSettings?.feature_labels?.super_premium?.[moduleId] ||
                planSettings?.feature_labels?.premium?.[moduleId] ||
                planSettings?.feature_labels?.free?.[moduleId] ||
                fallback
            );
        };

        const getTierStatus = (tier, moduleId, fallback = false, options = {}) => {
            const enabled = isModuleEnabled(tier, moduleId, fallback);
            if (!enabled) {
                return { text: options.lockedText || 'Locked', status: 'locked' };
            }
            if (options.partial) {
                return { text: options.unlockedText || 'Toggleable Module', status: 'partial' };
            }
            return { text: options.unlockedText || 'Full Access', status: 'unlocked' };
        };

        const groups = [
            {
                category: 'Shop Catalog & Listings',
                features: [
                    {
                        name: 'Monthly Subscription',
                        subtext: 'Monthly shop plan fee',
                        free: '₱0 (Free)',
                        premium: `₱${premiumPrice} / month`,
                        super_premium: `₱${superPremiumPrice} / month`,
                    },
                    {
                        name: 'Active Product Limit',
                        subtext: 'Active products displayed in your shop',
                        free: `${freeLimit} Products`,
                        premium: `${premiumLimit} Products`,
                        super_premium: `${superPremiumLimit} Products`,
                    },
                    {
                        name: getFeatureName('viewer_3d', '3D Interactive Model Viewer'),
                        subtext: 'Interactive 3D model viewport for customers on product pages',
                        free: getTierStatus('free', 'viewer_3d', true),
                        premium: getTierStatus('premium', 'viewer_3d', true),
                        super_premium: getTierStatus('super_premium', 'viewer_3d', true),
                    },
                    {
                        name: 'Core Workspace Operations',
                        subtext: 'Product management, basic orders, and shop profile settings',
                        free: { text: 'Full Access', status: 'unlocked' },
                        premium: { text: 'Full Access', status: 'unlocked' },
                        super_premium: { text: 'Full Access', status: 'unlocked' },
                    },
                    {
                        name: getFeatureName('chat_auto_reply', 'Automated Thank-You Messages'),
                        subtext: 'Automatic thank-you messages sent when orders are completed',
                        free: getTierStatus('free', 'chat_auto_reply', false),
                        premium: getTierStatus('premium', 'chat_auto_reply', true),
                        super_premium: getTierStatus('super_premium', 'chat_auto_reply', true),
                    },
                ],
            },
            {
                category: 'Orders & Deliveries',
                features: [
                    {
                        name: getFeatureName('courier_booking', 'Courier Booking via Lalamove'),
                        subtext: 'On-demand motorcycle, sedan, and MPV courier dispatch',
                        free: getTierStatus('free', 'courier_booking', true),
                        premium: getTierStatus('premium', 'courier_booking', true),
                        super_premium: getTierStatus('super_premium', 'courier_booking', true),
                    },
                    {
                        name: getFeatureName('in_house_dispatch', 'In-House Studio Driver Dispatch'),
                        subtext: 'Assign orders to in-house studio drivers with mobile proof-of-delivery',
                        free: getTierStatus('free', 'in_house_dispatch', false),
                        premium: getTierStatus('premium', 'in_house_dispatch', true),
                        super_premium: getTierStatus('super_premium', 'in_house_dispatch', true),
                    },
                    {
                        name: getFeatureName('printable_documents', 'Printable Invoices & Receipts'),
                        subtext: 'Downloadable PDF invoices, packing slips, and 58mm thermal receipts',
                        free: getTierStatus('free', 'printable_documents', true),
                        premium: getTierStatus('premium', 'printable_documents', true),
                        super_premium: getTierStatus('super_premium', 'printable_documents', true),
                    },
                    {
                        name: getFeatureName('customer_reviews', 'Customer Reviews & Ratings'),
                        subtext: 'Customer ratings, seller replies, and review dispute resolution',
                        free: getTierStatus('free', 'customer_reviews', true),
                        premium: getTierStatus('premium', 'customer_reviews', true),
                        super_premium: getTierStatus('super_premium', 'customer_reviews', true),
                    },
                ],
            },
            {
                category: 'Wholesale & B2B',
                features: [
                    {
                        name: getFeatureName('b2b_supply_hub', 'B2B Supply Hub & Wholesale Ordering'),
                        subtext: 'Source raw materials from peer artisans and list wholesale tiers with MOQ',
                        free: getTierStatus('free', 'b2b_supply_hub', false),
                        premium: getTierStatus('premium', 'b2b_supply_hub', false),
                        super_premium: getTierStatus('super_premium', 'b2b_supply_hub', true),
                    },
                ],
            },
            {
                category: 'Materials & Inventory',
                features: [
                    {
                        name: getFeatureName('material_recipes', 'Materials & Craft Recipes'),
                        subtext: 'Track materials used in each craft and deduct stock automatically',
                        free: getTierStatus('free', 'material_recipes', false, { lockedText: 'Locked (Ready-to-Sell Only)' }),
                        premium: getTierStatus('premium', 'material_recipes', true),
                        super_premium: getTierStatus('super_premium', 'material_recipes', true),
                    },
                    {
                        name: 'Supply Requests',
                        subtext: 'Order requests for crafting supplies and materials',
                        free: { text: 'Locked', status: 'locked' },
                        premium: { text: 'Full Access', status: 'unlocked' },
                        super_premium: { text: 'Full Access', status: 'unlocked' },
                    },
                    {
                        name: getFeatureName('analytics_export', 'Download Sales Summary'),
                        subtext: 'Download spreadsheets with your sales and performance figures',
                        free: getTierStatus('free', 'analytics_export', false, { lockedText: 'Dashboard View Only' }),
                        premium: getTierStatus('premium', 'analytics_export', true, { unlockedText: 'CSV / PDF Export Unlocked' }),
                        super_premium: getTierStatus('super_premium', 'analytics_export', true, { unlockedText: 'CSV / PDF Export Unlocked' }),
                    },
                ],
            },
            {
                category: 'Team & Business Operations',
                features: [
                    {
                        name: 'Employee Accounts & Seats',
                        subtext: 'Individual login seats for workshop staff with role permissions',
                        free: isModuleEnabled('free', 'staff_management', false) && freeStaffLimit > 0
                            ? `${freeStaffLimit} Staff Accounts`
                            : 'Owner Only (0 Seats)',
                        premium: isModuleEnabled('premium', 'staff_management', true) && premiumStaffLimit > 0
                            ? `${premiumStaffLimit} Staff Accounts`
                            : 'Locked',
                        super_premium: isModuleEnabled('super_premium', 'staff_management', true) && superPremiumStaffLimit > 0
                            ? `${superPremiumStaffLimit} Staff Accounts`
                            : 'Locked',
                    },
                    {
                        name: 'Internal Team Chat & Channels',
                        subtext: 'Internal workshop messaging and driver coordination channels',
                        free: { text: 'Locked', status: 'locked' },
                        premium: { text: 'Full Access', status: 'unlocked' },
                        super_premium: { text: 'Full Access', status: 'unlocked' },
                    },
                    {
                        name: getFeatureName('staff_management', 'Staff & Payroll Tools'),
                        subtext: 'Employee work hours, attendance checks, and payroll summaries',
                        free: getTierStatus('free', 'staff_management', false),
                        premium: getTierStatus('premium', 'staff_management', true, { partial: true }),
                        super_premium: getTierStatus('super_premium', 'staff_management', true),
                    },
                    {
                        name: getFeatureName('custom_modules', 'Bookkeeping & Financial Records'),
                        subtext: 'Shop earnings, payout records, and expense tracking',
                        free: getTierStatus('free', 'custom_modules', false),
                        premium: getTierStatus('premium', 'custom_modules', true, { partial: true }),
                        super_premium: getTierStatus('super_premium', 'custom_modules', true),
                    },
                ],
            },
            {
                category: 'Marketing & Pricing',
                features: [
                    {
                        name: getFeatureName('discounts', 'Discounts & Promo Codes'),
                        subtext: 'Create promo discount codes, sales discounts, and purchase limits',
                        free: getTierStatus('free', 'discounts', false),
                        premium: getTierStatus('premium', 'discounts', false),
                        super_premium: getTierStatus('super_premium', 'discounts', true),
                    },
                    {
                        name: getFeatureName('sponsorships', 'Featured Shop Spotlights'),
                        subtext: 'Front-page banner placement and featured artisan spotlights',
                        free: getTierStatus('free', 'sponsorships', false),
                        premium: getTierStatus('premium', 'sponsorships', false),
                        super_premium: getTierStatus('super_premium', 'sponsorships', true, { unlockedText: '5 Credits / 30 Days' }),
                    },
                ],
            },
        ];

        const customFree = planSettings?.custom_features?.free || [];
        const customPremium = planSettings?.custom_features?.premium || [];
        const customSuperPremium = planSettings?.custom_features?.super_premium || [];
        const allCustomPerks = Array.from(new Set([...customFree, ...customPremium, ...customSuperPremium]));

        if (allCustomPerks.length > 0) {
            groups.push({
                category: 'Exclusive Plan Highlights & Perks',
                features: allCustomPerks.map((perk) => ({
                    name: perk,
                    subtext: 'Custom plan capability configured by administration',
                    free: customFree.includes(perk) ? { text: 'Included', status: 'unlocked' } : { text: 'Locked', status: 'locked' },
                    premium: customPremium.includes(perk) ? { text: 'Included', status: 'unlocked' } : { text: 'Locked', status: 'locked' },
                    super_premium: customSuperPremium.includes(perk) ? { text: 'Included', status: 'unlocked' } : { text: 'Locked', status: 'locked' },
                })),
            });
        }

        return groups;
    }, [planSettings]);

    const renderValue = (val) => {
        if (typeof val === 'string') {
            return <span className="font-bold text-stone-900">{val}</span>;
        }

        if (val.status === 'unlocked') {
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>{val.text}</span>
                </div>
            );
        }

        if (val.status === 'partial') {
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] font-bold">
                    <CheckCircle2 size={13} className="text-amber-600 shrink-0" />
                    <span>{val.text}</span>
                </div>
            );
        }

        return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-500 border border-stone-200/60 text-[11px] font-medium">
                <Lock size={12} className="text-stone-400 shrink-0" />
                <span>{val.text}</span>
            </div>
        );
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="4xl">
            <div className="flex max-h-[85vh] flex-col bg-white rounded-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="shrink-0 border-b border-stone-150 px-6 py-5 bg-stone-50/70 flex items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-200/80 text-stone-700 text-[10px] font-black uppercase tracking-widest mb-1">
                            <Layers size={12} />
                            Plan Comparison
                        </div>
                        <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
                            Compare Shop Plans
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5 max-w-xl">
                            Compare active listing limits, raw material tracking, employee accounts, and business features.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-700 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-0 no-scrollbar">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b border-stone-200 bg-white shadow-2xs">
                                    <th scope="col" className="py-3.5 pl-6 pr-4 font-bold uppercase tracking-wider text-stone-400 text-[10px] w-[37%] bg-white">
                                        Capability / Module
                                    </th>

                                    {/* Standard Header */}
                                    <th scope="col" className={`py-3.5 px-4 text-center w-[21%] transition-colors ${currentPlan === 'free' ? 'bg-stone-100/90 border-x border-stone-200' : 'bg-white'}`}>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center">
                                                <Package size={15} />
                                            </div>
                                            <span className="font-extrabold text-stone-900 text-sm">Standard</span>
                                            {currentPlan === 'free' && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-800 text-stone-100">
                                                    <ShieldCheck size={10} /> Active
                                                </span>
                                            )}
                                        </div>
                                    </th>

                                    {/* Premium Header */}
                                    <th scope="col" className={`py-3.5 px-4 text-center w-[21%] transition-colors ${currentPlan === 'premium' ? 'bg-amber-50/90 border-x border-amber-200' : 'bg-white'}`}>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                                                <Crown size={15} />
                                            </div>
                                            <span className="font-extrabold text-stone-900 text-sm">Premium</span>
                                            {currentPlan === 'premium' ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-600 text-white">
                                                    <ShieldCheck size={10} /> Active
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-amber-700">Most Popular</span>
                                            )}
                                        </div>
                                    </th>

                                    {/* Elite Header */}
                                    <th scope="col" className={`py-3.5 px-4 text-center w-[21%] transition-colors ${currentPlan === 'super_premium' ? 'bg-violet-50/90 border-x border-violet-200' : 'bg-white'}`}>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shadow-xs">
                                                <Sparkles size={15} />
                                            </div>
                                            <span className="font-extrabold text-stone-900 text-sm">Elite</span>
                                            {currentPlan === 'super_premium' ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-600 text-white">
                                                    <ShieldCheck size={10} /> Active
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-violet-700">All Unlocked</span>
                                            )}
                                        </div>
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-stone-150">
                                {comparisonGroups.map((group, gIdx) => (
                                    <React.Fragment key={gIdx}>
                                        <tr className="bg-stone-50/70 border-y border-stone-200">
                                            <td colSpan={4} className="py-2.5 pl-6 pr-4 text-[10px] font-black uppercase tracking-widest text-stone-500">
                                                {group.category}
                                            </td>
                                        </tr>
                                        {group.features.map((item, fIdx) => (
                                            <tr key={fIdx} className="hover:bg-stone-50/40 transition-colors">
                                                <td className="py-3.5 pl-6 pr-4">
                                                    <p className="font-bold text-stone-900 text-xs">{item.name}</p>
                                                    {item.subtext && (
                                                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{item.subtext}</p>
                                                    )}
                                                </td>
                                                <td className={`py-3.5 px-4 text-center align-middle ${currentPlan === 'free' ? 'bg-stone-50/60 border-x border-stone-200/70' : ''}`}>
                                                    {renderValue(item.free)}
                                                </td>
                                                <td className={`py-3.5 px-4 text-center align-middle ${currentPlan === 'premium' ? 'bg-amber-50/40 border-x border-amber-200/70' : ''}`}>
                                                    {renderValue(item.premium)}
                                                </td>
                                                <td className={`py-3.5 px-4 text-center align-middle ${currentPlan === 'super_premium' ? 'bg-violet-50/40 border-x border-violet-200/70' : ''}`}>
                                                    {renderValue(item.super_premium)}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="shrink-0 border-t border-stone-150 px-6 py-4 bg-stone-50/50 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition"
                    >
                        Close Comparison
                    </button>
                </div>
            </div>
        </Modal>
    );
}
