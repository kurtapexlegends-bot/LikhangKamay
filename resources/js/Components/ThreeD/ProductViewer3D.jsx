/* eslint-disable react/no-unknown-property, react-hooks/immutability */
import React, { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, Html, useProgress } from '@react-three/drei';
import GLTFModel from './GLTFModel';
import { Loader2, Box, RotateCcw, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import { ThreeDModelBoundary, ThreeDModelUnavailable } from './ThreeDModelBoundary';
import CraftDimensionOverlay from './CraftDimensionOverlay';
import RealWorldScaleBenchmark, { getRecommendedBenchmarkId, getBenchmarkFraming } from './RealWorldScaleBenchmark';

function CameraController({ targetPos, targetLookAt, userZoom = 1.0, controlsRef }) {
    const { camera } = useThree();
    const animRef = useRef({
        active: false,
        targetPos: new THREE.Vector3(0.35, 0.2, 4.8),
        targetLookAt: new THREE.Vector3(0, 0, 0),
    });
    const isInteractingRef = useRef(false);

    // Track user drag on OrbitControls to avoid fighting manual inspection
    useEffect(() => {
        const controls = controlsRef?.current;
        if (!controls) return;

        const onStart = () => {
            isInteractingRef.current = true;
            animRef.current.active = false;
        };
        const onEnd = () => {
            isInteractingRef.current = false;
        };

        controls.addEventListener('start', onStart);
        controls.addEventListener('end', onEnd);
        return () => {
            controls.removeEventListener('start', onStart);
            controls.removeEventListener('end', onEnd);
        };
    }, [controlsRef]);

    // When framing target changes, initiate smooth glide
    useEffect(() => {
        if (!targetPos || !targetLookAt) return;
        animRef.current.targetPos.copy(targetPos);
        animRef.current.targetLookAt.copy(targetLookAt);
        animRef.current.active = true;
    }, [targetPos, targetLookAt]);

    // Update user manual zoom (+ / - buttons)
    useEffect(() => {
        camera.zoom = userZoom;
        camera.updateProjectionMatrix();
    }, [userZoom, camera]);

    useFrame((_, delta) => {
        if (!animRef.current.active || isInteractingRef.current) return;
        if (!controlsRef?.current) return;

        const lerpFactor = Math.min(delta * 6.0, 1.0);
        camera.position.lerp(animRef.current.targetPos, lerpFactor);
        controlsRef.current.target.lerp(animRef.current.targetLookAt, lerpFactor);
        controlsRef.current.update();

        const posDist = camera.position.distanceTo(animRef.current.targetPos);
        const lookDist = controlsRef.current.target.distanceTo(animRef.current.targetLookAt);
        if (posDist < 0.02 && lookDist < 0.02) {
            camera.position.copy(animRef.current.targetPos);
            controlsRef.current.target.copy(animRef.current.targetLookAt);
            controlsRef.current.update();
            animRef.current.active = false;
        }
    });

    return null;
}

/**
 * ProductViewer3D Component
 * Interactive 3D viewer for product pages (buyer-facing)
 *
 * @param {string} modelUrl - URL to the .glb file
 * @param {string} productName - Product name for display
 * @param {boolean} compact - Compact mode for smaller displays
 * @param {object} dimensions - Optional craft dimensions { height, width, depth }
 * @param {function} onOpenHeightChart - Optional callback to open the 2D height comparison chart
 */
export default function ProductViewer3D({
    modelUrl,
    productName = '3D Model',
    compact = false,
    className = '',
    dimensions = null,
    onOpenHeightChart,
    topLeftAction = null,
    hideBadge = false,
    onScaleBenchmarkChange = null
}) {
    const [autoRotate, setAutoRotate] = useState(true);
    const [zoom, setZoom] = useState(1.0);
    const [showScaleBenchmark, setShowScaleBenchmark] = useState(false);
    
    // Reset zoom and open scale comparison
    const handleOpenScaleBenchmark = useCallback(() => {
        setZoom(1.0);
        setShowScaleBenchmark(true);
    }, []);

    // Notify parent when 3D scale benchmark overlay opens or closes
    useEffect(() => {
        onScaleBenchmarkChange?.(showScaleBenchmark);
    }, [showScaleBenchmark, onScaleBenchmarkChange]);
    
    // Auto-select initial spatially optimal benchmark based on craft height
    const [benchmarkType, setBenchmarkType] = useState(() => getRecommendedBenchmarkId(dimensions?.height));
    const [unit, setUnit] = useState('cm');
    const [canvasKey, setCanvasKey] = useState(0);
    const controlsRef = useRef(null);

    const handleCanvasCreated = useCallback(({ gl }) => {
        const handleContextLost = (event) => {
            event.preventDefault();
            console.warn('WebGL context lost, recovering canvas instance.');
            setCanvasKey((prev) => prev + 1);
        };
        gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    }, []);

    // Sync auto-selection if product dimensions change
    useEffect(() => {
        if (dimensions?.height) {
            setBenchmarkType(getRecommendedBenchmarkId(dimensions.height));
        }
    }, [dimensions?.height]);

    // Compute dynamic camera target & distance framing when comparing against real-world benchmarks
    const framing = useMemo(() => {
        if (!showScaleBenchmark) {
            return {
                targetPos: new THREE.Vector3(0.35, 0.2, 4.8),
                targetLookAt: new THREE.Vector3(0, 0, 0),
            };
        }
        const data = getBenchmarkFraming(benchmarkType, dimensions?.height);
        return {
            targetPos: new THREE.Vector3(data.cameraX, data.cameraY, data.cameraZ),
            targetLookAt: new THREE.Vector3(data.targetX, data.targetY, 0),
        };
    }, [showScaleBenchmark, benchmarkType, dimensions?.height]);

    // Dynamic distance boundaries for smooth, bounded 3D zoom
    const { minDistance, maxDistance } = useMemo(() => {
        if (!showScaleBenchmark) {
            return {
                minDistance: 1.8,
                maxDistance: 9.0,
            };
        }
        const baseZ = framing.targetPos.z || 5.8;
        return {
            minDistance: Math.max(1.8, baseZ * 0.45),
            maxDistance: Math.max(10.0, baseZ * 2.2),
        };
    }, [showScaleBenchmark, framing.targetPos.z]);

    function Loader() {
        const { progress } = useProgress();

        return (
            <Html center>
                <div className="flex flex-col items-center gap-2 text-gray-600">
                    <Loader2 className="w-8 h-8 animate-spin text-clay-600" />
                    <span className="text-xs font-bold">{progress.toFixed(0)}%</span>
                </div>
            </Html>
        );
    }

    const PlaceholderModel = () => (
        <group position={[0, 0, 0]}>
            <mesh scale={0.9} position={[0, 0, 0]} castShadow receiveShadow>
                <torusKnotGeometry args={[0.7, 0.22, 100, 16]} />
                <meshStandardMaterial color="#c07251" roughness={0.3} metalness={0.1} />
            </mesh>
        </group>
    );

    const hasCustomHeight = className.includes('h-');
    const defaultHeightClass = hasCustomHeight ? '' : (compact ? 'h-64 sm:h-72' : 'h-80 sm:h-96 min-h-[320px]');
    const hasCustomBg = className.includes('bg-');
    const defaultBgClass = hasCustomBg ? '' : 'bg-gradient-to-b from-gray-50 to-gray-100';

    return (
        <div className={`relative ${defaultBgClass} rounded-2xl overflow-hidden ${defaultHeightClass} ${className}`}>
            {!showScaleBenchmark && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap max-w-[calc(100%-4.5rem)]">
                    {topLeftAction}
                    {!hideBadge && (
                        <div className="bg-white/90 backdrop-blur px-2.5 py-1.5 rounded-xl border border-gray-200 text-[10px] font-bold text-clay-600 flex items-center gap-1.5 shadow-xs uppercase tracking-wide min-h-[38px]">
                            <Box size={13} /> 3D View
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleOpenScaleBenchmark}
                        aria-label="Compare with real-life benchmark scale"
                        title="Compare with real-life scale"
                        className="flex items-center justify-center w-[38px] h-[38px] rounded-xl border transition shadow-xs cursor-pointer bg-white/90 backdrop-blur text-stone-700 border-gray-200 hover:bg-white active:scale-95 shrink-0"
                    >
                        <Sparkles size={16} className="text-amber-500" />
                    </button>
                </div>
            )}

            {!compact && !showScaleBenchmark && (
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white/90 backdrop-blur p-1 rounded-xl border border-gray-200 shadow-sm">
                    <button
                        onClick={handleOpenScaleBenchmark}
                        className="p-2 rounded-lg transition cursor-pointer hover:bg-gray-100 text-gray-600"
                        title="Compare with Real-Life Benchmark"
                    >
                        <Sparkles size={14} className="text-stone-500" />
                    </button>
                    <button
                        onClick={() => setAutoRotate(!autoRotate)}
                        className={`p-2 rounded-lg transition cursor-pointer ${autoRotate ? 'bg-clay-100 text-clay-700' : 'hover:bg-gray-100 text-gray-600'}`}
                        title={autoRotate ? 'Stop Rotation' : 'Auto Rotate'}
                    >
                        <RotateCcw size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoom((currentZoom) => Math.min(Number((currentZoom + 0.2).toFixed(1)), 2.4))}
                        disabled={zoom >= 2.4}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title={zoom >= 2.4 ? 'Maximum zoom reached' : 'Zoom In'}
                        aria-label="Zoom in 3D camera"
                    >
                        <ZoomIn size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoom((currentZoom) => Math.max(Number((currentZoom - 0.2).toFixed(1)), 0.6))}
                        disabled={zoom <= 0.6}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title={zoom <= 0.6 ? 'Minimum zoom reached' : 'Zoom Out'}
                        aria-label="Zoom out 3D camera"
                    >
                        <ZoomOut size={14} />
                    </button>
                </div>
            )}

            <ThreeDModelBoundary
                resetKey={modelUrl}
                fallback={({ onRetry }) => (
                    <div className="h-full bg-gradient-to-b from-gray-50 to-white">
                        <ThreeDModelUnavailable
                            compact={compact}
                            title={`${productName} 3D view is unavailable`}
                            description="The saved 3D asset is incomplete or temporarily inaccessible."
                            onRetry={onRetry}
                            className="h-full"
                        />
                    </div>
                )}
            >
                <Canvas
                    key={canvasKey}
                    onCreated={handleCanvasCreated}
                    shadows
                    dpr={[1, 2]}
                    camera={{ position: [0.35, 0.2, 4.8], fov: 42, near: 0.1, far: 1000 }}
                    gl={{ preserveDrawingBuffer: true, antialias: true }}
                    className="cursor-grab active:cursor-grabbing"
                >
                    <CameraController
                        targetPos={framing.targetPos}
                        targetLookAt={framing.targetLookAt}
                        userZoom={zoom}
                        controlsRef={controlsRef}
                    />
                    <Suspense fallback={<Loader />}>
                        <Stage preset="rembrandt" intensity={0.5} adjustCamera={false}>
                            {modelUrl ? (
                                <GLTFModel url={modelUrl} />
                            ) : (
                                <PlaceholderModel />
                            )}
                        </Stage>
                        {showScaleBenchmark && (
                            <group>
                                <directionalLight position={[5, 10, 7]} intensity={0.4} />
                                <RealWorldScaleBenchmark
                                    benchmarkId={benchmarkType}
                                    craftHeightCm={dimensions?.height || 22}
                                />
                            </group>
                        )}
                    </Suspense>
                    <OrbitControls
                        ref={controlsRef}
                        autoRotate={autoRotate && !showScaleBenchmark}
                        autoRotateSpeed={2}
                        enableZoom={true}
                        enablePan={false}
                        minDistance={minDistance}
                        maxDistance={maxDistance}
                        zoomSpeed={0.85}
                        enableDamping={true}
                        dampingFactor={0.08}
                        maxPolarAngle={Math.PI / 2 + 0.05}
                    />
                </Canvas>
            </ThreeDModelBoundary>

            {/* Real-World Benchmark Scale HUD & Object Switcher */}
            <CraftDimensionOverlay
                isOpen={showScaleBenchmark}
                onClose={() => setShowScaleBenchmark(false)}
                height={dimensions?.height}
                width={dimensions?.width}
                depth={dimensions?.depth}
                productName={productName}
                selectedBenchmark={benchmarkType}
                onSelectBenchmark={setBenchmarkType}
                unit={unit}
                onToggleUnit={setUnit}
                onOpenHeightChart={onOpenHeightChart}
            />

            {!compact && !showScaleBenchmark && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 via-white/50 to-transparent p-4 pt-8 pointer-events-none">
                    <p className="text-xs text-gray-500 text-center">
                        Drag to rotate • Scroll to zoom
                    </p>
                </div>
            )}
        </div>
    );
}

export const preloadProduct3D = (url, dracoPath) => {
    if (url) {
        GLTFModel.preload(url, dracoPath);
    }
};

ProductViewer3D.preload = preloadProduct3D;
