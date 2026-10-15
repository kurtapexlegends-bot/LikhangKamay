/* eslint-disable react/no-unknown-property, react-hooks/immutability */
import React, { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, Html, useProgress } from '@react-three/drei';
import GLTFModel from './GLTFModel';
import { Loader2, Box, RotateCcw, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import { ThreeDModelBoundary, ThreeDModelUnavailable } from './ThreeDModelBoundary';
import CraftDimensionOverlay from './CraftDimensionOverlay';
import RealWorldScaleBenchmark, { getRecommendedBenchmarkId, getBenchmarkFraming } from './RealWorldScaleBenchmark';

function CameraController({ zoom, targetX = 0, targetY = 0, controlsRef }) {
    const { camera } = useThree();
    useEffect(() => {
        camera.zoom = zoom;
        camera.position.set(targetX + 0.35, targetY + 0.2, camera.position.z);
        camera.updateProjectionMatrix();

        if (controlsRef?.current) {
            controlsRef.current.target.set(targetX, targetY, 0);
            controlsRef.current.update();
        }
    }, [zoom, targetX, targetY, camera, controlsRef]);
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

    // Compute dynamic camera target & zoom framing when comparing against real-world benchmarks
    const framing = useMemo(() => {
        if (!showScaleBenchmark) {
            return { targetX: 0, targetY: 0, optimalZoom: 1.0 };
        }
        return getBenchmarkFraming(benchmarkType, dimensions?.height);
    }, [showScaleBenchmark, benchmarkType, dimensions?.height]);

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
    const defaultHeightClass = compact ? 'h-64 sm:h-72' : 'h-80 sm:h-96 min-h-[320px]';

    return (
        <div className={`relative bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl overflow-hidden ${hasCustomHeight ? '' : defaultHeightClass} ${className}`}>
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
                        onClick={() => setShowScaleBenchmark(true)}
                        className="px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition shadow-xs cursor-pointer bg-white/90 backdrop-blur text-stone-700 border-gray-200 hover:bg-white active:scale-95 min-h-[38px] shrink-0"
                        title="Compare with Real-Life Benchmark"
                    >
                        <Sparkles size={13} className="text-amber-500" />
                        <span className="hidden sm:inline">Real-Life Scale</span>
                    </button>
                </div>
            )}

            {!compact && !showScaleBenchmark && (
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white/90 backdrop-blur p-1 rounded-xl border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setShowScaleBenchmark(true)}
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
                        onClick={() => setZoom((currentZoom) => Math.min(currentZoom + 0.2, 2))}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer"
                        title="Zoom In"
                    >
                        <ZoomIn size={14} />
                    </button>
                    <button
                        onClick={() => setZoom((currentZoom) => Math.max(currentZoom - 0.2, 0.5))}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer"
                        title="Zoom Out"
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
                    camera={{ position: [0.35, 0.2, 5.0], fov: 42 }}
                    gl={{ preserveDrawingBuffer: true, antialias: true }}
                    className="cursor-grab active:cursor-grabbing"
                >
                    <CameraController
                        zoom={framing.optimalZoom * zoom}
                        targetX={framing.targetX}
                        targetY={framing.targetY}
                        controlsRef={controlsRef}
                    />
                    <Suspense fallback={<Loader />}>
                        <Stage preset="rembrandt" intensity={0.5} adjustCamera={false}>
                            <group>
                                {modelUrl ? (
                                    <GLTFModel url={modelUrl} />
                                ) : (
                                    <PlaceholderModel />
                                )}
                                {showScaleBenchmark && (
                                    <RealWorldScaleBenchmark
                                        benchmarkId={benchmarkType}
                                        craftHeightCm={dimensions?.height || 22}
                                    />
                                )}
                            </group>
                        </Stage>
                    </Suspense>
                    <OrbitControls
                        ref={controlsRef}
                        autoRotate={autoRotate && !showScaleBenchmark}
                        autoRotateSpeed={2}
                        enableZoom={true}
                        enablePan={false}
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
