import React from 'react';
import {
    Truck,
    Bike,
    Car,
    ShieldAlert,
    ShieldCheck,
    Eye,
    Clock,
} from 'lucide-react';

export const renderVehicleIcon = (type, className = "text-clay-700", size = 22) => {
    const lower = (type || "").toLowerCase();
    if (lower.includes("bicycle") || lower.includes("bike")) {
        return <Bike className={className} size={size} />;
    }
    if (lower.includes("sedan") || lower.includes("car")) {
        return <Car className={className} size={size} />;
    }
    return <Truck className={className} size={size} />;
};

export default function DriverProfileSidebar({
    driverProfile = {},
    shopName = "Studio",
    activeDeliveriesCount = 0,
    completedTodayCount = 0,
    onOpenVerifyModal,
    onOpenClockInModal,
    onViewLicensePhoto,
}) {
    return (
        <div className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
            {/* Card 1: Rider Profile & Vehicle Compliance */}
            <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-100 border border-stone-200 text-clay-700 shadow-2xs">
                            {renderVehicleIcon(driverProfile.vehicle_type, "text-clay-700", 22)}
                            <span
                                className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                                    driverProfile.is_clocked_in ? "bg-emerald-500" : "bg-stone-400"
                                }`}
                            />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-extrabold text-stone-900 truncate">
                                {driverProfile.name || "Delivery Driver"}
                            </h2>
                            <p className="text-xs text-stone-500 font-medium truncate">
                                {shopName}
                            </p>
                        </div>
                    </div>
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                            driverProfile.is_clocked_in
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-stone-100 text-stone-600 border border-stone-200"
                        }`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${
                                driverProfile.is_clocked_in ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                            }`}
                        />
                        {driverProfile.is_clocked_in ? "On Duty" : "Off Duty"}
                    </span>
                </div>

                {/* Transport Specs */}
                <div className="rounded-xl bg-stone-50 p-3 border border-stone-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-stone-400 font-medium">Vehicle</span>
                        <span className="font-bold text-stone-800">{driverProfile.vehicle_type || "Motorcycle"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-stone-400 font-medium">Plate Number</span>
                        <span className="font-mono font-bold text-stone-800">{driverProfile.vehicle_plate_number || "Not set"}</span>
                    </div>
                    {driverProfile.driver_license_number && (
                        <div className="flex items-center justify-between">
                            <span className="text-stone-400 font-medium">License No.</span>
                            <span className="font-mono font-bold text-stone-800">{driverProfile.driver_license_number}</span>
                        </div>
                    )}
                </div>

                {/* Verification Status & Actions */}
                <div className="pt-3 border-t border-stone-100">
                    <div className="flex items-center justify-between">
                        <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                driverProfile.is_vehicle_verified
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                        >
                            {driverProfile.is_vehicle_verified ? (
                                <>
                                    <ShieldCheck size={13} className="text-emerald-600" />
                                    <span>Verified Transport</span>
                                </>
                            ) : (
                                <>
                                    <ShieldAlert size={13} className="text-amber-600" />
                                    <span>Verification Pending</span>
                                </>
                            )}
                        </span>

                        <div className="flex items-center gap-2">
                            {driverProfile.driver_license_photo_url && (
                                <button
                                    type="button"
                                    onClick={() => onViewLicensePhoto(driverProfile.driver_license_photo_url)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 underline"
                                >
                                    <Eye size={12} />
                                    <span>View ID</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onOpenVerifyModal}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-clay-700 hover:text-clay-800 underline"
                            >
                                {driverProfile.is_vehicle_verified ? "Update" : "Verify Now"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: Shift & Compensation Summary */}
            <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Shift &amp; Earnings
                </h3>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-stone-50 p-3 border border-stone-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Active Runs</span>
                        <span className="text-2xl font-extrabold text-stone-900 font-mono">{activeDeliveriesCount}</span>
                        <span className="text-[10px] text-stone-500 font-medium block mt-0.5">In transit</span>
                    </div>
                    <div className="rounded-xl bg-stone-50 p-3 border border-stone-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Completed</span>
                        <span className="text-2xl font-extrabold text-stone-900 font-mono">{completedTodayCount}</span>
                        <span className="text-[10px] text-stone-500 font-medium block mt-0.5">Today</span>
                    </div>
                </div>

                {/* Compensation breakdown */}
                <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        {(driverProfile.compensation_type === 'per_delivery' || driverProfile.compensation_type === 'hybrid')
                            ? "Today's Drop Earnings"
                            : "Compensation Model"}
                    </span>
                    <div className="text-lg font-extrabold text-stone-900 font-mono">
                        {(driverProfile.compensation_type === 'per_delivery' || driverProfile.compensation_type === 'hybrid')
                            ? `₱${Number(driverProfile.today_drop_earnings || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                            : "Monthly Salary"}
                    </div>
                    <p className="text-[11px] text-stone-500 font-medium">
                        {(driverProfile.compensation_type === 'per_delivery' || driverProfile.compensation_type === 'hybrid')
                            ? `₱${Number(driverProfile.delivery_fee_rate || 0).toFixed(2)} / completed drop`
                            : "Regular employee wage structure"}
                    </p>
                </div>

                {!driverProfile.is_clocked_in && (
                    <button
                        type="button"
                        onClick={onOpenClockInModal}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-clay-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-clay-700 active:scale-95 transition min-h-[42px]"
                    >
                        <Clock size={15} />
                        <span>Clock In Shift Now</span>
                    </button>
                )}
            </div>
        </div>
    );
}
