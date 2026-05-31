import React, { useState } from 'react';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import UserAvatar from "@/Components/UserAvatar";
import WorkspaceEmptyState from "@/Components/WorkspaceEmptyState";
import Skeleton from "@/Components/Skeleton";
import { 
    Save, 
    Globe, 
    Palette, 
    Layout, 
    Search, 
    Image as ImageIcon, 
    Sparkles, 
    Hash, 
    Mail, 
    Phone,
    MapPin,
    ArrowRight,
    CheckCircle2,
    Settings,
    Percent,
    Banknote,
    ShieldAlert,
    CreditCard,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    CircleDollarSign,
    Users,
    Star,
    Award,
    Clock,
    CheckCircle,
    XCircle,
    Minus,
    Server,
    ShieldCheck
} from 'lucide-react';

const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const planTierBadgeClasses = {
    Elite: 'bg-violet-50 text-violet-700 border-violet-200',
    Premium: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Free: 'bg-stone-100 text-stone-600 border-stone-200',
};

const changeDirectionBadgeClasses = {
    upgrade: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    downgrade: 'bg-amber-50 text-amber-700 border-amber-100',
    change: 'bg-stone-100 text-stone-600 border-stone-200',
};

// Skeleton Loaders
const StatSkeleton = () => (
    <div className="flex items-start justify-between rounded-2xl border border-stone-200 bg-white p-5">
        <div className="space-y-3 w-full">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2 w-32 mt-2 opacity-60" />
        </div>
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
    </div>
);

const RowSkeleton = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4">
            <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-16 opacity-60" />
                </div>
            </div>
        </td>
        <td className="px-6 py-4">
            <div className="flex justify-center">
                <Skeleton className="h-5 w-32 rounded-full" />
            </div>
        </td>
        <td className="px-6 py-4">
            <div className="flex justify-end">
                <Skeleton className="h-3 w-20" />
            </div>
        </td>
    </tr>
);

