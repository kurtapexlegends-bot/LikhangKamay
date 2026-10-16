import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import {
    DRACO_LOCAL_DECODER_PATH,
    DRACO_CDN_DECODER_PATH,
    DRACO_DEFAULT_DECODER_PATH,
    KTX2_TRANSCODER_PATH,
    getSharedDRACOLoader,
    getSharedKTX2Loader,
    configureGLTFExtensions,
} from './threeLoaders';

export {
    DRACO_LOCAL_DECODER_PATH,
    DRACO_CDN_DECODER_PATH,
    DRACO_DEFAULT_DECODER_PATH,
    KTX2_TRANSCODER_PATH,
    getSharedDRACOLoader,
    getSharedKTX2Loader,
    configureGLTFExtensions,
};

// Configure default global decoder path on useGLTF
try {
    if (typeof useGLTF.setDecoderPath === 'function') {
        useGLTF.setDecoderPath(DRACO_DEFAULT_DECODER_PATH);
    }
} catch {
    // Ignore in non-browser runtimes
}

/**
 * GLTFModel Component
 * Loads and displays a .glb/.gltf 3D model, normalizing its physical display height
 * to 2.0 Three.js units and grounding its base cleanly at y = -1.0 without mutating the scene object.
 * Fully supports Draco geometry compression and KTX2 texture transcoding for cellular links.
 * 
 * @param {string} url - Path to the .glb file
 * @param {number} scale - Optional user scale factor (default: 1)
 * @param {array} position - [x, y, z] position offset (default: [0, 0, 0])
 * @param {array} rotation - [x, y, z] rotation in radians (default: [0, 0, 0])
 * @param {string} dracoPath - Optional custom Draco decoder path
 */
export default function GLTFModel({ 
    url, 
    scale = 1, 
    position = [0, 0, 0], 
    rotation = [0, 0, 0],
    dracoPath = DRACO_DEFAULT_DECODER_PATH,
    ...props 
}) {
    const groupRef = useRef();
    const gl = useThree((state) => state?.gl);

    if (gl) {
        getSharedKTX2Loader(gl);
    }

    const { scene, animations } = useGLTF(
        url,
        dracoPath,
        true,
        (loader) => {
            configureGLTFExtensions(loader, gl, dracoPath);
        }
    );
    const { actions } = useAnimations(animations, groupRef);

    // Deep clone the scene hierarchy per instance so multiple viewers
    // (e.g. background drawer and fullscreen lightbox modal) each maintain
    // their own independent node hierarchy without reparenting or stealing nodes.
    const clonedScene = useMemo(() => {
        if (!scene) return null;
        return SkeletonUtils.clone(scene);
    }, [scene]);

    // Compute normalization transform from clean scene bounds
    const { normalizedScale, normalizedPosition } = useMemo(() => {
        if (!scene) {
            return {
                normalizedScale: [1, 1, 1],
                normalizedPosition: [0, 0, 0]
            };
        }

        // Measure intrinsic, unscaled geometry bounds directly from scene meshes
        const box = new THREE.Box3();
        scene.traverse((child) => {
            if (child.isMesh && child.geometry) {
                if (!child.geometry.boundingBox) {
                    child.geometry.computeBoundingBox();
                }
                const b = child.geometry.boundingBox.clone();
                b.applyMatrix4(child.matrix);
                box.union(b);
            }
        });

        if (box.isEmpty()) {
            box.setFromObject(scene);
        }

        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const rawHeight = size.y > 0.0001 ? size.y : 1.0;
        // Standardize craft model height to exactly 2.0 Three.js units (spanning y = -1.0 to +1.0)
        const autoScale = (2.0 / rawHeight) * (typeof scale === 'number' ? scale : 1.0);

        // Center on X and Z, and anchor the bottom base directly to ground level y = -1.0
        const autoPos = [
            -center.x * autoScale + (position[0] || 0),
            -box.min.y * autoScale - 1.0 + (position[1] || 0),
            -center.z * autoScale + (position[2] || 0)
        ];

        return {
            normalizedScale: [autoScale, autoScale, autoScale],
            normalizedPosition: autoPos
        };
    }, [scene, scale, position]);

    useEffect(() => {
        if (!clonedScene) return;

        clonedScene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    child.material.needsUpdate = true;
                }
            }
        });
    }, [clonedScene]);
    
    useEffect(() => {
        if (animations && animations.length > 0 && actions) {
            const firstAction = Object.values(actions)[0];
            if (firstAction) {
                firstAction.play();
            }
        }
    }, [actions, animations]);

    useEffect(() => {
        return () => {
            if (clonedScene) {
                clonedScene.traverse((child) => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach((mat) => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
            }
        };
    }, [clonedScene]);

    if (!clonedScene) return null;

    // Wrap in group with dispose={null} so R3F doesn't dispose cached assets on unmount
    return (
        <group ref={groupRef} {...props} dispose={null}>
            <group scale={normalizedScale} position={normalizedPosition} rotation={rotation}>
                <primitive object={clonedScene} />
            </group>
        </group>
    );
}

GLTFModel.preload = (url, dracoPath = DRACO_DEFAULT_DECODER_PATH) => {
    useGLTF.preload(url, dracoPath, true, (loader) => {
        configureGLTFExtensions(loader, null, dracoPath);
    });
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
