import { useState } from 'react';
import { useForm, router } from '@inertiajs/react'; // Correct import for router
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Plus, Trash2, CheckCircle, MapPin } from 'lucide-react';

export default function UpdateAddressForm({ addresses = [], className = '' }) {
    const [isAdding, setIsAdding] = useState(false);

    const { data, setData, post, processing, errors, reset, wasSuccessful } = useForm({
        label: 'Home',
        recipient_name: '',
        phone_number: '',
        full_address: '',
        region: '',
        city: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('user-addresses.store'), {
            onSuccess: () => {
                reset();
                setIsAdding(false);
            },
        });
    };

    const setDefault = (id) => {
        router.patch(route('user-addresses.set-default', id));
    };

    const deleteAddress = (id) => {
        if (confirm('Are you sure you want to delete this address?')) {
            router.delete(route('user-addresses.destroy', id));
        }
    };

    return (
        <section className={className}>
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Address Book</h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Manage your shipping addresses for faster checkout.
                    </p>
                </div>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                    <Plus size={16} /> {isAdding ? 'Cancel' : 'Add New'}
                </button>
            </header>

            {/* Address List */}
            {!isAdding && (
                <div className="mt-6 space-y-4">
                    {addresses.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No saved addresses yet.</p>
                    ) : (
                        addresses.map((addr) => (
                            <div key={addr.id} className={`p-4 rounded-lg border ${addr.is_default ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-800">{addr.label}</span>
                                            {addr.is_default && (
                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <CheckCircle size={10} /> Default
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-900 font-medium">{addr.recipient_name} | {addr.phone_number}</p>
                                        <p className="text-sm text-gray-600 mt-1 flex gap-1">
                                            <MapPin size={14} className="mt-0.5 shrink-0" /> 
                                            {addr.full_address}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        {!addr.is_default && (
                                            <button 
                                                onClick={() => setDefault(addr.id)}
                                                className="text-xs text-indigo-600 hover:underline"
                                            >
                                                Set Default
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => deleteAddress(addr.id)}
                                            className="text-gray-400 hover:text-red-600 transition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add New Form */}
            {isAdding && (
                <form onSubmit={submit} className="mt-6 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="label" value="Label (e.g. Home)" />
                            <TextInput
                                id="label"
                                className="mt-1 block w-full"
                                value={data.label}
                                onChange={(e) => setData('label', e.target.value)}
                                required
                            />
                            <InputError className="mt-2" message={errors.label} />
                        </div>
                        <div>
                            <InputLabel htmlFor="phone_number" value="Phone Number" />
                            <TextInput
                                id="phone_number"
                                className="mt-1 block w-full"
                                value={data.phone_number}
                                onChange={(e) => setData('phone_number', e.target.value)}
                                required
                            />
                            <InputError className="mt-2" message={errors.phone_number} />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="recipient_name" value="Recipient Name" />
                        <TextInput
                            id="recipient_name"
                            className="mt-1 block w-full"
                            value={data.recipient_name}
                            onChange={(e) => setData('recipient_name', e.target.value)}
                            required
                        />
                        <InputError className="mt-2" message={errors.recipient_name} />
                    </div>

                    <div>
                        <InputLabel htmlFor="full_address" value="Full Address (Street, Brgy, City, Province, Zip)" />
                        <textarea
                            id="full_address"
                            className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                            rows="3"
                            value={data.full_address}
                            onChange={(e) => setData('full_address', e.target.value)}
                            required
                        ></textarea>
                        <InputError className="mt-2" message={errors.full_address} />
                    </div>

                    <div className="flex items-center gap-4">
                        <PrimaryButton disabled={processing}>Save Address</PrimaryButton>
                        <button 
                            type="button" 
                            onClick={() => setIsAdding(false)}
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}
