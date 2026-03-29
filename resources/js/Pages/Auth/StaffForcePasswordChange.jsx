import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import { Eye, EyeOff, KeyRound, Lock, Loader2, ShieldCheck } from 'lucide-react';

export default function StaffForcePasswordChange() {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { data, setData, put, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        put(route('staff.password.update'), {
            onFinish: () => reset('current_password', 'password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] px-4 py-10 font-sans text-gray-800 sm:px-6">
            <Head title="Change Default Password" />

            <div className="mx-auto max-w-xl">
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-8 flex items-start justify-between gap-4">
                        <div>
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-clay-100 text-clay-700">
                                <ShieldCheck size={24} />
                            </div>
                            <h1 className="font-serif text-3xl font-bold text-stone-900">
                                Change Your Default Password
                            </h1>
                            <p className="mt-2 text-sm text-stone-500">
                                Your staff account needs a new password before it can continue to the staff workspace.
                            </p>
                        </div>

                        <WorkspaceLogoutLink
                            variant="button"
                            className="rounded-full border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
                        >
                            Log Out
                        </WorkspaceLogoutLink>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <InputLabel htmlFor="current_password" value="Current Password" className="mb-1.5 text-stone-700 font-bold" />
                            <div className="relative">
                                <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <TextInput
                                    id="current_password"
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={data.current_password}
                                    onChange={(e) => setData('current_password', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-stone-200 bg-stone-50/60 py-3 pl-11 pr-11 focus:border-clay-500 focus:ring-clay-500"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword((value) => !value)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-600"
                                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                                >
                                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <InputError className="mt-2" message={errors.current_password} />
                        </div>

                        <div>
                            <InputLabel htmlFor="password" value="New Password" className="mb-1.5 text-stone-700 font-bold" />
                            <div className="relative">
                                <KeyRound size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <TextInput
                                    id="password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-stone-200 bg-stone-50/60 py-3 pl-11 pr-11 focus:border-clay-500 focus:ring-clay-500"
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword((value) => !value)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-600"
                                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                                >
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <InputError className="mt-2" message={errors.password} />
                        </div>

                        <div>
                            <InputLabel htmlFor="password_confirmation" value="Confirm New Password" className="mb-1.5 text-stone-700 font-bold" />
                            <div className="relative">
                                <KeyRound size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <TextInput
                                    id="password_confirmation"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-stone-200 bg-stone-50/60 py-3 pl-11 pr-11 focus:border-clay-500 focus:ring-clay-500"
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((value) => !value)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-600"
                                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                            This password change is required once. Seller modules will stay locked in Phase 1 even after this step.
                        </div>

                        <PrimaryButton className="w-full justify-center rounded-xl bg-clay-600 py-3 text-sm font-bold hover:bg-clay-700" disabled={processing}>
                            {processing ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    Updating Password...
                                </span>
                            ) : (
                                'Save New Password'
                            )}
                        </PrimaryButton>
                    </form>
                </div>
            </div>
        </div>
    );
}
