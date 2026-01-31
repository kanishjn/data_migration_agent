'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function Ring({ radius, tube, rotation, speed, color }: { 
  radius: number; 
  tube: number; 
  rotation: [number, number, number];
  speed: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x += speed * 0.002;
      ref.current.rotation.y += speed * 0.001;
    }
  });

  return (
    <mesh ref={ref} rotation={rotation}>
      <torusGeometry args={[radius, tube, 64, 128]} />
      <meshStandardMaterial 
        color={color}
        wireframe
        transparent
        opacity={0.4}
      />
    </mesh>
  );
}

function Particles({ count = 150 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 3 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.0005;
      ref.current.rotation.x += 0.0002;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.02} 
        color="#06b6d4" 
        transparent 
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function FloatingSphere() {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.1;
      ref.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={ref} scale={0.8}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial 
          color="#06b6d4"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#06b6d4" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#e879f9" />
      
      {/* Multiple Rings with varied colors */}
      <Ring radius={2.5} tube={0.02} rotation={[0, 0, 0]} speed={1} color="#06b6d4" />
      <Ring radius={3} tube={0.015} rotation={[Math.PI / 4, 0, 0]} speed={0.8} color="#e879f9" />
      <Ring radius={3.5} tube={0.01} rotation={[0, Math.PI / 3, Math.PI / 6]} speed={0.6} color="#10b981" />
      <Ring radius={4} tube={0.008} rotation={[Math.PI / 2, Math.PI / 4, 0]} speed={0.4} color="#f59e0b" />
      
      {/* Center Sphere */}
      <FloatingSphere />
      
      {/* Particles */}
      <Particles count={150} />
    </>
  );
}

export function RingScene() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none ring-scene-container">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
