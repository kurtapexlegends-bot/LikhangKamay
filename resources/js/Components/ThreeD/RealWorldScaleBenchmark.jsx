/* eslint-disable react/no-unknown-property */
import React from 'react';

export const BENCHMARKS = [
    {
        id: 'human',
        label: 'Adult',
        name: 'Adult Human',
        heightCm: 170,
        desc: 'Average Adult (170 cm / 5′ 7″)',
    },
    {
        id: 'desk',
        label: 'Desk',
        name: 'Work Desk',
        heightCm: 75,
        desc: 'Standard Tabletop (75 cm / 2′ 5″)',
    },
    {
        id: 'phone',
        label: 'iPhone',
        name: 'iPhone 15',
        heightCm: 14.7,
        desc: 'iPhone 15 (14.7 cm / 5.8″)',
    },
    {
        id: 'mug',
        label: 'Mug',
        name: 'Coffee Mug',
        heightCm: 9.5,
        desc: 'Standard 300ml Coffee Mug',
    },
];

/**
 * Auto-selects the most spatially relevant benchmark based on craft height.
 */
export function getRecommendedBenchmarkId(craftHeightCm) {
    const h = Number(craftHeightCm) || 22;
    if (h < 12) return 'mug';         // Tiny items (<12 cm) -> Mug (9.5 cm)
    if (h < 45) return 'phone';       // Small tabletop (12–45 cm) -> iPhone 15 (14.7 cm)
    if (h < 100) return 'desk';       // Medium furniture/accent (45–100 cm) -> Desk (75 cm)
    return 'human';                   // Floor statement (100+ cm) -> Adult Human (170 cm)
}

