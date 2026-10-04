import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';

/**
 * GLTFModel Component
 * Loads and displays a .glb/.gltf 3D model, normalizing its physical display height
 * to 2.0 Three.js units and grounding its base cleanly at y = -1.0 without mutating the scene object.
 * 
 * @param {string} url - Path to the .glb file
 * @param {number} scale - Optional user scale factor (default: 1)
 * @param {array} position - [x, y, z] position offset (default: [0, 0, 0])
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
    
    const { scene, animations } = useGLTF(url, true, true, (loader) => {
        loader.setCrossOrigin('anonymous');
    });
    const { actions } = useAnimations(animations, groupRef);

    // Compute and lock unscaled raw bounds exactly once per scene URL
    const rawBoundsRef = useRef(null);

    // Compute normalization transform once from clean scene bounds
    const { normalizedScale, normalizedPosition } = useMemo(() => {
        if (!scene) {
            return {
                normalizedScale: [1, 1, 1],
                normalizedPosition: [0, 0, 0]
            };
        }

        if (!rawBoundsRef.current) {
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

            rawBoundsRef.current = {
                rawHeight: size.y > 0.0001 ? size.y : 1.0,
                center: [center.x, center.y, center.z],
                minY: box.min.y
            };
        }

        const { rawHeight, center, minY } = rawBoundsRef.current;
        // Standardize craft model height to exactly 2.0 Three.js units (spanning y = -1.0 to +1.0)
        const autoScale = (2.0 / rawHeight) * (typeof scale === 'number' ? scale : 1.0);

        // Center on X and Z, and anchor the bottom base directly to ground level y = -1.0
        const autoPos = [
            -center[0] * autoScale + (position[0] || 0),
            -minY * autoScale - 1.0 + (position[1] || 0),
            -center[2] * autoScale + (position[2] || 0)
        ];

        return {
            normalizedScale: [autoScale, autoScale, autoScale],
            normalizedPosition: autoPos
        };
    }, [scene, scale, position]);

    useEffect(() => {
        if (!scene) return;

        scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    child.material.needsUpdate = true;
                }
            }
        });

        return () => {
            scene.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry && typeof child.geometry.dispose === 'function') {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach((mat) => {
                            const textureKeys = [
                                'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
                                'envMap', 'alphaMap', 'aoMap', 'displacementMap',
                                'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap'
                            ];
                            textureKeys.forEach((key) => {
                                if (mat[key] && typeof mat[key].dispose === 'function') {
                                    mat[key].dispose();
                                }
                            });
                            if (typeof mat.dispose === 'function') {
                                mat.dispose();
                            }
                        });
                    }
                }
            });
        };
    }, [scene]);
    
    useEffect(() => {
        if (animations && animations.length > 0 && actions) {
            const firstAction = Object.values(actions)[0];
            if (firstAction) {
                firstAction.play();
            }
        }
    }, [actions, animations]);

    if (!scene) return null;

    // Wrap in group with transform so we never mutate scene.scale or scene.position
    return (
        <group ref={groupRef} {...props}>
            <group scale={normalizedScale} position={normalizedPosition} rotation={rotation}>
                <primitive object={scene} />
            </group>
        </group>
    );
}

GLTFModel.preload = (url) => {
    useGLTF.preload(url, true, true, (loader) => {
        loader.setCrossOrigin('anonymous');
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
