import React, { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Camera, MapPin, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, X, Loader2, Navigation } from 'lucide-react';
import Modal from '@/Components/Modal';

export default function StaffClockInModal({ isOpen, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    
    const [stream, setStream] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    
    const [location, setLocation] = useState({ lat: null, lng: null, accuracy: null });
    const [locationStatus, setLocationStatus] = useState('fetching'); // fetching, success, error
    const [submitting, setSubmitting] = useState(false);

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
    const canClockIn = Boolean(capturedPhoto) && isLocationVerified;

    const getButtonText = () => {
        if (submitting) return 'Clocking In...';
        if (!capturedPhoto) return 'Take Selfie Photo to Continue';
        if (locationStatus === 'fetching') return 'Verifying GPS Location...';
        if (!isLocationVerified) return 'GPS Location Verification Required';
        return 'Confirm Physical Clock In';
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-5 sm:p-6 bg-white space-y-4 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
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

                {/* Camera Stream / Photo Preview */}
                <div className="relative overflow-hidden rounded-2xl bg-stone-900 aspect-4/3 flex items-center justify-center border border-stone-200">
                    {capturedPhoto ? (
                        <img src={capturedPhoto} alt="Clock-in selfie preview" className="w-full h-full object-cover" />
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
                        </>
                    )}

                    {cameraError && !capturedPhoto && (
                        <div className="absolute inset-0 bg-stone-900/90 flex flex-col items-center justify-center p-4 text-center">
                            <AlertTriangle size={32} className="text-amber-400 mb-2" />
                            <p className="text-xs font-bold text-white max-w-xs">{cameraError}</p>
                            <button
                                type="button"
                                onClick={startCamera}
                                className="mt-3 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-white font-bold transition border border-stone-700"
                            >
                                Retry Camera
                            </button>
                        </div>
                    )}

                    {/* Camera Controls Floating Overlay */}
                    <div className="absolute bottom-3 inset-x-3 flex justify-between items-center bg-stone-900/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition"
                            >
                                <Camera size={14} />
                                Snap Photo
                            </button>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-300">
                            {capturedPhoto ? 'Photo Ready' : 'Live Camera'}
                        </span>
                    </div>
                </div>

                {/* GPS Location Status Indicator */}
                <div className={`relative overflow-hidden rounded-2xl border p-3.5 transition-all duration-300 ${
                    locationStatus === 'success' 
                        ? 'border-emerald-200 bg-emerald-50/50 shadow-2xs' 
                        : locationStatus === 'error' 
                            ? 'border-amber-200 bg-amber-50/70' 
                            : 'border-stone-200 bg-stone-50/90'
                }`}>
                    {/* Animated progress beam when fetching */}
                    {locationStatus === 'fetching' && (
                        <div className="absolute top-0 inset-x-0 h-0.5 bg-stone-200 overflow-hidden">
                            <div className="h-full bg-clay-600 animate-pulse w-full origin-left" />
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                            <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                                locationStatus === 'success'
                                    ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200'
                                    : locationStatus === 'error'
                                        ? 'bg-amber-100/80 text-amber-700 border-amber-200'
                                        : 'bg-white text-stone-600 border-stone-200 shadow-2xs'
                            }`}>
                                {locationStatus === 'fetching' ? (
                                    <Loader2 size={16} className="animate-spin text-clay-600" />
                                ) : locationStatus === 'success' ? (
                                    <MapPin size={16} className="text-emerald-700" />
                                ) : (
                                    <AlertTriangle size={16} className="text-amber-700" />
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-stone-900 block leading-tight">GPS Geofence Check</span>
                                    {locationStatus === 'fetching' && (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clay-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-clay-600"></span>
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                                    {locationStatus === 'fetching' && 'Acquiring satellite lock & coordinates...'}
                                    {locationStatus === 'success' && `Verified position within workplace boundary (±${location.accuracy}m)`}
                                    {locationStatus === 'error' && 'Location permission required to verify physical attendance.'}
                                </p>
                            </div>
                        </div>

                        <div>
                            {locationStatus === 'fetching' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-[10px] font-bold text-stone-600 shadow-2xs">
                                    <RefreshCw size={11} className="animate-spin text-clay-600" />
                                    Locating...
                                </span>
                            )}
                            {locationStatus === 'success' && (
                                <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100/70 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                                    <CheckCircle2 size={13} className="text-emerald-600" />
                                    Verified
                                </div>
                            )}
                            {locationStatus === 'error' && (
                                <button
                                    type="button"
                                    onClick={fetchGeolocation}
                                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shrink-0 shadow-2xs transition active:scale-95 flex items-center gap-1"
                                >
                                    <Navigation size={11} />
                                    Enable GPS
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !canClockIn}
                        className="w-full py-3 px-4 rounded-xl bg-clay-700 hover:bg-clay-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold transition shadow-md shadow-clay-200 active:scale-[0.99] flex items-center justify-center gap-2"
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
        </Modal>
    );
}
