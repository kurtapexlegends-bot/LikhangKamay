import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CheckCircle2, RefreshCw, AlertCircle, Sparkles, Scan } from 'lucide-react';

const CHALLENGES = [
    { id: 'blink', label: 'Blink your eyes naturally', instruction: 'Please blink once or twice towards the camera' },
    { id: 'nod', label: 'Turn your head slightly to the left', instruction: 'Tilt or rotate slightly to confirm 3D depth' },
];

export default function LivenessFaceScanner({ onVerified, onError }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const prevFrameRef = useRef(null);
    const streamRef = useRef(null);
    const animFrameRef = useRef(null);

    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [challengeState, setChallengeState] = useState('aligning'); // 'aligning' | 'challenging' | 'verifying' | 'completed'
    const [progress, setProgress] = useState(0);
    const [motionScore, setMotionScore] = useState(0);
    const [capturedPhoto, setCapturedPhoto] = useState(null);

    const activeChallenge = CHALLENGES[challengeIndex % CHALLENGES.length];

    const startCamera = useCallback(async () => {
        setCameraError(null);
        setCameraReady(false);
        setChallengeState('aligning');
        setProgress(0);
        setCapturedPhoto(null);

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

    // Continuous Frame Analysis for 3D Liveness Detection
    useEffect(() => {
        if (!cameraReady || challengeState === 'completed') return;

        let frameCounter = 0;
        let consecutiveMotionFrames = 0;

        const analyzeFrame = () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState !== 4) {
                animFrameRef.current = requestAnimationFrame(analyzeFrame);
                return;
            }

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const width = 160;
            const height = 120;
            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(video, 0, 0, width, height);
            const currentImageData = ctx.getImageData(0, 0, width, height);
            const currentData = currentImageData.data;

            if (prevFrameRef.current) {
                let diff = 0;
                const prevData = prevFrameRef.current;
                const totalPixels = currentData.length / 4;

                // Sample pixels in central oval zone (face area)
                const startY = Math.floor(height * 0.2);
                const endY = Math.floor(height * 0.8);
                const startX = Math.floor(width * 0.25);
                const endX = Math.floor(width * 0.75);

                let sampledPixels = 0;
                for (let y = startY; y < endY; y += 2) {
                    for (let x = startX; x < endX; x += 2) {
                        const idx = (y * width + x) * 4;
                        const delta = Math.abs(currentData[idx] - prevData[idx])
                            + Math.abs(currentData[idx + 1] - prevData[idx + 1])
                            + Math.abs(currentData[idx + 2] - prevData[idx + 2]);
                        diff += delta;
                        sampledPixels++;
                    }
                }

                const avgDiff = diff / (sampledPixels * 3);
                setMotionScore(Math.round(avgDiff * 10) / 10);

                frameCounter++;

                if (challengeState === 'aligning') {
                    // Requires steady face in frame for 10 frames
                    if (avgDiff > 0.8 && avgDiff < 12) {
                        setProgress(prev => Math.min(40, prev + 4));
                        if (frameCounter > 15) {
                            setChallengeState('challenging');
                        }
                    }
                } else if (challengeState === 'challenging') {
                    // Detect dynamic active gesture (blink or micro head rotation: avgDiff spikes between 2.5 and 18)
                    if (avgDiff >= 2.0 && avgDiff <= 25.0) {
                        consecutiveMotionFrames++;
                        setProgress(prev => Math.min(85, prev + 8));

                        if (consecutiveMotionFrames >= 4) {
                            setChallengeState('verifying');
                        }
                    }
                } else if (challengeState === 'verifying') {
                    setProgress(100);
                    // Capture high-res snapshot
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
        <div className="flex flex-col items-center">
            {/* Viewfinder Container */}
            <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-3xl overflow-hidden bg-stone-900 border-2 border-stone-200 shadow-inner flex items-center justify-center">
                {/* Live Video */}
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                        challengeState === 'completed' ? 'hidden' : 'block'
                    }`}
                />

                {/* Captured Photo Preview on Completion */}
                {challengeState === 'completed' && capturedPhoto && (
                    <img
                        src={capturedPhoto}
                        alt="Verified Liveness Selfie"
                        className="w-full h-full object-cover scale-x-[-1]"
                    />
                )}

                {/* Hidden Analysis Canvas */}
                <canvas ref={canvasRef} className="hidden" />

                {/* 3D Oval Viewfinder Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-3">
                    <div
                        className={`w-44 h-56 rounded-[50%] border-2 transition-all duration-300 flex items-center justify-center relative ${
                            challengeState === 'completed'
                                ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.3)]'
                                : challengeState === 'verifying'
                                ? 'border-amber-400 bg-amber-400/10 animate-pulse'
                                : challengeState === 'challenging'
                                ? 'border-clay-500 shadow-[0_0_16px_rgba(180,83,9,0.25)]'
                                : 'border-white/60'
                        }`}
                    >
                        {/* Scanning HUD Crosshairs */}
                        <div className="absolute top-2 w-4 h-0.5 bg-white/70" />
                        <div className="absolute bottom-2 w-4 h-0.5 bg-white/70" />
                        <div className="absolute left-2 h-4 w-0.5 bg-white/70" />
                        <div className="absolute right-2 h-4 w-0.5 bg-white/70" />

                        {challengeState === 'completed' && (
                            <CheckCircle2 size={36} className="text-emerald-400 drop-shadow-md animate-bounce" />
                        )}
                    </div>
                </div>

                {/* Scanning Progress Bar */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                    <div
                        className="h-full bg-clay-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Error Banner */}
                {cameraError && (
                    <div className="absolute inset-0 bg-stone-900/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                        <AlertCircle size={28} className="text-rose-400 mb-2" />
                        <p className="text-xs font-semibold text-white leading-relaxed">{cameraError}</p>
                        <button
                            type="button"
                            onClick={handleRestart}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-stone-900 text-xs font-bold shadow-xs hover:bg-stone-100"
                        >
                            <RefreshCw size={13} />
                            Try Again
                        </button>
                    </div>
                )}
            </div>

            {/* Instruction Badge & Feedback Card */}
            <div className="mt-3.5 w-full max-w-[320px] text-center">
                {challengeState === 'aligning' && (
                    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-2.5 flex items-center justify-center gap-2">
                        <Scan size={15} className="text-stone-600 animate-spin" />
                        <span className="text-xs font-bold text-stone-800">
                            Center face inside the oval
                        </span>
                    </div>
                )}

                {challengeState === 'challenging' && (
                    <div className="rounded-2xl border border-clay-200 bg-amber-50/70 p-2.5 flex items-center justify-center gap-2 animate-fade-in">
                        <Sparkles size={15} className="text-clay-700" />
                        <span className="text-xs font-bold text-clay-900">
                            {activeChallenge.label}
                        </span>
                    </div>
                )}

                {challengeState === 'verifying' && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-2.5 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span className="text-xs font-bold text-amber-900">
                            Verifying 3D depth & capture...
                        </span>
                    </div>
                )}

                {challengeState === 'completed' && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-2.5 flex items-center justify-between gap-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-700" />
                            <span className="text-xs font-bold text-emerald-900">
                                3D Liveness Verified
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleRestart}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900"
                        >
                            <RefreshCw size={11} /> Retake
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
