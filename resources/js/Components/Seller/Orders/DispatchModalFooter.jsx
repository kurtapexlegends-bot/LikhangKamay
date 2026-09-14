import React from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-react';

export default function DispatchModalFooter({
    activeTab,
    selectedDriver,
    selectedDriverId,
    onClose,
    onConfirm,
    isSubmitting,
    canEditOrders,
    isPremium,
}) {
    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3">
            {/* Live Assignment Summary Strip */}
            <div className="min-w-0 flex items-center gap-2">
                {activeTab === 'in_house' && (
                    selectedDriver ? (
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-clay-100 text-clay-700 font-bold text-xs">
                                {selectedDriver.name.charAt(0)}
                            </div>
                            <div className="min-w-0 text-left">
                                <p className="truncate text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                    <span className="truncate">{selectedDriver.name}</span>
                                    <span className="text-[10px] font-normal text-stone-500 shrink-0">({selectedDriver.vehicle_type})</span>
                                </p>
                                <p className="text-[10px] text-stone-500 flex items-center gap-1 truncate">
                                    <span className={`h-1.5 w-1.5 rounded-full ${selectedDriver.badge_color === 'emerald' ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                                    <span>{selectedDriver.status_label}</span>
                                    {selectedDriver.vehicle_plate_number && <span>• {selectedDriver.vehicle_plate_number}</span>}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-stone-400">
                            <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                            <span>Select or drag a driver to dispatch</span>
                        </div>
                    )
                )}
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition disabled:opacity-50 cursor-pointer"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={
                        !canEditOrders ||
                        isSubmitting ||
                        (activeTab === 'in_house' && (!isPremium || !selectedDriverId))
                    }
                    className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                    {isSubmitting ? (
                        <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                        <CheckCircle2 size={14} />
                    )}
                    <span>
                        {isSubmitting
                            ? 'Dispatching...'
                            : activeTab === 'in_house'
                            ? 'Confirm Studio Dispatch'
                            : 'Book Lalamove Courier'}
                    </span>
                </button>
            </div>
        </div>
    );
}
