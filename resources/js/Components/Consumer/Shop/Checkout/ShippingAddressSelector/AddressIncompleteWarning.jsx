import React from 'react';

export default function AddressIncompleteWarning({
    data,
    setData,
    errors,
}) {
    return (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-800">Complete delivery contact details</p>
            <p className="mt-1 text-xs text-amber-700">This saved address is missing recipient details required for courier booking.</p>
            <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">Recipient Name</label>
                    <input
                        type="text"
                        value={data.recipient_name || ''}
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
                        value={data.phone_number || ''}
                        onChange={(event) => setData('phone_number', event.target.value)}
                        className="w-full h-11 sm:h-10 rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-sm"
                        placeholder="09XXXXXXXXX"
                    />
                    {errors.phone_number && <p className="mt-1 text-sm text-red-500">{errors.phone_number}</p>}
                </div>
            </div>
        </div>
    );
}
