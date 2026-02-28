import React, { useRef, useEffect, Suspense } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';

/**
 * GLTFModel Component
 * Loads and displays a .glb/.gltf 3D model
 * 
 * @param {string} url - Path to the .glb file
 * @param {number} scale - Scale factor (default: 1)
 * @param {array} position - [x, y, z] position (default: [0, 0, 0])
 * @param {array} rotation - [x, y, z] rotation in radians (default: [0, 0, 0])
 */
export default function GLTFModel({ 
    url, 
    scale = 1, 
    position = [0, 0, 0], 
    rotation = [0, 0, 0],
    ...props 
}) {
    const groupRef = useRef();
    
    // Load the GLTF model
    const { scene, animations } = useGLTF(url);
    
    // Handle animations if present
    const { actions } = useAnimations(animations, groupRef);
    
    useEffect(() => {
        // Play the first animation if available
        if (animations.length > 0) {
            const firstAction = Object.values(actions)[0];
            if (firstAction) {
                firstAction.play();
            }
        }
    }, [actions, animations]);

    // Clone scene to avoid mutation issues when same model used multiple times
    const clonedScene = scene.clone();

    return (
        <group ref={groupRef} {...props} dispose={null}>
            <primitive 
                object={clonedScene} 
                scale={scale} 
                position={position}
                rotation={rotation}
            />
        </group>
    );
}

// Preload helper for better performance
GLTFModel.preload = (url) => {
    useGLTF.preload(url);
};

/**
 * Wrapper component with loading fallback
 */
export function GLTFModelWithFallback({ url, fallback, ...props }) {
    return (
        <Suspense fallback={fallback || <LoadingPlaceholder />}>
            <GLTFModel url={url} {...props} />
        </Suspense>
    );
}

// Simple loading placeholder mesh
function LoadingPlaceholder() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#d4d4d4" wireframe />
        </mesh>
    );
}
