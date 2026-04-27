import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import AdminLayout from '@/Layouts/AdminLayout';
import SellerHeader from '@/Components/SellerHeader';
import { User, Shield, MapPin, AlertTriangle } from 'lucide-react';
import DeleteUserForm from '@/Pages/Profile/Partials/DeleteUserForm';
import UpdatePasswordForm from '@/Pages/Profile/Partials/UpdatePasswordForm';
import UpdateAddressForm from '@/Pages/Profile/Partials/UpdateAddressForm';
import UpdateProfileInformationForm from '@/Pages/Profile/Partials/UpdateProfileInformationForm';
import SellerUpdateProfileInformationForm from './Partials/SellerUpdateProfileInformationForm';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';

export default function Edit({ mustVerifyEmail, status, addresses, profileMode = 'owner', workspaceShell = 'seller' }) {
    const { auth, flash } = usePage().props;
    const { addToast } = useToast();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isPersonalOnly = profileMode === 'personal';
    const isAdminShell = workspaceShell === 'admin';
    useFlashToast(flash, addToast);

    const profileContent = (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/20">
                    <div className="flex items-center gap-2.5">
                        <User size={18} className="text-stone-400" />
                        <h3 className="text-base font-bold text-stone-900">
                            {isPersonalOnly ? 'Personal Information' : 'Shop Information'}
                        </h3>
                    </div>
                </div>
                <div className="p-6">
                    {isPersonalOnly ? (
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-2xl"
                        />
                    ) : (
                        <SellerUpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-2xl"
                        />
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/20">
                    <div className="flex items-center gap-2.5">
                        <Shield size={18} className="text-stone-400" />
                        <h3 className="text-base font-bold text-stone-900">Security</h3>
                    </div>
                </div>
                <div className="p-6">
                    <UpdatePasswordForm className="max-w-2xl" />
                </div>
            </div>

            {!isPersonalOnly && (
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/20">
                        <div className="flex items-center gap-2.5">
                            <MapPin size={18} className="text-stone-400" />
                            <h3 className="text-base font-bold text-stone-900">Addresses</h3>
                        </div>
                    </div>
                    <div className="p-6">
                        <UpdateAddressForm addresses={addresses} />
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-red-50 bg-red-50/10">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle size={18} className="text-red-500" />
                        <h3 className="text-base font-bold text-red-600">Delete Account</h3>
                    </div>
                </div>
                <div className="p-6">
                    <DeleteUserForm className="max-w-2xl" />
                </div>
            </div>
        </div>
    );

    if (isAdminShell) {
        return (
            <>
                <Head title="Profile Settings" />
                <AdminLayout title="Profile Settings">
                    <div className="max-w-4xl px-4 sm:px-0">
                        {profileContent}
                    </div>
                </AdminLayout>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-stone-800">
            <Head title="My Profile" />
            <SellerSidebar active="" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                <SellerHeader
                    title="Profile Settings"
                    subtitle="Manage your shop identity, security, and preferences"
                    auth={auth}
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                        {profileContent}
                    </div>
                </main>
            </div>
        </div>
    );
}
