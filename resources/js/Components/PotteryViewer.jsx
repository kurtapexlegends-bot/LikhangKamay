import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function PlaceholderVase(props) {
  const meshRef = useRef();
  useFrame((state, delta) => (meshRef.current.rotation.y += delta * 0.5)); // Slow, elegant rotation

  return (
    <mesh {...props} ref={meshRef}>
      {/* Cylinder geometry to look more like a vase */}
      <cylinderGeometry args={[1, 1, 2, 32]} /> 
      <meshStandardMaterial color={'#cf8e55'} roughness={0.4} />
    </mesh>
  );
}

export default function PotteryViewer() {
  return (
    <div className="h-full w-full bg-transparent"> 
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 45 }}>
        <color attach="background" args={['#f8fafc']} />
        <ambientLight intensity={0.9} />
        <hemisphereLight intensity={0.55} groundColor="#d6d3d1" />
        <directionalLight position={[4, 6, 5]} intensity={1.1} castShadow />
        <directionalLight position={[-3, 2, -4]} intensity={0.35} />
        <PlaceholderVase />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
          <planeGeometry args={[8, 8]} />
          <shadowMaterial transparent opacity={0.18} />
        </mesh>
        <OrbitControls autoRotate autoRotateSpeed={2} enableZoom={false} />
      </Canvas>
    </div>
  );
}
