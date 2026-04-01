import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;
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
            <header>
                <h2 className="text-lg font-medium text-gray-900">
                    Profile Information
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    Update your account's profile information and email address.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                {/* Avatar Input */}
                {/* Avatar Input - Polished UI */}
                <div className="flex flex-col items-center sm:flex-row gap-8 pb-6 border-b border-gray-100">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full ring-4 ring-gray-50 overflow-hidden shadow-lg flex items-center justify-center bg-clay-100">
                            {data.preview_url || user.avatar ? (
                                <img 
                                    src={data.preview_url || (user.avatar.startsWith('http') ? user.avatar : `/storage/${user.avatar}`)} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <span className="text-4xl font-bold text-clay-600 uppercase">
                                    {user.name.charAt(0)}
                                </span>
                            )}
                        </div>
                        {/* Overlay camera icon on hover */}
                        <label 
                            htmlFor="avatar" 
                            className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-300"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                        </label>
                        <input 
                            id="avatar" 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
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
                    
                    <div className="flex-1 text-center sm:text-left space-y-3">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Profile Photo</h3>
                            <p className="text-sm text-gray-500">This will be displayed on your profile and shop interactions.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <label 
                                htmlFor="avatar"
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-clay-200 transition cursor-pointer"
                            >
                                Change Photo
                            </label>
                            
                            {data.avatar && (
                                <button
                                    onClick={submit}
                                    disabled={processing}
                                    className="px-4 py-2 bg-clay-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-clay-700 focus:ring-2 focus:ring-clay-500 transition animate-fade-in"
                                >
                                    Save Photo
                                </button>
                            )}
                            
                            <span className="text-xs text-gray-400">JPG, GIF or PNG. Max 10MB.</span>
                        </div>
                        <InputError className="mt-1" message={errors.avatar} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel htmlFor="first_name" value="First Name" />

                        <TextInput
                            id="first_name"
                            className="mt-1 block w-full"
                            value={data.first_name}
                            onChange={(e) => setData('first_name', e.target.value)}
                            required
                            isFocused
                            autoComplete="given-name"
                        />

                        <InputError className="mt-2" message={errors.first_name} />
                    </div>
                    <div>
                        <InputLabel htmlFor="last_name" value="Last Name" />

                        <TextInput
                            id="last_name"
                            className="mt-1 block w-full"
                            value={data.last_name}
                            onChange={(e) => setData('last_name', e.target.value)}
                            autoComplete="family-name"
                        />

                        <InputError className="mt-2" message={errors.last_name} />
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-gray-800">
                            Your email address is unverified.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600">
                                A new verification link has been sent to your
                                email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Save</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-600">
                            Saved.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
