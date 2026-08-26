import React from 'react';
import { Link } from '@inertiajs/react';
import { 
    Store, MapPin, Trash2, Plus, Minus, 
    Layers, AlertCircle, Sparkles, Truck 
} from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CartSupplierGroup({
    sellerId,
    group,
    selectedItems = {},
    onToggleItem,
    onToggleSupplier,
    onUpdateQuantity,
    onRemoveItem,
    vehicleResolver,
}) {
    const isAllSelected = group.items.length > 0 && group.items.every(item => !!selectedItems[item.cartKey]);
    const isSomeSelected = group.items.some(item => !!selectedItems[item.cartKey]) && !isAllSelected;

    // Supplier subtotal & weight for selected items
    const selectedGroupItems = group.items.filter(item => !!selectedItems[item.cartKey]);
    const groupWeightKg = selectedGroupItems.reduce((sum, item) => sum + ((Number(item.weight) || 1.0) * (Number(item.qty) || 1) * 1.10), 0);
    const vehicleInfo = vehicleResolver ? vehicleResolver(groupWeightKg) : null;

    return (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
            {/* Supplier Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-[#FDFBF9] border-b border-stone-150">
                <div className="flex items-center gap-2.5 sm:gap-3">
                    <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                        onChange={() => onToggleSupplier(sellerId)}
                        className="h-4 w-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <Store size={15} className="text-clay-600" />
                        <span className="font-bold text-stone-900 text-xs">{group.sellerName}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {group.city && (
                        <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                            <MapPin size={11} className="text-stone-400" />
                            {group.city}
                        </span>
                    )}
                </div>
            </div>

            {/* Item Rows */}
            <div className="divide-y divide-stone-100">
                {group.items.map((item) => {
                    const moq = Math.max(1, Number(item.moq) || 1);
                    const qty = Math.max(1, Number(item.qty) || 1);
                    const isBelowMoq = qty < moq;
                    const isSelected = !!selectedItems[item.cartKey];

                    // Unit price check
                    const basePrice = Number(item.price) || 0;
                    const wholesalePrice = item.wholesale_price ? Number(item.wholesale_price) : null;
                    const wholesaleMinQty = item.wholesale_min_qty ? Number(item.wholesale_min_qty) : null;
                    const isWholesaleApplied = wholesalePrice && wholesaleMinQty && qty >= wholesaleMinQty;
                    const effectiveUnitPrice = isWholesaleApplied ? wholesalePrice : basePrice;
                    const lineTotal = effectiveUnitPrice * qty;

                    return (
                        <div key={item.cartKey} className={`p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-colors ${isSelected ? 'bg-white' : 'bg-stone-50/40 opacity-75'}`}>
                            {/* Checkbox & Details */}
                            <div className="flex items-start gap-2.5 sm:gap-3.5 flex-1 min-w-0 w-full sm:w-auto">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onToggleItem(item.cartKey)}
                                    className="mt-1 h-4 w-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                />

                                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                                    {item.img ? (
                                        <img src={item.img} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <Layers size={18} className="text-stone-400" />
                                    )}
                                </div>

                                <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h3 className="font-bold text-stone-900 text-xs truncate max-w-sm">{item.name}</h3>
                                        <span className="px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-600 font-bold text-[9px] sm:text-[10px]">
                                            {item.supply_unit || 'pcs'}
                                        </span>
                                    </div>

                                    {/* Pricing details */}
                                    <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                        <span className="font-bold text-stone-900">{formatCurrency(effectiveUnitPrice)}</span>
                                        {isWholesaleApplied && (
                                            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200">
                                                <Sparkles size={9} /> Bulk Rate
                                            </span>
                                        )}
                                        {!isWholesaleApplied && wholesalePrice && wholesaleMinQty && (
                                            <span className="text-[9px] sm:text-[10px] text-stone-400">
                                                ({wholesaleMinQty}+ for {formatCurrency(wholesalePrice)})
                                            </span>
                                        )}
                                    </div>

                                    {/* MOQ warning */}
                                    {isBelowMoq && (
                                        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 w-fit">
                                            <AlertCircle size={10} />
                                            <span>Minimum Order: {moq} {item.supply_unit || 'units'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stepper, Line Total, Actions */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-stone-100">
                                {/* Stepper */}
                                <div className="flex items-center border border-stone-200 rounded-xl bg-white shadow-2xs overflow-hidden h-[32px] sm:h-[38px]">
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQuantity(item.cartKey, Math.max(1, qty - 1))}
                                        className="px-2.5 py-1 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition min-w-[32px] h-full flex items-center justify-center cursor-pointer active:scale-95"
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus size={11} />
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        value={qty}
                                        onChange={(e) => onUpdateQuantity(item.cartKey, Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-9 sm:w-12 text-center text-xs font-bold text-stone-800 border-0 focus:ring-0 p-0"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQuantity(item.cartKey, qty + 1)}
                                        className="px-2.5 py-1 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition min-w-[32px] h-full flex items-center justify-center cursor-pointer active:scale-95"
                                        aria-label="Increase quantity"
                                    >
                                        <Plus size={11} />
                                    </button>
                                </div>

                                {/* Line Total */}
                                <div className="text-right">
                                    <p className="font-bold text-stone-900 text-xs">{formatCurrency(lineTotal)}</p>
                                    <p className="text-[9px] sm:text-[10px] text-stone-400 font-medium">
                                        {roundNumber((Number(item.weight) || 1.0) * qty * 1.10, 1)} kg
                                    </p>
                                </div>

                                {/* Remove */}
                                <button
                                    type="button"
                                    onClick={() => onRemoveItem(item.cartKey)}
                                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer active:scale-95"
                                    title="Remove material"
                                    aria-label="Remove material"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Supplier Group Footer / Courier Vehicle Preview */}
            {selectedGroupItems.length > 0 && vehicleInfo && (
                <div className="p-2.5 sm:p-3 bg-stone-50/70 border-t border-stone-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5">
                        <Truck size={13} className="text-clay-600 shrink-0" />
                        <span className="font-medium text-[10px] sm:text-[11px]">
                            Transport: <strong className="text-stone-900 font-bold">{vehicleInfo.label}</strong> ({roundNumber(groupWeightKg, 1)} kg)
                        </span>
                    </div>
                    <span className="font-bold text-stone-900 text-xs">
                        Subtotal: {formatCurrency(selectedGroupItems.reduce((sum, it) => {
                            const unitP = (it.wholesale_price && it.wholesale_min_qty && it.qty >= it.wholesale_min_qty) ? Number(it.wholesale_price) : Number(it.price);
                            return sum + (unitP * Number(it.qty));
                        }, 0))}
                    </span>
                </div>
            )}
        </div>
    );
}

function roundNumber(num, dec) {
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}