// Stat Card Component
const StatCard = ({ title, metric, prefix = "", icon: Icon, bg, text, subtitle }) => {
    const value = typeof metric === 'object' ? metric.value : metric;
    const growth = typeof metric === 'object' ? metric.growth : undefined;
    const trend = typeof metric === 'object' ? metric.trend : undefined;

    const derivedTrend = trend || (growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral');

    return (
        <div className="flex items-start justify-between rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-300">
            <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    {title}
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-stone-900">
                    {prefix}{value !== undefined ? value.toLocaleString() : '0'}
                </h3>
                
                {growth !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${
                        derivedTrend === 'up' ? 'text-emerald-600' : 
                        derivedTrend === 'down' ? 'text-rose-600' : 'text-stone-400'
                    }`}>
                        {derivedTrend === 'up' && <TrendingUp size={12}/>}
                        {derivedTrend === 'down' && <TrendingDown size={12}/>}
                        {derivedTrend === 'neutral' && <Minus size={12}/>}
                        <span>{derivedTrend === 'up' ? '+' : ''}{growth}% vs 30 days ago</span>
                    </div>
                )}
                {subtitle && (
                    <p className="text-[10px] font-medium text-stone-400 mt-1">{subtitle}</p>
                )}
                {!subtitle && growth === undefined && (
                    <p className="text-[10px] font-medium text-stone-400 mt-1">Real-time status</p>
                )}
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${text}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default function SystemConfig({ auth, settings, metrics, recentSubscribers, recentSponsorships }) {
    const { flash } = usePage().props;

    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('tab') || 'branding';
        }
        return 'branding';
    });

    const [activeSubTab, setActiveSubTab] = useState('branding_identity');

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
        convenience_fee: settings?.convenience_fee || 15.0,
        withdrawal_min: settings?.withdrawal_min || 500.0,
        maintenance_mode: settings?.maintenance_mode || false,
        paymongo_enabled: settings?.paymongo_enabled || true,

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
        });
    };

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
        { id: 'branding_identity', name: 'Identity & Theme', icon: Palette },
        { id: 'branding_seo', name: 'Search & Metadata', icon: Search },
        { id: 'branding_contact', name: 'Contact & Socials', icon: Mail },
        { id: 'branding_smtp', name: 'SMTP Outgoing Mail', icon: Server },
        { id: 'branding_ops', name: 'Platform Ops', icon: Settings },
    ];

    const isLoadingMetrics = !metrics;
    const isLoadingSubscribers = !recentSubscribers;
    const isLoadingSponsorships = !recentSponsorships;

    return (
        <>
            <Head title="System Config" />

            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* --- TABS NAVIGATION --- */}
                <div className="border-b border-stone-200 bg-white rounded-t-2xl shadow-sm px-4 pt-4 sm:px-6">
                    <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
                        {mainTabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex items-center gap-2 border-b-2 pb-4 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap outline-none ${
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
                            <div className="flex items-center gap-1.5 border-b border-stone-100 pb-3 overflow-x-auto no-scrollbar">
                                {subTabs.map((subTab) => (
                                    <button
                                        key={subTab.id}
                                        type="button"
                                        onClick={() => setActiveSubTab(subTab.id)}
                                        className={`
                                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap
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
                                    
                                    {/* Sub-Tab 1: Identity & Theme */}
                                    {activeSubTab === 'branding_identity' && (
                                        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div>
                                                        <InputLabel htmlFor="platform_name" value="Platform Name" className="text-stone-700 font-bold mb-2 uppercase tracking-wider text-[10px]" />
                                                        <TextInput
                                                            id="platform_name"
                                                            className="block w-full border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 text-xs"
                                                            value={data.platform_name}
                                                            onChange={(e) => setData('platform_name', e.target.value)}
                                                            required
                                                        />
                                                        <InputError className="mt-2" message={errors.platform_name} />
                                                    </div>

                                                    <div>
                                                        <InputLabel htmlFor="primary_color" value="Primary Brand Color" className="text-stone-700 font-bold mb-1.5 uppercase tracking-wider text-[10px]" />
                                                        <div className="flex items-center gap-2">
                                                            <div 
                                                                className="w-9 h-9 rounded-lg border border-stone-200 shadow-sm shrink-0"
                                                                style={{ backgroundColor: data.primary_color }}
                                                            />
                                                            <TextInput
                                                                id="primary_color"
                                                                className="block w-full border-stone-200 bg-stone-50/30 font-mono text-xs py-2"
                                                                value={data.primary_color}
                                                                onChange={(e) => setData('primary_color', e.target.value)}
                                                            />
                                                            <input 
                                                                type="color" 
                                                                className="w-9 h-9 p-1 bg-white border border-stone-200 rounded-lg cursor-pointer shrink-0"
                                                                value={data.primary_color}
                                                                onChange={(e) => setData('primary_color', e.target.value)}
                                                            />
                                                        </div>
                                                        <InputError className="mt-1" message={errors.primary_color} />
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-start gap-3 p-4 bg-clay-50/50 rounded-2xl border border-clay-100/50">
                                                        <Sparkles className="text-clay-600 shrink-0 mt-0.5" size={16} />
                                                        <div>
                                                            <h4 className="text-xs font-bold text-clay-950 mb-0.5">Primary Theme Identity</h4>
                                                            <p className="text-[10px] text-clay-700 leading-relaxed font-medium">This primary tone renders across action buttons, links, and key active elements.</p>
                                                            <div className="mt-3 flex gap-2">
                                                                <div className="px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: data.primary_color }}>Primary</div>
                                                                <div className="px-3 py-1 rounded-full text-[10px] font-bold border" style={{ borderColor: data.primary_color, color: data.primary_color }}>Outline</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-stone-100">
                                                <div className="space-y-2">
                                                    <InputLabel value="Platform Logo" className="text-stone-700 font-bold uppercase tracking-wider text-[9px]" />
                                                    <div className="relative group aspect-[16/9] bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden transition-all hover:border-clay-300">
                                                        {data.platform_logo_preview ? (
                                                            <img src={data.platform_logo_preview} className="w-full h-full object-contain p-4" alt="Preview" />
                                                        ) : (
                                                            <ImageIcon className="text-stone-300" size={24} />
                                                        )}
                                                        <label htmlFor="platform_logo" className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                                            <span className="text-white text-[9px] font-bold bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5">
                                                                <ImageIcon size={12} /> Replace Logo
                                                            </span>
                                                        </label>
                                                        <input id="platform_logo" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'platform_logo')} />
                                                    </div>
                                                    <p className="text-[9px] text-stone-400">Supported: PNG/SVG, max 2MB.</p>
                                                </div>

                                                <div className="space-y-2">
                                                    <InputLabel value="Favicon Icon" className="text-stone-700 font-bold uppercase tracking-wider text-[9px]" />
                                                    <div className="relative group aspect-square max-w-[100px] bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden transition-all hover:border-clay-300">
                                                        {data.favicon_preview ? (
                                                            <div className="bg-white p-2 rounded-lg shadow-sm border border-stone-100">
                                                                <img src={data.favicon_preview} className="w-8 h-8 object-contain" alt="Favicon" />
                                                            </div>
                                                        ) : (
                                                            <Globe className="text-stone-300" size={24} />
                                                        )}
                                                        <label htmlFor="favicon" className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                                            <span className="text-white text-[8px] font-bold bg-white/10 backdrop-blur-md px-2 py-1 rounded">Change</span>
                                                        </label>
                                                        <input id="favicon" type="file" className="hidden" accept=".ico,.png" onChange={(e) => handleFileChange(e, 'favicon')} />
                                                    </div>
                                                    <p className="text-[9px] text-stone-400">Favicon size: 32x32px .ico/png.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-Tab 2: Search & SEO */}
                                    {activeSubTab === 'branding_seo' && (
                                        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm">
                                            <div className="space-y-4">
                                                <div>
                                                    <InputLabel htmlFor="seo_title" value="Default Meta Title" className="text-stone-700 font-bold mb-1.5 uppercase tracking-wider text-[10px]" />
                                                    <TextInput
                                                        id="seo_title"
                                                        className="block w-full border-stone-200 bg-stone-50/30 text-xs py-2"
                                                        value={data.seo_metadata.title}
                                                        onChange={(e) => updateNested('seo_metadata', 'title', e.target.value)}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <InputLabel htmlFor="seo_description" value="Default Meta Description" className="text-stone-700 font-bold mb-1.5 uppercase tracking-wider text-[10px]" />
                                                    <textarea
                                                        id="seo_description"
                                                        className="block w-full rounded-xl border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 min-h-[100px] text-xs p-3 font-medium text-stone-800"
                                                        value={data.seo_metadata.description}
                                                        onChange={(e) => updateNested('seo_metadata', 'description', e.target.value)}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <InputLabel htmlFor="seo_keywords" value="Keywords (Comma separated)" className="text-stone-700 font-bold mb-1.5 uppercase tracking-wider text-[10px]" />
                                                    <TextInput
                                                        id="seo_keywords"
                                                        className="block w-full border-stone-200 bg-stone-50/30 text-xs py-2"
                                                        value={data.seo_metadata.keywords}
                                                        onChange={(e) => updateNested('seo_metadata', 'keywords', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-stone-100">
                                                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">Google Search Preview</h4>
                                                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1 max-w-lg">
                                                    <div className="text-[#1a0dab] text-sm font-medium hover:underline cursor-pointer">
                                                        {data.seo_metadata.title || 'Likhang Kamay | Artisan Marketplace'}
                                                    </div>
                                                    <div className="text-[#006621] text-[10px] flex items-center gap-1">
                                                        https://likhangkamay.app <ChevronRight size={8} />
                                                    </div>
                                                    <div className="text-[#545454] text-xs leading-relaxed line-clamp-2">
                                                        {data.seo_metadata.description || 'Discover unique handmade treasures from across the Philippines.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-Tab 3: Contact Details */}
                                    {activeSubTab === 'branding_contact' && (
                                        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <InputLabel value="Support Email" className="text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                                        <TextInput 
                                                            className="block w-full pl-9 bg-stone-50/30 text-xs py-2" 
                                                            value={data.contact_info.email}
                                                            onChange={(e) => updateNested('contact_info', 'email', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <InputLabel value="Contact Phone" className="text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                                        <TextInput 
                                                            className="block w-full pl-9 bg-stone-50/30 text-xs py-2" 
                                                            value={data.contact_info.phone}
                                                            onChange={(e) => updateNested('contact_info', 'phone', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <InputLabel value="Headquarters Address" className="text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-3 text-stone-400" size={14} />
                                                    <textarea 
                                                        className="block w-full pl-9 rounded-xl border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 min-h-[70px] text-xs p-3 font-medium text-stone-800"
                                                        value={data.contact_info.address}
                                                        onChange={(e) => updateNested('contact_info', 'address', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-stone-100 space-y-4">
                                                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Social Accounts</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {['Facebook', 'Instagram', 'Twitter'].map(social => (
                                                        <div key={social}>
                                                            <InputLabel value={`${social} URL`} className="text-[9px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                                                            <TextInput 
                                                                className="block w-full bg-stone-50/30 text-xs py-2" 
                                                                placeholder={`https://${social.toLowerCase()}.com/`}
                                                                value={data.social_links[social.toLowerCase()]}
                                                                onChange={(e) => updateNested('social_links', social.toLowerCase(), e.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-Tab 4: SMTP Config */}
                                    {activeSubTab === 'branding_smtp' && (
                                        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm">
                                            <div className="flex items-center gap-2 border-b border-stone-50 pb-3">
                                                <Server className="text-clay-600" size={16} />
                                                <div>
                                                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">SMTP Outgoing Server</h3>
                                                    <p className="text-[9px] text-stone-400 font-medium">Define outgoing settings to dispatch transaction notifications and verification codes.</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-2">
                                                    <InputLabel htmlFor="mail_host" value="SMTP Host" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                                                    <TextInput 
                                                        id="mail_host"
                                                        className="block w-full bg-stone-50/30 text-xs py-2" 
                                                        value={data.mail_host}
                                                        onChange={(e) => setData('mail_host', e.target.value)}
                                                    />
                                                    <InputError className="mt-1" message={errors.mail_host} />
                                                </div>

                                                <div>
                                                    <InputLabel htmlFor="mail_port" value="SMTP Port" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                                                    <TextInput 
                                                        id="mail_port"
                                                        className="block w-full bg-stone-50/30 text-xs py-2" 
                                                        value={data.mail_port}
                                                        onChange={(e) => setData('mail_port', e.target.value)}
                                                    />
                                                    <InputError className="mt-1" message={errors.mail_port} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <InputLabel htmlFor="mail_encryption" value="Encryption Protocol" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                                                    <select
                                                        id="mail_encryption"
                                                        className="block w-full rounded-xl border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 text-xs font-medium text-stone-700 py-2.5"
                                                        value={data.mail_encryption}
                                                        onChange={(e) => setData('mail_encryption', e.target.value)}
                                                    >
                                                        <option value="tls">TLS</option>
                                                        <option value="ssl">SSL</option>
                                                        <option value="none">None</option>
                                                    </select>
                                                    <InputError className="mt-1" message={errors.mail_encryption} />
                                                </div>

                                                <div>
                                                    <InputLabel htmlFor="mail_username" value="SMTP Username" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                                                    <TextInput 
                                                        id="mail_username"
                                                        className="block w-full bg-stone-50/30 text-xs py-2" 
                                                        value={data.mail_username}
                                                        onChange={(e) => setData('mail_username', e.target.value)}
                                                    />
                                                    <InputError className="mt-1" message={errors.mail_username} />
                                                </div>

                                                <div>
                                                    <InputLabel htmlFor="mail_password" value="SMTP Password" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                                                    <TextInput 
                                                        id="mail_password"
                                                        type="password"
                                                        className="block w-full bg-stone-50/30 text-xs py-2" 
                                                        value={data.mail_password}
                                                        onChange={(e) => setData('mail_password', e.target.value)}
                                                    />
                                                    <InputError className="mt-1" message={errors.mail_password} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-50">
                                                <div>
                                                    <InputLabel htmlFor="mail_from_address" value="Sender Email Address" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                                                    <TextInput 
                                                        id="mail_from_address"
                                                        className="block w-full bg-stone-50/30 text-xs py-2" 
                                                        value={data.mail_from_address}
                                                        onChange={(e) => setData('mail_from_address', e.target.value)}
                                                    />
                                                    <InputError className="mt-1" message={errors.mail_from_address} />
                                                </div>

                                                <div>
                                                    <InputLabel htmlFor="mail_from_name" value="Sender Display Name" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                                                    <TextInput 
                                                        id="mail_from_name"
                                                        className="block w-full bg-stone-50/30 text-xs py-2" 
                                                        value={data.mail_from_name}
                                                        onChange={(e) => setData('mail_from_name', e.target.value)}
                                                    />
                                                    <InputError className="mt-1" message={errors.mail_from_name} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-Tab 5: Platform Operations */}
                                    {activeSubTab === 'branding_ops' && (
                                        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm">
                                            {/* Financial Parameters */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <Banknote className="text-clay-600" size={16} />
                                                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Financial Thresholds</h3>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <InputLabel value="Commission Rate (%)" className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1.5" />
                                                        <div className="relative">
                                                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                                                            <TextInput 
                                                                type="number"
                                                                step="0.1"
                                                                className="block w-full pl-8 bg-stone-50/30 text-xs py-2" 
                                                                value={data.commission_rate}
                                                                onChange={(e) => setData('commission_rate', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <InputLabel value="Convenience Fee (PHP)" className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1.5" />
                                                        <div className="relative">
                                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                                                            <TextInput 
                                                                type="number"
                                                                className="block w-full pl-8 bg-stone-50/30 text-xs py-2" 
                                                                value={data.convenience_fee}
                                                                onChange={(e) => setData('convenience_fee', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <InputLabel value="Min. Withdrawal (PHP)" className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1.5" />
                                                        <div className="relative">
                                                            <ArrowRight className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                                                            <TextInput 
                                                                type="number"
                                                                className="block w-full pl-8 bg-stone-50/30 text-xs py-2" 
                                                                value={data.withdrawal_min}
                                                                onChange={(e) => setData('withdrawal_min', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Feature Toggles */}
                                            <div className="pt-6 border-t border-stone-100 space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <ShieldAlert className="text-clay-600" size={16} />
                                                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Gateways & Safety</h3>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div 
                                                        onClick={() => setData('maintenance_mode', !data.maintenance_mode)}
                                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group ${data.maintenance_mode ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-stone-100 hover:border-stone-200'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg transition-colors ${data.maintenance_mode ? 'bg-amber-100 text-amber-700' : 'bg-stone-50 text-stone-400 group-hover:bg-stone-100'}`}>
                                                                <ShieldAlert size={15} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-stone-900 leading-tight">Maintenance Mode</h4>
                                                                <p className="text-[9px] text-stone-500 font-medium">Prevent login and access for buyers & artisans.</p>
                                                            </div>
                                                        </div>
                                                        <div className={`w-8 h-4.5 rounded-full relative transition-colors ${data.maintenance_mode ? 'bg-amber-500' : 'bg-stone-200'}`}>
                                                            <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${data.maintenance_mode ? 'left-4' : 'left-0.5'}`} />
                                                        </div>
                                                    </div>

                                                    <div 
                                                        onClick={() => setData('paymongo_enabled', !data.paymongo_enabled)}
                                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group ${data.paymongo_enabled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-stone-100 hover:border-stone-200'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg transition-colors ${data.paymongo_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-50 text-stone-400 group-hover:bg-stone-100'}`}>
                                                                <CreditCard size={15} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-stone-900 leading-tight">PayMongo Gateway</h4>
                                                                <p className="text-[9px] text-stone-500 font-medium">Enable real-time transaction processing.</p>
                                                            </div>
                                                        </div>
                                                        <div className={`w-8 h-4.5 rounded-full relative transition-colors ${data.paymongo_enabled ? 'bg-emerald-500' : 'bg-stone-200'}`}>
                                                            <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${data.paymongo_enabled ? 'left-4' : 'left-0.5'}`} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Sticky actions */}
                                <div className="space-y-6">
                                    <div className="bg-stone-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
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
                                                <Save size={14} className="group-hover:rotate-12 transition-transform" />
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

                                    <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-4">
                                        <h4 className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Operational Notes</h4>
                                        <ul className="space-y-3">
                                            {[
                                                { title: 'Commission Rates', desc: 'Sellers on Premium & Elite have custom low-overhead commission rates.', icon: Percent },
                                                { title: 'SMTP Syncing', desc: 'Verification codes require correct host credentials to verify artisans.', icon: Server },
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
                                </div>
                            </form>
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

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {isLoadingMetrics ? (
                                    <>
                                        <StatSkeleton />
                                        <StatSkeleton />
                                        <StatSkeleton />
                                        <StatSkeleton />
                                    </>
                                ) : (
                                    <>
                                        <StatCard
                                            title="Plan MRR"
                                            metric={metrics.mrr}
                                            prefix="₱"
                                            icon={CircleDollarSign}
                                            bg="bg-emerald-50"
                                            text="text-emerald-600"
                                            subtitle={metrics.mrr?.basis}
                                        />
                                        <StatCard
                                            title="Paid Subs"
                                            metric={metrics.subscribers.total_paid}
                                            icon={Users}
                                            bg="bg-blue-50"
                                            text="text-blue-600"
                                            subtitle={`${metrics.subscribers.premium + metrics.subscribers.elite} active`}
                                        />
                                        <StatCard
                                            title="Elite Only"
                                            metric={metrics.subscribers.elite}
                                            icon={Star}
                                            bg="bg-fuchsia-50"
                                            text="text-fuchsia-600"
                                        />
                                        <StatCard
                                            title="Sponsored"
                                            metric={metrics.sponsorships}
                                            icon={Award}
                                            bg="bg-amber-50"
                                            text="text-amber-600"
                                        />
                                    </>
                                )}
                            </div>

                            {/* Monetization Actions */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                                <Link
                                    href={route("admin.sponsorships")}
                                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[10px] font-bold text-stone-600 transition-colors hover:bg-stone-50"
                                >
                                    <Award size={12} />
                                    Sponsorship Queue
                                </Link>
                                <Link
                                    href={route("admin.users", { role: "artisan" })}
                                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[10px] font-bold text-stone-600 transition-colors hover:bg-stone-50"
                                >
                                    <Users size={12} />
                                    Review Plans
                                </Link>
                                {!isLoadingMetrics && (
                                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[10px] font-bold text-stone-500">
                                        <CircleDollarSign size={12} />
                                        {metrics.pendingSponsorships > 0 ? `${metrics.pendingSponsorships} pending` : 'No backlog'}
                                    </span>
                                )}
                            </div>

                            {/* Pending Sponsorship Notice */}
                            {!isLoadingMetrics && metrics.pendingSponsorships > 0 && (
                                <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-100 bg-white shrink-0">
                                            <Clock size={16} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-stone-900 text-sm">Pending Sponsorships</h3>
                                            <p className="text-[11px] text-stone-600 mt-0.5">
                                                There are <span className="font-bold text-amber-700">{metrics.pendingSponsorships}</span> request(s) awaiting review.
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href={route("admin.sponsorships")}
                                        className="flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-amber-600"
                                    >
                                        Review Requests <ChevronRight size={14} />
                                    </Link>
                                </div>
                            )}

                            {/* Logs Tables Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                
                                {/* Recent Plan Changes */}
                                <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                                    <div className="flex flex-col gap-2 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <h3 className="font-bold text-stone-900 text-sm">Recent Plan Changes</h3>
                                        <Link
                                            href={route("admin.users")}
                                            className="text-[10px] text-clay-600 font-bold hover:text-clay-800 transition flex items-center gap-0.5"
                                        >
                                            All Users <ChevronRight size={12} />
                                        </Link>
                                    </div>
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left table-card-mobile">
                                            <thead className="bg-stone-50 border-b border-stone-100">
                                                <tr>
                                                    <th className="px-5 py-2.5 text-[9px] font-bold text-stone-400 uppercase tracking-wider">Artisan</th>
                                                    <th className="px-5 py-2.5 text-center text-[9px] font-bold text-stone-400 uppercase tracking-wider">Plan Change</th>
                                                    <th className="px-5 py-2.5 text-right text-[9px] font-bold text-stone-400 uppercase tracking-wider">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {isLoadingSubscribers ? (
                                                    <>
                                                        <RowSkeleton />
                                                        <RowSkeleton />
                                                        <RowSkeleton />
                                                    </>
                                                ) : recentSubscribers.length > 0 ? recentSubscribers.map((user) => (
                                                    <tr key={user.id} className="hover:bg-stone-50/50 transition">
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <UserAvatar user={user} className="w-8 h-8 border border-clay-100" />
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-stone-900 text-xs">{user.name}</p>
                                                                    <p className="text-[10px] text-stone-500 truncate max-w-[120px]">{user.shop_name || "No Shop"}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3 text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="flex items-center gap-1 text-[9px] font-bold text-stone-400">
                                                                    <span className="bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">{user.previous_tier_label || 'Free'}</span>
                                                                    <ChevronRight size={8} />
                                                                    <span className={`px-1.5 py-0.5 rounded border ${planTierBadgeClasses[user.tier] || planTierBadgeClasses.Free}`}>
                                                                        {user.tier}
                                                                    </span>
                                                                </div>
                                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${
                                                                    changeDirectionBadgeClasses[user.change_direction] || changeDirectionBadgeClasses.change
                                                                }`}>
                                                                    {user.change_direction === 'upgrade' && <TrendingUp size={8} />}
                                                                    {user.change_direction === 'downgrade' && <TrendingDown size={8} />}
                                                                    {user.change_direction}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3 text-[10px] text-stone-500 text-right">
                                                            <div className="font-bold text-stone-900">{user.date}</div>
                                                            <div className="text-[8px] text-stone-400 mt-0.5">{user.change_label}</div>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="3" className="px-5 py-8 text-center">
                                                            <WorkspaceEmptyState
                                                                compact
                                                                icon={TrendingUp}
                                                                title="No recent plan changes"
                                                                description="Subscription plan changes will appear here."
                                                            />
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Recent Sponsorships */}
                                <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                                    <div className="flex flex-col gap-2 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <h3 className="font-bold text-stone-900 text-sm">Recent Sponsorships</h3>
                                        <Link
                                            href={route("admin.sponsorships")}
                                            className="text-[10px] text-clay-600 font-bold hover:text-clay-800 transition flex items-center gap-0.5"
                                        >
                                            All Sponsorships <ChevronRight size={12} />
                                        </Link>
                                    </div>
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left table-card-mobile">
                                            <thead className="bg-stone-50 border-b border-stone-100">
                                                <tr>
                                                    <th className="px-5 py-2.5 text-[9px] font-bold text-stone-400 uppercase tracking-wider">Product / Artisan</th>
                                                    <th className="px-5 py-2.5 text-center text-[9px] font-bold text-stone-400 uppercase tracking-wider">Status</th>
                                                    <th className="px-5 py-2.5 text-right text-[9px] font-bold text-stone-400 uppercase tracking-wider">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {isLoadingSponsorships ? (
                                                    <>
                                                        <RowSkeleton />
                                                        <RowSkeleton />
                                                        <RowSkeleton />
                                                    </>
                                                ) : recentSponsorships.length > 0 ? recentSponsorships.map((req) => (
                                                    <tr key={req.id} className="hover:bg-stone-50/50 transition">
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <UserAvatar user={req.user} className="w-8 h-8 border border-clay-100" />
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-stone-900 text-xs truncate max-w-[180px]" title={req.product_name}>{req.product_name}</p>
                                                                    <p className="text-[10px] text-stone-500">by {req.user?.name}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3 text-center">
                                                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${
                                                                req.status === "approved"
                                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                                    : req.status === "rejected" || req.status === "cancelled"
                                                                    ? "bg-stone-100 text-stone-600 border-stone-200"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                            }`}>
                                                                {req.status === "approved" && <CheckCircle size={10} />}
                                                                {(req.status === "rejected" || req.status === "cancelled") && <XCircle size={10} />}
                                                                {req.status === "pending" && <Clock size={10} />}
                                                                {req.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 text-[10px] text-stone-500 text-right font-medium">
                                                            {req.date}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="3" className="px-5 py-8 text-center">
                                                            <WorkspaceEmptyState
                                                                compact
                                                                icon={Clock}
                                                                title="No recent sponsorships"
                                                                description="New sponsorship request history will appear here."
                                                            />
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'plans' && (
                        <motion.div
                            key="plans-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                                <ShieldCheck className="text-clay-600" size={16} />
                                <div>
                                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Subscription Tiers Overview</h3>
                                    <p className="text-[9px] text-stone-400 font-medium">System configuration limits and features configured for active marketplace plans.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                {/* Free Tier Card */}
                                <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col justify-between transition hover:border-stone-300 relative">
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Basic</span>
                                            <h4 className="text-lg font-black text-stone-950">Free Plan</h4>
                                            <p className="text-[10px] text-stone-500 mt-0.5">Starter capabilities for hobbyist sellers.</p>
                                        </div>
                                        
                                        <div className="text-2xl font-black text-stone-900 tracking-tight">
                                            ₱0 <span className="text-xs font-medium text-stone-400">/ month</span>
                                        </div>

                                        <div className="w-full h-px bg-stone-100" />

                                        <ul className="space-y-2 text-[10px] font-medium text-stone-600">
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Active products limit: 15 items</span>
                                            </li>
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Platform commission: 5.0% rate</span>
                                            </li>
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Staff accounts limit: 1 seat</span>
                                            </li>
                                            <li className="flex items-center gap-1.5 text-stone-400">
                                                <XCircle className="text-stone-300" size={12} />
                                                <span>Lalamove integrations access</span>
                                            </li>
                                            <li className="flex items-center gap-1.5 text-stone-400">
                                                <XCircle className="text-stone-300" size={12} />
                                                <span>Verified artisan badge</span>
                                            </li>
                                        </ul>
                                    </div>
                                    
                                    <div className="mt-8 text-center text-[9px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 py-2 rounded-lg border">
                                        Default Onboarding
                                    </div>
                                </div>

                                {/* Premium Tier Card */}
                                <div className="bg-white rounded-2xl border-2 border-clay-500 p-6 flex flex-col justify-between transition hover:shadow-sm relative">
                                    <div className="absolute top-3 right-3 bg-clay-500 text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                                        Most Popular
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-clay-600">Growth</span>
                                            <h4 className="text-lg font-black text-stone-950">Premium Plan</h4>
                                            <p className="text-[10px] text-stone-500 mt-0.5">Advanced integrations for full-time creators.</p>
                                        </div>
                                        
                                        <div className="text-2xl font-black text-stone-900 tracking-tight">
                                            ₱199 <span className="text-xs font-medium text-stone-400">/ month</span>
                                        </div>

                                        <div className="w-full h-px bg-stone-100" />

                                        <ul className="space-y-2 text-[10px] font-medium text-stone-600">
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Active products limit: 100 items</span>
                                            </li>
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Platform commission: 2.5% rate</span>
                                            </li>
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Staff accounts limit: 5 seats</span>
                                            </li>
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Lalamove delivery integrations</span>
                                            </li>
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Premium Verified Badge</span>
                                            </li>
                                        </ul>
                                    </div>
                                    
                                    <div className="mt-8 text-center text-[9px] font-bold text-clay-700 uppercase tracking-widest bg-clay-50 py-2 rounded-lg border border-clay-200">
                                        Artisan Growth Tier
                                    </div>
                                </div>

                                {/* Elite Tier Card */}
                                <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col justify-between transition hover:border-stone-300 relative">
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-600">Enterprise</span>
                                            <h4 className="text-lg font-black text-stone-950">Elite Plan</h4>
                                            <p className="text-[10px] text-stone-500 mt-0.5">Zero platform commission for pro scale.</p>
                                        </div>
                                        
                                        <div className="text-2xl font-black text-stone-900 tracking-tight">
                                            ₱399 <span className="text-xs font-medium text-stone-400">/ month</span>
                                        </div>

                                        <div className="w-full h-px bg-stone-100" />

                                        <ul className="space-y-2 text-[10px] font-medium text-stone-600">
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span className="font-bold text-stone-900">Unlimited Active Products</span>
                                            </li>
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span className="font-bold text-stone-900">0.0% Commission (direct payouts)</span>
                                            </li>
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Unlimited Staff Seats</span>
                                            </li>
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Lalamove priority auto-booking</span>
                                            </li>
                                            <li className="flex items-center gap-1.5">
                                                <CheckCircle className="text-clay-600" size={12} />
                                                <span>Elite Badge & Featured Status</span>
                                            </li>
                                        </ul>
                                    </div>
                                    
                                    <div className="mt-8 text-center text-[9px] font-bold text-violet-700 uppercase tracking-widest bg-violet-50 py-2 rounded-lg border border-violet-200">
                                        Pro Scale Tier
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

SystemConfig.layout = page => <AdminLayout title="System Config">{page}</AdminLayout>;
