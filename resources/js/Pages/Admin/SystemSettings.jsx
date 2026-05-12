import React, { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { 
    Save, 
    Globe, 
    Palette, 
    Layout, 
    Search, 
    Image as ImageIcon, 
    Sparkles, 
    Hash, 
    Share2, 
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
    ChevronRight
} from 'lucide-react';

export default function SystemSettings({ auth, settings }) {
    const { flash } = usePage().props;
    const [activeTab, setActiveTab] = useState('branding');

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
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
        // Operational Settings
        commission_rate: settings.commission_rate || 5.0,
        convenience_fee: settings.convenience_fee || 15.0,
        withdrawal_min: settings.withdrawal_min || 500.0,
        maintenance_mode: settings.maintenance_mode || false,
        paymongo_enabled: settings.paymongo_enabled || true,
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

    const tabs = [
        { id: 'branding', name: 'Identity & Theme', icon: Palette },
        { id: 'seo', name: 'Search & Metadata', icon: Search },
        { id: 'contact', name: 'Contact & Socials', icon: Mail },
        { id: 'operations', name: 'Platform Ops', icon: Settings },
    ];

    return (
        <>
            <Head title="System Settings" />

            <div className="max-w-6xl mx-auto space-y-8 animate-page-enter">
                {/* Header Card */}
                <div className="bg-white rounded-3xl border border-clay-100 p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-clay-50 flex items-center justify-center text-clay-600 shadow-inner">
                                <Layout size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">System Configuration</h2>
                                <p className="text-sm text-gray-500 font-medium italic">Synchronize global platform variables and branding.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-stone-50 p-1.5 rounded-2xl border border-stone-100 overflow-x-auto no-scrollbar">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                                        ${activeTab === tab.id 
                                            ? 'bg-white text-clay-600 shadow-sm border border-clay-100' 
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}
                                    `}
                                >
                                    <tab.icon size={16} />
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {activeTab === 'branding' && (
                            <div className="bg-white rounded-3xl border border-clay-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div>
                                                <InputLabel htmlFor="platform_name" value="Platform Name" className="text-gray-900 font-bold mb-2 uppercase tracking-widest text-[10px]" />
                                                <TextInput
                                                    id="platform_name"
                                                    className="block w-full border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500"
                                                    value={data.platform_name}
                                                    onChange={(e) => setData('platform_name', e.target.value)}
                                                    required
                                                />
                                                <InputError className="mt-2" message={errors.platform_name} />
                                            </div>

                                            <div>
                                                <InputLabel htmlFor="primary_color" value="Primary Brand Color" className="text-gray-900 font-bold mb-2 uppercase tracking-widest text-[10px]" />
                                                <div className="flex items-center gap-3">
                                                    <div 
                                                        className="w-12 h-12 rounded-xl border border-stone-200 shadow-sm shrink-0"
                                                        style={{ backgroundColor: data.primary_color }}
                                                    />
                                                    <TextInput
                                                        id="primary_color"
                                                        className="block w-full border-stone-200 bg-stone-50/30 font-mono text-sm"
                                                        value={data.primary_color}
                                                        onChange={(e) => setData('primary_color', e.target.value)}
                                                    />
                                                    <div className="relative group">
                                                        <input 
                                                            type="color" 
                                                            className="w-12 h-12 p-1 bg-white border border-stone-200 rounded-xl cursor-pointer"
                                                            value={data.primary_color}
                                                            onChange={(e) => setData('primary_color', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <InputError className="mt-2" message={errors.primary_color} />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-start gap-4 p-4 bg-clay-50/50 rounded-2xl border border-clay-100">
                                                <Sparkles className="text-clay-600 shrink-0 mt-1" size={18} />
                                                <div>
                                                    <h4 className="text-xs font-bold text-clay-900 mb-1">Theme Preview</h4>
                                                    <p className="text-[10px] text-clay-600 leading-relaxed font-medium">This color will define your buttons, active states, and focus rings across the marketplace.</p>
                                                    <div className="mt-3 flex gap-2">
                                                        <div className="px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: data.primary_color }}>Active State</div>
                                                        <div className="px-3 py-1 rounded-full text-[10px] font-bold border" style={{ borderColor: data.primary_color, color: data.primary_color }}>Outline</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 pt-8 border-t border-stone-50">
                                        <div className="space-y-4">
                                            <InputLabel value="Platform Logo" className="text-gray-900 font-bold uppercase tracking-widest text-[10px]" />
                                            <div className="relative group aspect-[3/2] bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden transition-all hover:border-clay-300">
                                                {data.platform_logo_preview ? (
                                                    <img src={data.platform_logo_preview} className="w-full h-full object-contain p-6" alt="Preview" />
                                                ) : (
                                                    <ImageIcon className="text-stone-300" size={48} />
                                                )}
                                                <label htmlFor="platform_logo" className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                                    <span className="text-white text-xs font-bold bg-white/10 backdrop-blur-md px-6 py-2.5 rounded-xl border border-white/20 flex items-center gap-2">
                                                        <ImageIcon size={16} /> Upload Logo
                                                    </span>
                                                </label>
                                                <input id="platform_logo" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'platform_logo')} />
                                            </div>
                                            <p className="text-[10px] text-gray-400 italic">Recommended: PNG/SVG, transparent bg, max 2MB.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <InputLabel value="Favicon" className="text-gray-900 font-bold uppercase tracking-widest text-[10px]" />
                                            <div className="relative group aspect-square max-w-[200px] bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden transition-all hover:border-clay-300 mx-auto sm:mx-0">
                                                {data.favicon_preview ? (
                                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100">
                                                        <img src={data.favicon_preview} className="w-12 h-12 object-contain" alt="Favicon" />
                                                    </div>
                                                ) : (
                                                    <Globe className="text-stone-300" size={48} />
                                                )}
                                                <label htmlFor="favicon" className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                                    <span className="text-white text-[10px] font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">Change ICO</span>
                                                </label>
                                                <input id="favicon" type="file" className="hidden" accept=".ico,.png" onChange={(e) => handleFileChange(e, 'favicon')} />
                                            </div>
                                            <p className="text-[10px] text-gray-400 italic">Format: .ico or 32x32px .png.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'seo' && (
                            <div className="bg-white rounded-3xl border border-clay-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="p-8 space-y-8">
                                    <div className="space-y-6">
                                        <div>
                                            <InputLabel htmlFor="seo_title" value="Default Meta Title" className="text-gray-900 font-bold mb-2 uppercase tracking-widest text-[10px]" />
                                            <TextInput
                                                id="seo_title"
                                                className="block w-full border-stone-200 bg-stone-50/30"
                                                value={data.seo_metadata.title}
                                                onChange={(e) => updateNested('seo_metadata', 'title', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="seo_description" value="Default Meta Description" className="text-gray-900 font-bold mb-2 uppercase tracking-widest text-[10px]" />
                                            <textarea
                                                id="seo_description"
                                                className="block w-full rounded-2xl border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 min-h-[140px] text-sm font-medium p-4"
                                                value={data.seo_metadata.description}
                                                onChange={(e) => updateNested('seo_metadata', 'description', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="seo_keywords" value="Keywords (Comma separated)" className="text-gray-900 font-bold mb-2 uppercase tracking-widest text-[10px]" />
                                            <TextInput
                                                id="seo_keywords"
                                                className="block w-full border-stone-200 bg-stone-50/30"
                                                value={data.seo_metadata.keywords}
                                                onChange={(e) => updateNested('seo_metadata', 'keywords', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Google Preview */}
                                    <div className="pt-8 border-t border-stone-50">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Google Search Preview</h4>
                                        <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 space-y-1 max-w-xl">
                                            <div className="text-[#1a0dab] text-xl font-medium leading-tight truncate hover:underline cursor-pointer">
                                                {data.seo_metadata.title || 'Likhang Kamay | Artisan Marketplace'}
                                            </div>
                                            <div className="text-[#006621] text-sm leading-tight truncate flex items-center gap-1">
                                                https://likhangkamay.app <ChevronRight size={12} />
                                            </div>
                                            <div className="text-[#545454] text-sm leading-relaxed line-clamp-2">
                                                {data.seo_metadata.description || 'Discover unique handmade treasures from across the Philippines.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'contact' && (
                            <div className="bg-white rounded-3xl border border-clay-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <InputLabel value="Support Email" className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-2" />
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <TextInput 
                                                    className="block w-full pl-12 bg-stone-50/30" 
                                                    value={data.contact_info.email}
                                                    onChange={(e) => updateNested('contact_info', 'email', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <InputLabel value="Contact Phone" className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-2" />
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <TextInput 
                                                    className="block w-full pl-12 bg-stone-50/30" 
                                                    value={data.contact_info.phone}
                                                    onChange={(e) => updateNested('contact_info', 'phone', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <InputLabel value="Headquarters Address" className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-2" />
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-6 text-gray-400" size={16} />
                                            <textarea 
                                                className="block w-full pl-12 rounded-2xl border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 min-h-[100px] text-sm p-4"
                                                value={data.contact_info.address}
                                                onChange={(e) => updateNested('contact_info', 'address', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-stone-50 space-y-6">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Social Media Presence</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {['Facebook', 'Instagram', 'Twitter'].map(social => (
                                                <div key={social}>
                                                    <InputLabel value={`${social} URL`} className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-2" />
                                                    <TextInput 
                                                        className="block w-full bg-stone-50/30" 
                                                        placeholder={`https://${social.toLowerCase()}.com/likhangkamay`}
                                                        value={data.social_links[social.toLowerCase()]}
                                                        onChange={(e) => updateNested('social_links', social.toLowerCase(), e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'operations' && (
                            <div className="bg-white rounded-3xl border border-clay-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="p-8 space-y-10">
                                    {/* Financial Controls */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2">
                                            <Banknote className="text-clay-600" size={20} />
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Financial Controls</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <InputLabel value="Commission Rate (%)" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2" />
                                                <div className="relative">
                                                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                    <TextInput 
                                                        type="number"
                                                        step="0.1"
                                                        className="block w-full pl-10 bg-stone-50/30" 
                                                        value={data.commission_rate}
                                                        onChange={(e) => setData('commission_rate', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <InputLabel value="Convenience Fee (PHP)" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2" />
                                                <div className="relative">
                                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                    <TextInput 
                                                        type="number"
                                                        className="block w-full pl-10 bg-stone-50/30" 
                                                        value={data.convenience_fee}
                                                        onChange={(e) => setData('convenience_fee', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <InputLabel value="Min. Withdrawal (PHP)" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2" />
                                                <div className="relative">
                                                    <ArrowRight className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                    <TextInput 
                                                        type="number"
                                                        className="block w-full pl-10 bg-stone-50/30" 
                                                        value={data.withdrawal_min}
                                                        onChange={(e) => setData('withdrawal_min', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Feature Toggles */}
                                    <div className="pt-8 border-t border-stone-50 space-y-8">
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert className="text-clay-600" size={20} />
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Platform Governance</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div 
                                                onClick={() => setData('maintenance_mode', !data.maintenance_mode)}
                                                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${data.maintenance_mode ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-stone-100 hover:border-stone-200'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-xl transition-colors ${data.maintenance_mode ? 'bg-amber-100 text-amber-700' : 'bg-stone-50 text-stone-400 group-hover:bg-stone-100'}`}>
                                                        <ShieldAlert size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-900">Maintenance Mode</h4>
                                                        <p className="text-[11px] font-medium text-gray-500">Restrict access to artisans & buyers.</p>
                                                    </div>
                                                </div>
                                                <div className={`w-10 h-6 rounded-full relative transition-colors ${data.maintenance_mode ? 'bg-amber-500' : 'bg-stone-200'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${data.maintenance_mode ? 'left-5' : 'left-1'}`} />
                                                </div>
                                            </div>

                                            <div 
                                                onClick={() => setData('paymongo_enabled', !data.paymongo_enabled)}
                                                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${data.paymongo_enabled ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-stone-100 hover:border-stone-200'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-xl transition-colors ${data.paymongo_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-50 text-stone-400 group-hover:bg-stone-100'}`}>
                                                        <CreditCard size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-900">PayMongo Gateway</h4>
                                                        <p className="text-[11px] font-medium text-gray-500">Process live transactions via PayMongo.</p>
                                                    </div>
                                                </div>
                                                <div className={`w-10 h-6 rounded-full relative transition-colors ${data.paymongo_enabled ? 'bg-emerald-500' : 'bg-stone-200'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${data.paymongo_enabled ? 'left-5' : 'left-1'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Actions & Help */}
                    <div className="space-y-8">
                        <div className="bg-stone-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                        <Save size={20} className="text-clay-400" />
                                    </div>
                                    <h3 className="text-lg font-bold">Apply Changes</h3>
                                </div>
                                <p className="text-sm text-stone-400 leading-relaxed font-medium">
                                    Changes to operational variables (fees, commissions) affect all new transactions immediately.
                                </p>
                                
                                <PrimaryButton 
                                    disabled={processing}
                                    className="w-full py-4 bg-clay-600 hover:bg-clay-500 text-white rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-clay-600/20 group border-none"
                                >
                                    <Save size={18} className="group-hover:rotate-12 transition-transform" />
                                    {processing ? 'Processing...' : 'Apply Config Update'}
                                </PrimaryButton>

                                {recentlySuccessful && (
                                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                                        <CheckCircle2 size={16} />
                                        <span>System synchronized!</span>
                                    </div>
                                )}
                            </div>

                            {/* Decorative Background Circles */}
                            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-clay-600/10 rounded-full blur-3xl group-hover:bg-clay-600/20 transition-colors" />
                            <div className="absolute -left-10 -top-10 w-32 h-32 bg-indigo-600/5 rounded-full blur-2xl" />
                        </div>

                        <div className="bg-white rounded-3xl border border-clay-100 p-8 space-y-6">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Configuration Health</h4>
                            <ul className="space-y-4">
                                {[
                                    { title: 'Commission Policy', desc: 'The standard 5% commission covers platform operational overhead and marketing.', icon: Percent },
                                    { title: 'Secure Gateway', desc: 'PayMongo should only be disabled during emergency maintenance or gateway outages.', icon: CreditCard },
                                    { title: 'Withdrawal Threshold', desc: 'Setting a ₱500 minimum reduces transaction fee overhead for the treasury.', icon: Banknote },
                                ].map((tip, idx) => (
                                    <li key={idx} className="flex gap-4">
                                        <tip.icon size={18} className="text-clay-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-900">{tip.title}</p>
                                            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{tip.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            
                            <button type="button" className="w-full py-3 bg-stone-50 border border-stone-100 text-stone-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-100 transition-all flex items-center justify-center gap-2">
                                View Change Logs <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

SystemSettings.layout = page => <AdminLayout title="System Settings">{page}</AdminLayout>;
