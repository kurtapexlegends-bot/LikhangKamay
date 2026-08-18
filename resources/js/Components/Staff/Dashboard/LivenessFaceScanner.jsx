import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CheckCircle2, RefreshCw, AlertCircle, Sparkles, Eye, Check, ArrowLeft, ArrowRight, ArrowUp, Smile, ShieldCheck } from 'lucide-react';

const CHALLENGE_POOL = [
    { id: 'turn_left', label: 'Turn head slightly LEFT', instruction: 'Turn your face gently to the left', icon: ArrowLeft },
    { id: 'turn_right', label: 'Turn head slightly RIGHT', instruction: 'Turn your face gently to the right', icon: ArrowRight },
    { id: 'smile', label: 'Smile or open mouth', instruction: 'Show a natural smile to the camera', icon: Smile },
    { id: 'nod', label: 'Nod or tilt head UP', instruction: 'Tilt your chin and head upward', icon: ArrowUp },
];

function generateChallengeSequence() {
    const shuffled = [...CHALLENGE_POOL].sort(() => 0.5 - Math.random());
    return [shuffled[0], shuffled[1]];
}

export default function LivenessFaceScanner({ onVerified, onError }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const isCompletedRef = useRef(false);
    const isModelLoadedRef = useRef(false);
    const isProcessingRef = useRef(false);
    const animFrameRef = useRef(null);
    const transitionTimerRef = useRef(null);

    // Challenge & Calibration State (Refs for stable animation loop)
    const challengesRef = useRef(generateChallengeSequence());
    const currentStepIndexRef = useRef(0);
    const isCalibratingStepRef = useRef(false);
    const baselineYawRef = useRef(null);
    const baselinePitchRef = useRef(null);
    const baselineMARRef = useRef(null);
    const consecutivePassFramesRef = useRef(0);

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
    const [currentStep, setCurrentStep] = useState(0); // 0 = Step 1, 1 = Step 2, 2 = Completed
    const [activeChallenges, setActiveChallenges] = useState(challengesRef.current);
    const [scanPhase, setScanPhase] = useState('align'); // 'align' | 'calibrating' | 'challenge' | 'completed'
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [step1Passed, setStep1Passed] = useState(false);

    // Stop camera stream & timers
    const stopCamera = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (transitionTimerRef.current) {
            clearTimeout(transitionTimerRef.current);
            transitionTimerRef.current = null;
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
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            // Subtle official verification watermark
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(10, captureCanvas.height - 35, 260, 25);
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#FFFFFF';
            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            ctx.fillText(`LikhangKamay • 3D Biometric Verified • ${now}`, 20, captureCanvas.height - 18);

            const photoData = captureCanvas.toDataURL('image/jpeg', 0.88);

            setCapturedPhoto(photoData);
            setCurrentStep(2);
            setScanPhase('completed');
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
                await faceapi.nets.tinyFaceDetector.loadFromUri('/models/face');
                await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models/face');

                if (isMounted) {
                    isModelLoadedRef.current = true;
                    setModelLoading(false);
                }
            } catch (err) {
                console.error('Face detector model loading error:', err);
                if (isMounted) {
                    setModelLoading(false);
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
        challengesRef.current = generateChallengeSequence();
        setActiveChallenges(challengesRef.current);
        currentStepIndexRef.current = 0;
        setCurrentStep(0);
        setStep1Passed(false);
        setScanPhase('align');
        isCalibratingStepRef.current = false;
        baselineYawRef.current = null;
        baselinePitchRef.current = null;
        baselineMARRef.current = null;
        consecutivePassFramesRef.current = 0;

        setCameraError(null);
        setCameraReady(false);
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

    // Continuous Real Face Detection & Interactive 3D Liveness Tracking
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

            // Process detection at ~10 FPS (every 100ms)
            if (timestamp - lastDetectTime >= 100) {
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

                            // Central oval boundary validation
                            const faceCenterX = box.x + box.width / 2;
                            const faceCenterY = box.y + box.height / 2;

                            const ovalCenterX = videoW / 2;
                            const ovalCenterY = videoH / 2;
                            const ovalRadiusX = videoW * 0.32;
                            const ovalRadiusY = videoH * 0.42;

                            const normalizedX = (faceCenterX - ovalCenterX) / ovalRadiusX;
                            const normalizedY = (faceCenterY - ovalCenterY) / ovalRadiusY;
                            const insideOval = (normalizedX * normalizedX + normalizedY * normalizedY) <= 1.35 && (box.width / videoW >= 0.20);

                            setIsInsideOval(insideOval);

                            if (insideOval) {
                                const landmarks = detection.landmarks;
                                const leftEye = landmarks.getLeftEye();
                                const rightEye = landmarks.getRightEye();
                                const nose = landmarks.getNose();
                                const mouth = landmarks.getMouth();
                                const jaw = landmarks.getJawOutline();

                                // 1. 3D Head Yaw Asymmetry (Nose to Left Eye vs Nose to Right Eye)
                                const noseTip = nose[3] || nose[0];
                                const distLeft = Math.abs(noseTip.x - leftEye[0].x);
                                const distRight = Math.abs(rightEye[3].x - noseTip.x);
                                const currentYaw = distLeft / (distRight || 1);

                                // 2. Mouth Opening Ratio (MAR) for smile / open mouth
                                const mouthHeight = Math.hypot(mouth[18].x - mouth[14].x, mouth[18].y - mouth[14].y);
                                const mouthWidth = Math.hypot(mouth[6].x - mouth[0].x, mouth[6].y - mouth[0].y);
                                const currentMAR = mouthHeight / (mouthWidth || 1);

                                // 3. 3D Head Pitch Ratio (Nose to Chin vs Nose to Eyes)
                                const eyeCenterY = (leftEye[0].y + rightEye[3].y) / 2;
                                const chinY = jaw[8]?.y || (box.y + box.height);
                                const distNoseToChin = Math.abs(chinY - noseTip.y);
                                const distNoseToEyes = Math.abs(noseTip.y - eyeCenterY);
                                const currentPitch = distNoseToChin / (distNoseToEyes || 1);

                                // PHASE 1: Initial Face Alignment inside oval
                                if (scanPhase === 'align') {
                                    consecutivePassFramesRef.current++;

                                    if (consecutivePassFramesRef.current >= 4) {
                                        consecutivePassFramesRef.current = 0;
                                        setScanPhase('calibrating');
                                        isCalibratingStepRef.current = true;

                                        // 1.0s Pause to allow user to read Step 1 instruction & calibrate neutral pose
                                        transitionTimerRef.current = setTimeout(() => {
                                            baselineYawRef.current = currentYaw;
                                            baselinePitchRef.current = currentPitch;
                                            baselineMARRef.current = currentMAR;
                                            isCalibratingStepRef.current = false;
                                            setScanPhase('challenge');
                                        }, 1000);
                                    }
                                } 
                                // PHASE 2: Interactive Challenge Validation (Only runs after 1s calibration finishes)
                                else if (scanPhase === 'challenge' && !isCalibratingStepRef.current) {
                                    const currentChallenge = challengesRef.current[currentStepIndexRef.current];
                                    let passedCurrent = false;

                                    if (currentChallenge.id === 'turn_left') {
                                        // User turning left moves nose right in mirrored frame
                                        const baseline = baselineYawRef.current || 1.0;
                                        if (currentYaw >= baseline * 1.38 || currentYaw > 1.60) {
                                            passedCurrent = true;
                                        }
                                    } else if (currentChallenge.id === 'turn_right') {
                                        // User turning right moves nose left in mirrored frame
                                        const baseline = baselineYawRef.current || 1.0;
                                        if (currentYaw <= baseline * 0.68 || currentYaw < 0.65) {
                                            passedCurrent = true;
                                        }
                                    } else if (currentChallenge.id === 'smile') {
                                        // Smile / Open Mouth
                                        const baseline = baselineMARRef.current || 0.15;
                                        if (currentMAR >= baseline * 1.40 && currentMAR > 0.24) {
                                            passedCurrent = true;
                                        }
                                    } else if (currentChallenge.id === 'nod') {
                                        // 3D Head Tilt / Nod UP: requires genuine upward chin movement relative to neutral baseline
                                        const baseline = baselinePitchRef.current || 1.4;
                                        if (currentPitch >= baseline * 1.30 && currentPitch > 1.70) {
                                            passedCurrent = true;
                                        }
                                    }

                                    if (passedCurrent) {
                                        consecutivePassFramesRef.current++;

                                        if (consecutivePassFramesRef.current >= 2) {
                                            consecutivePassFramesRef.current = 0;

                                            if (currentStepIndexRef.current === 0) {
                                                // Step 1 passed! Set green check and start 1-second transition to Step 2
                                                setStep1Passed(true);
                                                setCurrentStep(1);
                                                currentStepIndexRef.current = 1;
                                                setScanPhase('calibrating');
                                                isCalibratingStepRef.current = true;

                                                // 1-second pause to let user read Step 2 challenge and calibrate pose
                                                transitionTimerRef.current = setTimeout(() => {
                                                    baselineYawRef.current = currentYaw;
                                                    baselinePitchRef.current = currentPitch;
                                                    baselineMARRef.current = currentMAR;
                                                    isCalibratingStepRef.current = false;
                                                    setScanPhase('challenge');
                                                }, 1000);
                                            } else {
                                                // Step 2 passed! Execute verified capture
                                                executeCapture();
                                                return;
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            setFaceDetected(false);
                            setIsInsideOval(false);
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
    }, [cameraReady, scanPhase, executeCapture]);

    const handleRestart = () => {
        startCamera();
    };

    const currentChallenge = activeChallenges[currentStep] || activeChallenges[0];
    const ChallengeIcon = currentChallenge?.icon || Sparkles;

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
                        scanPhase === 'completed' ? 'hidden' : 'block'
                    }`}
                />

                {/* Captured Photo (Preview) */}
                {scanPhase === 'completed' && capturedPhoto && (
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
                            scanPhase === 'completed'
                                ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                : isInsideOval
                                ? 'border-emerald-400 bg-emerald-400/5 ring-4 ring-emerald-400/20'
                                : faceDetected
                                ? 'border-amber-400 bg-amber-400/5'
                                : 'border-white/50'
                        }`}
                    >
                        {/* Guide Notches */}
                        <div className="absolute -top-1 w-3 h-0.5 bg-white/70 rounded-full" />
                        <div className="absolute -bottom-1 w-3 h-0.5 bg-white/70 rounded-full" />
                        <div className="absolute -left-1 h-3 w-0.5 bg-white/70 rounded-full" />
                        <div className="absolute -right-1 h-3 w-0.5 bg-white/70 rounded-full" />

                        {/* Verified Success Badge */}
                        {scanPhase === 'completed' && (
                            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-scale-in">
                                <Check size={28} strokeWidth={3} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Challenge Progress Bar */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-black/40 flex">
                    <div
                        className={`h-full transition-all duration-300 ${
                            step1Passed ? 'bg-emerald-500 w-1/2' : isInsideOval ? 'bg-amber-400 w-1/4' : 'bg-transparent w-0'
                        }`}
                    />
                    <div
                        className={`h-full transition-all duration-300 ${
                            currentStep >= 2 ? 'bg-emerald-500 w-1/2' : 'bg-transparent w-0'
                        }`}
                    />
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

            {/* Interactive Challenge Prompter */}
            <div className="mt-3 w-full max-w-[310px] space-y-2">
                {scanPhase === 'align' && (
                    <div className={`rounded-xl border py-2 px-3 flex items-center justify-center gap-2 text-center transition ${
                        isInsideOval
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 font-bold text-xs'
                            : faceDetected
                            ? 'border-amber-200 bg-amber-50 text-amber-900 font-medium text-xs'
                            : 'border-stone-200 bg-stone-50 text-stone-700 font-medium text-xs'
                    }`}>
                        <Eye size={15} className={isInsideOval ? 'text-emerald-700' : 'text-stone-500'} />
                        <span>{isInsideOval ? 'Face aligned! Preparing challenges...' : 'Fit real face inside the oval'}</span>
                    </div>
                )}

                {(scanPhase === 'challenge' || scanPhase === 'calibrating') && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-3 space-y-2 shadow-2xs animate-fade-in">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                                <ShieldCheck size={12} className="text-amber-700" />
                                3D Liveness Step {currentStep + 1} of 2
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full transition-all ${step1Passed ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-amber-600'}`} />
                                <span className={`w-2 h-2 rounded-full transition-all ${currentStep >= 2 ? 'bg-emerald-600' : 'bg-stone-300'}`} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 bg-white/80 rounded-lg p-2 border border-amber-200/80">
                            <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center shrink-0 shadow-2xs transition-colors ${
                                scanPhase === 'calibrating' ? 'bg-stone-600 animate-pulse' : 'bg-amber-500'
                            }`}>
                                <ChallengeIcon size={18} />
                            </div>
                            <div className="text-left">
                                <h5 className="text-xs font-black text-stone-900 leading-tight">
                                    {scanPhase === 'calibrating' ? `Get ready for Step ${currentStep + 1}...` : currentChallenge.label}
                                </h5>
                                <p className="text-[10px] text-stone-500 font-medium">
                                    {scanPhase === 'calibrating' ? currentChallenge.instruction : currentChallenge.instruction}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {scanPhase === 'completed' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 px-3 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-700" />
                            <div>
                                <h6 className="text-xs font-bold text-emerald-950">3D Liveness Verified</h6>
                                <p className="text-[10px] text-emerald-700 font-medium">Interactive challenges passed</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleRestart}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-stone-800 cursor-pointer bg-white px-2 py-1 rounded-lg border border-stone-200"
                        >
                            <RefreshCw size={11} /> Retake
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
