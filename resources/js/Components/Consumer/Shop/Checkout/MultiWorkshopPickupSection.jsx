import React from 'react';
import { Store, Check, MapPin } from 'lucide-react';
import StorePickupScheduler from '@/Components/Consumer/Shop/Checkout/StorePickupScheduler';

export default function MultiWorkshopPickupSection({
    sellerGroups = [],
    totalSellers,
    pickupConfigs = {},
    pickupSchedules = {},
    activeWorkshopSellerId,
    setActiveWorkshopSellerId,
    setPickupSchedules,
    errors = {},
    clearErrors,
}) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-stone-200/60 pb-2.5">
                <div>
                    <div className="flex items-center gap-2">
                        <Store size={16} className="text-clay-600 shrink-0" />
                        <h2 className="text-sm font-bold text-stone-900">Workshop Pick Up Schedules</h2>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                        Schedule your visit date & time window for each of the {totalSellers} artisan studios:
                    </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 shrink-0 self-start sm:self-auto">
                    {Object.values(pickupSchedules).filter(s => s?.date && s?.time_slot).length} of {totalSellers} Scheduled
                </span>
            </div>

            {/* Workshop Selection Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {sellerGroups.map((group, idx) => {
                    const config = pickupConfigs?.[String(group.sellerId)];
                    const isSelected = String(activeWorkshopSellerId) === String(group.sellerId);
                    const sched = pickupSchedules[String(group.sellerId)];
                    const isConfigured = Boolean(sched?.date && sched?.time_slot);
                    const isPickupDisabled = config && config.pickup_enabled === false;

                    return (
                        <button
                            key={group.sellerId}
                            type="button"
                            onClick={() => setActiveWorkshopSellerId(group.sellerId)}
                            className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                                isSelected
                                    ? 'border-clay-500 bg-clay-50/50 ring-2 ring-clay-500/20 shadow-xs'
                                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-1 w-full">
                                <span className="text-xs font-bold text-stone-900 truncate">
                                    {idx + 1}. {group.shopName}
                                </span>
                                {isPickupDisabled ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">
                                        Unavailable
                                    </span>
                                ) : isConfigured ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                                        <Check size={9} /> Ready
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                                        Needed
                                    </span>
                                )}
                            </div>
                            {group.location && (
                                <span className="text-[10px] text-stone-400 mt-0.5 truncate flex items-center gap-1">
                                    <MapPin size={10} className="shrink-0" />
                                    {group.location}
                                </span>
                            )}
                            <span className="text-[10px] text-stone-600 font-medium mt-0.5 truncate">
                                {sched?.formattedDate || sched?.date ? `${sched.formattedDate || sched.date} (${sched.time_slot})` : 'Select date & slot'}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Active Workshop Pick Up Scheduler */}
            <div className="pt-2">
                <StorePickupScheduler
                    pickupConfig={pickupConfigs?.[String(activeWorkshopSellerId)] || null}
                    selectedDate={pickupSchedules[String(activeWorkshopSellerId)]?.date || ''}
                    selectedSlot={pickupSchedules[String(activeWorkshopSellerId)]?.time_slot || ''}
                    onSelectDate={(date) => {
                        setPickupSchedules(prev => {
                            const days = pickupConfigs?.[String(activeWorkshopSellerId)]?.days || [];
                            const dayObj = days.find(d => d.date === date);
                            return {
                                ...prev,
                                [String(activeWorkshopSellerId)]: {
                                    ...(prev[String(activeWorkshopSellerId)] || {}),
                                    date,
                                    formattedDate: dayObj?.formatted || date,
                                }
                            };
                        });
                        if (errors[`pickup_schedules.${activeWorkshopSellerId}`]) clearErrors(`pickup_schedules.${activeWorkshopSellerId}`);
                    }}
                    onSelectSlot={(slot) => {
                        setPickupSchedules(prev => ({
                            ...prev,
                            [String(activeWorkshopSellerId)]: {
                                ...(prev[String(activeWorkshopSellerId)] || {}),
                                time_slot: slot,
                            }
                        }));
                        if (errors[`pickup_schedules.${activeWorkshopSellerId}`]) clearErrors(`pickup_schedules.${activeWorkshopSellerId}`);
                    }}
                    error={errors[`pickup_schedules.${activeWorkshopSellerId}`]}
                />
            </div>
        </div>
    );
}
