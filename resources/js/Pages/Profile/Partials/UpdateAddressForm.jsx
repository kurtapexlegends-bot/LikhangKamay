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
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Address Book</h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Manage your shipping addresses for faster checkout.
                    </p>
                </div>
                <button 
                    onClick={() => (isAdding || editingAddressId ? cancelForm() : startAdding())}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                    {isAdding || editingAddressId ? 'Cancel' : (
                        <>
                            <Plus size={14} />
                            Add New
                        </>
                    )}
                </button>
            </header>

            {/* Address List */}
            {!isAdding && !editingAddressId && (
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
                                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-bold uppercase tracking-wide">
                                                {humanizeAddressType(addr.address_type)}
                                            </span>
                                            {addr.is_default && (
                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <CheckCircle size={10} /> Default
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-900 font-medium">{addr.recipient_name} | {addr.phone_number}</p>
                                        <p className="text-sm text-gray-600 mt-1 flex gap-1">
                                            <MapPin size={14} className="mt-0.5 shrink-0" /> 
                                            {resolveAddressDisplay(addr)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 self-start sm:self-auto">
                                        {!addr.is_default && (
                                            <button
                                                onClick={() => setDefault(addr.id)}
                                                className="rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 transition hover:bg-white hover:text-indigo-600"
                                            >
                                                Set Default
                                            </button>
                                        )}
                                        <button
                                            onClick={() => startEditing(addr)}
                                            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-gray-500 transition hover:bg-white hover:text-indigo-600"
                                        >
                                            <Pencil size={13} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => openDeleteAddressModal(addr)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-red-600"
                                            aria-label={`Delete ${addr.label} address`}
                                            title="Delete address"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add New Form */}
            {(isAdding || editingAddressId) && (
                <form onSubmit={submit} className="mt-6 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                        <InputLabel value="Address Type" />
                        <div className="mt-2 grid grid-cols-3 gap-2">
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
                                    className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                                        data.address_type === type.value
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                        <InputError className="mt-2" message={errors.address_type} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="label" value="Label" />
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

                    <StructuredAddressFields
                        key={`address-form-${editingAddressId ?? 'new'}`}
                        data={data}
                        setData={setData}
                        errors={errors}
                        required
                        helperText="Save a complete address."
                        previewLabel="Saved Address"
                    />

                    <div className="flex items-center gap-4">
                        <PrimaryButton disabled={processing}>
                            {editingAddressId ? 'Save Changes' : 'Save Address'}
                        </PrimaryButton>
                        <button 
                            type="button" 
                            onClick={cancelForm}
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <ConfirmationModal
                isOpen={!!deleteAddressTarget}
                onClose={closeDeleteAddressModal}
                onConfirm={deleteAddress}
                title="Delete address?"
                message={deleteAddressTarget
                    ? `Remove ${deleteAddressTarget.label} from your address book?`
                    : 'Are you sure you want to delete this address?'}
                icon={AlertTriangle}
                iconBg="bg-red-50 text-red-600"
                confirmText="Delete"
                confirmColor="bg-red-600 hover:bg-red-700"
            />
        </section>
    );
}
