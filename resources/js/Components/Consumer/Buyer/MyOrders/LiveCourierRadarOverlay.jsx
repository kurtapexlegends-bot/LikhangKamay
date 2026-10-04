import React from 'react';
import { Radio, Gauge, Compass, ShieldCheck, Clock, Navigation } from 'lucide-react';

export default function LiveCourierRadarOverlay({
    isOpen,
    onClose,
    telemetry,
    remainingKm,
    estimatedMinutes,
}) {
    if (!isOpen) return null;

    const speed = telemetry?.speed_kph ? Math.round(telemetry.speed_kph) : 0;
    const heading = telemetry?.heading ? Math.round(telemetry.heading) : null;
    const driverName = telemetry?.driver_name || 'Studio Courier';
    const vehiclePlate = telemetry?.vehicle_plate_number;
    const vehicleType = telemetry?.vehicle_type || 'Courier Vehicle';

    // Approximate cardinal direction from heading angle
    const getCardinalDirection = (deg) => {
        if (deg === null || deg === undefined) return 'Heading to Destination';
        const directions = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
        const index = Math.round(deg / 45) % 8;
        return `Heading ${directions[index]}`;
    };

    return (
        <div className="absolute top-10 left-2 right-2 sm:right-auto sm:w-80 z-[500] pointer-events-auto bg-stone-900/90 backdrop-blur-md rounded-2xl border border-stone-700/80 p-3.5 text-white shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 select-none">
            {/* Radar Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                    {/* Pulsing Radar Ring Icon */}
                    <div className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <Radio size={13} className="animate-pulse" />
                        <span className="absolute -inset-1 rounded-lg border border-emerald-400/40 animate-ping opacity-30" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black tracking-wide text-white">Courier Radar Telemetry</h4>
                        <p className="text-[9.5px] font-mono text-emerald-400">Live GPS Link Active</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="text-stone-400 hover:text-white text-xs px-1.5 py-0.5 rounded-lg hover:bg-stone-800 transition"
                >
                    Hide
                </button>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Speed Telemetry */}
                <div className="bg-stone-800/80 rounded-xl p-2 border border-stone-700/60 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-stone-700 text-amber-400">
                        <Gauge size={14} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Speed</p>
                        <p className="text-sm font-black font-mono text-white">
                            {speed > 0 ? `${speed} km/h` : 'At Stop'}
                        </p>
                    </div>
                </div>

                {/* Distance to Doorstep */}
                <div className="bg-stone-800/80 rounded-xl p-2 border border-stone-700/60 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-stone-700 text-emerald-400">
                        <Navigation size={14} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Distance</p>
                        <p className="text-sm font-black font-mono text-emerald-400 truncate">
                            {remainingKm !== null ? `${remainingKm} km` : 'En Route'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ETA & Heading Strip */}
            <div className="bg-stone-800/60 rounded-xl p-2.5 border border-stone-700/60 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                    <span className="text-stone-400 flex items-center gap-1">
                        <Clock size={11} className="text-amber-400" />
                        <span>Estimated Arrival:</span>
                    </span>
                    <span className="font-extrabold text-amber-300 font-mono">
                        {estimatedMinutes !== null ? `~${estimatedMinutes} mins` : 'Calculating'}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-stone-400 flex items-center gap-1">
                        <Compass size={11} className="text-sky-400" />
                        <span>Direction:</span>
                    </span>
                    <span className="font-bold text-stone-200">
                        {getCardinalDirection(heading)}
                    </span>
                </div>
            </div>

            {/* Courier & Vehicle Badge */}
            <div className="flex items-center justify-between pt-1 border-t border-stone-800 text-[10px] text-stone-400">
                <span className="truncate font-semibold text-stone-300">{driverName}</span>
                <span className="font-mono font-bold text-stone-300">
                    {vehiclePlate || vehicleType}
                </span>
            </div>
        </div>
    );
}
