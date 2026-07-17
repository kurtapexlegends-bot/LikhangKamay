import React from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import StructuredAddressFields from '@/Components/Address/StructuredAddressFields';
import TextInput from '@/Components/TextInput';
import { TYPES } from '@/utils/addressHelpers';

export default function AddressFormDrawer({
    isOpen,
    onClose,
    title,
    data,
    setData,
    errors,
    onSave,
    recipientNameRef = null,
    phoneNumberRef = null,
    streetRef = null,
    cityRef = null,
    barangayRef = null,
    postalCodeRef = null,
    regionRef = null,
}) {
    return (
        <SlideOverDrawer
            show={isOpen}
            onClose={onClose}
            title={title}
            widthClass="max-w-xl"
            position="bottom"
            footer={
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onSave}
                        className="flex-1 rounded-xl bg-clay-600 h-11 sm:h-10 text-sm font-bold text-white transition hover:bg-clay-700 active:scale-95 shadow-sm"
                    >
                        Save Address
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
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
                        <TextInput
                            ref={recipientNameRef}
                            type="text"
                            value={data.recipient_name || ''}
                            onChange={(event) => setData('recipient_name', event.target.value)}
                            className="w-full h-11 sm:h-10 rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-sm"
                            placeholder="Full recipient name"
                            hasError={!!errors.recipient_name}
                        />
                        {errors.recipient_name && <p className="mt-1 text-sm text-red-500">{errors.recipient_name}</p>}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">Phone Number</label>
                        <TextInput
                            ref={phoneNumberRef}
                            type="text"
                            value={data.phone_number || ''}
                            onChange={(event) => setData('phone_number', event.target.value)}
                            className="w-full h-11 sm:h-10 rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-sm"
                            placeholder="09XXXXXXXXX"
                            hasError={!!errors.phone_number}
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
                    streetRef={streetRef}
                    cityRef={cityRef}
                    barangayRef={barangayRef}
                    postalCodeRef={postalCodeRef}
                    regionRef={regionRef}
                />
            </div>
        </SlideOverDrawer>
    );
}
