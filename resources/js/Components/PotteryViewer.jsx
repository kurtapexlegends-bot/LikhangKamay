import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';

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
      {/* Light background for the canvas itself */}
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 45 }}>
        {/* 'rembrandt' gives a nice studio lighting effect */}
        <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.2, blur: 3 }}>
          <PlaceholderVase />
        </Stage>
        <OrbitControls autoRotate autoRotateSpeed={2} enableZoom={false} />
      </Canvas>
    </div>
  );
}