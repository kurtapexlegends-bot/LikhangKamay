import React, { useState } from 'react';
import { 
    Zap, 
    Crown, 
    Sparkles, 
    CheckCircle2, 
    Plus, 
    Trash2, 
    RotateCcw, 
    Users, 
    Package, 
    Tag, 
    Layers,
    Settings as SettingsIcon,
    ToggleLeft,
    ToggleRight,
    HelpCircle
} from 'lucide-react';

const DEFAULT_AVAILABLE_MODULES = [
    {
        id: 'viewer_3d',
        category: 'Shop Catalog & Listings',
        default_name: '3D Interactive Model Viewer',
        description: 'Interactive 3D model viewport on product pages letting shoppers inspect ceramics and crafts.',
        defaults: { free: true, premium: true, super_premium: true }
    },
    {
        id: 'courier_booking',
        category: 'Orders & Deliveries',
        default_name: 'Courier Booking (Lalamove)',
        description: 'On-demand courier parcel dispatch and pickup with automated tracking.',
        defaults: { free: true, premium: true, super_premium: true }
    },
    {
        id: 'customer_reviews',
        category: 'Sales & Support',
        default_name: 'Customer Reviews & Dispute Resolution',
        description: 'Collect buyer reviews, provide seller replies, and submit review dispute resolutions.',
        defaults: { free: true, premium: true, super_premium: true }
    },
    {
        id: 'printable_documents',
        category: 'Orders & Deliveries',
        default_name: 'Printable Invoices & Thermal Receipts',
        description: 'Print PDF tax invoices, packaging slips, and 58mm thermal receipts.',
        defaults: { free: true, premium: true, super_premium: true }
    },
    {
        id: 'in_house_dispatch',
        category: 'Orders & Deliveries',
        default_name: 'In-House Driver Fleet Dispatch',
        description: 'Dispatch internal studio drivers with live assignment and mobile proof-of-delivery.',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'material_recipes',
        category: 'Materials & Inventory',
        default_name: 'Materials & Craft Recipes',
        description: 'Track crafting raw materials, recipes, and automatic inventory deduction upon production.',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'staff_management',
        category: 'Team & Business Operations',
        default_name: 'Staff Attendance & Payroll Tools',
        description: 'Employee workspace accounts, facial photo clock-ins, shift tracking, and payroll generation.',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'analytics_export',
        category: 'Team & Business Operations',
        default_name: 'Analytics Report Export',
        description: 'Download shop sales logs, visitor stats, and product reports in CSV/spreadsheet format.',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'custom_modules',
        category: 'Team & Business Operations',
        default_name: 'Workspace Module Customization',
        description: 'Allows artisan to selectively enable or disable operational modules (HR, Accounting).',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'chat_auto_reply',
        category: 'Sales & Support',
        default_name: 'Automated Thank-You Messages',
        description: 'Automatically dispatch personalized thank-you messages when orders are marked completed.',
        defaults: { free: false, premium: true, super_premium: true }
    },
    {
        id: 'b2b_supply_hub',
        category: 'Wholesale & B2B',
        default_name: 'B2B Supply Hub & Wholesale Ordering',
        description: 'Source raw crafting supplies from peer artisans and list wholesale product tiers with MOQ.',
        defaults: { free: false, premium: false, super_premium: true }
    },
    {
        id: 'discounts',
        category: 'Marketing & Pricing',
        default_name: 'Discounts & Promo Coupons',
        description: 'Create promotional coupon codes, flash sales, and cart discounts.',
        defaults: { free: false, premium: false, super_premium: true }
    },
    {
        id: 'sponsorships',
        category: 'Marketing & Pricing',
        default_name: 'Sponsored Catalog Spotlight',
        description: 'Featured artisan spotlight placements on the marketplace homepage and priority category placement.',
        defaults: { free: false, premium: false, super_premium: true }
    },
];

