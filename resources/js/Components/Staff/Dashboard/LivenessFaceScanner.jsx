import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CheckCircle2, RefreshCw, AlertCircle, Sparkles, Scan, Eye, Check } from 'lucide-react';

export default function LivenessFaceScanner({ onVerified, onError }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const prevFrameRef = useRef(null);
    const streamRef = useRef(null);
    const animFrameRef = useRef(null);
    const autoSnapTimerRef = useRef(null);
    const countdownTimerRef = useRef(null);

    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [scanState, setScanState] = useState('aligning'); // 'aligning' | 'ready' | 'completed'
    const [countdown, setCountdown] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);

    // Stop all active camera tracks & timers
    const stopCamera = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (autoSnapTimerRef.current) {
            clearTimeout(autoSnapTimerRef.current);
            autoSnapTimerRef.current = null;
        }
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    // Take High-Resolution Snapshot with Visual Watermark
    const executeCapture = useCallback(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;

        try {
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = video.videoWidth || 640;
            captureCanvas.height = video.videoHeight || 480;
            const ctx = captureCanvas.getContext('2d');

            // Draw mirrored camera frame
            ctx.translate(captureCanvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
            ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform

            // Optional subtle timestamp watermark
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(10, captureCanvas.height - 35, 230, 25);
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#FFFFFF';
            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            ctx.fillText(`LikhangKamay • ${now}`, 20, captureCanvas.height - 18);

            const photoData = captureCanvas.toDataURL('image/jpeg', 0.88);

            setCapturedPhoto(photoData);
            setScanState('completed');
            stopCamera();

            if (onVerified) {
                onVerified({
                    photoData,
                    livenessVerified: true,
                });
            }
        } catch (err) {
            console.error('Snapshot capture error:', err);
        }
    }, [onVerified, stopCamera]);

    // Start user camera stream
    const startCamera = useCallback(async () => {
        setCameraError(null);
        setCameraReady(false);
        setScanState('aligning');
        setCapturedPhoto(null);
        setCountdown(null);

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access is not supported by your current browser.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                },
                audio: false,
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch(() => {});
                    setCameraReady(true);
                };
            }
        } catch (err) {
            const msg = err.name === 'NotAllowedError'
                ? 'Camera access denied. Please enable camera permissions in your browser.'
                : (err.message || 'Unable to access camera.');
            setCameraError(msg);
            if (onError) onError(msg);
        }
    }, [onError]);

    // Initialize camera on mount
    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    // Robust Liveness Detection & Auto-Capture Loop
    useEffect(() => {
        if (!cameraReady || scanState === 'completed') return;

        // Auto-progress from 'aligning' to 'ready' after 1 second of stable feed
        const readyTimer = setTimeout(() => {
            setScanState('ready');
            setCountdown(2);

            // 2-second countdown before automatic clean snapshot
            let currentCount = 2;
            countdownTimerRef.current = setInterval(() => {
                currentCount -= 1;
                if (currentCount > 0) {
                    setCountdown(currentCount);
                } else {
                    clearInterval(countdownTimerRef.current);
                    setCountdown(null);
                    executeCapture();
                }
            }, 1000);
        }, 1200);

        // Background gentle motion analysis (fast-tracks capture on natural movement or blink)
        let lastCheck = 0;
        const checkMotion = (timestamp) => {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (video && canvas && video.readyState === 4 && timestamp - lastCheck > 120) {
                lastCheck = timestamp;

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const width = 64;
                const height = 48;
                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(video, 0, 0, width, height);
                const currentData = ctx.getImageData(0, 0, width, height).data;

                if (prevFrameRef.current) {
                    let diff = 0;
                    const prevData = prevFrameRef.current;
                    for (let i = 0; i < currentData.length; i += 8) {
                        diff += Math.abs(currentData[i] - prevData[i]);
                    }
                    const avg = diff / (currentData.length / 8);

                    // If natural blink or gesture occurs while ready, snap immediately
                    if (avg >= 3.0 && scanState === 'ready') {
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                        executeCapture();
                        return;
                    }
                }

                prevFrameRef.current = new Uint8ClampedArray(currentData);
            }

            if (scanState !== 'completed') {
                animFrameRef.current = requestAnimationFrame(checkMotion);
            }
        };

        animFrameRef.current = requestAnimationFrame(checkMotion);

        return () => {
            clearTimeout(readyTimer);
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [cameraReady, scanState, executeCapture]);

    const handleRestart = () => {
        startCamera();
    };

    return (
        <div className="flex flex-col items-center w-full">
            {/* Viewfinder Container */}
            <div className="relative w-full max-w-[310px] aspect-[4/3] rounded-2xl overflow-hidden bg-stone-950 border border-stone-200 shadow-sm flex items-center justify-center">
                {/* Video Stream (Live) */}
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover scale-x-[-1] ${
                        scanState === 'completed' ? 'hidden' : 'block'
                    }`}
                />

                {/* Captured Photo (Preview) */}
                {scanState === 'completed' && capturedPhoto && (
                    <img
                        src={capturedPhoto}
                        alt="Captured Attendance Selfie"
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Offscreen Analysis Canvas */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Steady Oval Guide Reticle */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-3">
                    <div
                        className={`w-40 h-52 rounded-[50%] border-2 transition-all duration-300 flex items-center justify-center relative ${
                            scanState === 'completed'
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : scanState === 'ready'
                                ? 'border-amber-400 bg-amber-400/5 ring-4 ring-amber-400/20'
                                : 'border-white/60'
                        }`}
                    >
                        {/* Countdown Badge overlay */}
                        {scanState === 'ready' && countdown !== null && (
                            <div className="w-14 h-14 rounded-full bg-stone-900/80 backdrop-blur-xs text-white border-2 border-amber-400 flex items-center justify-center shadow-lg animate-scale-in">
                                <span className="text-xl font-black">{countdown}</span>
                            </div>
                        )}

                        {/* Verified Success Badge */}
                        {scanState === 'completed' && (
                            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-scale-in">
                                <Check size={28} strokeWidth={3} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Error Banner */}
                {cameraError && (
                    <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                        <AlertCircle size={26} className="text-rose-400 mb-2" />
                        <p className="text-xs text-white leading-relaxed font-medium">{cameraError}</p>
                        <button
                            type="button"
                            onClick={handleRestart}
                            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-stone-900 text-xs font-bold shadow-xs hover:bg-stone-100 cursor-pointer"
                        >
                            <RefreshCw size={13} />
                            Try Again
                        </button>
                    </div>
                )}
            </div>

            {/* Instruction Card & Manual Snap Action */}
            <div className="mt-3 w-full max-w-[310px] space-y-2">
                {scanState === 'aligning' && (
                    <div className="rounded-xl border border-stone-200 bg-stone-50 py-2 px-3 flex items-center justify-center gap-2">
                        <Eye size={14} className="text-stone-500" />
                        <span className="text-xs font-bold text-stone-700">
                            Fit face in oval guide
                        </span>
                    </div>
                )}

                {scanState === 'ready' && (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-xl border border-amber-200 bg-amber-50 py-2 px-3 flex items-center justify-center gap-1.5">
                            <Sparkles size={14} className="text-amber-700" />
                            <span className="text-xs font-bold text-amber-900">
                                Hold still or blink...
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={executeCapture}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold shadow-xs cursor-pointer transition active:scale-95 shrink-0"
                        >
                            <Camera size={13} />
                            Snap Now
                        </button>
                    </div>
                )}

                {scanState === 'completed' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 py-2 px-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={15} className="text-emerald-700" />
                            <span className="text-xs font-bold text-emerald-900">
                                Biometric Selfie Captured
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleRestart}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
                        >
                            <RefreshCw size={11} /> Retake
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
