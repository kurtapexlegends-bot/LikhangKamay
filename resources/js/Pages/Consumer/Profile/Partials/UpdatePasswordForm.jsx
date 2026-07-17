import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function UpdatePasswordForm({ className = '' }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();
    const confirmPasswordInput = useRef();

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
        setError,
        clearErrors,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();

        const localErrors = {};
        let firstInvalidRef = null;

        if (!data.current_password || data.current_password === '') {
            localErrors.current_password = 'Current password is required';
            if (!firstInvalidRef) firstInvalidRef = currentPasswordInput;
        }

        if (!data.password || data.password === '') {
            localErrors.password = 'New password is required';
            if (!firstInvalidRef) firstInvalidRef = passwordInput;
        } else if (data.password.length < 8) {
            localErrors.password = 'Password must be at least 8 characters';
            if (!firstInvalidRef) firstInvalidRef = passwordInput;
        }

        if (data.password !== data.password_confirmation) {
            localErrors.password_confirmation = 'Passwords do not match';
            if (!firstInvalidRef) firstInvalidRef = confirmPasswordInput;
        }

        if (Object.keys(localErrors).length > 0) {
            setError(localErrors);
            firstInvalidRef?.current?.focus();
            return;
        }

        clearErrors();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header className="mb-6">
                <h3 className="text-lg font-bold text-stone-900">Update Password</h3>
                <p className="mt-1 text-sm text-stone-500">
                    Ensure your account is using a long, random password to stay secure.
                </p>
            </header>

            <form onSubmit={updatePassword} className="space-y-6">
                <div className="max-w-xl space-y-4">
                    <div>
                        <InputLabel htmlFor="current_password" value="Current Password" />
                        <TextInput
                            id="current_password"
                            ref={currentPasswordInput}
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            type="password"
                            className="mt-1 block w-full border-stone-200 bg-stone-50/30"
                            autoComplete="current-password"
                            hasError={!!errors.current_password}
                        />
                        <InputError message={errors.current_password} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="New Password" />
                        <TextInput
                            id="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            type="password"
                            className="mt-1 block w-full border-stone-200 bg-stone-50/30"
                            autoComplete="new-password"
                            hasError={!!errors.password}
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    {/* Password Strength Indicator */}
                    {data.password && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1.5 px-1 space-y-1.5"
                        >
                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                                <span className="text-stone-400">Strength</span>
                                <span className={
                                    data.password.length < 12 ? 'text-rose-500' : 
                                    data.password.length < 15 ? 'text-amber-500' : 'text-emerald-500'
                                }>
                                    {data.password.length < 12 ? 'Weak' : data.password.length < 15 ? 'Fair' : 'Strong'}
                                </span>
                            </div>
                            <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden flex gap-0.5">
                                <div className={`h-full transition-all duration-500 ${data.password.length >= 6 ? (data.password.length < 12 ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                                <div className={`h-full transition-all duration-500 ${data.password.length >= 12 ? (data.password.length < 15 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                                <div className={`h-full transition-all duration-500 ${data.password.length >= 15 ? 'bg-emerald-500' : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                                <div className={`h-full transition-all duration-500 ${/[!@#$%^&*(),.?":{}|<>]/.test(data.password) && /\d/.test(data.password) && data.password.length >= 12 ? 'bg-emerald-500' : 'bg-stone-200'}`} style={{ width: '25%' }}></div>
                            </div>
                        </motion.div>
                    )}

                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirm Password" />
                        <TextInput
                            id="password_confirmation"
                            ref={confirmPasswordInput}
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            type="password"
                            className="mt-1 block w-full border-stone-200 bg-stone-50/30"
                            autoComplete="new-password"
                            hasError={!!errors.password_confirmation}
                        />
                        <InputError message={errors.password_confirmation} className="mt-2" />
                    </div>

                    {/* Real-time Password Matching status indicator */}
                    {data.password && data.password_confirmation && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl border transition-all duration-300 ${
                                data.password === data.password_confirmation
                                    ? 'text-emerald-700 bg-emerald-50/80 border-emerald-100/60 shadow-sm shadow-emerald-500/5'
                                    : 'text-amber-700 bg-amber-50/80 border-amber-100/60 shadow-sm shadow-amber-500/5'
                            }`}
                        >
                            {data.password === data.password_confirmation ? (
                                <>
                                    <CheckCircle2 size={15} className="shrink-0 text-emerald-600 animate-pulse" />
                                    <span>Passwords match successfully.</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={15} className="shrink-0 text-amber-600 animate-pulse" />
                                    <span>Passwords do not match yet.</span>
                                </>
                            )}
                        </motion.div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>
                        {processing ? 'Saving...' : 'Save Password'}
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-stone-500 font-bold">Saved.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
