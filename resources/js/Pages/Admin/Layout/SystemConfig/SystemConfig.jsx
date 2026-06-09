import React, { useState, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '@/Layouts/AdminLayout';
import { useToast } from '@/Components/ToastContext';
import PrimaryButton from '@/Components/PrimaryButton';
import { 
    Save, 
    Mail, 
    Settings, 
    CircleDollarSign, 
    ShieldCheck, 
    CheckCircle2, 
    Percent, 
    CreditCard,
    ChevronDown,
    AlertCircle
} from 'lucide-react';

import ContactSocialsForm from '@/Components/Admin/Layout/SystemConfig/ContactSocialsForm';
import PlatformOpsForm from '@/Components/Admin/Layout/SystemConfig/PlatformOpsForm';
import MonetizationDashboard from '@/Components/Admin/Layout/SystemConfig/MonetizationDashboard';
import SubscriptionTiers from '@/Components/Admin/Layout/SystemConfig/SubscriptionTiers';

export default function SystemConfig({ auth, settings, metrics, recentSubscribers, recentSponsorships }) {
    const { flash } = usePage().props;
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('tab') || 'branding';
        }
        return 'branding';
    });

    const [activeSubTab, setActiveSubTab] = useState('branding_contact');
    const [showMobileNotes, setShowMobileNotes] = useState(false);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tabId);
            window.history.pushState({}, '', url.toString());
        }
    };

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        platform_name: settings?.platform_name || '',
        platform_logo: null,
        platform_logo_preview: settings?.platform_logo || '',
        favicon: null,
        favicon_preview: settings?.favicon || '',
        primary_color: settings?.primary_color || '#8B4513',
        seo_metadata: {
            title: settings?.seo_metadata?.title || '',
            description: settings?.seo_metadata?.description || '',
            keywords: settings?.seo_metadata?.keywords || '',
        },
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
        commission_rate: settings?.commission_rate || 5.0,
        convenience_fee: settings?.convenience_fee || 3.0,
        maintenance_mode: settings?.maintenance_mode || false,
        paymongo_enabled: settings?.paymongo_enabled || true,

        // Subscription Tier Settings
        tier_free_limit: settings?.tier_free_limit ?? 3,
        tier_premium_price: settings?.tier_premium_price ?? 199,
        tier_premium_limit: settings?.tier_premium_limit ?? 10,
        tier_super_premium_price: settings?.tier_super_premium_price ?? 399,
        tier_super_premium_limit: settings?.tier_super_premium_limit ?? 50,

        // SMTP Settings
        mail_host: settings?.mail_host || 'smtp.mailtrap.io',
        mail_port: settings?.mail_port || '2525',
        mail_encryption: settings?.mail_encryption || 'tls',
        mail_username: settings?.mail_username || '',
        mail_password: settings?.mail_password || '',
        mail_from_address: settings?.mail_from_address || 'noreply@likhangkamay.app',
        mail_from_name: settings?.mail_from_name || 'Likhang Kamay',
    });

    const submit = (e) => {
        e.preventDefault();
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
                platform_name: settings.platform_name || '',
                platform_logo: null,
                platform_logo_preview: settings.platform_logo || '',
                favicon: null,
                favicon_preview: settings.favicon || '',
                primary_color: settings.primary_color || '#8B4513',
                seo_metadata: {
                    title: settings.seo_metadata?.title || '',
                    description: settings.seo_metadata?.description || '',
                    keywords: settings.seo_metadata?.keywords || '',
                },
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
                commission_rate: settings.commission_rate || 5.0,
                convenience_fee: settings.convenience_fee || 3.0,
                maintenance_mode: settings.maintenance_mode || false,
                paymongo_enabled: settings.paymongo_enabled || true,
                tier_free_limit: settings.tier_free_limit ?? 3,
                tier_premium_price: settings.tier_premium_price ?? 199,
                tier_premium_limit: settings.tier_premium_limit ?? 10,
                tier_super_premium_price: settings.tier_super_premium_price ?? 399,
                tier_super_premium_limit: settings.tier_super_premium_limit ?? 50,
                mail_host: settings.mail_host || 'smtp.mailtrap.io',
                mail_port: settings.mail_port || '2525',
                mail_encryption: settings.mail_encryption || 'tls',
                mail_username: settings.mail_username || '',
                mail_password: settings.mail_password || '',
                mail_from_address: settings.mail_from_address || 'noreply@likhangkamay.app',
                mail_from_name: settings.mail_from_name || 'Likhang Kamay',
            });
        }
    }, [settings]);

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            setData(field, file);
            const previewField = `${field}_preview`;
            setData(previewField, URL.createObjectURL(file));
        }
    };

    const updateNested = (category, field, value) => {
        setData(category, {
            ...data[category],
            [field]: value
        });
    };

    const mainTabs = [
        { id: 'branding', name: 'System Config', icon: Settings },
        { id: 'monetization', name: 'Monetization Dashboard', icon: CircleDollarSign },
        { id: 'plans', name: 'Subscription Plans', icon: ShieldCheck },
    ];

    const subTabs = [
        { id: 'branding_contact', name: 'Contact & Socials', icon: Mail },
        { id: 'branding_ops', name: 'Platform Ops', icon: Settings },
    ];

    return (
        <>
            <Head title="System Config" />

            <div className="max-w-6xl mx-auto space-y-6 pb-24 lg:pb-6">
                
                {/* --- TABS NAVIGATION --- */}
                <div className="border-b border-stone-200 bg-white rounded-t-2xl shadow-sm px-4 pt-4 sm:px-6">
                    <div className="flex space-x-6 overflow-x-auto scrollbar-hide no-scrollbar flex-nowrap">
                        {mainTabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex items-center gap-2 border-b-2 pb-4 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap outline-none min-h-[44px] ${
                                        activeTab === tab.id
                                            ? 'border-clay-600 text-clay-700 font-bold'
                                            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-200'
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{tab.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Contents */}
                <AnimatePresence mode="wait">
                    {activeTab === 'branding' && (
                        <motion.div
                            key="branding-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Inner Sub Tabs bar */}
                            <div className="flex items-center gap-1.5 border-b border-stone-100 pb-3 overflow-x-auto no-scrollbar flex-nowrap">
                                {subTabs.map((subTab) => (
                                    <button
                                        key={subTab.id}
                                        type="button"
                                        onClick={() => setActiveSubTab(subTab.id)}
                                        className={`
                                            flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap min-h-[36px]
                                            ${activeSubTab === subTab.id 
                                                ? 'bg-clay-50 text-clay-700 font-bold border border-clay-200/50' 
                                                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'}
                                        `}
                                    >
                                        <subTab.icon size={12} />
                                        {subTab.name}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                {/* Left Column: Inputs */}
                                <div className="lg:col-span-2 space-y-6">
                                    {activeSubTab === 'branding_contact' && (
                                        <ContactSocialsForm 
                                            data={data} 
                                            updateNested={updateNested} 
                                        />
                                    )}

                                    {activeSubTab === 'branding_ops' && (
                                        <PlatformOpsForm 
                                            data={data} 
                                            setData={setData} 
                                        />
                                    )}
                                </div>

                                {/* Right Column: Sticky actions (Desktop only) */}
                                <div className="space-y-6">
                                    <div className="hidden lg:block bg-stone-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                                        <div className="relative z-10 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                                    <Save size={14} className="text-clay-400" />
                                                </div>
                                                <h3 className="text-sm font-bold">Apply Changes</h3>
                                            </div>
                                            <p className="text-[11px] text-stone-400 leading-relaxed font-medium">
                                                System parameters and SMTP rules sync across live processes.
                                            </p>
                                            
                                            <PrimaryButton 
                                                disabled={processing}
                                                className="w-full py-3 bg-clay-600 hover:bg-clay-500 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md group border-none text-[10px]"
                                            >
                                                <Save size={14} className="transition-transform duration-200 group-hover:scale-110" />
                                                {processing ? 'Processing...' : 'Apply Config Update'}
                                            </PrimaryButton>

                                            {recentlySuccessful && (
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold animate-in fade-in slide-in-from-top-1">
                                                    <CheckCircle2 size={13} />
                                                    <span>Settings updated successfully!</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-clay-600/10 rounded-full blur-3xl group-hover:bg-clay-600/20 transition-colors" />
                                    </div>

                                    <div className="bg-white rounded-2xl border border-clay-100 p-5 lg:p-6 space-y-4 shadow-sm select-none">
                                        <div 
                                            onClick={() => {
                                                if (window.innerWidth < 1024) {
                                                    setShowMobileNotes(!showMobileNotes);
                                                }
                                            }}
                                            className="flex items-center justify-between cursor-pointer lg:cursor-default"
                                        >
                                            <h4 className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Operational Notes</h4>
                                            <div className="lg:hidden text-stone-400 hover:text-stone-600 p-1">
                                                <motion.span
                                                    animate={{ rotate: showMobileNotes ? 180 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="inline-block"
                                                >
                                                    <ChevronDown size={14} />
                                                </motion.span>
                                            </div>
                                        </div>

                                        {/* Desktop Notes: always visible */}
                                        <div className="hidden lg:block">
                                            <ul className="space-y-3">
                                                {[
                                                    { title: 'Commission Rates', desc: 'Sellers on Premium & Elite have custom low-overhead commission rates.', icon: Percent },
                                                    { title: 'PayMongo Gateway', desc: 'Disable this toggle to set checkout offline during technical maintenance.', icon: CreditCard },
                                                ].map((tip, idx) => (
                                                    <li key={idx} className="flex gap-2.5">
                                                        <tip.icon size={14} className="text-clay-600 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-[10px] font-bold text-stone-900">{tip.title}</p>
                                                            <p className="text-[9px] text-stone-500 font-medium leading-relaxed">{tip.desc}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Mobile Notes: collapsible */}
                                        <AnimatePresence initial={false}>
                                            {showMobileNotes && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="lg:hidden overflow-hidden"
                                                >
                                                    <ul className="space-y-3 pt-2">
                                                        {[
                                                            { title: 'Commission Rates', desc: 'Sellers on Premium & Elite have custom low-overhead commission rates.', icon: Percent },
                                                            { title: 'PayMongo Gateway', desc: 'Disable this toggle to set checkout offline during technical maintenance.', icon: CreditCard },
                                                        ].map((tip, idx) => (
                                                            <li key={idx} className="flex gap-2.5">
                                                                <tip.icon size={14} className="text-clay-600 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-stone-900">{tip.title}</p>
                                                                    <p className="text-[9px] text-stone-500 font-medium leading-relaxed">{tip.desc}</p>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </form>

                            {/* Sticky actions bar for Mobile (below lg) */}
                            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                                <div className="flex-1 min-w-0 pr-4">
                                    {recentlySuccessful && (
                                        <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold animate-in fade-in">
                                            <CheckCircle2 size={12} />
                                            <span>Saved successfully!</span>
                                        </div>
                                    )}
                                    {!recentlySuccessful && (
                                        <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Unsaved Changes</span>
                                    )}
                                </div>
                                <PrimaryButton 
                                    disabled={processing}
                                    onClick={submit}
                                    className="py-2.5 px-4 bg-clay-600 hover:bg-clay-700 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md border-none text-[10px] font-bold min-h-[44px]"
                                >
                                    <Save size={12} />
                                    {processing ? 'Saving...' : 'Apply Config'}
                                </PrimaryButton>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'monetization' && (
                        <motion.div
                            key="monetization-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Flash Alert */}
                            {(flash?.success || flash?.error) && (
                                <div className={`rounded-xl border px-4 py-3 text-xs font-medium ${
                                    flash?.success
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-red-200 bg-red-50 text-red-700'
                                }`}>
                                    {flash?.success || flash?.error}
                                </div>
                            )}

                            <MonetizationDashboard 
                                metrics={metrics} 
                                recentSubscribers={recentSubscribers} 
                                recentSponsorships={recentSponsorships} 
                            />
                        </motion.div>
                    )}

                    {activeTab === 'plans' && (
                        <motion.div
                            key="plans-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                        >
                            <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                {/* Left Column: Inputs */}
                                <div className="lg:col-span-2 space-y-6">
                                    <SubscriptionTiers 
                                        data={data} 
                                        setData={setData} 
                                        errors={errors} 
                                    />
                                </div>

                                {/* Right Column: Sticky actions */}
                                <div className="space-y-6">
                                    <div className="hidden lg:block bg-stone-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                                        <div className="relative z-10 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                                    <Save size={14} className="text-clay-400" />
                                                </div>
                                                <h3 className="text-sm font-bold">Apply Plan Changes</h3>
                                            </div>
                                            <p className="text-[11px] text-stone-400 leading-relaxed font-medium">
                                                Plan tier modifications (limits and pricing) will apply immediately to all active artisan shops.
                                            </p>
                                            
                                            <PrimaryButton 
                                                disabled={processing}
                                                className="w-full py-3 bg-clay-600 hover:bg-clay-700 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md group border-none text-[10px]"
                                            >
                                                <Save size={14} className="transition-transform duration-200 group-hover:scale-110" />
                                                {processing ? 'Processing...' : 'Apply Tier Update'}
                                            </PrimaryButton>

                                            {recentlySuccessful && (
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold animate-in fade-in slide-in-from-top-1">
                                                    <CheckCircle2 size={13} />
                                                    <span>Tier settings updated!</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-clay-600/10 rounded-full blur-3xl group-hover:bg-clay-600/20 transition-colors" />
                                    </div>

                                    {/* Operational Warnings */}
                                    <div className="bg-amber-50/40 rounded-2xl border border-amber-200/50 p-5 lg:p-6 space-y-4">
                                        <div className="flex gap-2.5">
                                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Warning: Downgrade Impact</h4>
                                                <p className="text-[9px] text-amber-700 font-medium leading-relaxed mt-1">
                                                    Reducing product limits will draft excess listings of sellers when their accounts reconcile. Set limits carefully to prevent catalog disruption.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>

                            {/* Sticky actions bar for Mobile (below lg) */}
                            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                                <div className="flex-1 min-w-0 pr-4">
                                    {recentlySuccessful && (
                                        <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold animate-in fade-in">
                                            <CheckCircle2 size={12} />
                                            <span>Saved successfully!</span>
                                        </div>
                                    )}
                                    {!recentlySuccessful && (
                                        <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Unsaved Changes</span>
                                    )}
                                </div>
                                <PrimaryButton 
                                    disabled={processing}
                                    onClick={submit}
                                    className="py-2.5 px-4 bg-clay-600 hover:bg-clay-700 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md border-none text-[10px] font-bold min-h-[44px]"
                                >
                                    <Save size={12} />
                                    {processing ? 'Saving...' : 'Apply Config'}
                                </PrimaryButton>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

SystemConfig.layout = page => <AdminLayout title="System Config">{page}</AdminLayout>;
