/* global route */
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { useRef } from 'react';

const sanitizeDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 6);

export default function UpdatePosVoidPinForm({
    hasPosVoidPin = false,
    posVoidPinUpdatedAt = null,
    className = '',
}) {
    const currentPasswordInput = useRef(null);
    const pinInput = useRef(null);

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
        pin: '',
        pin_confirmation: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        const localErrors = {};
        if (!data.current_password) {
            localErrors.current_password = 'Enter your current account password.';
        }
        if (!/^\d{6}$/.test(data.pin)) {
            localErrors.pin = 'Void PIN must be exactly 6 numeric digits.';
        }
        if (data.pin !== data.pin_confirmation) {
            localErrors.pin_confirmation = 'PIN confirmation does not match.';
        }

        if (Object.keys(localErrors).length > 0) {
            setError(localErrors);
            if (localErrors.current_password) {
                currentPasswordInput.current?.focus();
            } else {
                pinInput.current?.focus();
            }
            return;
        }

        clearErrors();
        put(route('profile.pos-void-pin.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (serverErrors) => {
                if (serverErrors.pin) {
                    reset('pin', 'pin_confirmation');
                    pinInput.current?.focus();
                }
                if (serverErrors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header className="mb-5 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h4 className="text-base font-bold text-stone-900 inline-flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-clay-600" />
                        <span>Walk-In POS Void PIN</span>
                    </h4>
                    <p className="mt-1 text-xs text-stone-500">
                        Personal 6-digit PIN required to authorize Walk-In POS receipt voids.
                    </p>
                </div>

                <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        hasPosVoidPin
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                >
                    {hasPosVoidPin
                        ? `PIN Active${posVoidPinUpdatedAt ? ` · Updated ${posVoidPinUpdatedAt}` : ''}`
                        : 'Not Configured'}
                </span>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="pos_void_current_password" value="Current Account Password" />
                    <TextInput
                        id="pos_void_current_password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        type="password"
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                    />
                    <InputError message={errors.current_password} className="mt-2" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <InputLabel
                            htmlFor="pos_void_pin"
                            value={hasPosVoidPin ? 'New 6-Digit PIN' : 'Set 6-Digit PIN'}
                        />
                        <TextInput
                            id="pos_void_pin"
                            ref={pinInput}
                            value={data.pin}
                            onChange={(e) => setData('pin', sanitizeDigits(e.target.value))}
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            className="mt-1 block w-full font-mono tracking-widest"
                            placeholder="••••••"
                            autoComplete="one-time-code"
                        />
                        <InputError message={errors.pin} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="pos_void_pin_confirmation" value="Confirm 6-Digit PIN" />
                        <TextInput
                            id="pos_void_pin_confirmation"
                            value={data.pin_confirmation}
                            onChange={(e) => setData('pin_confirmation', sanitizeDigits(e.target.value))}
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            className="mt-1 block w-full font-mono tracking-widest"
                            placeholder="••••••"
                            autoComplete="one-time-code"
                        />
                        <InputError message={errors.pin_confirmation} className="mt-2" />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>
                        {hasPosVoidPin ? 'Update Void PIN' : 'Save Void PIN'}
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Saved</span>
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
