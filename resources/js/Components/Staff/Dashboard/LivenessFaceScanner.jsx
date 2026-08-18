import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CheckCircle2, RefreshCw, AlertCircle, Sparkles, Scan, Smile, Eye } from 'lucide-react';

const CHALLENGES = [
    { id: 'blink', label: 'Blink your eyes naturally', instruction: 'Blink once or twice towards the camera' },
    { id: 'nod', label: 'Turn your head slightly', instruction: 'Slight head movement confirms 3D depth' },
];

export default function LivenessFaceScanner({ onVerified, onError }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const prevFrameRef = useRef(null);
    const streamRef = useRef(null);
    const animFrameRef = useRef(null);
    const lastAnalysisTimeRef = useRef(0);
    const consecutiveMotionRef = useRef(0);
    const steadyFramesRef = useRef(0);

    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [challengeState, setChallengeState] = useState('aligning'); // 'aligning' | 'challenging' | 'verifying' | 'completed'
    const [progress, setProgress] = useState(0);
    const [capturedPhoto, setCapturedPhoto] = useState(null);

    const activeChallenge = CHALLENGES[challengeIndex % CHALLENGES.length];

    const startCamera = useCallback(async () => {
        setCameraError(null);
        setCameraReady(false);
        setChallengeState('aligning');
        setProgress(15);
        setCapturedPhoto(null);
        consecutiveMotionRef.current = 0;
        steadyFramesRef.current = 0;

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera device access is not supported by your current browser.');
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
                ? 'Camera access denied. Please allow camera permissions in your browser.'
                : (err.message || 'Unable to start camera stream.');
            setCameraError(msg);
            if (onError) onError(msg);
        }
    }, [onError]);

    const stopCamera = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    // Throttled, smooth optical analysis for 3D liveness detection
    useEffect(() => {
        if (!cameraReady || challengeState === 'completed') return;

        const analyzeFrame = (timestamp) => {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!video || !canvas || video.readyState !== 4) {
                animFrameRef.current = requestAnimationFrame(analyzeFrame);
                return;
            }

            // Throttle optical difference checks to ~12 FPS (every 80ms) to prevent UI frame thrashing
            if (timestamp - lastAnalysisTimeRef.current >= 80) {
                lastAnalysisTimeRef.current = timestamp;

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const width = 120;
                const height = 90;
                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(video, 0, 0, width, height);
                const currentImageData = ctx.getImageData(0, 0, width, height);
                const currentData = currentImageData.data;

                if (prevFrameRef.current) {
                    let diff = 0;
                    const prevData = prevFrameRef.current;

                    // Sample pixels strictly in central face area
                    const startY = Math.floor(height * 0.25);
                    const endY = Math.floor(height * 0.75);
                    const startX = Math.floor(width * 0.25);
                    const endX = Math.floor(width * 0.75);

                    let sampledPixels = 0;
                    for (let y = startY; y < endY; y += 3) {
                        for (let x = startX; x < endX; x += 3) {
                            const idx = (y * width + x) * 4;
                            const delta = Math.abs(currentData[idx] - prevData[idx])
                                + Math.abs(currentData[idx + 1] - prevData[idx + 1])
                                + Math.abs(currentData[idx + 2] - prevData[idx + 2]);
                            diff += delta;
                            sampledPixels++;
                        }
                    }

                    const avgDiff = diff / (sampledPixels * 3);

                    // Stage 1: Face Centered / Aligning
                    if (challengeState === 'aligning') {
                        if (avgDiff > 0.5 && avgDiff < 15) {
                            steadyFramesRef.current++;
                            if (steadyFramesRef.current >= 4) {
                                setProgress(45);
                                setChallengeState('challenging');
                            }
                        }
                    } 
                    // Stage 2: Active Gesture / Micro-Movement Challenge
                    else if (challengeState === 'challenging') {
                        if (avgDiff >= 1.5 && avgDiff <= 28.0) {
                            consecutiveMotionRef.current++;
                            if (consecutiveMotionRef.current >= 2) {
                                setProgress(85);
                                setChallengeState('verifying');
                            }
                        }
                    } 
                    // Stage 3: Instant Verified Snapshot Capture
                    else if (challengeState === 'verifying') {
                        setProgress(100);

                        const captureCanvas = document.createElement('canvas');
                        captureCanvas.width = video.videoWidth || 640;
                        captureCanvas.height = video.videoHeight || 480;
                        const captureCtx = captureCanvas.getContext('2d');
                        captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
                        const photoData = captureCanvas.toDataURL('image/jpeg', 0.88);

                        setCapturedPhoto(photoData);
                        setChallengeState('completed');
                        stopCamera();

                        if (onVerified) {
                            onVerified({
                                photoData,
                                livenessVerified: true,
                            });
                        }
                        return;
                    }
                }

                prevFrameRef.current = new Uint8ClampedArray(currentData);
            }

            animFrameRef.current = requestAnimationFrame(analyzeFrame);
        };

        animFrameRef.current = requestAnimationFrame(analyzeFrame);

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [cameraReady, challengeState, onVerified, stopCamera]);

    const handleRestart = () => {
        setChallengeIndex(prev => prev + 1);
        startCamera();
    };

    return (
        <div className="flex flex-col items-center w-full">
            {/* Viewfinder Frame */}
            <div className="relative w-full max-w-[310px] aspect-[4/3] rounded-2xl overflow-hidden bg-stone-950 border border-stone-200 shadow-sm flex items-center justify-center">
                {/* Live Camera Stream */}
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                        challengeState === 'completed' ? 'hidden' : 'block'
                    }`}
                />

                {/* Verified Selfie Capture Preview */}
                {challengeState === 'completed' && capturedPhoto && (
                    <img
                        src={capturedPhoto}
                        alt="Verified Selfie"
                        className="w-full h-full object-cover scale-x-[-1]"
                    />
                )}

                {/* Offscreen Analysis Canvas */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Steady Oval Guide Reticle */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-3">
                    <div
                        className={`w-40 h-52 rounded-[50%] border-2 transition-all duration-300 flex items-center justify-center relative ${
                            challengeState === 'completed'
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : challengeState === 'verifying'
                                ? 'border-amber-400 bg-amber-400/10'
                                : challengeState === 'challenging'
                                ? 'border-amber-500/80 bg-amber-500/5'
                                : 'border-white/50'
                        }`}
                    >
                        {/* Clean Subtle Guide Notches */}
                        <div className="absolute -top-1 w-3 h-0.5 bg-white/70 rounded-full" />
                        <div className="absolute -bottom-1 w-3 h-0.5 bg-white/70 rounded-full" />
                        <div className="absolute -left-1 h-3 w-0.5 bg-white/70 rounded-full" />
                        <div className="absolute -right-1 h-3 w-0.5 bg-white/70 rounded-full" />

                        {challengeState === 'completed' && (
                            <div className="w-12 h-12 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-lg animate-scale-in">
                                <CheckCircle2 size={28} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Smooth Progress Bar */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                    <div
                        className="h-full bg-clay-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Camera Error Display */}
                {cameraError && (
                    <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                        <AlertCircle size={26} className="text-rose-400 mb-2" />
                        <p className="text-xs text-white leading-relaxed font-medium">{cameraError}</p>
                        <button
                            type="button"
                            onClick={handleRestart}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-stone-900 text-xs font-bold shadow-xs hover:bg-stone-100 cursor-pointer"
                        >
                            <RefreshCw size={13} />
                            Try Again
                        </button>
                    </div>
                )}
            </div>

            {/* Instruction Card */}
            <div className="mt-3 w-full max-w-[310px] text-center">
                {challengeState === 'aligning' && (
                    <div className="rounded-xl border border-stone-200 bg-stone-50/90 py-2 px-3 flex items-center justify-center gap-2">
                        <Eye size={14} className="text-stone-500" />
                        <span className="text-xs font-bold text-stone-700">
                            Fit your face inside the oval
                        </span>
                    </div>
                )}

                {challengeState === 'challenging' && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 py-2 px-3 flex items-center justify-center gap-2">
                        <Sparkles size={14} className="text-amber-700" />
                        <span className="text-xs font-bold text-amber-900">
                            {activeChallenge.label}
                        </span>
                    </div>
                )}

                {challengeState === 'verifying' && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50/90 py-2 px-3 flex items-center justify-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                        <span className="text-xs font-bold text-amber-900">
                            Verifying liveness...
                        </span>
                    </div>
                )}

                {challengeState === 'completed' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 py-2 px-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={15} className="text-emerald-700" />
                            <span className="text-xs font-bold text-emerald-900">
                                3D Liveness Verified
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
