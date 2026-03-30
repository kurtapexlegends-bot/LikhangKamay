import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import StructuredAddressFields from '@/Components/Address/StructuredAddressFields';
import { Transition } from '@headlessui/react';
import { useForm, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export default function SellerUpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;

    const { data, setData, post, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
            shop_name: user.shop_name || '',
            phone_number: user.phone_number || '',
            street_address: user.street_address || '',
            barangay: user.barangay || '',
            city: user.city || '',
            region: user.region || '',
            zip_code: user.zip_code || '',
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
                <h2 className="text-base font-medium text-gray-900">
                    Profile Information
                </h2>

                <p className="mt-0.5 text-xs text-gray-600">
                    Update your account's profile information and shop details.
                </p>
            </header>

            <form onSubmit={submit} className="mt-4 space-y-4">
                
                {/* Avatar Input */}
                {/* Avatar Input - Polished UI */}
                <div className="flex flex-col items-center sm:flex-row gap-6 pb-4 border-b border-gray-100">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full ring-2 ring-gray-50 overflow-hidden shadow-sm flex items-center justify-center bg-clay-100 flex-none aspect-square">
                            {data.preview_url || user.avatar ? (
                                <img 
                                    src={data.preview_url || (user.avatar.startsWith('http') ? user.avatar : `/storage/${user.avatar}`)} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <span className="text-3xl font-bold text-clay-600 uppercase">
                                    {(user.shop_name || user.name).charAt(0)}
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
                    
                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Profile Photo</h3>
                            <p className="text-xs text-gray-500">This will be displayed on your shop and products.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <label 
                                htmlFor="avatar"
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-clay-200 transition cursor-pointer"
                            >
                                Change Photo
                            </label>
                            
                            {data.avatar && (
                                <button
                                    onClick={submit}
                                    disabled={processing}
                                    className="px-3 py-1.5 bg-clay-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-clay-700 focus:ring-2 focus:ring-clay-500 transition animate-fade-in"
                                >
                                    Save Photo
                                </button>
                            )}

                            <span className="text-[10px] text-gray-400">JPG, GIF or PNG. Max 10MB.</span>
                        </div>
                        <InputError className="mt-1" message={errors.avatar} />
                    </div>
                </div>

                {/* Email (Read Only) */}
                <div>
                    <InputLabel htmlFor="email" value="Email (Cannot be changed)" />
                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                        value={data.email}
                        disabled={true}
                    />
                </div>

                {/* Personal Name (Read Only) */}
                <div>
                    <InputLabel htmlFor="name" value="Owner Name (Cannot be changed)" />
                    <TextInput
                        id="name"
                        className="mt-1 block w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                        value={data.name}
                        disabled={true}
                    />
                </div>

                {/* Shop Name (Read Only) */}
                <div>
                    <InputLabel htmlFor="shop_name" value="Shop Name (Cannot be changed)" />
                    <TextInput
                        id="shop_name"
                        className="mt-1 block w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                        value={data.shop_name}
                        disabled={true}
                    />
                </div>

                {/* Primary Phone */}
                <div>
                    <InputLabel htmlFor="phone_number" value="Primary Phone Number (Manage additional numbers in Address Book)" />
                    <TextInput
                        id="phone_number"
                        className="mt-1 block w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                        value={data.phone_number}
                        disabled={true}
                    />
                    <InputError className="mt-2" message={errors.phone_number} />
                </div>

                {/* Primary Address */}
                <div className="space-y-4">
                    <StructuredAddressFields
                        data={data}
                        setData={setData}
                        errors={errors}
                        fieldNames={{ postal_code: 'zip_code' }}
                        helperText=""
                        readOnly
                        showPreview={false}
                    />
                </div>
                <div className="mt-1 text-xs text-gray-500 italic">
                    Default Address Book is used first for courier pickup. This saved profile address is the fallback.
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing} className="bg-clay-600 hover:bg-clay-700">Save Changes</PrimaryButton>

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
