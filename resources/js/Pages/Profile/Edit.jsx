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
        { id: 'account', label: 'Account Settings', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'addresses', label: 'Address Book', icon: MapPin },
        ...(userRole === 'artisan' ? [{ id: 'shop', label: 'Shop Settings', icon: Store }] : []),
        { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, variant: 'danger' },
    ];

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title="My Profile" />
            <BuyerNavbar />

            <main className="py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        
                        {/* SIDEBAR NAVIGATION */}
                        <aside className="w-full lg:w-64 flex-shrink-0">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 sticky top-24">
                                <div className="mb-6 px-2">
                                    <h2 className="text-xl font-bold text-gray-900">Settings</h2>
                                    <p className="text-xs text-gray-500 mt-1">Manage your account</p>
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
                                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                                                    isActive 
                                                        ? 'bg-clay-50 text-clay-700 shadow-sm' 
                                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                } ${isDanger && !isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon size={18} className={isActive ? 'text-clay-600' : isDanger ? 'text-red-500' : 'text-gray-400'} />
                                                    <span>{tab.label}</span>
                                                </div>
                                                {isActive && <ChevronRight size={16} className="text-clay-400" />}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        </aside>

                        {/* CONTENT AREA */}
                        <div className="flex-1">
                            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-gray-100 min-h-[600px]">
                                
                                {/* ACCOUNT SETTINGS */}
                                {activeTab === 'account' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="mb-8 border-b border-gray-100 pb-6">
                                            <h3 className="text-2xl font-bold text-gray-900">Personal Information</h3>
                                            <p className="text-gray-500 mt-1">Update your profile details and contact info.</p>
                                        </div>
                                        <UpdateProfileInformationForm
                                            mustVerifyEmail={mustVerifyEmail}
                                            status={status}
                                            className="max-w-xl"
                                        />
                                    </div>
                                )}

                                {/* SECURITY/PASSWORD */}
                                {activeTab === 'security' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="mb-8 border-b border-gray-100 pb-6">
                                            <h3 className="text-2xl font-bold text-gray-900">Security</h3>
                                            <p className="text-gray-500 mt-1">Ensure your account is secure with a strong password.</p>
                                        </div>
                                        <UpdatePasswordForm className="max-w-xl" />
                                    </div>
                                )}

                                {/* ADDRESS BOOK */}
                                {activeTab === 'addresses' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="mb-8 border-b border-gray-100 pb-6">
                                            <h3 className="text-2xl font-bold text-gray-900">Address Book</h3>
                                            <p className="text-gray-500 mt-1">Manage shipping addresses for faster checkout.</p>
                                        </div>
                                        <UpdateAddressForm addresses={addresses} />
                                    </div>
                                )}

                                {/* SHOP SETTINGS (ARTISAN ONLY) */}
                                {activeTab === 'shop' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="mb-8 border-b border-gray-100 pb-6 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900">Shop Settings</h3>
                                                <p className="text-gray-500 mt-1">Manage your public shop profile.</p>
                                            </div>
                                            <Link href={route('dashboard')} className="flex items-center gap-2 bg-clay-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-clay-700 transition">
                                                Go to Seller Dashboard <ChevronRight size={16} />
                                            </Link>
                                        </div>
                                        
                                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 text-center">
                                            <Store size={48} className="mx-auto text-clay-400 mb-4" />
                                            <h4 className="text-lg font-bold text-gray-900 mb-2">Want to manage your products?</h4>
                                            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                                                To upload products, manage inventory, and view analytics, please visit the Seller Dashboard.
                                            </p>
                                            <Link href={route('dashboard')} className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition">
                                                Launch Seller Dashboard
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                {/* DANGER ZONE */}
                                {activeTab === 'danger' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="mb-8 border-b border-red-100 pb-6">
                                            <h3 className="text-2xl font-bold text-red-600">Danger Zone</h3>
                                            <p className="text-gray-500 mt-1">Permanently remove your account and data.</p>
                                        </div>
                                        <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
                                            <DeleteUserForm className="max-w-xl" />
                                        </div>
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
