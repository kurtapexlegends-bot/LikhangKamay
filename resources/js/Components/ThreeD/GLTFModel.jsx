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
    
    const { scene, animations } = useGLTF(url);
    const { actions } = useAnimations(animations, groupRef);
    
    useEffect(() => {
        if (animations.length > 0) {
            const firstAction = Object.values(actions)[0];
            if (firstAction) {
                firstAction.play();
            }
        }
    }, [actions, animations]);

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

GLTFModel.preload = (url) => {
    useGLTF.preload(url);
};

export function GLTFModelWithFallback({ url, fallback, ...props }) {
    return (
        <Suspense fallback={fallback || <LoadingPlaceholder />}>
            <GLTFModel url={url} {...props} />
        </Suspense>
    );
}

function LoadingPlaceholder() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#d4d4d4" wireframe />
        </mesh>
    );
}
