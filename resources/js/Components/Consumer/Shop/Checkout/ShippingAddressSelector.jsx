import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { MapPin, CheckCircle2, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import StructuredAddressFields from '@/Components/Address/StructuredAddressFields';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

const TYPES = [
    { value: 'home', label: 'Home' },
    { value: 'office', label: 'Office' },
    { value: 'other', label: 'Other' },
];

const typeLabel = (value) => TYPES.find((type) => type.value === value)?.label || 'Other';

const resolveAddressDisplay = (address) => address?.full_address || formatStructuredAddress({
    street_address: address?.street_address,
    barangay: address?.barangay,
    city: address?.city,
    region: address?.region,
    postal_code: address?.postal_code,
});

export default function ShippingAddressSelector({
    auth,
    data,
    setData,
    errors,
    needsDeliveryContactDetails,
}) {
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [deleteAddressTarget, setDeleteAddressTarget] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);

    const isNewAddress = data.selected_address_id === 'new' || !auth.user.addresses?.length;
    const showAddressForm = isAddingNew || editingAddressId !== null;

    useEffect(() => {
        if (!auth.user.addresses?.length) {
            if (data.selected_address_id !== 'new') {
                setData('selected_address_id', 'new');
            }
            return;
        }

        if (data.selected_address_id === 'new') return;

        const stillExists = auth.user.addresses.some((address) => String(address.id) === String(data.selected_address_id));
        if (!stillExists) {
            const fallback = auth.user.addresses.find((address) => address.is_default) || auth.user.addresses[0];
            if (fallback) {
                chooseSavedAddress(fallback);
            }
        }
    }, [auth.user.addresses, data.selected_address_id]);

    const chooseSavedAddress = (address) => {
        setEditingAddressId(null);
        setData((current) => ({
            ...current,
            selected_address_id: address.id,
            address_label: address.label || typeLabel(address.address_type || 'home'),
            shipping_address: resolveAddressDisplay(address),
            shipping_address_type: address.address_type || 'home',
            shipping_street_address: address.street_address || '',
            shipping_barangay: address.barangay || '',
            shipping_city: address.city || '',
            shipping_region: address.region || '',
            shipping_postal_code: address.postal_code || '',
            recipient_name: address.recipient_name || auth.user.name || '',
            phone_number: address.phone_number || auth.user.phone_number || '',
            save_address: false,
        }));
    };

    const chooseNewAddress = () => {
        setEditingAddressId(null);
        setData((current) => ({
            ...current,
            selected_address_id: 'new',
            address_label: typeLabel(current.shipping_address_type || 'home'),
            shipping_address: '',
            shipping_address_type: current.shipping_address_type || 'home',
            shipping_street_address: auth.user.street_address || '',
            shipping_barangay: auth.user.barangay || '',
            shipping_city: auth.user.city || '',
            shipping_region: auth.user.region || '',
            shipping_postal_code: auth.user.zip_code || '',
            recipient_name: auth.user.name || '',
            phone_number: auth.user.phone_number || '',
            save_address: false,
        }));
    };

    const startEditingAddress = (address) => {
        setEditingAddressId(address.id);
        setData((current) => ({
            ...current,
            selected_address_id: address.id,
            address_label: address.label || typeLabel(address.address_type || 'home'),
            shipping_address: resolveAddressDisplay(address),
            shipping_address_type: address.address_type || 'home',
            shipping_street_address: address.street_address || '',
            shipping_barangay: address.barangay || '',
            shipping_city: address.city || '',
            shipping_region: address.region || '',
            shipping_postal_code: address.postal_code || '',
            recipient_name: address.recipient_name || auth.user.name || '',
            phone_number: address.phone_number || auth.user.phone_number || '',
            save_address: false,
        }));
    };

    const cancelAddressForm = () => {
        setEditingAddressId(null);
        setIsAddingNew(false);
        if (auth.user.addresses?.length && data.selected_address_id !== 'new') {
            const fallback = auth.user.addresses.find((address) => String(address.id) === String(data.selected_address_id));
            if (fallback) {
                chooseSavedAddress(fallback);
                return;
            }
        }
        chooseNewAddress();
    };

    const saveAddress = () => {
        const payload = {
            label: data.address_label || typeLabel(data.shipping_address_type || 'home'),
            address_type: data.shipping_address_type,
            recipient_name: data.recipient_name,
            phone_number: data.phone_number,
            street_address: data.shipping_street_address,
            barangay: data.shipping_barangay,
            city: data.shipping_city,
            region: data.shipping_region,
            postal_code: data.shipping_postal_code,
        };

        const onSuccess = () => {
            setEditingAddressId(null);
            setIsAddingNew(false);
        };

        if (editingAddressId) {
            router.patch(route('user-addresses.update', editingAddressId), payload, {
                preserveScroll: true,
                onSuccess,
            });
            return;
        }

        router.post(route('user-addresses.store'), payload, {
            preserveScroll: true,
            onSuccess,
        });
    };

    const setDefaultAddress = (addressId) => {
        router.patch(route('user-addresses.set-default', addressId), {}, {
            preserveScroll: true,
        });
    };

    const deleteAddress = () => {
        if (!deleteAddressTarget) return;

        router.delete(route('user-addresses.destroy', deleteAddressTarget.id), {
            preserveScroll: true,
            onFinish: () => {
                if (String(data.selected_address_id) === String(deleteAddressTarget.id)) {
                    setData('selected_address_id', 'new');
                    setEditingAddressId(null);
                    setIsAddingNew(false);
                }
                setDeleteAddressTarget(null);
            },
        });
    };

    const drawerTitle = editingAddressId ? 'Edit Shipping Address' : 'Add New Address';

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-3 text-clay-700">
                <MapPin size={18} />
                <h2 className="text-base font-bold">Shipping Address</h2>
            </div>

            {/* Saved Addresses Swiper/Grid */}
            {!!auth.user.addresses?.length ? (
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {auth.user.addresses.map((address) => (
                        <div
                            key={address.id}
                            onClick={() => chooseSavedAddress(address)}
                            className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm flex flex-col justify-between h-full ${
                                data.selected_address_id === address.id
                                    ? 'border-clay-600 bg-clay-50/20 ring-1 ring-clay-600 shadow-sm'
                                    : 'border-stone-200 bg-white hover:border-clay-300'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Radio Indicator */}
                                <div className="shrink-0 mt-1">
                                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                                        data.selected_address_id === address.id
                                            ? 'border-clay-600 bg-clay-600'
                                            : 'border-stone-300 bg-white hover:border-clay-400'
                                    }`}>
                                        {data.selected_address_id === address.id && (
                                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                        )}
                                    </div>
                                </div>

                                {/* Address Details Content */}
                                <div className="flex-1 space-y-2.5 min-w-0">
                                    {/* Header: Label & Type */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm font-bold text-gray-800 truncate">{address.label}</span>
                                            <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700">
                                                {typeLabel(address.address_type)}
                                            </span>
                                        </div>
                                        {address.is_default && (
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                <CheckCircle2 size={10} />
                                                Default
                                            </span>
                                        )}
                                    </div>

                                    {/* Address Details */}
                                    <p className="line-clamp-2 text-xs text-gray-650 leading-relaxed">{resolveAddressDisplay(address)}</p>
                                    <p className="text-[10px] font-semibold text-gray-500 tracking-wide">
                                        {address.recipient_name} • {address.phone_number}
                                    </p>
                                </div>
                            </div>

                            {/* Separated Actions Footer */}
                            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2" onClick={(event) => event.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                    {!address.is_default && (
                                        <button
                                            type="button"
                                            onClick={() => setDefaultAddress(address.id)}
                                            className="h-9 px-2.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-stone-50 hover:text-clay-600 transition"
                                        >
                                            Set Default
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => startEditingAddress(address)}
                                        className="inline-flex h-9 px-2.5 items-center gap-1 rounded-lg text-xs font-bold text-gray-500 hover:bg-stone-50 hover:text-clay-600 transition"
                                    >
                                        <Pencil size={11} />
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteAddressTarget(address)}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-stone-50 hover:text-red-650 transition"
                                        aria-label={`Delete ${address.label} address`}
                                        title="Delete address"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div 
                        onClick={() => { setIsAddingNew(true); chooseNewAddress(); }}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm min-h-[140px] h-full ${
                            data.selected_address_id === 'new' 
                                ? 'border-clay-600 bg-clay-50/20 text-clay-700 shadow-sm' 
                                : 'border-gray-200 text-gray-400 hover:border-clay-400 hover:text-clay-600'
                        }`}
                    >
                        <span className="text-2xl font-light leading-none">+</span>
                        <span className="text-sm font-medium">Use New Address</span>
                    </div>
                </div>
            ) : (
                <WorkspaceEmptyState
                    icon={MapPin}
                    title="No Saved Addresses"
                    description="Estimate shipping options and place orders by adding a delivery address."
                    actionLabel="Add Shipping Address"
                    onAction={() => {
                        setIsAddingNew(true);
                        chooseNewAddress();
                    }}
                    compact={true}
                />
            )}

            {/* Address Form Drawer (SlideOverDrawer) */}
            <SlideOverDrawer
                show={showAddressForm}
                onClose={cancelAddressForm}
                title={drawerTitle}
                widthClass="max-w-xl"
                position="right"
                footer={
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={saveAddress}
                            className="flex-1 rounded-xl bg-clay-600 h-11 sm:h-10 text-sm font-bold text-white transition hover:bg-clay-700 active:scale-95 shadow-sm"
                        >
                            Save Address
                        </button>
                        <button
                            type="button"
                            onClick={cancelAddressForm}
                            className="flex-1 rounded-xl border border-stone-200 h-11 sm:h-10 text-sm font-medium text-gray-500 transition hover:bg-stone-50 hover:text-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <p className="mb-2 text-sm font-bold text-gray-800">Address Type</p>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                            {TYPES.map((type) => (
                                <button 
                                    key={type.value} 
                                    type="button" 
                                    onClick={() => setData((current) => ({ ...current, shipping_address_type: type.value }))} 
                                    className={`rounded-xl border px-3 h-11 sm:h-10 text-sm font-bold transition ${
                                        data.shipping_address_type === type.value 
                                            ? 'border-clay-600 bg-clay-50 text-clay-700' 
                                            : 'border-gray-200 text-gray-500 hover:border-clay-300'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                        {errors.shipping_address_type && <p className="mt-1 text-sm text-red-500">{errors.shipping_address_type}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-bold text-gray-700">Recipient Name</label>
                            <input
                                type="text"
                                value={data.recipient_name}
                                onChange={(event) => setData('recipient_name', event.target.value)}
                                className="w-full h-11 sm:h-10 rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-sm"
                                placeholder="Full recipient name"
                            />
                            {errors.recipient_name && <p className="mt-1 text-sm text-red-500">{errors.recipient_name}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-bold text-gray-700">Phone Number</label>
                            <input
                                type="text"
                                value={data.phone_number}
                                onChange={(event) => setData('phone_number', event.target.value)}
                                className="w-full h-11 sm:h-10 rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-sm"
                                placeholder="09XXXXXXXXX"
                            />
                            {errors.phone_number && <p className="mt-1 text-sm text-red-500">{errors.phone_number}</p>}
                        </div>
                    </div>

                    <StructuredAddressFields
                        key={`checkout-address-fields-${data.selected_address_id}`}
                        data={data}
                        setData={setData}
                        errors={errors}
                        prefix="shipping_"
                        required
                        previewLabel="Delivery Address"
                    />
                </div>
            </SlideOverDrawer>

            {/* Incomplete Details Warning */}
            {!isNewAddress && needsDeliveryContactDetails && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-bold text-amber-800">Complete delivery contact details</p>
                    <p className="mt-1 text-xs text-amber-700">This saved address is missing recipient details required for courier booking.</p>
                    <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-bold text-gray-700">Recipient Name</label>
                            <input
                                type="text"
                                value={data.recipient_name}
                                onChange={(event) => setData('recipient_name', event.target.value)}
                                className="w-full h-11 sm:h-10 rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-sm"
                                placeholder="Full recipient name"
                            />
                            {errors.recipient_name && <p className="mt-1 text-sm text-red-500">{errors.recipient_name}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-bold text-gray-700">Phone Number</label>
                            <input
                                type="text"
                                value={data.phone_number}
                                onChange={(event) => setData('phone_number', event.target.value)}
                                className="w-full h-11 sm:h-10 rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-sm"
                                placeholder="09XXXXXXXXX"
                            />
                            {errors.phone_number && <p className="mt-1 text-sm text-red-500">{errors.phone_number}</p>}
                        </div>
                    </div>
                </div>
            )}

            {errors.shipping_address && <p className="mt-1 text-sm text-red-500">{errors.shipping_address}</p>}
            {errors.selected_address_id && <p className="mt-1 text-sm text-red-500">{errors.selected_address_id}</p>}

            {/* Confirmation modal for delete address */}
            <ConfirmationModal
                isOpen={!!deleteAddressTarget}
                onClose={() => setDeleteAddressTarget(null)}
                onConfirm={deleteAddress}
                title="Delete address?"
                message={deleteAddressTarget ? `Remove ${deleteAddressTarget.label} from your address book?` : 'Delete this address?'}
                icon={AlertTriangle}
                iconBg="bg-red-50 text-red-600"
                confirmText="Delete"
                confirmColor="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
}
