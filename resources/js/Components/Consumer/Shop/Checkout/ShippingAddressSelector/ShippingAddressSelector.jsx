import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { MapPin, AlertTriangle } from 'lucide-react';
import ConfirmationModal from '@/Components/ConfirmationModal';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { typeLabel, resolveAddressDisplay } from '@/utils/addressHelpers';

// Extracted Subcomponents
import AddressCard from './AddressCard';
import AddressFormDrawer from './AddressFormDrawer';
import AddressIncompleteWarning from './AddressIncompleteWarning';

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
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-clay-700">
                    <MapPin size={18} />
                    <h2 className="text-base font-bold">Shipping Address</h2>
                </div>
            </div>

            {/* Saved Addresses (Mobile: Grid-to-scroll, Tablet/Desktop: 2-column Grid) */}
            {!!auth.user.addresses?.length ? (
                <div className="flex md:grid overflow-x-auto md:overflow-visible flex-nowrap md:grid-cols-2 gap-4 pb-3 md:pb-0 snap-x scrollbar-hide">
                    {auth.user.addresses.map((address) => (
                        <div key={address.id} className="w-[290px] md:w-auto shrink-0 md:shrink snap-start h-full">
                            <AddressCard
                                address={address}
                                selectedAddressId={data.selected_address_id}
                                onSelect={chooseSavedAddress}
                                onSetDefault={setDefaultAddress}
                                onEdit={startEditingAddress}
                                onDelete={setDeleteAddressTarget}
                            />
                        </div>
                    ))}
                    <div className="w-[290px] md:w-auto shrink-0 md:shrink snap-start h-full">
                        <div 
                            onClick={() => { setIsAddingNew(true); chooseNewAddress(); }}
                            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm min-h-[160px] md:min-h-[140px] h-full ${
                                data.selected_address_id === 'new' 
                                    ? 'border-clay-600 bg-clay-50/20 text-clay-700 shadow-sm' 
                                    : 'border-gray-200 text-gray-400 hover:border-clay-400 hover:text-clay-600'
                            }`}
                        >
                            <span className="text-2xl font-light leading-none">+</span>
                            <span className="text-sm font-medium">Use New Address</span>
                        </div>
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
            <AddressFormDrawer
                isOpen={showAddressForm}
                onClose={cancelAddressForm}
                title={drawerTitle}
                data={data}
                setData={setData}
                errors={errors}
                onSave={saveAddress}
            />

            {/* Incomplete Details Warning */}
            {!isNewAddress && needsDeliveryContactDetails && (
                <AddressIncompleteWarning
                    data={data}
                    setData={setData}
                    errors={errors}
                />
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
