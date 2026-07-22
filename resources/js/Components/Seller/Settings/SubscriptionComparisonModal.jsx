import React, { useMemo } from 'react';
import Modal from '@/Components/Modal';
import { CheckCircle2, Lock, Sparkles, Crown, Package, Layers, ShieldCheck, X } from 'lucide-react';

export default function SubscriptionComparisonModal({ isOpen, onClose, currentPlan, planSettings = {} }) {
    const comparisonGroups = useMemo(() => {
        const freeLimit = planSettings?.free_limit ?? 3;
        const premiumPrice = planSettings?.premium_price ?? 199;
        const premiumLimit = planSettings?.premium_limit ?? 10;
        const superPremiumPrice = planSettings?.super_premium_price ?? 399;
        const superPremiumLimit = planSettings?.super_premium_limit ?? 50;

        return [
            {
                category: 'Catalog & Listing Capacity',
                features: [
                    {
                        name: 'Monthly Subscription',
                        subtext: 'Billing cycle fee processed via PayMongo',
                        free: '₱0 (Free)',
                        premium: `₱${premiumPrice} / month`,
                        super_premium: `₱${superPremiumPrice} / month`,
                    },
                    {
                        name: 'Active Product Limit',
                        subtext: 'Maximum published active product listings in marketplace',
                        free: `${freeLimit} Products`,
                        premium: `${premiumLimit} Products`,
                        super_premium: `${superPremiumLimit} Products`,
                    },
                    {
                        name: 'Core Workspace Operations',
                        subtext: 'Catalog management, order processing, live customer chat, reviews & shop settings',
                        free: { text: 'Full Access', status: 'unlocked' },
                        premium: { text: 'Full Access', status: 'unlocked' },
                        super_premium: { text: 'Full Access', status: 'unlocked' },
                    },
                ],
            },
            {
                category: 'Inventory & Procurement',
                features: [
                    {
                        name: 'Procurement & Raw Material BOM',
                        subtext: 'Warehouse supply tracking, Bill of Materials recipes & automatic supply deduction',
                        free: { text: 'Locked (Resell Mode Only)', status: 'locked' },
                        premium: { text: 'Full Access', status: 'unlocked' },
                        super_premium: { text: 'Full Access', status: 'unlocked' },
                    },
                    {
                        name: 'Stock Requests & Warehousing',
                        subtext: 'Inter-branch stock transfers and supplier order requests',
                        free: { text: 'Locked', status: 'locked' },
                        premium: { text: 'Full Access', status: 'unlocked' },
                        super_premium: { text: 'Full Access', status: 'unlocked' },
                    },
                    {
                        name: 'Analytics Report Export',
                        subtext: 'Downloadable CSV and PDF performance and sales reports',
                        free: { text: 'Dashboard View Only', status: 'locked' },
                        premium: { text: 'CSV / PDF Export Unlocked', status: 'unlocked' },
                        super_premium: { text: 'CSV / PDF Export Unlocked', status: 'unlocked' },
                    },
                ],
            },
            {
                category: 'ERP Modules & Staff Management',
                features: [
                    {
                        name: 'HR Payroll & Employee Management',
                        subtext: 'Staff roster management, payroll runs & attendance logging',
                        free: { text: 'Locked', status: 'locked' },
                        premium: { text: 'Toggleable Module', status: 'partial' },
                        super_premium: { text: 'Unlocked by Default', status: 'unlocked' },
                    },
                    {
                        name: 'Accounting & Fund Release Tracking',
                        subtext: 'Escrow tracking, fund approval pipelines & financial ledgers',
                        free: { text: 'Locked', status: 'locked' },
                        premium: { text: 'Toggleable Module', status: 'partial' },
                        super_premium: { text: 'Unlocked by Default', status: 'unlocked' },
                    },
                    {
                        name: 'Staff Accounts & Workplace Chat',
                        subtext: 'Multi-user staff access with role presets and internal team messaging',
                        free: { text: 'Owner Only', status: 'locked' },
                        premium: { text: 'Staff Accounts & Team Chat', status: 'unlocked' },
                        super_premium: { text: 'Staff Accounts & Team Chat', status: 'unlocked' },
                    },
                ],
            },
            {
                category: 'Marketing & Sponsorships',
                features: [
                    {
                        name: 'Platform Sponsorship Credits',
                        subtext: 'Featured homepage banners, artisan spotlights & promotional event slots',
                        free: { text: 'Locked', status: 'locked' },
                        premium: { text: 'Locked', status: 'locked' },
                        super_premium: { text: '5 Credits / 30 Days', status: 'unlocked' },
                    },
                ],
            },
        ];
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
                            Feature Entitlements Matrix
                        </div>
                        <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
                            Detailed Plan Comparison
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5 max-w-xl">
                            Compare active listing limits, raw material recipe tracking, staff accounts, and ERP capabilities.
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
                                    <th scope="col" className={`py-3.5 px-4 text-center w-[21%] transition-colors ${currentPlan === 'super_premium' ? 'bg-stone-100/90 border-x border-stone-300' : 'bg-white'}`}>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center shadow-xs">
                                                <Sparkles size={15} />
                                            </div>
                                            <span className="font-extrabold text-stone-900 text-sm">Elite</span>
                                            {currentPlan === 'super_premium' ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-900 text-amber-300">
                                                    <ShieldCheck size={10} /> Active
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-stone-600">All Unlocked</span>
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
                                                <td className={`py-3.5 px-4 text-center align-middle ${currentPlan === 'super_premium' ? 'bg-stone-100/40 border-x border-stone-200/70' : ''}`}>
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
