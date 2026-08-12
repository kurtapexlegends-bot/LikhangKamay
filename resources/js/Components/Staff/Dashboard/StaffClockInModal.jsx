import React, { useState, useRef, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Camera, MapPin, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, X, Loader2, Navigation } from 'lucide-react';
import Modal from '@/Components/Modal';
import StaffGeofenceMap from './StaffGeofenceMap';

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
};

export default function StaffClockInModal({ isOpen, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    
    const { attendance } = usePage().props;
    const assignedLoc = attendance?.assigned_location;

    const [stream, setStream] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    
    const [location, setLocation] = useState({ lat: null, lng: null, accuracy: null });
    const [locationStatus, setLocationStatus] = useState('fetching'); // fetching, success, error
    const [submitting, setSubmitting] = useState(false);

    // Workplace location parameters
    const workplaceLat = assignedLoc?.latitude;
    const workplaceLng = assignedLoc?.longitude;
    const radiusLimit = Number(assignedLoc?.radius_meters || 200);
    const locationName = assignedLoc?.name || 'Assigned Workplace';
    const strictGeofence = !!assignedLoc?.enforce_strict_geofence;

    // Calculate actual distance between staff and workplace center
    const distanceMeters = (locationStatus === 'success' && location.lat !== null && workplaceLat !== undefined && workplaceLat !== null)
        ? calculateDistanceMeters(location.lat, location.lng, workplaceLat, workplaceLng)
        : null;

    const isWithinGeofence = distanceMeters !== null ? (distanceMeters <= radiusLimit) : true;

    // Initialize WebCam and Geolocation when modal opens
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            return;
        }

        startCamera();
        fetchGeolocation();

        return () => {
            stopCamera();
        };
    }, [isOpen]);

    const startCamera = async () => {
        setCameraError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Camera access error:', err);
            setCameraError('Camera access required for physical attendance verification.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    const fetchGeolocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            return;
        }

        setLocationStatus('fetching');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: Math.round(pos.coords.accuracy)
                });
                setLocationStatus('success');
            },
            (err) => {
                console.warn('Geolocation error:', err);
                setLocationStatus('error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
    };

    const retakePhoto = () => {
        setCapturedPhoto(null);
        if (!stream) {
            startCamera();
        }
    };

    const handleSubmit = () => {
        setSubmitting(true);
        router.post('/staff/attendance/resume', {
            photo_data: capturedPhoto,
            latitude: location.lat,
            longitude: location.lng
        }, {
            onFinish: () => {
                setSubmitting(false);
                onClose();
            }
        });
    };

    const isLocationVerified = locationStatus === 'success' && location.lat !== null && location.lng !== null;
    const canClockIn = Boolean(capturedPhoto) && isLocationVerified && (!strictGeofence || isWithinGeofence);

    const getButtonText = () => {
        if (submitting) return 'Clocking In...';
        if (!capturedPhoto) return 'Take Selfie Photo to Continue';
        if (locationStatus === 'fetching') return 'Verifying GPS Location...';
        if (!isLocationVerified) return 'GPS Location Verification Required';
        if (strictGeofence && !isWithinGeofence) return `Clock In Blocked: Move Within ${radiusLimit}m of ${locationName}`;
        return 'Confirm Physical Clock In';
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="3xl">
            <div className="p-5 sm:p-6 bg-white space-y-4 rounded-2xl border border-stone-200/60 shadow-xl max-h-[92vh] overflow-y-auto">
                {/* Header & Verification Steps */}
                <div className="border-b border-stone-100 pb-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/80 shadow-2xs">
                                <ShieldCheck size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-stone-900 leading-tight">Clock In Verification</h3>
                                <p className="text-xs text-stone-500 font-medium">Selfie Proof & Workplace Geofence Required</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* 2-Step Verification Progress Bar */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                            capturedPhoto 
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' 
                                : 'bg-stone-50 border-stone-200 text-stone-600'
                        }`}>
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                                capturedPhoto ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
                            }`}>
                                {capturedPhoto ? <CheckCircle2 size={10} /> : '1'}
                            </div>
                            <span className="truncate">1. Selfie Photo</span>
                        </div>

                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                            isLocationVerified && isWithinGeofence
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' 
                                : isLocationVerified && !isWithinGeofence
                                    ? 'bg-rose-50/90 border-rose-200 text-rose-800'
                                    : locationStatus === 'error'
                                        ? 'bg-amber-50/80 border-amber-200 text-amber-800'
                                        : 'bg-stone-50 border-stone-200 text-stone-600'
                        }`}>
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                                isLocationVerified && isWithinGeofence
                                    ? 'bg-emerald-600 text-white' 
                                    : isLocationVerified && !isWithinGeofence
                                        ? 'bg-rose-600 text-white'
                                        : locationStatus === 'error'
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-stone-200 text-stone-600'
                            }`}>
                                {isLocationVerified && isWithinGeofence ? <CheckCircle2 size={10} /> : '2'}
                            </div>
                            <span className="truncate">2. Workplace GPS</span>
                        </div>
                    </div>
                </div>

                {/* 2-Column Split Operational Cockpit Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                    {/* LEFT COLUMN: Biometric Camera Viewfinder Stream / Photo Preview */}
                    <div className="flex flex-col h-full space-y-2.5">
                        <div className="flex items-center justify-between px-0.5">
                            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                                <Camera size={14} className="text-clay-600" />
                                Biometric Selfie Proof
                            </span>
                            <span className="text-[10px] font-semibold text-stone-400">Step 1 of 2</span>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl bg-stone-950 flex-1 min-h-[260px] md:min-h-[290px] flex items-center justify-center border border-stone-800 shadow-inner group">
                            {capturedPhoto ? (
                                <div className="relative w-full h-full">
                                    <img src={capturedPhoto} alt="Clock-in selfie preview" className="w-full h-full object-cover" />
                                    {/* Photo Captured Overlay Badge */}
                                    <div className="absolute top-3 left-3 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                        <CheckCircle2 size={12} className="text-emerald-400" />
                                        Snapshot Verified
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover transform -scale-x-100"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />

                                    {/* Viewfinder Corner Ticks */}
                                    <div className="pointer-events-none absolute inset-4">
                                        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-400/70 rounded-tl-lg" />
                                        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-400/70 rounded-tr-lg" />
                                        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-400/70 rounded-bl-lg" />
                                        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-400/70 rounded-br-lg" />
                                    </div>

                                    {/* Facial Oval Guide Silhouette */}
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                        <div className="w-36 h-48 sm:w-40 sm:h-52 border-2 border-dashed border-white/20 rounded-[50%] flex items-center justify-center">
                                            <span className="text-[10px] font-medium text-white/40 tracking-widest uppercase">Position Face</span>
                                        </div>
                                    </div>

                                    {/* Live Stream Indicator Badge */}
                                    <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        LIVE STREAM
                                    </div>
                                </>
                            )}

                            {cameraError && !capturedPhoto && (
                                <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
                                    <AlertTriangle size={32} className="text-amber-400 mb-2" />
                                    <p className="text-xs font-bold text-white max-w-xs leading-relaxed">{cameraError}</p>
                                    <button
                                        type="button"
                                        onClick={startCamera}
                                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs text-white font-bold transition border border-stone-700 flex items-center gap-1.5"
                                    >
                                        <RefreshCw size={12} />
                                        Retry Camera Stream
                                    </button>
                                </div>
                            )}

                            {/* Camera Controls Floating Overlay */}
                            <div className="absolute bottom-3 inset-x-3 flex justify-between items-center bg-stone-950/75 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10 z-10">
                                {capturedPhoto ? (
                                    <button
                                        type="button"
                                        onClick={retakePhoto}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-amber-300 transition"
                                    >
                                        <RefreshCw size={14} />
                                        Retake Photo
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={capturePhoto}
                                        disabled={!!cameraError}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm active:scale-95"
                                    >
                                        <Camera size={14} />
                                        Snap Photo
                                    </button>
                                )}
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-300">
                                    {capturedPhoto ? 'Photo Captured' : 'Ready'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Read-Only Leaflet Map, GPS Geofence Check & Action */}
                    <div className="flex flex-col h-full space-y-3">
                        <div className="flex items-center justify-between px-0.5">
                            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                                <MapPin size={14} className="text-emerald-600" />
                                Workplace Geofence
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
                                height="170px"
                            />
                        ) : (
                            <div className="h-[170px] rounded-2xl border border-stone-200 bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
                                <Loader2 size={24} className="animate-spin text-clay-600 mb-2" />
                                <p className="text-xs font-bold text-stone-700">Acquiring GPS Position...</p>
                                <p className="text-[10px] text-stone-400 font-medium mt-0.5">Initializing Leaflet geofence visual map</p>
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
                                            <span className="font-bold text-stone-900 block leading-tight text-xs">GPS Geofence Status</span>
                                            {locationStatus === 'fetching' && (
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clay-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-clay-600"></span>
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-[10px] text-stone-600 font-medium mt-0.5 leading-snug">
                                            {locationStatus === 'fetching' && 'Acquiring satellite lock & GPS coordinates...'}
                                            {locationStatus === 'success' && isWithinGeofence && (
                                                <span>Verified within <strong>{locationName}</strong> boundary ({distanceMeters}m away • max {radiusLimit}m)</span>
                                            )}
                                            {locationStatus === 'success' && !isWithinGeofence && (
                                                <span className="text-rose-900 font-bold">
                                                    Outside Boundary: <strong>{distanceMeters}m</strong> away from {locationName} (max {radiusLimit}m).
                                                </span>
                                            )}
                                            {locationStatus === 'error' && 'Location permission required to verify physical attendance.'}
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
                                            In Range
                                        </div>
                                    )}
                                    {locationStatus === 'success' && !isWithinGeofence && (
                                        <div className="flex items-center gap-1 text-[9px] font-extrabold text-rose-700 bg-rose-100/90 border border-rose-200 px-2 py-0.5 rounded-lg">
                                            <ShieldAlert size={11} className="text-rose-600" />
                                            Out of Range
                                        </div>
                                    )}
                                    {locationStatus === 'error' && (
                                        <button
                                            type="button"
                                            onClick={fetchGeolocation}
                                            className="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-bold shrink-0 transition active:scale-95 flex items-center gap-1"
                                        >
                                            <Navigation size={10} />
                                            Enable GPS
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
                                className="w-full py-3 px-4 rounded-xl bg-clay-800 hover:bg-clay-900 active:bg-clay-950 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold transition-all shadow-md shadow-clay-800/20 active:scale-[0.98] flex items-center justify-center gap-2"
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
                </div>
            </div>
        </Modal>
    );
}