export default function SubscriptionTiers({ data, setData, errors, availableModules = [] }) {
    const modulesCatalog = availableModules.length > 0 ? availableModules : DEFAULT_AVAILABLE_MODULES;

    const [newFeatureInputs, setNewFeatureInputs] = useState({
        free: '',
        premium: '',
        super_premium: '',
    });

    const [searchFilter, setSearchFilter] = useState('');

    const plans = [
        {
            id: 'free',
            name: 'Standard',
            icon: Zap,
            colorName: 'stone',
            badgeKey: 'tier_free_badge',
            descKey: 'tier_free_description',
            priceKey: null,
            limitKey: 'tier_free_limit',
            staffKey: 'tier_free_staff_limit',
            modulesKey: 'tier_free_modules',
            labelsKey: 'tier_free_feature_labels',
            customFeaturesKey: 'tier_free_custom_features',
            cardClass: 'border-stone-200 bg-white shadow-sm hover:border-stone-300',
            iconClass: 'bg-stone-100 text-stone-700 border border-stone-200',
            badgeClass: 'bg-stone-100 text-stone-700 border border-stone-200',
            checkColor: 'text-stone-500',
            switchActiveClass: 'bg-stone-900',
            panelBg: 'bg-stone-50/70 border-stone-200/70',
            inputFocus: 'focus:border-stone-400 focus:ring-stone-300',
        },
        {
            id: 'premium',
            name: 'Premium',
            icon: Crown,
            colorName: 'amber',
            badgeKey: 'tier_premium_badge',
            descKey: 'tier_premium_description',
            priceKey: 'tier_premium_price',
            limitKey: 'tier_premium_limit',
            staffKey: 'tier_premium_staff_limit',
            modulesKey: 'tier_premium_modules',
            labelsKey: 'tier_premium_feature_labels',
            customFeaturesKey: 'tier_premium_custom_features',
            cardClass: 'border-amber-200/80 bg-white shadow-sm ring-1 ring-amber-100 hover:border-amber-300',
            iconClass: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm',
            badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
            checkColor: 'text-amber-600',
            switchActiveClass: 'bg-amber-600',
            panelBg: 'bg-amber-50/40 border-amber-200/60',
            inputFocus: 'focus:border-amber-400 focus:ring-amber-300',
        },
        {
            id: 'super_premium',
            name: 'Elite',
            icon: Sparkles,
            colorName: 'violet',
            badgeKey: 'tier_super_premium_badge',
            descKey: 'tier_super_premium_description',
            priceKey: 'tier_super_premium_price',
            limitKey: 'tier_super_premium_limit',
            staffKey: 'tier_super_premium_staff_limit',
            modulesKey: 'tier_super_premium_modules',
            labelsKey: 'tier_super_premium_feature_labels',
            customFeaturesKey: 'tier_super_premium_custom_features',
            cardClass: 'border-violet-200/80 bg-white shadow-sm ring-1 ring-violet-100 hover:border-violet-300',
            iconClass: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm',
            badgeClass: 'bg-violet-50 text-violet-800 border border-violet-200',
            checkColor: 'text-violet-600',
            switchActiveClass: 'bg-violet-600',
            panelBg: 'bg-violet-50/40 border-violet-200/60',
            inputFocus: 'focus:border-violet-400 focus:ring-violet-300',
        },
    ];

    const isModuleActive = (plan, moduleId) => {
        const modules = data[plan.modulesKey] || {};
        if (modules[moduleId] !== undefined) {
            return Boolean(modules[moduleId]);
        }
        const meta = modulesCatalog.find(m => m.id === moduleId);
        return Boolean(meta?.defaults?.[plan.id]);
    };

    const toggleModule = (plan, moduleId) => {
        const currentActive = isModuleActive(plan, moduleId);
        const currentModules = { ...(data[plan.modulesKey] || {}) };
        currentModules[moduleId] = !currentActive;
        setData(plan.modulesKey, currentModules);
    };

    const getModuleLabel = (plan, module) => {
        const labels = data[plan.labelsKey] || {};
        if (labels[module.id] && String(labels[module.id]).trim() !== '') {
            return labels[module.id];
        }
        return module.default_name;
    };

    const handleLabelChange = (plan, moduleId, value) => {
        const currentLabels = { ...(data[plan.labelsKey] || {}) };
        currentLabels[moduleId] = value;
        setData(plan.labelsKey, currentLabels);
    };

    const handleAddCustomPerk = (planId, customKey) => {
        const text = (newFeatureInputs[planId] || '').trim();
        if (!text) return;
        const currentList = Array.isArray(data[customKey]) ? [...data[customKey]] : [];
        currentList.push(text);
        setData(customKey, currentList);
        setNewFeatureInputs((prev) => ({ ...prev, [planId]: '' }));
    };

    const handleRemoveCustomPerk = (customKey, index) => {
        const currentList = Array.isArray(data[customKey]) ? [...data[customKey]] : [];
        currentList.splice(index, 1);
        setData(customKey, currentList);
    };

    const handleEditCustomPerk = (customKey, index, value) => {
        const currentList = Array.isArray(data[customKey]) ? [...data[customKey]] : [];
        currentList[index] = value;
        setData(customKey, currentList);
    };

    const handleResetPlan = (plan) => {
        const defaultModules = {};
        const defaultLabels = {};
        modulesCatalog.forEach((m) => {
            defaultModules[m.id] = Boolean(m.defaults?.[plan.id]);
            defaultLabels[m.id] = m.default_name;
        });

        setData((prev) => ({
            ...prev,
            [plan.modulesKey]: defaultModules,
            [plan.labelsKey]: defaultLabels,
            [plan.customFeaturesKey]: [],
        }));
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {plans.map((plan) => {
                    const PlanIcon = plan.icon;
                    const customFeatures = Array.isArray(data[plan.customFeaturesKey]) ? data[plan.customFeaturesKey] : [];
                    const activeModulesCount = modulesCatalog.filter(m => isModuleActive(plan, m.id)).length;

                    return (
                        <div
                            key={plan.id}
                            className={`flex flex-col rounded-[1.75rem] border p-6 transition-all duration-200 ${plan.cardClass}`}
                        >
                            {/* 1. Header: Icon, Name, Badge Tagline */}
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${plan.iconClass}`}>
                                        <PlanIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight text-stone-900 leading-tight">
                                            {plan.name}
                                        </h3>
                                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${plan.badgeClass}`}>
                                            {data[plan.badgeKey] || (plan.id === 'free' ? 'Foundational' : plan.id === 'premium' ? 'Most Popular' : 'Full Access')}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleResetPlan(plan)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-stone-700 transition cursor-pointer p-1 rounded-lg hover:bg-stone-100"
                                    title="Restore recommended default modules & labels"
                                >
                                    <RotateCcw size={11} />
                                    <span>Reset</span>
                                </button>
                            </div>

                            {/* 2. Tagline & Description Customization */}
                            <div className="space-y-2 mb-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Tag size={11} className="text-stone-400" />
                                        <span>Badge Label / Tagline</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data[plan.badgeKey] ?? ''}
                                        onChange={(e) => setData(plan.badgeKey, e.target.value)}
                                        placeholder="e.g. Foundational, Most Popular..."
                                        className={`w-full rounded-xl border border-stone-200 bg-stone-50/50 py-1.5 px-3 text-xs text-stone-900 font-semibold ${plan.inputFocus}`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                                        Plan Summary Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={data[plan.descKey] ?? ''}
                                        onChange={(e) => setData(plan.descKey, e.target.value)}
                                        placeholder="Short overview of what this plan delivers..."
                                        className={`w-full rounded-xl border border-stone-200 bg-stone-50/50 py-1.5 px-3 text-xs text-stone-800 resize-none ${plan.inputFocus}`}
                                    />
                                </div>
                            </div>

                            {/* 3. Core Numerical Parameters */}
                            <div className={`rounded-2xl border p-4 mb-5 ${plan.panelBg}`}>
                                <div className="text-[9px] font-black text-stone-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                                    <Layers size={11} />
                                    <span>Pricing & Capacity Quotas</span>
                                </div>

                                <div className="space-y-2">
                                    {/* Monthly Price */}
                                    <div className="flex items-center justify-between gap-3 bg-white border border-stone-200/80 rounded-xl px-3 py-2 shadow-2xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 font-black text-[11px] shrink-0">
                                                ₱
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-800 leading-tight">Monthly Price</p>
                                                <p className="text-[10px] text-stone-400 leading-tight">Subscription billing</p>
                                            </div>
                                        </div>
                                        {plan.priceKey ? (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-xs font-bold text-stone-400">₱</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={data[plan.priceKey] ?? ''}
                                                    onChange={(e) => setData(plan.priceKey, e.target.value)}
                                                    className={`w-20 rounded-lg border border-stone-200 bg-stone-50/70 py-1 px-2 text-xs font-bold text-stone-900 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${plan.inputFocus}`}
                                                    placeholder="0"
                                                />
                                                <span className="text-[10px] font-bold text-stone-400">/ mo</span>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px] font-bold border border-stone-200/60">
                                                Free (₱0)
                                            </span>
                                        )}
                                    </div>

                                    {/* Active Product Limit */}
                                    <div className="flex items-center justify-between gap-3 bg-white border border-stone-200/80 rounded-xl px-3 py-2 shadow-2xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
                                                <Package size={13} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-800 leading-tight">Active Products</p>
                                                <p className="text-[10px] text-stone-400 leading-tight">Max live listings</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={data[plan.limitKey] ?? ''}
                                                onChange={(e) => setData(plan.limitKey, e.target.value)}
                                                className={`w-16 rounded-lg border border-stone-200 bg-stone-50/70 py-1 px-2 text-xs font-bold text-stone-900 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${plan.inputFocus}`}
                                                placeholder="3"
                                            />
                                            <span className="text-[10px] font-bold text-stone-400 w-10">items</span>
                                        </div>
                                    </div>

                                    {/* Staff Member Limit */}
                                    <div className="flex items-center justify-between gap-3 bg-white border border-stone-200/80 rounded-xl px-3 py-2 shadow-2xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
                                                <Users size={13} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-800 leading-tight">Staff Accounts</p>
                                                <p className="text-[10px] text-stone-400 leading-tight">Team login seats</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={data[plan.staffKey] ?? ''}
                                                onChange={(e) => setData(plan.staffKey, e.target.value)}
                                                className={`w-16 rounded-lg border border-stone-200 bg-stone-50/70 py-1 px-2 text-xs font-bold text-stone-900 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${plan.inputFocus}`}
                                                placeholder="0"
                                            />
                                            <span className="text-[10px] font-bold text-stone-400 w-10">seats</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Interactive System Modules & Capabilities */}
                            <div className="space-y-3 mb-5">
                                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <SettingsIcon size={12} className="text-stone-400" />
                                        <span className="text-[10px] font-black text-stone-700 uppercase tracking-wider">
                                            Included System Modules ({activeModulesCount}/{modulesCatalog.length})
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold text-stone-400">
                                        Toggle & Rename
                                    </span>
                                </div>

                                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 overscroll-contain divide-y divide-stone-100">
                                    {modulesCatalog.map((module) => {
                                        const active = isModuleActive(plan, module.id);
                                        const currentLabel = getModuleLabel(plan, module);

                                        return (
                                            <div 
                                                key={module.id} 
                                                className={`pt-2.5 pb-2.5 first:pt-1 rounded-xl transition-all ${
                                                    active ? 'bg-transparent' : 'opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2.5">
                                                    {/* Toggle Switch */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleModule(plan, module.id)}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            active ? plan.switchActiveClass : 'bg-stone-200'
                                                        }`}
                                                        aria-label={`Toggle ${module.default_name}`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                                active ? 'translate-x-4' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>

                                                    {/* Editable Module Display Label */}
                                                    <div className="flex-1 min-w-0">
                                                        <input
                                                            type="text"
                                                            value={currentLabel}
                                                            disabled={!active}
                                                            onChange={(e) => handleLabelChange(plan, module.id, e.target.value)}
                                                            className={`w-full text-xs font-bold rounded-lg border py-1 px-2 transition ${
                                                                active 
                                                                    ? 'text-stone-900 border-transparent hover:border-stone-200 focus:border-stone-400 bg-stone-50/50 focus:bg-white' 
                                                                    : 'text-stone-400 border-transparent bg-transparent cursor-not-allowed line-through'
                                                            }`}
                                                        />
                                                    </div>

                                                    <span className="text-[9px] font-bold text-stone-400 shrink-0 uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-100">
                                                        {module.category.split(' ')[0]}
                                                    </span>
                                                </div>

                                                <p className="text-[10px] text-stone-500 font-medium pl-11 mt-1 leading-snug">
                                                    {module.description}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 5. Custom Plan Highlights & Extra Perks */}
                            <div className="pt-3 border-t border-stone-100 flex-1 flex flex-col space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-stone-600 uppercase tracking-wider">
                                        Extra Perks & Highlights ({customFeatures.length})
                                    </span>
                                </div>

                                {customFeatures.length > 0 && (
                                    <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {customFeatures.map((perk, idx) => (
                                            <li key={idx} className="flex items-center gap-2 group">
                                                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${plan.checkColor}`} />
                                                <input
                                                    type="text"
                                                    value={perk}
                                                    onChange={(e) => handleEditCustomPerk(plan.customFeaturesKey, idx, e.target.value)}
                                                    className="flex-1 rounded-lg border border-transparent hover:border-stone-200 focus:border-stone-400 bg-stone-50/60 focus:bg-white py-1 px-2 text-xs text-stone-800 font-medium transition"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCustomPerk(plan.customFeaturesKey, idx)}
                                                    className="text-stone-300 hover:text-red-500 p-1 transition opacity-60 group-hover:opacity-100 cursor-pointer"
                                                    title="Remove this perk"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Add Custom Perk Input */}
                                <div className="flex items-center gap-2 mt-auto">
                                    <input
                                        type="text"
                                        placeholder="Add custom plan highlight..."
                                        value={newFeatureInputs[plan.id] || ''}
                                        onChange={(e) => setNewFeatureInputs((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddCustomPerk(plan.id, plan.customFeaturesKey);
                                            }
                                        }}
                                        className="flex-1 rounded-xl border border-stone-200 bg-stone-50/60 py-1.5 px-3 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-200 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleAddCustomPerk(plan.id, plan.customFeaturesKey)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shrink-0"
                                    >
                                        <Plus size={13} />
                                        <span>Add</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

