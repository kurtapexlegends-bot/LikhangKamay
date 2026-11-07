import BuyerNavbar from '@/Layouts/BuyerNavbar';
import { Head, usePage, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdateAddressForm from './Partials/UpdateAddressForm';
import UserAvatar from '@/Components/UserAvatar';
import { 
    User, Shield, MapPin, AlertTriangle, ShoppingBag, Star 
} from 'lucide-react';

export default function Edit({ mustVerifyEmail, status, addresses = [] }) {
    const { auth, url } = usePage().props;
    const user = auth?.user;
    
    const [activeTab, setActiveTab] = useState(() => {
        const urlStr = typeof window !== 'undefined' ? window.location.search : '';
        const params = new URLSearchParams(urlStr);
        return params.get('tab') || 'account';
    });

    useEffect(() => {
        const urlStr = typeof window !== 'undefined' ? window.location.search : '';
        const params = new URLSearchParams(urlStr);
        const currentTab = params.get('tab') || 'account';
        setActiveTab(currentTab);
    }, [url]);

    const tabs = [
        { id: 'account', label: 'Profile Information', shortLabel: 'Profile', icon: User },
        { id: 'security', label: 'Security & Password', shortLabel: 'Security', icon: Shield },
        { id: 'addresses', label: 'Saved Addresses', shortLabel: 'Addresses', icon: MapPin, count: addresses?.length || 0 },
        { id: 'danger', label: 'Deactivate Account', shortLabel: 'Deactivate', icon: AlertTriangle, variant: 'danger' },
    ];

    const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-stone-800">
            <Head title="Profile Settings - LikhangKamay" />
            <BuyerNavbar />

            <main id="main-content" tabIndex={-1} className="py-5 sm:py-8 focus:outline-none">
                <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
                        
                        {/* LEFT COLUMN: Account Profile & Navigation Sidebar (Desktop) */}
                        <aside className="hidden lg:flex flex-col w-full lg:w-64 shrink-0 lg:sticky lg:top-24 self-start bg-white border border-stone-200 rounded-2xl shadow-sm divide-y divide-stone-100">
                            {/* Account Profile Header Section */}
                            <div className="p-5">
                                <div className="flex items-center gap-3.5">
                                    <UserAvatar user={user} className="w-12 h-12 shadow-sm border border-stone-100" />
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-sm font-bold text-stone-900 truncate">{user?.name || 'My Account'}</h2>
                                        <p className="text-[10px] text-stone-500 font-semibold truncate mt-0.5">{user?.email}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-center mt-4">
                                    <div className="bg-stone-50/50 border border-stone-100/80 rounded-xl p-2.5">
                                        <p className="text-[10px] font-bold text-stone-400">Addresses</p>
                                        <p className="text-base font-black text-clay-700 mt-0.5">{addresses?.length || 0}</p>
                                    </div>
                                    <div className="bg-stone-50/50 border border-stone-100/80 rounded-xl p-2.5">
                                        <p className="text-[10px] font-bold text-stone-400">Security</p>
                                        <p className={`text-xs font-black mt-1 uppercase tracking-wider ${
                                            user?.email_verified_at ? 'text-emerald-700' : 'text-amber-700'
                                        }`}>
                                            {user?.email_verified_at ? 'Verified' : 'Unverified'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Vertical Navigation Menu Section */}
                            <nav className="p-3 flex flex-col gap-1 w-full">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    const isDanger = tab.variant === 'danger';
                                    
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center justify-between px-3.5 py-3 text-left text-xs font-bold rounded-xl transition-all w-full select-none ${
                                                isActive 
                                                    ? 'bg-clay-50 text-clay-700 font-bold' 
                                                    : isDanger 
                                                    ? 'text-stone-500 hover:text-red-600 hover:bg-red-50/50' 
                                                    : 'text-stone-500 hover:text-clay-650 hover:bg-stone-50/50'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2.5 truncate">
                                                <Icon 
                                                    size={16} 
                                                    strokeWidth={2.2} 
                                                    className={isActive ? 'text-clay-600' : isDanger ? 'text-red-500' : 'text-stone-400'} 
                                                />
                                                <span className="truncate">{tab.label}</span>
                                            </span>
                                            {typeof tab.count === 'number' && tab.count > 0 && (
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold leading-none ${
                                                    isActive ? 'bg-clay-600 text-white' : 'bg-stone-100 text-stone-500'
                                                }`}>
                                                    {tab.count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                        </aside>

                        {/* RIGHT COLUMN: Main Content Area */}
                        <div className="flex-1 min-w-0 w-full">
                            {/* Page Header (Desktop) */}
                            <div className="hidden lg:flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-black tracking-tight text-stone-900">Profile Settings</h1>
                                    <span className="text-xs bg-clay-100 text-clay-700 px-3 py-1 rounded-full font-bold">
                                        {currentTabObj.shortLabel}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={route('my-orders.index')}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50 transition-colors shadow-2xs"
                                    >
                                        <ShoppingBag size={13} className="text-stone-400" />
                                        <span>My Purchases</span>
                                    </Link>
                                    <Link
                                        href={route('buyer.reviews')}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50 transition-colors shadow-2xs"
                                    >
                                        <Star size={13} className="text-stone-400" />
                                        <span>My Reviews</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Mobile Header */}
                            <div className="mb-3.5 lg:hidden flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <h1 className="text-lg font-black tracking-tight text-stone-900 truncate">Profile Settings</h1>
                                    <span className="text-[10px] bg-clay-100 text-clay-700 px-2 py-0.5 rounded-full font-bold shrink-0">
                                        {currentTabObj.shortLabel}
                                    </span>
                                </div>
                                <Link
                                    href={route('my-orders.index')}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 shadow-2xs active:scale-95 transition-all shrink-0 min-h-[36px]"
                                >
                                    <span>Purchases</span>
                                </Link>
                            </div>

                            {/* Mobile Tabs Slider */}
                            <div className="lg:hidden mb-4 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xs">
                                <div className="flex overflow-x-auto scrollbar-hide">
                                    {tabs.map((tab) => {
                                        const Icon = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        const isDanger = tab.variant === 'danger';
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${
                                                    isActive
                                                        ? 'border-clay-600 text-clay-700 bg-clay-50/40'
                                                        : isDanger
                                                        ? 'border-transparent text-stone-500 hover:text-red-600 hover:bg-red-50/30'
                                                        : 'border-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                                                }`}
                                            >
                                                <Icon size={14} className={isActive ? 'text-clay-600' : isDanger ? 'text-red-500' : 'text-stone-400'} />
                                                <span>{tab.shortLabel}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Main Content Card Container */}
                            <div className="bg-white p-5 sm:p-8 rounded-2xl border border-stone-200 min-h-[460px] shadow-sm">
                                
                                {/* ACCOUNT SETTINGS */}
                                {activeTab === 'account' && (
                                    <div className="animate-in fade-in duration-200">
                                        <UpdateProfileInformationForm
                                            mustVerifyEmail={mustVerifyEmail}
                                            status={status}
                                            className="max-w-2xl"
                                        />
                                    </div>
                                )}

                                {/* SECURITY/PASSWORD */}
                                {activeTab === 'security' && (
                                    <div className="animate-in fade-in duration-200">
                                        <UpdatePasswordForm className="max-w-2xl" />
                                    </div>
                                )}

                                {/* ADDRESS BOOK */}
                                {activeTab === 'addresses' && (
                                    <div className="animate-in fade-in duration-200">
                                        <UpdateAddressForm addresses={addresses} />
                                    </div>
                                )}

                                {/* DANGER ZONE */}
                                {activeTab === 'danger' && (
                                    <div className="animate-in fade-in duration-200">
                                        <DeleteUserForm className="max-w-2xl" />
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
