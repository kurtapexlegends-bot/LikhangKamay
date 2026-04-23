import BuyerNavbar from '@/Components/BuyerNavbar';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdateAddressForm from './Partials/UpdateAddressForm';
import { User, Shield, MapPin, AlertTriangle, ChevronRight, Store } from 'lucide-react';
import { usePage, Link } from '@inertiajs/react';

export default function Edit({ mustVerifyEmail, status, addresses }) {
    const { auth } = usePage().props;
    const userRole = auth.user.role;
    const [activeTab, setActiveTab] = useState('account');

    const tabs = [
        { id: 'account', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'addresses', label: 'Addresses', icon: MapPin },
        ...(userRole === 'artisan' ? [{ id: 'shop', label: 'Shop', icon: Store }] : []),
        { id: 'danger', label: 'Delete Account', icon: AlertTriangle, variant: 'danger' },
    ];

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-stone-800">
            <Head title="My Profile" />
            <BuyerNavbar />

            <main className="py-10 sm:py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        
                        {/* SIDEBAR NAVIGATION */}
                        <aside className="w-full lg:w-64 flex-shrink-0">
                            <div className="bg-white rounded-2xl border border-stone-200 p-4 sticky top-28 shadow-sm">
                                <div className="mb-6 px-2">
                                    <h2 className="text-xl font-bold text-stone-900">Settings</h2>
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Account Controls</p>
                                </div>
                                <nav className="space-y-1">
                                    {tabs.map((tab) => {
                                        const Icon = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        const isDanger = tab.variant === 'danger';
                                        
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition-all ${
                                                    isActive 
                                                        ? 'bg-clay-50 text-clay-700' 
                                                        : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                                                } ${isDanger && !isActive ? 'hover:bg-red-50 hover:text-red-600' : ''}`}
                                            >
                                                <Icon size={18} strokeWidth={2.5} className={isActive ? 'text-clay-600' : isDanger ? 'text-red-500' : 'text-stone-400'} />
                                                <span className="truncate">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        </aside>

                        {/* CONTENT AREA */}
                        <div className="flex-1 min-w-0">
                            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 min-h-[500px] shadow-sm">
                                
                                {/* ACCOUNT SETTINGS */}
                                {activeTab === 'account' && (
                                    <div className="animate-in fade-in duration-300">
                                        <UpdateProfileInformationForm
                                            mustVerifyEmail={mustVerifyEmail}
                                            status={status}
                                            className="max-w-2xl"
                                        />
                                    </div>
                                )}

                                {/* SECURITY/PASSWORD */}
                                {activeTab === 'security' && (
                                    <div className="animate-in fade-in duration-300">
                                        <UpdatePasswordForm className="max-w-2xl" />
                                    </div>
                                )}

                                {/* ADDRESS BOOK */}
                                {activeTab === 'addresses' && (
                                    <div className="animate-in fade-in duration-300">
                                        <UpdateAddressForm addresses={addresses} />
                                    </div>
                                )}

                                {/* SHOP SETTINGS (ARTISAN ONLY) */}
                                {activeTab === 'shop' && (
                                    <div className="animate-in fade-in duration-300">
                                        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-stone-900">Shop</h3>
                                                <p className="text-sm text-stone-500 mt-1">Manage your storefront and artisan operations.</p>
                                            </div>
                                            <Link href={route('dashboard')} className="inline-flex items-center gap-2 bg-clay-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-clay-700 transition">
                                                Go to Dashboard <ChevronRight size={14} />
                                            </Link>
                                        </header>
                                        
                                        <div className="bg-stone-50 rounded-2xl p-8 border border-stone-100 text-center">
                                            <div className="w-16 h-16 bg-white rounded-xl border border-stone-100 flex items-center justify-center mx-auto mb-4">
                                                <Store size={32} className="text-clay-600" />
                                            </div>
                                            <h4 className="text-lg font-bold text-stone-900 mb-2">Artisan Workspace</h4>
                                            <p className="text-sm text-stone-500 mb-6 max-w-sm mx-auto font-medium">
                                                Inventory, products, and fulfillment are managed in your artisan dashboard.
                                            </p>
                                            <Link href={route('dashboard')} className="inline-flex items-center justify-center px-8 py-2.5 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition shadow-sm">
                                                Open Workspace
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                {/* DANGER ZONE */}
                                {activeTab === 'danger' && (
                                    <div className="animate-in fade-in duration-300">
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
