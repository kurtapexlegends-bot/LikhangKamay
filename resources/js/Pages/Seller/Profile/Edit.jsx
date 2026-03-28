import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import AdminLayout from '@/Layouts/AdminLayout';
import { Menu, User, Shield, MapPin, AlertTriangle, CheckCircle, AlertCircle, X } from 'lucide-react';
import DeleteUserForm from '@/Pages/Profile/Partials/DeleteUserForm';
import UpdatePasswordForm from '@/Pages/Profile/Partials/UpdatePasswordForm';
import UpdateAddressForm from '@/Pages/Profile/Partials/UpdateAddressForm';
import UpdateProfileInformationForm from '@/Pages/Profile/Partials/UpdateProfileInformationForm';
import SellerUpdateProfileInformationForm from './Partials/SellerUpdateProfileInformationForm';
import Dropdown from '@/Components/Dropdown';
import UserAvatar from '@/Components/UserAvatar';

export default function Edit({ mustVerifyEmail, status, addresses, profileMode = 'owner', workspaceShell = 'seller' }) {
    const { auth, flash } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isPersonalOnly = profileMode === 'personal';
    const isAdminShell = workspaceShell === 'admin';

    // --- FLASH MESSAGE HANDLING ---
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); // 'success' or 'error'

    React.useEffect(() => {
        if (flash.success) {
            setToastType('success');
            setToastMessage(flash.success);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
        if (flash.error) {
            setToastType('error');
            setToastMessage(flash.error);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
        }
    }, [flash]);

    const profileContent = (
        <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-clay-50 text-clay-600 rounded-lg">
                        <User size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Personal Information</h3>
                        <p className="text-xs text-gray-500">
                            {isPersonalOnly ? 'Update your personal account details and profile photo.' : 'Update your account details and shop info.'}
                        </p>
                    </div>
                </div>
                {isPersonalOnly ? (
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-xl"
                    />
                ) : (
                    <SellerUpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-xl"
                    />
                )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Security</h3>
                        <p className="text-xs text-gray-500">Ensure your account is secure with a strong password.</p>
                    </div>
                </div>
                <UpdatePasswordForm className="max-w-xl" />
            </div>

            {!isPersonalOnly && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Address Book & Additional Contacts</h3>
                                <p className="text-xs text-gray-500">Manage additional store locations or contact numbers.</p>
                            </div>
                        </div>
                    </div>
                    <UpdateAddressForm addresses={addresses} />
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-red-600">Danger Zone</h3>
                        <p className="text-xs text-gray-500">Permanently delete your account and data.</p>
                    </div>
                </div>
                <DeleteUserForm className="max-w-xl" />
            </div>
        </>
    );

    const toastNotification = (
        <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[100] transition-all duration-500 transform ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border ${toastType === 'success' ? 'bg-white border-green-100' : 'bg-white border-red-100'}`}>
                <div className={`p-2 rounded-full ${toastType === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {toastType === 'success' ? <CheckCircle size={20} className="stroke-2" /> : <AlertCircle size={20} className="stroke-2" />}
                </div>
                <div>
                    <h4 className={`text-sm font-bold ${toastType === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                        {toastType === 'success' ? 'Success' : 'Error'}
                    </h4>
                    <p className="text-xs text-gray-500">{toastMessage}</p>
                </div>
                <button onClick={() => setShowToast(false)} className="ml-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
        </div>
    );

    if (isAdminShell) {
        return (
            <>
                <Head title="Profile Settings" />
                <AdminLayout title="Profile Settings">
                    <div className="max-w-4xl space-y-6">
                        {profileContent}
                    </div>
                </AdminLayout>
                {toastNotification}
            </>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Seller Profile" />
            <SellerSidebar active="" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40">
                    <div className="flex min-w-0 items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Manage your account settings</p>
                        </div>
                    </div>
                    
                    <Dropdown>
                        <Dropdown.Trigger>
                            <button className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-clay-600 transition">
                                <span className="hidden md:inline">{auth.user.shop_name || auth.user.name}</span>
                                <UserAvatar user={auth.user} className="w-8 h-8" />
                            </button>
                        </Dropdown.Trigger>
                        <Dropdown.Content>
                            <Dropdown.Link href={route('logout')} method="post" as="button" className="text-red-600">Log Out</Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </header>

                <main className="p-4 sm:p-6 space-y-6 max-w-4xl">
                    {profileContent}
                </main>
            </div>

            {toastNotification}
        </div>
    );
}
