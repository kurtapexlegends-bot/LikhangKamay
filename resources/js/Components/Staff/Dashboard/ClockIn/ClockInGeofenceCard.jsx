import React from 'react';
import { MapPin, Loader2, ShieldAlert, AlertTriangle, RefreshCw, CheckCircle2, Navigation, ShieldCheck } from 'lucide-react';
import StaffGeofenceMap from '../StaffGeofenceMap';

export default function ClockInGeofenceCard({
    activeMobileTab,
    isLocationVerified,
    workplaceLat,
    workplaceLng,
    radiusLimit,
    location,
    distanceMeters,
    isWithinGeofence,
    locationName,
    locationStatus,
    fetchGeolocation,
    handleSubmit,
    submitting,
    canClockIn,
    getButtonText,
}) {
    return (
        <div className={`flex flex-col space-y-3 ${
            activeMobileTab === 'geofence' ? 'block' : 'hidden md:flex'
        }`}>
            <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-600" />
                    Store Location
                </span>
                <span className="text-[10px] font-semibold text-stone-400">Step 2 of 2</span>
            </div>

            {/* Read-Only Visual Geofence Map Feedback */}
            {isLocationVerified && workplaceLat !== undefined && workplaceLat !== null ? (
                <StaffGeofenceMap
                    workplaceLat={workplaceLat}
                    workplaceLng={workplaceLng}
                    radiusMeters={radiusLimit}
                    staffLat={location.lat}
                    staffLng={location.lng}
                    distanceMeters={distanceMeters}
                    isWithin={isWithinGeofence}
                    locationName={locationName}
                    height="160px"
                />
            ) : (
                <div className="h-[160px] rounded-2xl border border-stone-200 bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
                    <Loader2 size={24} className="animate-spin text-clay-600 mb-2" />
                    <p className="text-xs font-bold text-stone-700">Checking your location...</p>
                    <p className="text-[10px] text-stone-400 font-medium mt-0.5">Verifying distance to store</p>
                </div>
            )}

            {/* GPS Location Status Indicator & Out-of-Range Feedback Card */}
            <div className={`relative overflow-hidden rounded-2xl border p-3 transition-all duration-300 flex-1 flex flex-col justify-center ${
                locationStatus === 'success' && isWithinGeofence
                    ? 'border-emerald-200 bg-emerald-50/50 shadow-2xs' 
                    : locationStatus === 'success' && !isWithinGeofence
                        ? 'border-rose-200 bg-rose-50/70 shadow-2xs'
                        : locationStatus === 'error' 
                            ? 'border-amber-200 bg-amber-50/70 shadow-2xs' 
                            : 'border-stone-200 bg-stone-50/90'
            }`}>
                {/* Animated progress beam when fetching */}
                {locationStatus === 'fetching' && (
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-stone-200 overflow-hidden">
                        <div className="h-full bg-clay-600 animate-pulse w-full origin-left" />
                    </div>
                )}

                <div className="flex items-start justify-between gap-2.5 text-xs">
                    <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                            locationStatus === 'success' && isWithinGeofence
                                ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200'
                                : locationStatus === 'success' && !isWithinGeofence
                                    ? 'bg-rose-100/80 text-rose-700 border-rose-200'
                                    : locationStatus === 'error'
                                        ? 'bg-amber-100/80 text-amber-700 border-amber-200'
                                        : 'bg-white text-stone-600 border-stone-200 shadow-2xs'
                        }`}>
                            {locationStatus === 'fetching' ? (
                                <Loader2 size={14} className="animate-spin text-clay-600" />
                            ) : locationStatus === 'success' && isWithinGeofence ? (
                                <MapPin size={14} className="text-emerald-700" />
                            ) : locationStatus === 'success' && !isWithinGeofence ? (
                                <ShieldAlert size={14} className="text-rose-700" />
                            ) : (
                                <AlertTriangle size={14} className="text-amber-700" />
                            )}
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-stone-900 block leading-tight text-xs">Store Location</span>
                                {locationStatus === 'fetching' && (
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clay-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-clay-600"></span>
                                    </span>
                                )}
                            </div>

                            <p className="text-[10px] text-stone-600 font-medium mt-0.5 leading-snug">
                                {locationStatus === 'fetching' && 'Finding your location...'}
                                {locationStatus === 'success' && isWithinGeofence && (
                                    <span>You are at <strong>{locationName}</strong> ({distanceMeters}m away • allowed within {radiusLimit}m)</span>
                                )}
                                {locationStatus === 'success' && !isWithinGeofence && (
                                    <span className="text-rose-900 font-bold block">
                                        Too far from store: You are <strong>{distanceMeters}m</strong> away (must be within {radiusLimit}m). Move inside the green circle on the map above, or use Email Security Code.
                                    </span>
                                )}
                                {locationStatus === 'error' && 'Location is turned off. Please allow location in your browser or phone settings.'}
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0">
                        {locationStatus === 'fetching' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-[9px] font-bold text-stone-600">
                                <RefreshCw size={10} className="animate-spin text-clay-600" />
                                Locating
                            </span>
                        )}
                        {locationStatus === 'success' && isWithinGeofence && (
                            <div className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-100/70 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                At Store
                            </div>
                        )}
                        {locationStatus === 'success' && !isWithinGeofence && (
                            <div className="flex items-center gap-1 text-[9px] font-extrabold text-rose-700 bg-rose-100/90 border border-rose-200 px-2 py-0.5 rounded-lg">
                                <ShieldAlert size={11} className="text-rose-600" />
                                Too Far
                            </div>
                        )}
                        {locationStatus === 'error' && (
                            <button
                                type="button"
                                onClick={fetchGeolocation}
                                className="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-bold shrink-0 transition active:scale-95 flex items-center gap-1"
                            >
                                <Navigation size={10} />
                                Allow Location
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-0.5">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !canClockIn}
                    className="w-full py-3 px-4 rounded-xl bg-clay-800 hover:bg-clay-900 active:bg-clay-950 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold transition-all shadow-md shadow-clay-800/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                    {submitting ? (
                        <RefreshCw size={16} className="animate-spin" />
                    ) : (
                        <ShieldCheck size={16} />
                    )}
                    {getButtonText()}
                </button>
            </div>
        </div>
    );
}
