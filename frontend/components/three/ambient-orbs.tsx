'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingOrbProps {
  position: [number, number, number];
  scale: number;
  color: string;
  speed?: number;
  opacity?: number;
}

function FloatingOrb({ position, scale, color, speed = 0.5, opacity = 0.35 }: FloatingOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle, floating movement
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * speed * 0.5) * 0.15;
      meshRef.current.position.x =
        position[0] + Math.cos(state.clock.elapsedTime * speed * 0.3) * 0.1;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.15} floatIntensity={0.3}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.6}
          metalness={0.3}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
    </Float>
  );
}

interface SceneProps {
  isDark: boolean;
}

function Scene({ isDark }: SceneProps) {
  const orbs = useMemo(() => {
    const colors = isDark
      ? ['#818cf8', '#a78bfa', '#f472b6', '#60a5fa', '#34d399']
      : ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

    return [
      { position: [-2, 0.5, -2] as [number, number, number], scale: 1.5, color: colors[0], speed: 0.3, opacity: 0.4 },
      { position: [2.5, -0.3, -1.5] as [number, number, number], scale: 1.0, color: colors[1], speed: 0.5, opacity: 0.35 },
      { position: [0, 1.2, -3] as [number, number, number], scale: 2.0, color: colors[2], speed: 0.25, opacity: 0.3 },
      { position: [-1.8, -0.8, -2.5] as [number, number, number], scale: 0.8, color: colors[3], speed: 0.4, opacity: 0.35 },
      { position: [1.5, 0.8, -2] as [number, number, number], scale: 0.6, color: colors[4], speed: 0.45, opacity: 0.3 },
    ];
  }, [isDark]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.2} color="#818cf8" />
      {orbs.map((orb, index) => (
        <FloatingOrb key={index} {...orb} />
      ))}
    </>
  );
}

interface AmbientOrbsProps {
  className?: string;
}

export function AmbientOrbs({ className }: AmbientOrbsProps) {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if dark mode is active
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  return (
    <div className={className} style={{ opacity: 0.85, minHeight: '100%', minWidth: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene isDark={isDark} />
      </Canvas>
    </div>
  );
}
