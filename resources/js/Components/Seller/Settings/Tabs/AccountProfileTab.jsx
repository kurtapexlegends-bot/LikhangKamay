import React from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { User, Mail, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function AccountProfileTab() {
    const { auth } = usePage().props;
    const user = auth?.user || {};

    const profileForm = useForm({
        name: user.name || '',
        email: user.email || '',
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handleProfileSubmit = (e) => {
        e.preventDefault();
        profileForm.patch(route('profile.update'), {
            preserveScroll: true,
        });
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        passwordForm.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
        });
    };

    return (
        <div className="space-y-6">
            {/* User Info Card */}
            <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                        <User size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900">Personal Information</h3>
                        <p className="text-xs text-stone-500">Update your account display name and email address.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={profileForm.data.name}
                            onChange={(e) => profileForm.setData('name', e.target.value)}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500"
                            required
                        />
                        {profileForm.errors.name && (
                            <p className="text-xs text-rose-600 mt-1">{profileForm.errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={profileForm.data.email}
                            onChange={(e) => profileForm.setData('email', e.target.value)}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500"
                            required
                        />
                        {profileForm.errors.email && (
                            <p className="text-xs text-rose-600 mt-1">{profileForm.errors.email}</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={profileForm.processing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 text-white text-xs font-bold hover:bg-clay-700 transition disabled:opacity-50 min-h-[40px]"
                    >
                        <CheckCircle2 size={15} />
                        Save Profile
                    </button>
                </div>
            </form>

            {/* Password Update Card */}
            <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900">Security & Password</h3>
                        <p className="text-xs text-stone-500">Ensure your account is using a strong password.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                            Current Password
                        </label>
                        <input
                            type="password"
                            value={passwordForm.data.current_password}
                            onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                            New Password
                        </label>
                        <input
                            type="password"
                            value={passwordForm.data.password}
                            onChange={(e) => passwordForm.setData('password', e.target.value)}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={passwordForm.data.password_confirmation}
                            onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500"
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={passwordForm.processing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition disabled:opacity-50 min-h-[40px]"
                    >
                        <ShieldCheck size={15} />
                        Update Password
                    </button>
                </div>
            </form>
        </div>
    );
}
