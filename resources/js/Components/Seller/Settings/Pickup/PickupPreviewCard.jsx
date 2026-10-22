import React from 'react';
import { Store, MapPin, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PickupPreviewCard({
    isEnabled,
    selectedLocation,
    maxAdvanceDays,
    weeklyOverview = [],
}) {
    const openDaysCount = weeklyOverview.filter((d) => d.isOpen).length;

    return (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-2xs space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${
                        isEnabled
                            ? 'bg-clay-50 text-clay-700 border-clay-100'
                            : 'bg-stone-100 text-stone-400 border-stone-200'
                    }`}>
                        <Store size={16} />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Customer Preview</h4>
                        <p className="text-[10px] text-stone-400 font-medium">How pickup appears at checkout</p>
                    </div>
                </div>

                {isEnabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 size={11} /> Pickup Available
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-stone-500 bg-stone-100 border border-stone-200">
                        <AlertCircle size={11} /> Currently Paused
                    </span>
                )}
            </div>

            {/* Location & Address Tile */}
            <div className="p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-1">
                <div className="flex items-center gap-1.5 text-stone-500">
                    <MapPin size={13} className="text-clay-600 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Pickup Location</span>
                </div>
                <h5 className="text-xs font-bold text-stone-900 truncate">
                    {selectedLocation?.name || 'Primary Studio Address'}
                </h5>
                <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {selectedLocation?.address || 'Your verified Cavite artisan workshop location'}
                </p>
            </div>

            {/* Advance Window Badge */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                <div className="flex items-center gap-1.5 text-stone-600">
                    <Calendar size={13} className="text-clay-600" />
                    <span className="text-xs font-semibold">Advance Window</span>
                </div>
                <span className="text-xs font-bold text-stone-900">{maxAdvanceDays} Days Ahead</span>
            </div>

            {/* Weekly Schedule Breakdown */}
            <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                        <Clock size={11} className="text-clay-600" />
                        Weekly Hours
                    </span>
                    <span className="text-[10px] font-bold text-stone-500">
                        {openDaysCount} of 7 days open
                    </span>
                </div>

                <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/60 bg-white overflow-hidden shadow-2xs">
                    {weeklyOverview.map((day) => (
                        <div key={day.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-stone-850 w-7 shrink-0 text-[11px]">{day.label}</span>
                                {day.isOpen ? (
                                    <span className="text-[11px] text-stone-600 truncate font-medium">
                                        {day.hoursSummary || 'Open'}
                                    </span>
                                ) : (
                                    <span className="text-[11px] text-stone-400 italic">Closed</span>
                                )}
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                day.isOpen
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                    : 'bg-stone-100 text-stone-400'
                            }`}>
                                {day.isOpen ? `${day.slotsCount} win` : 'Closed'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
