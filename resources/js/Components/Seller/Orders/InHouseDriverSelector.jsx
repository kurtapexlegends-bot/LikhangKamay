/* global route */
import React from 'react';
import {
    UserCheck,
    MapPin,
    PackageOpen,
    Phone,
    CheckCircle2,
    LoaderCircle,
    X,
    GripVertical,
    AlertTriangle,
    ShieldAlert,
    User,
    Scale,
    Car,
    Bike,
    Receipt,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

export default function InHouseDriverSelector({
    orderNumber,
    recipientName,
    contactPhone,
    deliveryAddress,
    resolvedWeightKg,
    isHeavyOrder,
    recommendedVehicle,
    hasShippingFee,
    shippingFeeAmount,
    items = [],
    isItemsExpanded,
    setIsItemsExpanded,
    dispatchNotes,
    setDispatchNotes,
    drivers = [],
    sortedDrivers = [],
    isLoadingDrivers = false,
    selectedDriverId,
    setSelectedDriverId,
    selectedDriver,
    isDraggingOver,
    isDraggingAny,
    isMobile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragStart,
    handleDragEnd,
    driverListRef,
    formatDriverCompensation,
    getDriverVehicleSuitability,
    isPremium = true,
    setActiveTab,
}) {
    if (!isPremium) {
        return (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-6 text-center">
                <ShieldAlert size={36} className="mx-auto text-stone-600 mb-2" />
                <h3 className="text-base font-bold text-stone-900 mb-1">
                    Studio Fleet Dispatch
                </h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto mb-4 leading-relaxed">
                    In-house driver dispatch with delivery tracking and proof-of-delivery photos is reserved for Premium and Elite shops.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => setActiveTab("lalamove")}
                        className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition"
                    >
                        Use Lalamove Courier Instead
                    </button>
                    <a
                        href={route("seller.subscription")}
                        className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
                    >
                        View Upgrade Options
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT COLUMN: Order Parcel & Drop Target */}
            <div className="lg:col-span-5 space-y-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                        <div className="flex items-center gap-2">
                            <PackageOpen size={15} className="text-clay-600" />
                            <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                                Parcel Destination
                            </span>
                        </div>
                        <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[10px] font-bold text-stone-600">
                            #{orderNumber}
                        </span>
                    </div>

                    {/* Customer & Address */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-stone-900 truncate">
                                {recipientName}
                            </p>
                            <p className="text-[11px] text-stone-500 font-medium flex items-center gap-1 shrink-0">
                                <Phone size={11} className="text-stone-400" />
                                <span>{contactPhone}</span>
                            </p>
                        </div>

                        <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-100 flex items-start gap-2">
                            <MapPin size={14} className="text-clay-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-medium text-stone-800 leading-relaxed">
                                {deliveryAddress}
                            </p>
                        </div>
                    </div>

                    {/* LOGISTICS SPECS: 3-Stat Compact Grid */}
                    <div className="rounded-xl border border-stone-200/80 bg-stone-50/80 p-2.5">
                        <div className="grid grid-cols-3 divide-x divide-stone-200/80 text-center">
                            <div className="px-1">
                                <span className="text-[10px] font-semibold text-stone-500 flex items-center justify-center gap-1">
                                    <Scale size={11} className="text-clay-600" />
                                    Weight
                                </span>
                                <p className="font-mono text-xs font-bold text-stone-900 mt-0.5">
                                    {resolvedWeightKg.toFixed(1)} kg
                                </p>
                            </div>
                            <div className="px-1">
                                <span className="text-[10px] font-semibold text-stone-500 flex items-center justify-center gap-1">
                                    {isHeavyOrder ? (
                                        <Car size={11} className="text-clay-600" />
                                    ) : (
                                        <Bike size={11} className="text-clay-600" />
                                    )}
                                    Vehicle
                                </span>
                                <p className="text-xs font-bold text-stone-900 mt-0.5 truncate" title={recommendedVehicle}>
                                    {recommendedVehicle}
                                </p>
                            </div>
                            <div className="px-1">
                                <span className="text-[10px] font-semibold text-stone-500 flex items-center justify-center gap-1">
                                    <Receipt size={11} className="text-clay-600" />
                                    Shipping Fee
                                </span>
                                <p className="font-mono text-xs font-bold text-emerald-700 mt-0.5">
                                    {hasShippingFee ? `₱${shippingFeeAmount.toFixed(0)}` : "Free"}
                                </p>
                            </div>
                        </div>

                        {isHeavyOrder && (
                            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-[10px] text-amber-900 border border-amber-200/60 leading-snug">
                                <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-600" />
                                <span>Exceeds standard 20 kg motorcycle capacity. Assign a 4-wheel vehicle (Sedan, MPV, or Van).</span>
                            </div>
                        )}
                    </div>

                    {/* Collapsible Items Preview */}
                    {items.length > 0 && (
                        <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                    Items ({items.length})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsItemsExpanded(!isItemsExpanded)}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-clay-700 hover:text-clay-800 transition"
                                >
                                    <span>{isItemsExpanded ? "Hide items" : "Show items"}</span>
                                    {isItemsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                            </div>
                            {isItemsExpanded && (
                                <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1 pt-1.5 border-t border-stone-200/60">
                                    {items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between rounded-lg bg-white p-2 text-xs border border-stone-100 shadow-2xs"
                                        >
                                            <span className="truncate font-medium text-stone-700 max-w-[200px]">
                                                {item.name || item.product_name}
                                                {item.weight && (
                                                    <span className="text-[10px] text-stone-400 ml-1">
                                                        ({Number(item.weight).toFixed(1)} kg)
                                                    </span>
                                                )}
                                            </span>
                                            <span className="font-bold text-stone-900">
                                                ×{item.qty || item.quantity || 1}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Drag & Drop Target Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative rounded-2xl border-2 border-dashed p-3.5 text-center transition-all ${
                        isDraggingOver
                            ? "border-clay-500 bg-clay-50/80 scale-[1.01] shadow-xs"
                            : isDraggingAny && !selectedDriver
                            ? "border-clay-400 bg-clay-50/40 ring-2 ring-clay-400/20"
                            : selectedDriver
                            ? isDraggingOver
                                ? "border-clay-500 bg-clay-100/60 ring-2 ring-clay-500"
                                : "border-emerald-300 bg-emerald-50/40"
                            : "border-stone-200 bg-stone-50/40 hover:border-stone-300"
                    }`}
                >
                    {selectedDriver ? (
                        <div className="flex items-center justify-between text-left">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm shadow-xs">
                                    <UserCheck size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                            Assigned Studio Driver
                                        </p>
                                        {isDraggingOver && (
                                            <span className="text-[9px] font-bold text-clay-700 bg-clay-100 px-1.5 rounded animate-pulse">
                                                Drop to swap
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-bold text-stone-900 truncate">
                                        {selectedDriver.name}
                                    </p>
                                    <p className="text-[11px] text-stone-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <span>{selectedDriver.vehicle_type}</span>
                                        {selectedDriver.vehicle_plate_number && <span>• {selectedDriver.vehicle_plate_number}</span>}
                                        {formatDriverCompensation(selectedDriver) && (
                                            <span className="rounded bg-emerald-100/70 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                                                {formatDriverCompensation(selectedDriver)}
                                            </span>
                                        )}
                                    </p>
                                    {(() => {
                                        const suitability = getDriverVehicleSuitability(selectedDriver.vehicle_type, resolvedWeightKg);
                                        if (!suitability) return null;
                                        return (
                                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold mt-1 ${suitability.badgeClass}`}>
                                                {suitability.badge}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDriverId(null);
                                }}
                                className="shrink-0 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition"
                                title="Remove assignment"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    ) : (
                        <div className="py-2.5">
                            <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                <GripVertical size={16} className={`text-stone-400 ${isDraggingAny ? 'text-clay-600 animate-bounce' : ''}`} />
                                <p className="text-xs font-bold text-stone-700">
                                    {isDraggingAny ? "Release driver card here to assign" : isMobile ? "Select a driver below" : "Drag driver here to assign"}
                                </p>
                            </div>
                            <p className="text-[10px] text-stone-400">
                                {isMobile ? "Tap any driver in the roster to assign" : "or click any driver in the roster to assign directly"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Dispatch Notes for Driver */}
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                        Rider Instructions (Optional)
                    </label>
                    <textarea
                        rows={2}
                        value={dispatchNotes}
                        onChange={(e) => setDispatchNotes(e.target.value)}
                        placeholder="e.g. Call upon arrival, leave at lobby reception..."
                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                    />
                </div>
            </div>

            {/* RIGHT COLUMN: Driver Board & Live Availability */}
            <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                        <UserCheck size={16} className="text-clay-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                            Driver Roster &amp; Live Status
                        </h3>
                    </div>
                    <span className="text-[10px] font-medium text-stone-500">
                        {drivers.length} Driver(s) configured
                    </span>
                </div>

                {isLoadingDrivers ? (
                    <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                        <LoaderCircle size={24} className="animate-spin mb-2" />
                        <p className="text-xs font-medium">Checking live driver availability...</p>
                    </div>
                ) : drivers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center bg-stone-50/50">
                        <User size={28} className="mx-auto text-stone-300 mb-2" />
                        <p className="text-xs font-bold text-stone-700">
                            No studio drivers found
                        </p>
                        <p className="text-[11px] text-stone-400 mt-1 max-w-xs mx-auto">
                            Add staff members with the role &quot;Logistics &amp; Driver&quot; in People &amp; Payroll to dispatch orders with your own fleet.
                        </p>
                    </div>
                ) : (
                    <div ref={driverListRef} className="space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                        {sortedDrivers.map((driver) => {
                            const isSelected = selectedDriverId === driver.id;
                            const suitability = getDriverVehicleSuitability(driver.vehicle_type, resolvedWeightKg);

                            return (
                                <div
                                    key={driver.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedDriverId(driver.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setSelectedDriverId(driver.id);
                                        }
                                    }}
                                    draggable={!isMobile}
                                    onDragStart={(e) => handleDragStart(e, driver.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`group relative flex items-center justify-between rounded-xl border p-3.5 transition-all select-none cursor-pointer ${
                                        isSelected
                                            ? "border-clay-500 bg-clay-50/50 shadow-xs ring-2 ring-clay-500/20"
                                            : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs"
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {!isMobile && (
                                            <div className="text-stone-300 group-hover:text-stone-500 transition-colors cursor-grab active:cursor-grabbing">
                                                <GripVertical size={16} />
                                            </div>
                                        )}
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 font-bold text-stone-700 text-xs">
                                            {driver.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="truncate text-xs font-bold text-stone-900">
                                                    {driver.name}
                                                </p>
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                                        driver.badge_color === "emerald"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : driver.badge_color === "amber"
                                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                            : "bg-stone-100 text-stone-600 border border-stone-200"
                                                    }`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                            driver.badge_color === "emerald"
                                                                ? "bg-emerald-500 animate-pulse"
                                                                : driver.badge_color === "amber"
                                                                ? "bg-amber-500"
                                                                : "bg-stone-400"
                                                        }`}
                                                    />
                                                    {driver.status_label}
                                                </span>
                                                {suitability && (
                                                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ${suitability.badgeClass}`}>
                                                        {suitability.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-stone-500 truncate mt-0.5 flex-wrap">
                                                <span>{driver.vehicle_type}</span>
                                                {driver.vehicle_plate_number && <span>• {driver.vehicle_plate_number}</span>}
                                                {formatDriverCompensation(driver) && (
                                                    <span className="rounded bg-stone-100 px-1.5 py-0.2 text-[10px] font-semibold text-stone-600 border border-stone-200/60">
                                                        {formatDriverCompensation(driver)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="shrink-0 ml-3">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                                isSelected
                                                    ? "bg-clay-600 text-white shadow-xs"
                                                    : "border border-stone-200 bg-stone-50 text-stone-700 group-hover:bg-stone-100"
                                            }`}
                                        >
                                            {isSelected ? (
                                                <>
                                                    <CheckCircle2 size={12} />
                                                    <span>Assigned</span>
                                                </>
                                            ) : (
                                                <span>Assign</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
