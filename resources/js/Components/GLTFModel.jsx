import React, { useRef, useEffect, Suspense, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

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
    normalize = true,
    fitSize = 2.4,
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

    const clonedScene = useMemo(() => {
        const clone = scene.clone();

        clone.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        if (normalize) {
            const box = new THREE.Box3().setFromObject(clone);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z) || 1;
            const normalizedScale = fitSize / maxDimension;

            clone.position.x -= center.x;
            clone.position.y -= box.min.y;
            clone.position.z -= center.z;
            clone.scale.setScalar(normalizedScale);
        }

        return clone;
    }, [scene, normalize, fitSize]);

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
