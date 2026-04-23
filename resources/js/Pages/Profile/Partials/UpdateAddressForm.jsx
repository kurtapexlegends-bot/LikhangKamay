import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import StructuredAddressFields from '@/Components/Address/StructuredAddressFields';
import ConfirmationModal from '@/Components/ConfirmationModal';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Plus, Trash2, CheckCircle, MapPin, Pencil, AlertTriangle } from 'lucide-react';
import { formatStructuredAddress } from '@/lib/addressFormatting';

const ADDRESS_TYPES = [
    { value: 'home', label: 'Home' },
    { value: 'office', label: 'Office' },
    { value: 'other', label: 'Other' },
];

const humanizeAddressType = (value) => ADDRESS_TYPES.find((type) => type.value === value)?.label || 'Other';
const resolveAddressDisplay = (address) => address?.full_address || formatStructuredAddress({
    street_address: address?.street_address,
    barangay: address?.barangay,
    city: address?.city,
    region: address?.region,
    postal_code: address?.postal_code,
});

export default function UpdateAddressForm({ addresses = [], className = '' }) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [deleteAddressTarget, setDeleteAddressTarget] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        label: 'Home',
        address_type: 'home',
        recipient_name: '',
        phone_number: '',
        street_address: '',
        barangay: '',
        region: '',
        city: '',
        postal_code: '',
    });

    const resetFormState = () => {
        reset();
        setData({
            label: 'Home',
            address_type: 'home',
            recipient_name: '',
            phone_number: '',
            street_address: '',
            barangay: '',
            region: '',
            city: '',
            postal_code: '',
        });
        setIsAdding(false);
        setEditingAddressId(null);
    };

    const startAdding = () => {
        resetFormState();
        setIsAdding(true);
    };

    const startEditing = (address) => {
        setData({
            label: address.label || humanizeAddressType(address.address_type).toLowerCase(),
            address_type: address.address_type || 'home',
            recipient_name: address.recipient_name || '',
            phone_number: address.phone_number || '',
            street_address: address.street_address || resolveAddressDisplay(address) || '',
            barangay: address.barangay || '',
            region: address.region || '',
            city: address.city || '',
            postal_code: address.postal_code || '',
        });
        setEditingAddressId(address.id);
        setIsAdding(false);
    };

    const cancelForm = () => {
        resetFormState();
    };

    const submit = (e) => {
        e.preventDefault();
        const onSuccess = () => {
            resetFormState();
        };

        if (editingAddressId) {
            router.patch(route('user-addresses.update', editingAddressId), data, { onSuccess });
            return;
        }

        post(route('user-addresses.store'), { onSuccess });
    };

    const setDefault = (id) => {
        router.patch(route('user-addresses.set-default', id));
    };

    const openDeleteAddressModal = (address) => {
        setDeleteAddressTarget(address);
    };

    const closeDeleteAddressModal = () => {
        setDeleteAddressTarget(null);
    };

    const deleteAddress = () => {
        if (!deleteAddressTarget) {
            return;
        }

        router.delete(route('user-addresses.destroy', deleteAddressTarget.id), {
            onFinish: closeDeleteAddressModal,
        });
    };

    return (
        <section className={className}>
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-stone-900">Addresses</h3>
                    <p className="mt-1 text-sm text-stone-500">
                        Manage your shipping and billing addresses.
                    </p>
                </div>
                <button 
                    onClick={() => (isAdding || editingAddressId ? cancelForm() : startAdding())}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isAdding || editingAddressId 
                            ? 'text-stone-600 hover:text-stone-900 bg-stone-100' 
                            : 'bg-clay-600 text-white hover:bg-clay-700 shadow-sm'
                    }`}
                >
                    {isAdding || editingAddressId ? 'Cancel' : (
                        <>
                            <Plus size={16} />
                            Add New
                        </>
                    )}
                </button>
            </header>

            {!isAdding && !editingAddressId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.length === 0 ? (
                        <div className="col-span-2 py-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                            <MapPin size={32} className="mx-auto text-stone-300 mb-3" />
                            <p className="text-sm font-medium text-stone-400">No addresses found.</p>
                        </div>
                    ) : (
                        addresses.map((addr) => (
                            <div key={addr.id} className={`p-5 rounded-2xl border transition-all ${addr.is_default ? 'border-clay-200 bg-clay-50/30' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-stone-900">{addr.label}</span>
                                            <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded border border-stone-200 font-bold uppercase tracking-wider">
                                                {humanizeAddressType(addr.address_type)}
                                            </span>
                                            {addr.is_default && (
                                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-bold uppercase tracking-wider">
                                                    Primary
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1 mb-4 flex-1 text-sm">
                                        <p className="font-bold text-stone-800">{addr.recipient_name}</p>
                                        <p className="text-stone-500 font-medium">{addr.phone_number}</p>
                                        <p className="text-stone-600 font-medium flex gap-2">
                                            <MapPin size={16} className="mt-0.5 shrink-0 text-stone-400" />
                                            {resolveAddressDisplay(addr)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 pt-3 border-t border-stone-100 mt-auto">
                                        {!addr.is_default && (
                                            <button
                                                onClick={() => setDefault(addr.id)}
                                                className="text-xs font-bold text-clay-600 hover:text-clay-700 transition-colors"
                                            >
                                                Set Primary
                                            </button>
                                        )}
                                        <button
                                            onClick={() => startEditing(addr)}
                                            className="text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => openDeleteAddressModal(addr)}
                                            className="ml-auto text-stone-400 hover:text-red-600 transition-colors"
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

            {(isAdding || editingAddressId) && (
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <InputLabel value="Address Type" className="text-stone-600 font-bold mb-3" />
                            <div className="flex flex-wrap gap-2">
                                {ADDRESS_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => {
                                            setData('address_type', type.value);
                                            if (!data.label.trim() || ['Home', 'Office', 'Other'].includes(data.label)) {
                                                setData('label', type.label);
                                            }
                                        }}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                                            data.address_type === type.value
                                                ? 'border-clay-600 bg-clay-600 text-white'
                                                : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                                        }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                            <InputError className="mt-2" message={errors.address_type} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="label" value="Label" className="text-stone-700 font-bold" />
                                <TextInput
                                    id="label"
                                    className="mt-1 block w-full border-stone-200 bg-white"
                                    value={data.label}
                                    onChange={(e) => setData('label', e.target.value)}
                                    required
                                />
                                <InputError className="mt-2" message={errors.label} />
                            </div>
                            <div>
                                <InputLabel htmlFor="phone_number" value="Phone Number" className="text-stone-700 font-bold" />
                                <TextInput
                                    id="phone_number"
                                    className="mt-1 block w-full border-stone-200 bg-white"
                                    value={data.phone_number}
                                    onChange={(e) => setData('phone_number', e.target.value)}
                                    required
                                />
                                <InputError className="mt-2" message={errors.phone_number} />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="recipient_name" value="Recipient Name" className="text-stone-700 font-bold" />
                            <TextInput
                                id="recipient_name"
                                className="mt-1 block w-full border-stone-200 bg-white"
                                value={data.recipient_name}
                                onChange={(e) => setData('recipient_name', e.target.value)}
                                required
                            />
                            <InputError className="mt-2" message={errors.recipient_name} />
                        </div>

                        <StructuredAddressFields
                            key={`address-form-${editingAddressId ?? 'new'}`}
                            data={data}
                            setData={setData}
                            errors={errors}
                            required
                        />

                        <div className="flex items-center justify-end gap-3 pt-4">
                            <button 
                                type="button" 
                                onClick={cancelForm}
                                className="text-sm font-bold text-stone-500 hover:text-stone-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <PrimaryButton disabled={processing}>
                                {editingAddressId ? 'Update Address' : 'Add Address'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!deleteAddressTarget}
                onClose={closeDeleteAddressModal}
                onConfirm={deleteAddress}
                title="Delete Address"
                message={`Are you sure you want to delete this address? This action cannot be undone.`}
                confirmText="Delete"
                confirmColor="bg-red-600 hover:bg-red-700"
            />
        </section>
    );
}
