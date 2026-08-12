import React, { useState, useRef, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Camera, MapPin, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, X, Loader2, Navigation, Key } from 'lucide-react';
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
    const [activeMobileTab, setActiveMobileTab] = useState('selfie'); // 'selfie' | 'geofence'

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
        setActiveMobileTab('selfie');

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

        // Auto-advance to Step 2 (GPS Geofence) on mobile
        setActiveMobileTab('geofence');
    };

    const retakePhoto = () => {
        setCapturedPhoto(null);
        if (!stream) {
            startCamera();
        }
        setActiveMobileTab('selfie');
    };

    const [usePinFallback, setUsePinFallback] = useState(false);
    const [workplacePin, setWorkplacePin] = useState('');

    const handleSubmit = () => {
        setSubmitting(true);
        router.post('/staff/attendance/resume', {
            photo_data: capturedPhoto,
            workplace_pin: usePinFallback ? workplacePin : null,
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
    const canClockIn = (Boolean(capturedPhoto) || (usePinFallback && workplacePin.length >= 4)) && isLocationVerified && (!strictGeofence || isWithinGeofence);

    const getButtonText = () => {
        if (submitting) return 'Clocking In...';
        if (usePinFallback && workplacePin.length < 4) return 'Enter 4-Digit Workplace PIN';
        if (!capturedPhoto && !usePinFallback) return 'Take Selfie Photo to Continue';
        if (locationStatus === 'fetching') return 'Verifying GPS Location...';
        if (!isLocationVerified) return 'GPS Location Verification Required';
        if (strictGeofence && !isWithinGeofence) return `Clock In Blocked: Move Within ${radiusLimit}m of ${locationName}`;
        return 'Confirm Physical Clock In';
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="3xl">
            <div className="p-4 sm:p-6 bg-white space-y-3.5 sm:space-y-4 rounded-t-3xl sm:rounded-2xl border border-stone-200/60 shadow-xl max-h-[92vh] overflow-y-auto">
                {/* Mobile Drag Handle Bar */}
                <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto sm:hidden -mt-1 mb-1" />

                {/* Header & Verification Steps */}
                <div className="border-b border-stone-100 pb-3 space-y-3">
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

                    {/* 2-Step Verification Progress Bar (Acts as Interactive Tab Bar on Mobile) */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                            type="button"
                            onClick={() => setActiveMobileTab('selfie')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all text-left ${
                                capturedPhoto 
                                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' 
                                    : activeMobileTab === 'selfie'
                                        ? 'bg-clay-50 border-clay-300 text-clay-900 shadow-2xs ring-1 ring-clay-400/30'
                                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                            }`}
                        >
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                                capturedPhoto ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
                            }`}>
                                {capturedPhoto ? <CheckCircle2 size={10} /> : '1'}
                            </div>
                            <span className="truncate">1. Selfie Photo</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveMobileTab('geofence')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all text-left ${
                                isLocationVerified && isWithinGeofence
                                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' 
                                    : isLocationVerified && !isWithinGeofence
                                        ? 'bg-rose-50/90 border-rose-200 text-rose-800'
                                        : activeMobileTab === 'geofence'
                                            ? 'bg-clay-50 border-clay-300 text-clay-900 shadow-2xs ring-1 ring-clay-400/30'
                                            : locationStatus === 'error'
                                                ? 'bg-amber-50/80 border-amber-200 text-amber-800'
                                                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                            }`}
                        >
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
                        </button>
                    </div>
                </div>

                {/* Cockpit Container: 2-Column Split on Desktop/Tablet (md+), Single Tabbed View on Mobile (< md) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-stretch">
                    {/* LEFT COLUMN: Biometric Camera Viewfinder Stream / Photo Preview */}
                    <div className={`flex flex-col space-y-2.5 ${
                        activeMobileTab === 'selfie' ? 'block' : 'hidden md:flex'
                    }`}>
                        <div className="flex items-center justify-between px-0.5">
                            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                                {usePinFallback ? <Key size={14} className="text-amber-600" /> : <Camera size={14} className="text-clay-600" />}
                                {usePinFallback ? 'Workplace Daily PIN' : 'Biometric Selfie Proof'}
                            </span>
                            <span className="text-[10px] font-semibold text-stone-400">Step 1 of 2</span>
                        </div>

                        {usePinFallback ? (
                            <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 flex flex-col items-center justify-center text-center space-y-3 min-h-[240px] sm:min-h-[270px] md:min-h-[290px]">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200/80 shadow-2xs">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-stone-900">Workplace Daily PIN Verification</h4>
                                    <p className="text-[11px] text-stone-600 font-medium mt-0.5 max-w-xs leading-relaxed">
                                        Enter the 4-digit Workplace Daily PIN provided verbally by your on-site manager.
                                    </p>
                                </div>
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={workplacePin}
                                    onChange={(e) => setWorkplacePin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="0 0 0 0"
                                    className="w-36 text-center text-xl font-mono font-black tracking-[0.3em] px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white shadow-2xs text-stone-900"
                                />
                                <p className="text-[10px] text-stone-400 font-medium">
                                    Camera unavailable fallback mode active
                                </p>
                            </div>
                        ) : (
                            <div className="relative overflow-hidden rounded-2xl bg-stone-950 aspect-square sm:aspect-4/3 md:aspect-auto flex-1 min-h-[240px] sm:min-h-[270px] md:min-h-[290px] flex items-center justify-center border border-stone-800 shadow-inner group">
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
                                        <div className="pointer-events-none absolute inset-3.5 sm:inset-4">
                                            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-400/70 rounded-tl-lg" />
                                            <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-400/70 rounded-tr-lg" />
                                            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-400/70 rounded-bl-lg" />
                                            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-400/70 rounded-br-lg" />
                                        </div>

                                        {/* Facial Oval Guide Silhouette */}
                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                            <div className="w-32 h-44 sm:w-40 sm:h-52 border-2 border-dashed border-white/20 rounded-[50%] flex items-center justify-center">
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
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={startCamera}
                                                className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs text-white font-bold transition border border-stone-700 flex items-center gap-1.5"
                                            >
                                                <RefreshCw size={12} />
                                                Retry Stream
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setUsePinFallback(true)}
                                                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs text-white font-bold transition flex items-center gap-1.5"
                                            >
                                                <Key size={12} />
                                                Use Workplace PIN
                                            </button>
                                        </div>
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
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                const nextVal = !usePinFallback;
                                setUsePinFallback(nextVal);
                                if (!nextVal) startCamera();
                            }}
                            className="text-[10px] text-stone-500 hover:text-stone-800 font-bold underline text-center pt-0.5"
                        >
                            {usePinFallback ? 'Switch Back to Camera Selfie Stream' : 'Camera Broken or Unavailable? Use Workplace Daily PIN'}
                        </button>

                        {/* Mobile-Only CTA to advance to Step 2 */}
                        <div className="pt-1 md:hidden">
                            {capturedPhoto ? (
                                <button
                                    type="button"
                                    onClick={() => setActiveMobileTab('geofence')}
                                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    <span>Proceed to GPS Map & Geofence</span>
                                    <CheckCircle2 size={14} />
                                </button>
                            ) : (
                                <p className="text-[10px] text-stone-400 font-medium text-center">
                                    Snap your selfie photo to automatically advance to GPS Geofence check.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Read-Only Leaflet Map, GPS Geofence Check & Action */}
                    <div className={`flex flex-col space-y-3 ${
                        activeMobileTab === 'geofence' ? 'block' : 'hidden md:flex'
                    }`}>
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
                                height="160px"
                            />
                        ) : (
                            <div className="h-[160px] rounded-2xl border border-stone-200 bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
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
