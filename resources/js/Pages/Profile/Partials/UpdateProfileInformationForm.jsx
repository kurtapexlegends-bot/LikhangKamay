import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const { auth, flash = {} } = usePage().props;
    const user = auth.user;
    const fallbackNameParts = (user.name || '').trim().split(/\s+/).filter(Boolean);
    const fallbackFirstName = fallbackNameParts[0] || '';
    const fallbackLastName = fallbackNameParts.slice(1).join(' ');

    const { data, setData, post, errors, processing, recentlySuccessful } =
        useForm({
            first_name: user.first_name || fallbackFirstName,
            last_name: user.last_name || fallbackLastName,
            email: user.email,
            avatar: null,
            preview_url: null,
        });

    const submit = (e) => {
        e.preventDefault();

        post(route('profile.update'), {
            forceFormData: true,
        });
    };

    const revokePreview = (url) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    };

    useEffect(() => {
        return () => revokePreview(data.preview_url);
    }, [data.preview_url]);

    return (
        <section className={className}>
            <header className="mb-6">
                <h3 className="text-lg font-bold text-stone-900">Profile Information</h3>
                <p className="mt-1 text-sm text-stone-500">
                    Update your account's profile information and email address.
                </p>
            </header>

            <form onSubmit={submit} className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-stone-100">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-stone-100 overflow-hidden border border-stone-200 flex items-center justify-center">
                            {data.preview_url || user.avatar ? (
                                <img 
                                    src={data.preview_url || (user.avatar.startsWith('http') ? user.avatar : `/storage/${user.avatar}`)} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-3xl font-bold text-stone-400">
                                    {(user.name || 'A').charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <label 
                            htmlFor="avatar" 
                            className="absolute inset-0 bg-stone-900/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                        </label>
                        <input id="avatar" type="file" className="hidden" accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setData('avatar', file);
                                    revokePreview(data.preview_url);
                                    setData('preview_url', URL.createObjectURL(file));
                                }
                            }}
                        />
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                        <h4 className="text-sm font-bold text-stone-900">Profile Photo</h4>
                        <p className="text-xs text-stone-500 mb-3">This will be displayed on your profile and interactions.</p>
                        
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <label htmlFor="avatar" className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-50 transition-colors cursor-pointer">
                                Change Photo
                            </label>
                            {data.avatar && (
                                <button type="button" onClick={submit} disabled={processing} className="px-3 py-1.5 bg-clay-600 text-white text-xs font-bold rounded-lg hover:bg-clay-700 transition-colors">
                                    Save Photo
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel htmlFor="first_name" value="First Name" className="text-stone-700 font-bold" />
                        <TextInput
                            id="first_name"
                            className="mt-1 block w-full border-stone-200 bg-stone-50/30"
                            value={data.first_name}
                            onChange={(e) => setData('first_name', e.target.value)}
                            required
                        />
                        <InputError className="mt-2" message={errors.first_name} />
                    </div>

                    <div>
                        <InputLabel htmlFor="last_name" value="Last Name" className="text-stone-700 font-bold" />
                        <TextInput
                            id="last_name"
                            className="mt-1 block w-full border-stone-200 bg-stone-50/30"
                            value={data.last_name}
                            onChange={(e) => setData('last_name', e.target.value)}
                        />
                        <InputError className="mt-2" message={errors.last_name} />
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-stone-700 font-bold" />
                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full border-stone-200 bg-stone-50/30"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-sm text-amber-800 font-medium">
                            Your email address is unverified.
                        </p>
                        {flash.error && (
                            <p className="mt-2 text-sm font-medium text-red-600">
                                {flash.error}
                            </p>
                        )}
                        <Link
                            href={route('verification.send')}
                            method="post"
                            as="button"
                            className="mt-1 text-sm text-amber-600 hover:text-amber-700 font-bold underline underline-offset-4"
                        >
                            Send a new verification code.
                        </Link>
                        {status === 'verification-code-sent' && (
                            <div className="mt-2 font-bold text-sm text-emerald-600">
                                A new verification code has been sent to your email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                    <PrimaryButton disabled={processing}>
                        {processing ? 'Saving...' : 'Save Changes'}
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
