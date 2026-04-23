import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import AdminLayout from '@/Layouts/AdminLayout';
import { Menu, User, Shield, MapPin, AlertTriangle, LogOut } from 'lucide-react';
import DeleteUserForm from '@/Pages/Profile/Partials/DeleteUserForm';
import UpdatePasswordForm from '@/Pages/Profile/Partials/UpdatePasswordForm';
import UpdateAddressForm from '@/Pages/Profile/Partials/UpdateAddressForm';
import UpdateProfileInformationForm from '@/Pages/Profile/Partials/UpdateProfileInformationForm';
import SellerUpdateProfileInformationForm from './Partials/SellerUpdateProfileInformationForm';
import Dropdown from '@/Components/Dropdown';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
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
                <header className="bg-white border-b border-stone-100 flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-40 shadow-sm">
                    <div className="flex min-w-0 items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-stone-500 hover:text-clay-600 transition-colors">
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-stone-900">Profile Settings</h1>
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider hidden sm:block">Update your account configuration</p>
                        </div>
                    </div>
                    
                    <Dropdown>
                        <Dropdown.Trigger>
                            <button className="flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-clay-700 transition">
                                <span className="hidden md:inline">{auth.user.shop_name || auth.user.name}</span>
                                <UserAvatar user={auth.user} className="w-8 h-8 rounded-lg" />
                            </button>
                        </Dropdown.Trigger>
                        <Dropdown.Content align="right" width="48">
                            <div className="px-4 py-3 border-b border-stone-50">
                                <p className="text-xs font-bold text-stone-900 truncate">{auth.user.name}</p>
                                <p className="text-[10px] text-stone-500 truncate">{auth.user.email}</p>
                            </div>
                            <WorkspaceLogoutLink className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2">
                                <LogOut size={14} /> Sign Out
                            </WorkspaceLogoutLink>
                        </Dropdown.Content>
                    </Dropdown>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                        {profileContent}
                    </div>
                </main>
            </div>
        </div>
    );
}
