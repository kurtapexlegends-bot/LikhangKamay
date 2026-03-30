import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, useProgress } from '@react-three/drei';
import GLTFModel from './GLTFModel';
import { Loader2, Box, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

/**
 * ProductViewer3D Component
 * Interactive 3D viewer for product pages (buyer-facing)
 * 
 * @param {string} modelUrl - URL to the .glb file
 * @param {string} productName - Product name for display
 * @param {boolean} compact - Compact mode for smaller displays
 */
export default function ProductViewer3D({ 
    modelUrl, 
    productName = '3D Model',
    compact = false,
    className = ''
}) {
    const [autoRotate, setAutoRotate] = useState(true);
    const [zoom, setZoom] = useState(1);

    // Loading indicator
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

    // Placeholder when no model
    const PlaceholderModel = () => (
        <mesh>
            <torusKnotGeometry args={[0.8, 0.25, 100, 16]} />
            <meshStandardMaterial color="#c07251" roughness={0.3} metalness={0.1} />
        </mesh>
    );

    return (
        <div className={`relative bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl overflow-hidden ${compact ? 'h-64' : 'h-96'} ${className}`}>
            
            {/* 3D Badge */}
            <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full border border-gray-200 text-[10px] font-bold text-clay-600 flex items-center gap-1.5 shadow-sm uppercase tracking-wide">
                <Box size={12} /> 3D View
            </div>

            {/* Controls */}
            {!compact && (
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white/90 backdrop-blur p-1 rounded-xl border border-gray-200 shadow-sm">
                    <button 
                        onClick={() => setAutoRotate(!autoRotate)}
                        className={`p-2 rounded-lg transition ${autoRotate ? 'bg-clay-100 text-clay-700' : 'hover:bg-gray-100 text-gray-600'}`}
                        title={autoRotate ? 'Stop Rotation' : 'Auto Rotate'}
                    >
                        <RotateCcw size={14} />
                    </button>
                    <button 
                        onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        title="Zoom In"
                    >
                        <ZoomIn size={14} />
                    </button>
                    <button 
                        onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        title="Zoom Out"
                    >
                        <ZoomOut size={14} />
                    </button>
                </div>
            )}

            {/* Canvas */}
            <Canvas
                dpr={[1, 2]}
                camera={{ fov: 45, position: [0, 0, 5] }}
                className="cursor-grab active:cursor-grabbing"
                shadows
            >
                <color attach="background" args={['#f8fafc']} />
                <ambientLight intensity={0.9} />
                <hemisphereLight intensity={0.55} groundColor="#d6d3d1" />
                <directionalLight
                    position={[4, 6, 5]}
                    intensity={1.15}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                />
                <directionalLight position={[-3, 2, -4]} intensity={0.35} />
                <Suspense fallback={<Loader />}>
                    {modelUrl ? (
                        <GLTFModel url={modelUrl} scale={zoom} />
                    ) : (
                        <PlaceholderModel />
                    )}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                        <planeGeometry args={[8, 8]} />
                        <shadowMaterial transparent opacity={0.18} />
                    </mesh>
                </Suspense>
                <OrbitControls 
                    autoRotate={autoRotate} 
                    autoRotateSpeed={1.5} 
                    enableZoom={true}
                    minDistance={2}
                    maxDistance={8}
                    enablePan={false}
                />
            </Canvas>

            {/* Product Name Footer */}
            {!compact && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 via-white/50 to-transparent p-4 pt-8">
                    <p className="text-xs text-gray-500 text-center">Drag to rotate and scroll to zoom</p>
                </div>
            )}
        </div>
    );
}

