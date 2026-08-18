import React, { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Camera, MapPin, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, X, Loader2, Navigation, Mail, Send, Inbox } from 'lucide-react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import StaffGeofenceMap from './StaffGeofenceMap';
import LivenessFaceScanner from './LivenessFaceScanner';

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

    const [useOtpFallback, setUseOtpFallback] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpError, setOtpError] = useState(null);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [maskedEmail, setMaskedEmail] = useState(attendance?.masked_email || '');

    // Cooldown countdown timer for resending OTP
    useEffect(() => {
        if (otpCooldown <= 0) return;
        const timer = setInterval(() => {
            setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [otpCooldown]);

    const handleRequestOtp = async () => {
        if (otpCooldown > 0 || isSendingOtp) return;
        setIsSendingOtp(true);
        setOtpError(null);
        try {
            const res = await axios.post('/staff/attendance/otp');
            setOtpSent(true);
            setOtpCooldown(res.data.cooldown_seconds || 60);
            if (res.data.masked_email) {
                setMaskedEmail(res.data.masked_email);
            }
        } catch (err) {
            setOtpError(err.response?.data?.errors?.otp?.[0] || err.response?.data?.message || 'Failed to send OTP code. Please try again.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleSubmit = () => {
        setSubmitting(true);
        router.post('/staff/attendance/resume', {
            photo_data: capturedPhoto,
            otp_code: useOtpFallback ? otpCode : null,
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
    const canClockIn = (Boolean(capturedPhoto) || (useOtpFallback && otpCode.length >= 6)) && isLocationVerified && (!strictGeofence || isWithinGeofence);

    const getButtonText = () => {
        if (submitting) return 'Clocking In...';
        if (useOtpFallback && otpCode.length < 6) return 'Enter 6-Digit Email OTP';
        if (!capturedPhoto && !useOtpFallback) return 'Take Selfie Photo to Continue';
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
                                {useOtpFallback ? <Mail size={14} className="text-amber-600" /> : <Camera size={14} className="text-clay-600" />}
                                {useOtpFallback ? 'Email OTP Verification' : 'Biometric Selfie Proof'}
                            </span>
                            <span className="text-[10px] font-semibold text-stone-400">Step 1 of 2</span>
                        </div>

                        {useOtpFallback ? (
                            <div className="rounded-2xl bg-amber-50/60 border border-amber-200/80 p-4 sm:p-5 flex flex-col items-center justify-center text-center space-y-3 min-h-[240px] sm:min-h-[270px] md:min-h-[290px]">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
                                    <Mail size={22} className="text-amber-700" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-stone-900">Email OTP Verification</h4>
                                    <p className="text-[11px] text-stone-600 font-medium max-w-xs leading-relaxed">
                                        A single-use 6-digit verification code will be sent to your registered Gmail address.
                                    </p>
                                    {maskedEmail && (
                                        <span className="inline-block text-[11px] font-mono font-bold text-stone-800 bg-white px-2.5 py-0.5 rounded-full border border-stone-200 shadow-2xs mt-1">
                                            {maskedEmail}
                                        </span>
                                    )}
                                </div>

                                {/* Send / Resend OTP Action */}
                                <div className="pt-0.5">
                                    <button
                                        type="button"
                                        onClick={handleRequestOtp}
                                        disabled={isSendingOtp || otpCooldown > 0}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-200 disabled:text-stone-500 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        {isSendingOtp ? (
                                            <>
                                                <Loader2 size={13} className="animate-spin" />
                                                Sending Code...
                                            </>
                                        ) : otpCooldown > 0 ? (
                                            <>
                                                <Mail size={13} />
                                                Resend Code ({otpCooldown}s)
                                            </>
                                        ) : (
                                            <>
                                                <Send size={13} />
                                                {otpSent ? 'Resend Code to Email' : 'Send Verification Code'}
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* OTP Input Form */}
                                <div className="space-y-1.5 w-full max-w-[200px]">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="0 0 0 0 0 0"
                                        className="w-full text-center text-xl font-mono font-black tracking-[0.25em] px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white shadow-2xs text-stone-900"
                                    />
                                    {otpError && (
                                        <p className="text-[10px] text-red-600 font-bold">{otpError}</p>
                                    )}
                                    {otpSent && !otpError && (
                                        <p className="text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                                            <CheckCircle2 size={11} /> Code sent! Check your Gmail.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-stone-50/70 border border-stone-200/80 min-h-[290px]">
                                <LivenessFaceScanner
                                    onVerified={({ photoData }) => {
                                        setCapturedPhoto(photoData);
                                        setActiveMobileTab('geofence');
                                    }}
                                    onError={(err) => {
                                        setCameraError(err);
                                    }}
                                />
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                const nextVal = !useOtpFallback;
                                setUseOtpFallback(nextVal);
                                setCapturedPhoto(null);
                                if (nextVal && !otpSent) {
                                    handleRequestOtp();
                                }
                            }}
                            className="text-[10px] text-stone-500 hover:text-stone-800 font-bold underline text-center pt-0.5"
                        >
                            {useOtpFallback ? 'Switch Back to 3D Liveness Selfie Scan' : 'Camera Broken or Unavailable? Use Email OTP Verification'}
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
