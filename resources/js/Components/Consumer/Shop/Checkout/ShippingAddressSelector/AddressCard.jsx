import React from 'react';
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { typeLabel, resolveAddressDisplay } from '@/utils/addressHelpers';

export default function AddressCard({
    address,
    selectedAddressId,
    onSelect,
    onSetDefault,
    onEdit,
    onDelete,
}) {
    const isSelected = selectedAddressId === address.id;

    return (
        <div
            onClick={() => onSelect(address)}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm flex flex-col justify-between h-full ${
                isSelected
                    ? 'border-clay-600 bg-clay-50/20 ring-1 ring-clay-600 shadow-sm'
                    : 'border-stone-200 bg-white hover:border-clay-300'
            }`}
        >
            <div className="flex items-start gap-3">
                {/* Radio Indicator */}
                <div className="shrink-0 mt-1">
                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                            ? 'border-clay-600 bg-clay-600'
                            : 'border-stone-300 bg-white hover:border-clay-400'
                    }`}>
                        {isSelected && (
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
                            onClick={() => onSetDefault(address.id)}
                            className="h-11 px-3 sm:h-9 sm:px-2.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-stone-50 hover:text-clay-600 transition flex items-center"
                        >
                            Set Default
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onEdit(address)}
                        className="inline-flex h-11 px-3 sm:h-9 sm:px-2.5 items-center gap-1 rounded-lg text-xs font-bold text-gray-500 hover:bg-stone-50 hover:text-clay-600 transition"
                    >
                        <Pencil size={11} />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(address)}
                        className="inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-stone-50 hover:text-red-650 transition"
                        aria-label={`Delete ${address.label} address`}
                        title="Delete address"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
