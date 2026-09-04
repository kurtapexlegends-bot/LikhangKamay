import { useRef } from 'react';
import { Head, useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import PasswordStrengthIndicator from '@/Components/PasswordStrengthIndicator';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import { KeyRound, Lock, Loader2, LogOut, ShieldCheck } from 'lucide-react';

export default function StaffForcePasswordChange() {
    const { data, setData, put, processing, errors, reset, setError, clearErrors } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const currentPasswordRef = useRef(null);
    const newPasswordRef = useRef(null);
    const confirmPasswordRef = useRef(null);

    const submit = (e) => {
        e.preventDefault();

        const localErrors = {};
        let firstInvalidRef = null;

        if (!data.current_password || data.current_password === '') {
            localErrors.current_password = 'Current password is required';
            if (!firstInvalidRef) firstInvalidRef = currentPasswordRef;
        }

        if (!data.password || data.password === '') {
            localErrors.password = 'New password is required';
            if (!firstInvalidRef) firstInvalidRef = newPasswordRef;
        } else if (data.password.length < 12) {
            localErrors.password = 'The password field must be at least 12 characters.';
            if (!firstInvalidRef) firstInvalidRef = newPasswordRef;
        }

        if (data.password !== data.password_confirmation) {
            localErrors.password_confirmation = 'Passwords do not match';
            if (!firstInvalidRef) firstInvalidRef = confirmPasswordRef;
        }

        if (Object.keys(localErrors).length > 0) {
            setError(localErrors);
            firstInvalidRef?.current?.focus();
            return;
        }

        clearErrors();
        put(route('staff.password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.current_password) {
                    reset('current_password');
                    currentPasswordRef.current?.focus();
                } else if (errs.password) {
                    newPasswordRef.current?.focus();
                }
            },
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9] px-4 py-6 font-sans text-gray-800 sm:px-6">
            <Head title="Change Default Password" />

            <div className="w-full max-w-lg">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 leading-tight">
                                    Change Default Password
                                </h1>
                                <p className="mt-0.5 text-xs text-stone-500 truncate sm:whitespace-normal">
                                    Set a new password to access your staff workspace.
                                </p>
                            </div>
                        </div>

                        <WorkspaceLogoutLink
                            variant="button"
                            direct
                            className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 shadow-2xs transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20"
                        >
                            <LogOut size={13} className="text-stone-400" />
                            <span>Log Out</span>
                        </WorkspaceLogoutLink>
                    </div>

                    <form onSubmit={submit} noValidate className="space-y-3.5">
                        <div>
                            <InputLabel htmlFor="current_password" value="Current Password" className="mb-1 text-xs text-stone-700 font-bold" />
                            <TextInput
                                ref={currentPasswordRef}
                                id="current_password"
                                name="current_password"
                                type="password"
                                value={data.current_password}
                                onChange={(e) => {
                                    setData('current_password', e.target.value);
                                    if (errors.current_password) clearErrors('current_password');
                                }}
                                className="mt-0.5 block w-full rounded-xl border-stone-200 bg-stone-50/60 py-2.5 focus:border-clay-500 focus:ring-clay-500"
                                autoComplete="current-password"
                                hasError={!!errors.current_password}
                                icon={Lock}
                            />
                            <InputError className="mt-1" message={errors.current_password} />
                        </div>

                        <div>
                            <InputLabel htmlFor="password" value="New Password" className="mb-1 text-xs text-stone-700 font-bold" />
                            <TextInput
                                ref={newPasswordRef}
                                id="password"
                                name="password"
                                type="password"
                                value={data.password}
                                onChange={(e) => {
                                    setData('password', e.target.value);
                                    if (errors.password) clearErrors('password');
                                }}
                                className="mt-0.5 block w-full rounded-xl border-stone-200 bg-stone-50/60 py-2.5 focus:border-clay-500 focus:ring-clay-500"
                                autoComplete="new-password"
                                hasError={!!errors.password}
                                icon={KeyRound}
                            />
                            <InputError className="mt-1" message={errors.password} />
                            {data.password && (
                                <PasswordStrengthIndicator password={data.password} className="mt-2" />
                            )}
                        </div>

                        <div>
                            <InputLabel htmlFor="password_confirmation" value="Confirm New Password" className="mb-1 text-xs text-stone-700 font-bold" />
                            <TextInput
                                ref={confirmPasswordRef}
                                id="password_confirmation"
                                name="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => {
                                    setData('password_confirmation', e.target.value);
                                    if (errors.password_confirmation) clearErrors('password_confirmation');
                                }}
                                className="mt-0.5 block w-full rounded-xl border-stone-200 bg-stone-50/60 py-2.5 focus:border-clay-500 focus:ring-clay-500"
                                autoComplete="new-password"
                                hasError={!!errors.password_confirmation}
                                icon={KeyRound}
                            />
                            <InputError className="mt-1" message={errors.password_confirmation} />
                        </div>

                        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2 text-[11px] font-medium text-amber-800 leading-snug">
                            This password change is required once. Seller modules will stay locked in Phase 1 even after this step.
                        </div>

                        <PrimaryButton className="w-full justify-center rounded-xl bg-clay-600 py-2.5 text-xs font-bold hover:bg-clay-700" disabled={processing}>
                            {processing ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={15} className="animate-spin" />
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
