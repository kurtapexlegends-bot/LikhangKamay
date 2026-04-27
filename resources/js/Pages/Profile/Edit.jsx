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
