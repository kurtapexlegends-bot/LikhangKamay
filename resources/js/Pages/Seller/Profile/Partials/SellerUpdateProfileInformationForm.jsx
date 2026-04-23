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
            <header className="mb-6">
                <h3 className="text-lg font-bold text-stone-900">Shop Profile</h3>
                <p className="mt-1 text-sm text-stone-500">
                    Your shop identity is visible to customers and partners.
                </p>
            </header>

            <div className="space-y-8">
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
                                    {(user.shop_name || user.name).charAt(0).toUpperCase()}
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
                        <h4 className="text-sm font-bold text-stone-900">Shop Avatar</h4>
                        <p className="text-xs text-stone-500 mb-3">Professional photos represent your craftsmanship quality.</p>
                        
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <label htmlFor="avatar" className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-50 transition-colors cursor-pointer">
                                Change Image
                            </label>
                            {data.avatar && (
                                <button type="button" onClick={submit} disabled={processing} className="px-3 py-1.5 bg-clay-600 text-white text-xs font-bold rounded-lg hover:bg-clay-700 transition-colors">
                                    Save Image
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 pb-2 border-b border-stone-50">
                             <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Account Information</h4>
                        </div>

                        <div>
                            <InputLabel value="Email Address" className="text-stone-400 font-bold" />
                            <div className="mt-1 px-4 py-2 bg-stone-50 border border-stone-100 rounded-xl text-sm font-bold text-stone-500 cursor-not-allowed">
                                {data.email}
                            </div>
                        </div>

                        <div>
                            <InputLabel value="Legal Name" className="text-stone-400 font-bold" />
                            <div className="mt-1 px-4 py-2 bg-stone-50 border border-stone-100 rounded-xl text-sm font-bold text-stone-500 cursor-not-allowed">
                                {data.name}
                            </div>
                        </div>

                        <div>
                            <InputLabel value="Shop Name" className="text-stone-400 font-bold" />
                            <div className="mt-1 px-4 py-2 bg-stone-50 border border-stone-100 rounded-xl text-sm font-bold text-stone-500 cursor-not-allowed">
                                {data.shop_name}
                            </div>
                        </div>

                        <div>
                             <InputLabel value="Phone Number" className="text-stone-400 font-bold" />
                             <div className="mt-1 px-4 py-2 bg-stone-50 border border-stone-100 rounded-xl text-sm font-bold text-stone-500 cursor-not-allowed">
                                 {data.phone_number || 'Not set'}
                             </div>
                        </div>

                        <div className="md:col-span-2 space-y-4 pt-4">
                             <div className="pb-2 border-b border-stone-50">
                                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Default Logistics Address</h4>
                             </div>
                             <div className="opacity-70">
                                <StructuredAddressFields
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                    fieldNames={{ postal_code: 'zip_code' }}
                                    readOnly
                                    showPreview={false}
                                />
                             </div>
                             <div className="flex items-start gap-3 bg-stone-50 p-4 rounded-xl border border-stone-100">
                                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                                <p className="text-xs font-medium text-stone-500 leading-relaxed">
                                   This is your primary business address used for fulfillment. To manage multiple locations, use the <span className="font-bold text-stone-800 underline">Address Registry</span>.
                                </p>
                             </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-6 border-t border-stone-100">
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
            </div>
        </section>
    );
}
