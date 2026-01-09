import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Torus } from '@react-three/drei';
import * as THREE from 'three';

/**
 * MENTYX 3D MASCOT - VERSION 3 (FINAL PREMIUM / GEN-Z)
 * 
 * Visuals: "Charcoal Navy & Neon Aqua" (MENTYX v3)
 * - Body: Charcoal Navy-Black (Premium, Calm)
 * - Eyes: Soft Neon Aqua (Friendly, Future-AI)
 * - Glow: Very subtle Aqua Halo (Hologram feel)
 * - Animation: Gen-Z Loop (Pulse, Blink, Float, Micro-move)
 */

function MentyxCharacter() {
    const bodyRef = useRef();
    const glowRef = useRef();
    const ringRef = useRef();
    const leftEyeRef = useRef();
    const rightEyeRef = useRef();
    const leftEyeMatRef = useRef();
    const rightEyeMatRef = useRef();

    // GEN-Z ANIMATION LOOP (Preserved)
    useFrame((state) => {
        const t = state.clock.getElapsedTime();

        // 1. Floating (Smooth Sine)
        const floatY = Math.sin(t) * 0.12;
        if (bodyRef.current) bodyRef.current.position.y = floatY;
        if (glowRef.current) glowRef.current.position.y = floatY;
        if (ringRef.current) {
            ringRef.current.position.y = floatY;
            // Slow ring rotation
            ringRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.1;
            ringRef.current.rotation.y = t * 0.1;
        }

        // 2. Breathing / Pulse Scale
        const pulse = 1 + Math.sin(t * 2) * 0.02;
        if (bodyRef.current) bodyRef.current.scale.set(pulse, pulse, pulse);
        // Glow pulses slightly more/larger
        if (glowRef.current) glowRef.current.scale.set(1.15 * pulse, 1.15 * pulse, 1.15 * pulse);

        // 3. Eye Glow Pulsation
        const glowIntensity = 1.0 + Math.sin(t * 3) * 0.2;
        if (leftEyeMatRef.current) leftEyeMatRef.current.emissiveIntensity = glowIntensity;
        if (rightEyeMatRef.current) rightEyeMatRef.current.emissiveIntensity = glowIntensity;

        // 4. Eye Micro-Movements
        const navX = Math.sin(t * 1.5) * 0.02;
        if (leftEyeRef.current) {
            leftEyeRef.current.position.x = -0.6 + navX;
            leftEyeRef.current.position.y = 0.1 + floatY;
        }
        if (rightEyeRef.current) {
            rightEyeRef.current.position.x = 0.6 + navX;
            rightEyeRef.current.position.y = 0.1 + floatY;
        }

        // 5. Blink
        const blink = Math.abs(Math.sin(t * 0.8)) < 0.05;
        const eyeScaleY = blink ? 0.1 : 1;
        if (leftEyeRef.current) leftEyeRef.current.scale.y = eyeScaleY;
        if (rightEyeRef.current) rightEyeRef.current.scale.y = eyeScaleY;
    });

    // MENTYX v3 Color Palette (The "Best" Scheme)
    const COLOR_BODY = "#0f172a";      // Charcoal Navy-Black
    const COLOR_EYES = "#38f9ff";      // Soft Neon Aqua
    const COLOR_GLOW = "#38f9ff";      // Soft Aqua Halo
    const COLOR_ACCENT = "#1e293b";    // Slate Blue-Gray

    return (
        <group>
            {/* 1. OUTER GLOW (Holographic Halo) */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[2.2, 64, 64]} />
                <meshBasicMaterial
                    color={COLOR_GLOW}
                    transparent
                    opacity={0.08}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* 2. MAIN BODY (Charcoal Core) */}
            <mesh ref={bodyRef}>
                <sphereGeometry args={[2.2, 64, 64]} />
                <meshStandardMaterial
                    color={COLOR_BODY}
                    metalness={0.85}
                    roughness={0.25}
                />
            </mesh>

            {/* 3. ACCENT RING (Subtle Detail) */}
            <mesh ref={ringRef}>
                <torusGeometry args={[2.8, 0.03, 16, 100]} />
                <meshBasicMaterial color={COLOR_ACCENT} transparent opacity={0.15} />
            </mesh>

            {/* 4. EYES (Neon Aqua Focus) */}
            <group position={[0, 0, 1.8]}>
                <mesh ref={leftEyeRef} position={[-0.6, 0.1, 0.2]}>
                    <sphereGeometry args={[0.35, 32, 32]} />
                    <meshStandardMaterial
                        ref={leftEyeMatRef}
                        color={COLOR_EYES}
                        emissive={COLOR_EYES}
                        emissiveIntensity={1.0}
                        toneMapped={false}
                    />
                </mesh>
                <mesh ref={rightEyeRef} position={[0.6, 0.1, 0.2]}>
                    <sphereGeometry args={[0.35, 32, 32]} />
                    <meshStandardMaterial
                        ref={rightEyeMatRef}
                        color={COLOR_EYES}
                        emissive={COLOR_EYES}
                        emissiveIntensity={1.0}
                        toneMapped={false}
                    />
                </mesh>
            </group>
        </group>
    );
}

export default function MentyxAvatar() {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                gl={{ alpha: true, antialias: true }}
            >
                <ambientLight intensity={0.5} />

                {/* Lights adjusted for Dark Body */}
                <pointLight position={[10, 10, 10]} intensity={1.0} color="#ffffff" />
                <pointLight position={[-10, -10, -5]} intensity={0.5} color="#38f9ff" /> {/* Slight cool fill */}

                {/* Rim Light for Premium Edge */}
                <pointLight position={[-2, 2, 3]} intensity={1.5} color="#38f9ff" />

                <MentyxCharacter />
            </Canvas>
        </div>
    );
}
