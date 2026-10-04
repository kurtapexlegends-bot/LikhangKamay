/* eslint-disable react/no-unknown-property */
import React, { Suspense, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, Html, useProgress } from '@react-three/drei';
import GLTFModel from './GLTFModel';
import { Loader2, Box, RotateCcw, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import { ThreeDModelBoundary, ThreeDModelUnavailable } from './ThreeDModelBoundary';
import CraftDimensionOverlay from './CraftDimensionOverlay';
import RealWorldScaleBenchmark, { getRecommendedBenchmarkId } from './RealWorldScaleBenchmark';

function CameraController({ zoom }) {
    const { camera } = useThree();
    useEffect(() => {
        // eslint-disable-next-line react-hooks/immutability
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
    }, [zoom, camera]);
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
    onOpenHeightChart
}) {
    const [autoRotate, setAutoRotate] = useState(true);
    const [zoom, setZoom] = useState(1.0);
    const [showScaleBenchmark, setShowScaleBenchmark] = useState(false);
    
    // Auto-select initial spatially optimal benchmark based on craft height
    const [benchmarkType, setBenchmarkType] = useState(() => getRecommendedBenchmarkId(dimensions?.height));
    const [unit, setUnit] = useState('cm');

    // Sync auto-selection if product dimensions change
    useEffect(() => {
        if (dimensions?.height) {
            setBenchmarkType(getRecommendedBenchmarkId(dimensions.height));
        }
    }, [dimensions?.height]);

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

    return (
        <div className={`relative bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl overflow-hidden ${compact ? 'h-64' : 'h-96'} ${className}`}>
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                <div className="bg-white/90 backdrop-blur px-2.5 py-1 rounded-full border border-gray-200 text-[10px] font-bold text-clay-600 flex items-center gap-1.5 shadow-sm uppercase tracking-wide">
                    <Box size={12} /> 3D View
                </div>
                <button
                    type="button"
                    onClick={() => setShowScaleBenchmark(!showScaleBenchmark)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition shadow-sm cursor-pointer ${
                        showScaleBenchmark ? 'bg-amber-500 text-stone-950 border-amber-500' : 'bg-white/90 backdrop-blur text-stone-700 border-gray-200 hover:bg-white'
                    }`}
                    title={showScaleBenchmark ? 'Hide Real-World Scale' : 'Compare with Real-Life Benchmark'}
                >
                    <Sparkles size={11} className={showScaleBenchmark ? 'text-stone-950' : 'text-amber-500'} />
                    <span>Real-Life Scale</span>
                </button>
            </div>

            {!compact && (
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white/90 backdrop-blur p-1 rounded-xl border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setShowScaleBenchmark(!showScaleBenchmark)}
                        className={`p-2 rounded-lg transition cursor-pointer ${showScaleBenchmark ? 'bg-amber-100 text-amber-800' : 'hover:bg-gray-100 text-gray-600'}`}
                        title={showScaleBenchmark ? 'Hide Real-World Scale' : 'Compare with Real-Life Benchmark'}
                    >
                        <Sparkles size={14} className={showScaleBenchmark ? 'text-amber-700' : 'text-stone-500'} />
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
                    shadows
                    dpr={[1, 2]}
                    camera={{ position: [0.35, 0.2, 5.0], fov: 42 }}
                    gl={{ preserveDrawingBuffer: true, antialias: true }}
                    className="cursor-grab active:cursor-grabbing"
                >
                    <CameraController zoom={zoom} />
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
                        autoRotate={autoRotate}
                        autoRotateSpeed={2}
                        enableZoom={true}
                        enablePan={false}
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
