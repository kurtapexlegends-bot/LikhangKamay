import React, { useState } from 'react';
import { Route, ArrowUp, ArrowDown, Sparkles, MapPin, CheckCircle, Navigation } from 'lucide-react';

// Common Cavite municipalities sorted by north-to-south highway dispatch corridor
const CAVITE_CORRIDOR_ORDER = [
    'bacoor',
    'kawit',
    'noveleta',
    'rosario',
    'cavite city',
    'imus',
    'general trias',
    'gentri',
    'dasmarinas',
    'dasmariñas',
    'carmona',
    'silang',
    'amadeo',
    'tagaytay',
    'alfonso',
    'mendez',
    'indang',
    'maragondon',
    'naic',
    'ternate'
];

function extractCity(address = '') {
    const lower = address.toLowerCase();
    for (const city of CAVITE_CORRIDOR_ORDER) {
        if (lower.includes(city)) {
            // Capitalize first letter
            return city.charAt(0).toUpperCase() + city.slice(1);
        }
    }
    return 'Cavite';
}

export default function RouteSequencerBar({
    deliveries = [],
    onReorder,
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!deliveries || deliveries.length <= 1) return null;

    const handleMove = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= deliveries.length) return;

        const updated = [...deliveries];
        const temp = updated[index];
        updated[index] = updated[newIndex];
        updated[newIndex] = temp;
        onReorder(updated);
    };

    const handleAutoOptimize = () => {
        // Sort deliveries matching corridor order, fallback to order_number
        const sorted = [...deliveries].sort((a, b) => {
            const addrA = (a.destination?.address || '').toLowerCase();
            const addrB = (b.destination?.address || '').toLowerCase();

            const idxA = CAVITE_CORRIDOR_ORDER.findIndex(c => addrA.includes(c));
            const idxB = CAVITE_CORRIDOR_ORDER.findIndex(c => addrB.includes(c));

            if (idxA !== -1 && idxB !== -1) {
                return idxA - idxB;
            }
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;

            return Number(a.order_number || a.id) - Number(b.order_number || b.id);
        });

        onReorder(sorted);
    };

    return (
        <div className="rounded-2xl border border-stone-200/90 bg-white shadow-2xs overflow-hidden transition-all">
            {/* Header / Summary Bar */}
            <div className="p-3.5 bg-stone-50/90 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                        <Route size={15} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-stone-900">
                                Delivery Route Sequencer
                            </span>
                            <span className="px-2 py-0.2 rounded-full bg-clay-100 text-clay-800 text-[10px] font-mono font-bold">
                                {deliveries.length} Stops
                            </span>
                        </div>
                        <p className="text-[10.5px] text-stone-500 font-medium">
                            Set optimal drop-off sequence to save fuel and travel time
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                    <button
                        type="button"
                        onClick={handleAutoOptimize}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-[11px] font-bold shadow-2xs transition active:scale-95 cursor-pointer"
                        title="Optimize order along the Cavite delivery corridor"
                    >
                        <Sparkles size={12} />
                        <span>Optimize Stops</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-[11px] font-bold transition"
                    >
                        <span>{isExpanded ? 'Hide Queue' : 'Reorder'}</span>
                    </button>
                </div>
            </div>

            {/* Stop Chips Strip (Visible when collapsed) */}
            {!isExpanded && (
                <div className="px-3.5 py-2.5 border-t border-stone-100 flex items-center gap-2 overflow-x-auto custom-scrollbar select-none">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0">
                        Sequence:
                    </span>
                    {deliveries.map((delivery, index) => {
                        const isFirst = index === 0;
                        const city = extractCity(delivery.destination?.address);
                        return (
                            <div
                                key={delivery.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border shrink-0 transition ${
                                    isFirst
                                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/30'
                                        : 'bg-stone-50 text-stone-700 border-stone-200'
                                }`}
                            >
                                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-mono font-black ${
                                    isFirst ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
                                }`}>
                                    {index + 1}
                                </span>
                                <span className="font-mono">#{delivery.order_number}</span>
                                <span className="text-stone-400 font-normal">•</span>
                                <span className="truncate max-w-[100px]">{city}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detailed Reorder Drawer (Visible when expanded) */}
            {isExpanded && (
                <div className="p-3.5 border-t border-stone-100 bg-[#FCFBF9] space-y-2">
                    <p className="text-[11px] text-stone-500 font-medium">
                        Use the arrow controls to prioritize stops according to traffic or customer availability:
                    </p>
                    <div className="space-y-1.5">
                        {deliveries.map((delivery, index) => {
                            const isFirst = index === 0;
                            const isLast = index === deliveries.length - 1;
                            const city = extractCity(delivery.destination?.address);

                            return (
                                <div
                                    key={delivery.id}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                                        isFirst
                                            ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                                            : 'bg-white border-stone-200/80 shadow-2xs'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-mono font-black ${
                                            isFirst ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 border border-stone-200'
                                        }`}>
                                            {index + 1}
                                        </span>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-black text-stone-900 font-mono">
                                                    #{delivery.order_number}
                                                </span>
                                                {isFirst && (
                                                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9.5px] font-bold">
                                                        Next Stop
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-stone-500 font-semibold truncate">
                                                    ({city})
                                                </span>
                                            </div>
                                            <p className="text-[10.5px] text-stone-500 truncate max-w-sm sm:max-w-md">
                                                {delivery.customer?.name} • {delivery.destination?.address}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <button
                                            type="button"
                                            onClick={() => handleMove(index, -1)}
                                            disabled={isFirst}
                                            className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                            title="Move up in route sequence"
                                        >
                                            <ArrowUp size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMove(index, 1)}
                                            disabled={isLast}
                                            className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                            title="Move down in route sequence"
                                        >
                                            <ArrowDown size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
