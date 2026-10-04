import React from 'react';
import { CheckCircle2, Pencil, Trash2, MapPin } from 'lucide-react';
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
            className={`cursor-pointer rounded-xl border p-2.5 sm:p-3 transition-all duration-200 hover:shadow-xs flex flex-col justify-between h-full ${
                isSelected
                    ? 'border-clay-600 bg-clay-50/25 ring-1 ring-clay-600 shadow-2xs'
                    : 'border-stone-200 bg-white hover:border-clay-300'
            }`}
        >
            <div className="flex items-start gap-2">
                {/* Radio Indicator */}
                <div className="shrink-0 mt-0.5">
                    <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all ${
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
                <div className="flex-1 space-y-0.5 min-w-0">
                    {/* Header: Label, Type & Badges */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11.5px] font-bold text-stone-900 truncate">{address.label}</span>
                            <span className="shrink-0 rounded-full border border-stone-200 bg-stone-100 px-1.5 py-0.2 text-[8.5px] font-bold uppercase tracking-wider text-stone-600">
                                {typeLabel(address.address_type)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {address.latitude && address.longitude && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 text-[8px] font-bold text-emerald-700">
                                    <MapPin size={8} className="text-emerald-600" />
                                    Pinned
                                </span>
                            )}
                            {address.is_default && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[8.5px] font-bold text-emerald-800">
                                    <CheckCircle2 size={8.5} />
                                    Default
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Address Line */}
                    <p className="line-clamp-1 sm:line-clamp-2 text-[11px] text-stone-600 leading-snug">
                        {resolveAddressDisplay(address)}
                    </p>
                    <p className="text-[10px] font-medium text-stone-500 truncate">
                        {address.recipient_name} • {address.phone_number}
                    </p>
                </div>
            </div>

            {/* Compact Actions Footer */}
            <div className="mt-1.5 pt-1.5 border-t border-stone-100 flex items-center justify-between gap-1" onClick={(event) => event.stopPropagation()}>
                <div>
                    {!address.is_default && (
                        <button
                            type="button"
                            onClick={() => onSetDefault(address.id)}
                            className="h-5 px-1.5 rounded text-[10px] font-bold text-stone-500 hover:bg-stone-100 hover:text-clay-600 transition flex items-center"
                        >
                            Set Default
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => onEdit(address)}
                        className="inline-flex h-5 px-1.5 items-center gap-1 rounded text-[10px] font-bold text-stone-500 hover:bg-stone-100 hover:text-clay-600 transition"
                    >
                        <Pencil size={9.5} />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(address)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        aria-label={`Delete ${address.label} address`}
                        title="Delete address"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
}
