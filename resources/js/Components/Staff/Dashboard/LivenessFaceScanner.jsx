import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CheckCircle2, RefreshCw, AlertCircle, Sparkles, Scan, Eye, Check, UserCheck, AlertTriangle } from 'lucide-react';

export default function LivenessFaceScanner({ onVerified, onError }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const isCompletedRef = useRef(false);
    const isModelLoadedRef = useRef(false);
    const isProcessingRef = useRef(false);
    const animFrameRef = useRef(null);

    // Dynamic Challenge State
    const challengePhaseRef = useRef('align'); // 'align' -> 'gesture' -> 'verified'
    const baselineEARRef = useRef(null);
    const blinkDetectedRef = useRef(false);
    const headMovementRef = useRef(false);
    const initialNoseXRef = useRef(null);

    // Callbacks
    const onVerifiedRef = useRef(onVerified);
    onVerifiedRef.current = onVerified;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const [cameraReady, setCameraReady] = useState(false);
    const [modelLoading, setModelLoading] = useState(true);
    const [cameraError, setCameraError] = useState(null);
    
    // UI state
    const [faceDetected, setFaceDetected] = useState(false);
    const [isInsideOval, setIsInsideOval] = useState(false);
    const [scanState, setScanState] = useState('aligning'); // 'aligning' | 'gesture' | 'completed'
    const [statusMessage, setStatusMessage] = useState('Loading face detection models...');
    const [capturedPhoto, setCapturedPhoto] = useState(null);

    // Stop camera stream & analysis loop
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

    // Take High-Resolution Snapshot with Visual Timestamp Watermark
    const executeCapture = useCallback(() => {
        if (isCompletedRef.current) return;
        isCompletedRef.current = true;

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

            // Subtle official verification watermark
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(10, captureCanvas.height - 35, 240, 25);
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#FFFFFF';
            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            ctx.fillText(`LikhangKamay • ${now}`, 20, captureCanvas.height - 18);

            const photoData = captureCanvas.toDataURL('image/jpeg', 0.88);

            setCapturedPhoto(photoData);
            setScanState('completed');
            stopCamera();

            if (onVerifiedRef.current) {
                onVerifiedRef.current({
                    photoData,
                    livenessVerified: true,
                });
            }
        } catch (err) {
            console.error('Snapshot capture error:', err);
        }
    }, [stopCamera]);

    // Load lightweight face-api models from /models/face
    useEffect(() => {
        let isMounted = true;

        const loadModels = async () => {
            try {
                setModelLoading(true);
                setStatusMessage('Initializing face detector...');

                await faceapi.nets.tinyFaceDetector.loadFromUri('/models/face');
                await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models/face');

                if (isMounted) {
                    isModelLoadedRef.current = true;
                    setModelLoading(false);
                    setStatusMessage('Please center your face inside the oval');
                }
            } catch (err) {
                console.error('Face detector model loading error:', err);
                if (isMounted) {
                    setModelLoading(false);
                    setStatusMessage('Ready for face scan');
                }
            }
        };

        loadModels();

        return () => {
            isMounted = false;
        };
    }, []);

    // Start user camera stream
    const startCamera = useCallback(async () => {
        stopCamera();
        isCompletedRef.current = false;
        challengePhaseRef.current = 'align';
        baselineEARRef.current = null;
        blinkDetectedRef.current = false;
        headMovementRef.current = false;
        initialNoseXRef.current = null;

        setCameraError(null);
        setCameraReady(false);
        setScanState('aligning');
        setCapturedPhoto(null);
        setFaceDetected(false);
        setIsInsideOval(false);

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
            if (onErrorRef.current) onErrorRef.current(msg);
        }
    }, [stopCamera]);

    // Mount camera strictly once on component mount
    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Continuous Real Face Detection & 3D Liveness Tracking
    useEffect(() => {
        if (!cameraReady || isCompletedRef.current) return;

        let lastDetectTime = 0;

        const processDetection = async (timestamp) => {
            if (isCompletedRef.current) return;

            const video = videoRef.current;
            if (!video || video.readyState !== 4 || isProcessingRef.current) {
                animFrameRef.current = requestAnimationFrame(processDetection);
                return;
            }

            // Throttle detection to ~8 FPS (every 120ms) to ensure smooth UI and zero lag
            if (timestamp - lastDetectTime >= 120) {
                lastDetectTime = timestamp;
                isProcessingRef.current = true;

                try {
                    if (isModelLoadedRef.current) {
                        const detectorOptions = new faceapi.TinyFaceDetectorOptions({
                            inputSize: 160,
                            scoreThreshold: 0.45,
                        });

                        const detection = await faceapi
                            .detectSingleFace(video, detectorOptions)
                            .withFaceLandmarks(true);

                        if (detection) {
                            setFaceDetected(true);

                            const { box } = detection.detection;
                            const videoW = video.videoWidth || 640;
                            const videoH = video.videoHeight || 480;

                            // Calculate if face center is inside the central oval boundary
                            const faceCenterX = box.x + box.width / 2;
                            const faceCenterY = box.y + box.height / 2;

                            const ovalCenterX = videoW / 2;
                            const ovalCenterY = videoH / 2;
                            const ovalRadiusX = videoW * 0.28;
                            const ovalRadiusY = videoH * 0.38;

                            const normalizedX = (faceCenterX - ovalCenterX) / ovalRadiusX;
                            const normalizedY = (faceCenterY - ovalCenterY) / ovalRadiusY;
                            const insideOval = (normalizedX * normalizedX + normalizedY * normalizedY) <= 1.25 && (box.width / videoW >= 0.2);

                            setIsInsideOval(insideOval);

                            if (insideOval) {
                                const landmarks = detection.landmarks;
                                const leftEye = landmarks.getLeftEye();
                                const rightEye = landmarks.getRightEye();
                                const nose = landmarks.getNose();

                                // Calculate Eye Aspect Ratio (EAR) for blink detection
                                const calcEyeOpenness = (eyePts) => {
                                    const v1 = Math.hypot(eyePts[1].x - eyePts[5].x, eyePts[1].y - eyePts[5].y);
                                    const v2 = Math.hypot(eyePts[2].x - eyePts[4].x, eyePts[2].y - eyePts[4].y);
                                    const h = Math.hypot(eyePts[0].x - eyePts[3].x, eyePts[0].y - eyePts[3].y);
                                    return (v1 + v2) / (2.0 * (h || 1));
                                };

                                const avgEAR = (calcEyeOpenness(leftEye) + calcEyeOpenness(rightEye)) / 2;

                                if (challengePhaseRef.current === 'align') {
                                    challengePhaseRef.current = 'gesture';
                                    setScanState('gesture');
                                    baselineEARRef.current = avgEAR;
                                    initialNoseXRef.current = nose[3]?.x || faceCenterX;
                                    setStatusMessage('Face detected! Please blink naturally or tilt your head');
                                } else if (challengePhaseRef.current === 'gesture') {
                                    // Check 1: Natural Blink Detection
                                    if (baselineEARRef.current && (avgEAR < baselineEARRef.current * 0.65 || avgEAR < 0.18)) {
                                        blinkDetectedRef.current = true;
                                    }

                                    // Check 2: Head Movement / 3D Turn Detection
                                    const currentNoseX = nose[3]?.x || faceCenterX;
                                    if (initialNoseXRef.current && Math.abs(currentNoseX - initialNoseXRef.current) > (videoW * 0.035)) {
                                        headMovementRef.current = true;
                                    }

                                    // If either natural blink or slight head movement is confirmed:
                                    if (blinkDetectedRef.current || headMovementRef.current) {
                                        setStatusMessage('Liveness verified! Capturing...');
                                        executeCapture();
                                        return;
                                    }
                                }
                            } else {
                                setStatusMessage('Move closer and center your face');
                            }
                        } else {
                            // NO FACE FOUND (e.g. looking away, covered camera, empty room)
                            setFaceDetected(false);
                            setIsInsideOval(false);
                            setStatusMessage('No face detected. Please face the camera');
                        }
                    }
                } catch (detectErr) {
                    console.warn('Face detection pass error:', detectErr);
                } finally {
                    isProcessingRef.current = false;
                }
            }

            if (!isCompletedRef.current) {
                animFrameRef.current = requestAnimationFrame(processDetection);
            }
        };

        animFrameRef.current = requestAnimationFrame(processDetection);

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
        };
    }, [cameraReady, executeCapture]);

    const handleRestart = () => {
        startCamera();
    };

    return (
        <div className="flex flex-col items-center w-full">
            {/* Viewfinder Container */}
            <div className="relative w-full max-w-[310px] aspect-[4/3] rounded-2xl overflow-hidden bg-stone-950 border border-stone-200 shadow-sm flex items-center justify-center">
                {/* Live Camera Stream */}
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

                {/* Steady Oval Guide Reticle */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-3">
                    <div
                        className={`w-40 h-52 rounded-[50%] border-2 transition-all duration-300 flex items-center justify-center relative ${
                            scanState === 'completed'
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : isInsideOval
                                ? 'border-emerald-400 bg-emerald-400/5 ring-4 ring-emerald-400/20'
                                : faceDetected
                                ? 'border-amber-400 bg-amber-400/5'
                                : 'border-white/50'
                        }`}
                    >
                        {/* Clean Subtle Guide Notches */}
                        <div className="absolute -top-1 w-3 h-0.5 bg-white/70 rounded-full" />
                        <div className="absolute -bottom-1 w-3 h-0.5 bg-white/70 rounded-full" />
                        <div className="absolute -left-1 h-3 w-0.5 bg-white/70 rounded-full" />
                        <div className="absolute -right-1 h-3 w-0.5 bg-white/70 rounded-full" />

                        {/* Verified Success Badge */}
                        {scanState === 'completed' && (
                            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
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

            {/* Real-time Status Card & Manual Action */}
            <div className="mt-3 w-full max-w-[310px] space-y-2">
                {scanState !== 'completed' ? (
                    <div className="flex items-center gap-2">
                        <div className={`flex-1 rounded-xl border py-2 px-3 flex items-center justify-center gap-1.5 text-center ${
                            isInsideOval
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 font-bold text-xs'
                                : faceDetected
                                ? 'border-amber-200 bg-amber-50 text-amber-900 font-medium text-xs'
                                : 'border-stone-200 bg-stone-50 text-stone-700 font-medium text-xs'
                        }`}>
                            {isInsideOval ? (
                                <>
                                    <Sparkles size={14} className="text-emerald-700 shrink-0" />
                                    <span>Blink or turn slightly...</span>
                                </>
                            ) : faceDetected ? (
                                <>
                                    <UserCheck size={14} className="text-amber-700 shrink-0" />
                                    <span>Center face inside oval</span>
                                </>
                            ) : (
                                <>
                                    <Eye size={14} className="text-stone-500 shrink-0" />
                                    <span>{statusMessage}</span>
                                </>
                            )}
                        </div>

                        {/* Snap Now Button: Only active when an actual human face is present! */}
                        <button
                            type="button"
                            onClick={executeCapture}
                            disabled={!faceDetected}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-clay-700 hover:bg-clay-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-bold shadow-xs cursor-pointer disabled:cursor-not-allowed transition active:scale-95 shrink-0"
                            title={faceDetected ? 'Capture selfie now' : 'Face must be detected first'}
                        >
                            <Camera size={13} />
                            Snap Now
                        </button>
                    </div>
                ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 py-2 px-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={15} className="text-emerald-700" />
                            <span className="text-xs font-bold text-emerald-900">
                                3D Liveness Verified &amp; Captured
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
