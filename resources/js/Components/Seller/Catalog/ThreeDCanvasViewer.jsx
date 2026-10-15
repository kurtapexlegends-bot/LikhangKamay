import React, { Suspense, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Html, useProgress } from '@react-three/drei';
import GLTFModel from '@/Components/ThreeD/GLTFModel';
import { ThreeDModelBoundary, ThreeDModelUnavailable } from '@/Components/ThreeD/ThreeDModelBoundary';

function Loader() {
    const { progress } = useProgress();
    return (
        <Html center>
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-clay-100 border-t-clay-600 rounded-full animate-spin"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                    {progress.toFixed(0)}%
                </span>
            </div>
        </Html>
    );
}

const DemoPottery = (props) => {
    return (
        <mesh {...props}>
            <torusKnotGeometry args={[1, 0.3, 100, 16]} />
            <meshStandardMaterial color="#c07251" roughness={0.3} metalness={0.1} />
        </mesh>
    );
};

export default function ThreeDCanvasViewer({
    modelUrl,
    scale = 1.0,
    showDemoFallback = true,
    fallback,
    resetKey,
    suspenseFallback = <Loader />
}) {
    const [canvasKey, setCanvasKey] = useState(0);

    const handleCanvasCreated = useCallback(({ gl }) => {
        const handleContextLost = (event) => {
            event.preventDefault();
            console.warn('WebGL context lost, recovering canvas instance.');
            setCanvasKey((prev) => prev + 1);
        };
        gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    }, []);

    const defaultFallback = ({ onRetry }) => (
        <ThreeDModelUnavailable
            title="Saved 3D asset unavailable"
            description="This model is missing files or could not be loaded from storage."
            onRetry={onRetry}
            className="h-full"
        />
    );

    return (
        <ThreeDModelBoundary
            resetKey={resetKey || modelUrl || 'empty'}
            fallback={fallback || defaultFallback}
        >
            <Canvas 
                key={canvasKey}
                onCreated={handleCanvasCreated}
                shadows 
                dpr={[1, 2]} 
                camera={{ position: [0, 0, 4], fov: 50 }}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
            >
                <Suspense fallback={suspenseFallback}>
                    <Stage preset="rembrandt" intensity={0.5} adjustCamera={1.1}>
                        {modelUrl ? (
                            <GLTFModel url={modelUrl} scale={scale} />
                        ) : showDemoFallback ? (
                            <DemoPottery scale={0.65} />
                        ) : null}
                    </Stage>
                    <OrbitControls autoRotate autoRotateSpeed={2} enableZoom={true} />
                </Suspense>
            </Canvas>
        </ThreeDModelBoundary>
    );
}