function HumanFigureMesh({ scaleHeight, positionX }) {
    const height = scaleHeight;
    const width = height * (42 / 170);
    const depth = height * (22 / 170);
    const headRadius = height * 0.062;

    return (
        <group position={[positionX, -1.0, 0]}>
            {/* Head */}
            <mesh position={[0, height - headRadius, 0]} castShadow receiveShadow>
                <sphereGeometry args={[headRadius, 16, 16]} />
                <meshStandardMaterial color="#64748b" roughness={0.6} />
            </mesh>

            {/* Neck */}
            <mesh position={[0, height - headRadius * 2 - (height * 0.015), 0]} castShadow receiveShadow>
                <cylinderGeometry args={[width * 0.1, width * 0.12, height * 0.035, 12]} />
                <meshStandardMaterial color="#64748b" roughness={0.6} />
            </mesh>

            {/* Shoulders & Upper Torso */}
            <mesh position={[0, height * 0.78, 0]} castShadow receiveShadow>
                <boxGeometry args={[width * 0.88, height * 0.12, depth * 0.45]} />
                <meshStandardMaterial color="#475569" roughness={0.6} />
            </mesh>

            {/* Main Torso */}
            <mesh position={[0, height * 0.62, 0]} castShadow receiveShadow>
                <boxGeometry args={[width * 0.72, height * 0.24, depth * 0.45]} />
                <meshStandardMaterial color="#475569" roughness={0.6} />
            </mesh>

            {/* Left Leg */}
            <mesh position={[-width * 0.22, height * 0.25, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[width * 0.11, width * 0.09, height * 0.5, 12]} />
                <meshStandardMaterial color="#334155" roughness={0.6} />
            </mesh>

            {/* Right Leg */}
            <mesh position={[width * 0.22, height * 0.25, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[width * 0.11, width * 0.09, height * 0.5, 12]} />
                <meshStandardMaterial color="#334155" roughness={0.6} />
            </mesh>
        </group>
    );
}

function DeskMesh({ scaleHeight, positionX }) {
    const height = scaleHeight;
    const width = height * (115 / 75);
    const depth = height * (55 / 75);
    const legRadius = Math.max(height * 0.025, 0.018);

    return (
        <group position={[positionX, -1.0, 0]}>
            {/* Tabletop */}
            <mesh position={[0, height - (height * 0.025), 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height * 0.05, depth]} />
                <meshStandardMaterial color="#78716c" roughness={0.5} />
            </mesh>

            {/* 4 Desk Legs */}
            <mesh position={[-width * 0.45, height * 0.48, -depth * 0.42]} castShadow receiveShadow>
                <cylinderGeometry args={[legRadius, legRadius, height * 0.95, 8]} />
                <meshStandardMaterial color="#292524" roughness={0.8} />
            </mesh>
            <mesh position={[width * 0.45, height * 0.48, -depth * 0.42]} castShadow receiveShadow>
                <cylinderGeometry args={[legRadius, legRadius, height * 0.95, 8]} />
                <meshStandardMaterial color="#292524" roughness={0.8} />
            </mesh>
            <mesh position={[-width * 0.45, height * 0.48, depth * 0.42]} castShadow receiveShadow>
                <cylinderGeometry args={[legRadius, legRadius, height * 0.95, 8]} />
                <meshStandardMaterial color="#292524" roughness={0.8} />
            </mesh>
            <mesh position={[width * 0.45, height * 0.48, depth * 0.42]} castShadow receiveShadow>
                <cylinderGeometry args={[legRadius, legRadius, height * 0.95, 8]} />
                <meshStandardMaterial color="#292524" roughness={0.8} />
            </mesh>
        </group>
    );
}

function SmartphoneMesh({ scaleHeight, positionX }) {
    const height = scaleHeight;
    const width = height * (7.15 / 14.7);
    const depth = Math.max(height * (0.8 / 14.7), 0.035);

    return (
        <group position={[positionX, -1.0 + height / 2, 0]}>
            {/* Phone Body */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color="#334155" roughness={0.35} metalness={0.7} />
            </mesh>

            {/* Screen Face */}
            <mesh position={[0, 0, depth / 2 + 0.002]}>
                <planeGeometry args={[width * 0.92, height * 0.94]} />
                <meshStandardMaterial color="#090d16" roughness={0.15} metalness={0.85} />
            </mesh>
        </group>
    );
}

function CoffeeMugMesh({ scaleHeight, positionX }) {
    const height = scaleHeight;
    const radius = Math.max(height * (8.2 / 9.5) / 2, 0.12);

    return (
        <group position={[positionX, -1.0 + height / 2, 0]}>
            {/* Mug Body */}
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[radius, radius * 0.92, height, 32]} />
                <meshStandardMaterial color="#f5f5f4" roughness={0.5} metalness={0.05} />
            </mesh>

            {/* Mug Top Cavity */}
            <mesh position={[0, height / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[radius * 0.85, 32]} />
                <meshStandardMaterial color="#44403c" roughness={0.8} />
            </mesh>

            {/* Handle */}
            <mesh position={[radius + (height * 0.13), 0, 0]}>
                <torusGeometry args={[height * 0.24, height * 0.07, 16, 32, Math.PI]} />
                <meshStandardMaterial color="#f5f5f4" roughness={0.5} metalness={0.05} />
            </mesh>
        </group>
    );
}

export default function RealWorldScaleBenchmark({
    benchmarkId = 'human',
    craftHeightCm = 22
}) {
    const resolvedCraftHeight = Math.max(Number(craftHeightCm) || 22, 4);
    const selected = BENCHMARKS.find((b) => b.id === benchmarkId) || BENCHMARKS[0];
    const scaleHeight = 2.0 * (selected.heightCm / resolvedCraftHeight);

    // Compute approximate width to cleanly place beside craft at x = 0
    let benchmarkWidth = scaleHeight * 0.5;
    if (benchmarkId === 'human') benchmarkWidth = scaleHeight * (42 / 170);
    else if (benchmarkId === 'desk') benchmarkWidth = scaleHeight * (115 / 75);
    else if (benchmarkId === 'mug') benchmarkWidth = scaleHeight * (8.2 / 9.5);
    else if (benchmarkId === 'phone') benchmarkWidth = scaleHeight * (7.15 / 14.7);

    // Place benchmark beside the craft piece
    const positionX = Math.max(1.25, 0.75 + (benchmarkWidth / 2));

    if (benchmarkId === 'human') {
        return <HumanFigureMesh scaleHeight={scaleHeight} positionX={positionX} />;
    }

    if (benchmarkId === 'desk') {
        return <DeskMesh scaleHeight={scaleHeight} positionX={positionX} />;
    }

    if (benchmarkId === 'mug') {
        return <CoffeeMugMesh scaleHeight={scaleHeight} positionX={positionX} />;
    }

    return <SmartphoneMesh scaleHeight={scaleHeight} positionX={positionX} />;
}
