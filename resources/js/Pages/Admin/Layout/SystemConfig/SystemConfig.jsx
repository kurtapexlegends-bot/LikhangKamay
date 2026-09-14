import React, { useState, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '@/Layouts/AdminLayout';
import { useToast } from '@/Components/ToastContext';
import { 
    Settings, 
    ShieldCheck, 
    FolderTree, 
    RotateCcw
} from 'lucide-react';

import GeneralPlatformTab from './GeneralPlatformTab';
import SystemOperationsTab from './SystemOperationsTab';
import CategoryManager from '@/Components/Admin/Catalog/CategoryManager';
import TrashRestorationTable from '@/Components/Admin/Compliance/TrashRestorationTable';
import ConfirmationModal from '@/Components/ConfirmationModal';

export default function SystemConfig({ auth, settings, metrics, recentSubscribers, recentSponsorships, categories = [], trashQueue = [], trashStats }) {
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('tab') || 'branding';
        }
        return 'branding';
    });

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tabId);
            window.history.pushState({}, '', url.toString());
        }
    };

    const { data, setData, post, processing, errors, recentlySuccessful, isDirty } = useForm({
        contact_info: {
            email: settings?.contact_info?.email || 'support@likhangkamay.app',
            phone: settings?.contact_info?.phone || '',
            address: settings?.contact_info?.address || '',
        },
        social_links: {
            facebook: settings?.social_links?.facebook || '',
            instagram: settings?.social_links?.instagram || '',
            twitter: settings?.social_links?.twitter || '',
        },
        // Operational Settings
        convenience_fee: settings?.convenience_fee || 3.0,
        maintenance_mode: settings?.maintenance_mode || false,
        paymongo_enabled: settings?.paymongo_enabled || true,

        // Subscription Tier Settings
        tier_free_limit: settings?.tier_free_limit ?? 3,
        tier_free_staff_limit: settings?.tier_free_staff_limit ?? 0,
        tier_free_badge: settings?.tier_free_badge ?? 'Foundational',
        tier_free_description: settings?.tier_free_description ?? 'Keep your shop live with essentials for catalog, orders, and seller workspace.',
        tier_free_modules: settings?.tier_free_modules ?? {},
        tier_free_feature_labels: settings?.tier_free_feature_labels ?? {},
        tier_free_custom_features: settings?.tier_free_custom_features ?? [],
        tier_free_features: settings?.tier_free_features ?? [],

        tier_premium_price: settings?.tier_premium_price ?? 199,
        tier_premium_limit: settings?.tier_premium_limit ?? 10,
        tier_premium_staff_limit: settings?.tier_premium_staff_limit ?? 3,
        tier_premium_badge: settings?.tier_premium_badge ?? 'Most Popular',
        tier_premium_description: settings?.tier_premium_description ?? 'Add more shelf space and stronger operational tools for growing artisan shops.',
        tier_premium_modules: settings?.tier_premium_modules ?? {},
        tier_premium_feature_labels: settings?.tier_premium_feature_labels ?? {},
        tier_premium_custom_features: settings?.tier_premium_custom_features ?? [],
        tier_premium_features: settings?.tier_premium_features ?? [],

        tier_super_premium_price: settings?.tier_super_premium_price ?? 399,
        tier_super_premium_limit: settings?.tier_super_premium_limit ?? 50,
        tier_super_premium_staff_limit: settings?.tier_super_premium_staff_limit ?? 15,
        tier_super_premium_badge: settings?.tier_super_premium_badge ?? 'Full Access',
        tier_super_premium_description: settings?.tier_super_premium_description ?? 'Unlock the complete seller suite, B2B wholesale access, and sponsored placements.',
        tier_super_premium_modules: settings?.tier_super_premium_modules ?? {},
        tier_super_premium_feature_labels: settings?.tier_super_premium_feature_labels ?? {},
        tier_super_premium_custom_features: settings?.tier_super_premium_custom_features ?? [],
        tier_super_premium_features: settings?.tier_super_premium_features ?? [],

        // Mail Engine & Dispatcher Settings
        mail_driver: settings?.mail_driver || 'resend',
        resend_api_key: settings?.resend_api_key || '',
        mail_from_address: settings?.mail_from_address || 'noreply@likhangkamay.app',
        mail_from_name: settings?.mail_from_name || 'LikhangKamay',
    });

    const submit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setIsConfirmOpen(true);
    };

    const confirmSubmit = () => {
        setIsConfirmOpen(false);
        post(route('admin.settings.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                addToast('System settings synchronized successfully.', 'success');
            },
            onError: (errs) => {
                const errorMsg = Object.values(errs)[0] || 'Validation failed. Please check the fields.';
                addToast(errorMsg, 'error');
            }
        });
    };

    useEffect(() => {
        if (settings) {
            setData({
                contact_info: {
                    email: settings.contact_info?.email || 'support@likhangkamay.app',
                    phone: settings.contact_info?.phone || '',
                    address: settings.contact_info?.address || '',
                },
                social_links: {
                    facebook: settings.social_links?.facebook || '',
                    instagram: settings.social_links?.instagram || '',
                    twitter: settings.social_links?.twitter || '',
                },
                convenience_fee: settings.convenience_fee || 3.0,
                maintenance_mode: settings.maintenance_mode || false,
                paymongo_enabled: settings.paymongo_enabled || true,
                tier_free_limit: settings.tier_free_limit ?? 3,
                tier_premium_price: settings.tier_premium_price ?? 199,
                tier_premium_limit: settings.tier_premium_limit ?? 10,
                tier_super_premium_price: settings.tier_super_premium_price ?? 399,
                tier_super_premium_limit: settings.tier_super_premium_limit ?? 50,
                mail_driver: settings.mail_driver || 'resend',
                resend_api_key: settings.resend_api_key || '',
                mail_from_address: settings.mail_from_address || 'noreply@likhangkamay.app',
                mail_from_name: settings.mail_from_name || 'LikhangKamay',
            });
        }
    }, [settings]);

    const updateNested = (parent, field, value) => {
        setData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [field]: value
            }
        }));
    };

    const tabs = [
        { id: 'branding', name: 'General & Platform', icon: Settings },
        { id: 'plans', name: 'Subscription Tiers', icon: ShieldCheck },
        { id: 'taxonomy', name: 'Categories & Taxonomy', icon: FolderTree },
        { id: 'trash', name: 'Trash & Retention', icon: RotateCcw, count: trashQueue?.length || 0 },
    ];

    return (
        <>
            <Head title="System Configuration" />

            <div className="space-y-6 pb-20">
                {/* Main Tabs Navigation Bar */}
                <div className="border-b border-stone-200/80 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar scroll-smooth">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`
                                        flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all outline-none cursor-pointer
                                        ${isActive 
                                            ? 'border-clay-700 text-clay-700' 
                                            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}
                                    `}
                                >
                                    <Icon size={16} className={isActive ? 'text-clay-700' : 'text-stone-400'} />
                                    <span>{tab.name}</span>
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-clay-100 text-clay-800' : 'bg-stone-100 text-stone-600'}`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content Panels */}
                <AnimatePresence mode="wait">
                    {activeTab === 'branding' && (
                        <GeneralPlatformTab
                            data={data}
                            setData={setData}
                            updateNested={updateNested}
                            errors={errors}
                            processing={processing}
                            recentlySuccessful={recentlySuccessful}
                            isDirty={isDirty}
                            onSubmit={submit}
                        />
                    )}

                    {activeTab === 'plans' && (
                        <SystemOperationsTab
                            data={data}
                            setData={setData}
                            errors={errors}
                            processing={processing}
                            recentlySuccessful={recentlySuccessful}
                            isDirty={isDirty}
                            availablePlanModules={settings?.available_plan_modules || []}
                            onSubmit={submit}
                        />
                    )}

                    {activeTab === 'taxonomy' && (
                        <motion.div
                            key="taxonomy-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                        >
                            <CategoryManager categories={categories} />
                        </motion.div>
                    )}

                    {activeTab === 'trash' && (
                        <motion.div
                            key="trash-tab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="space-y-6"
                        >
                            <TrashRestorationTable
                                trashQueue={trashQueue}
                                stats={trashStats}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={confirmSubmit}
                    title={activeTab === 'plans' ? "Confirm Subscription Plan Update" : "Confirm System Config Update"}
                    message={activeTab === 'plans' 
                        ? "Are you sure you want to update subscription plans? Lowering limits will automatically move excess active listings to draft for affected artisans."
                        : "Are you sure you want to update the system configuration? Branding and operational settings will apply immediately to all active processes."}
                    icon={activeTab === 'plans' ? ShieldCheck : Settings}
                    iconBg="bg-clay-50 text-clay-700"
                    confirmText={activeTab === 'plans' ? "Apply Plan Changes" : "Apply Config Changes"}
                    confirmColor="bg-clay-600 hover:bg-clay-700 focus-visible:ring-clay-500/30"
                    isVeryHighRisk={true}
                    processing={processing}
                />
            </div>
        </>
    );
}

SystemConfig.layout = page => <AdminLayout title="System Config">{page}</AdminLayout>;
