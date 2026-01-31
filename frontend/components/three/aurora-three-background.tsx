'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Aurora wave mesh that creates flowing light effect
function AuroraWave({ 
  color, 
  speed, 
  amplitude, 
  frequency, 
  yOffset,
  opacity 
}: { 
  color: string; 
  speed: number; 
  amplitude: number; 
  frequency: number;
  yOffset: number;
  opacity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uAmplitude: { value: amplitude },
    uFrequency: { value: frequency },
    uOpacity: { value: opacity },
  }), [color, amplitude, frequency, opacity]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * speed;
    }
  });

  const vertexShader = `
    uniform float uTime;
    uniform float uAmplitude;
    uniform float uFrequency;
    varying vec2 vUv;
    varying float vElevation;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      float wave1 = sin(pos.x * uFrequency + uTime) * uAmplitude;
      float wave2 = sin(pos.x * uFrequency * 0.5 + uTime * 0.7) * uAmplitude * 0.5;
      float wave3 = cos(pos.x * uFrequency * 0.3 + uTime * 0.5) * uAmplitude * 0.3;
      
      pos.y += wave1 + wave2 + wave3;
      vElevation = wave1 + wave2 + wave3;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;
    
    void main() {
      float alpha = (1.0 - vUv.y) * uOpacity;
      alpha *= 0.5 + 0.5 * sin(vUv.x * 3.14159 + uTime * 0.3);
      alpha *= 0.8 + 0.2 * (vElevation + 0.5);
      
      vec3 color = uColor;
      color = mix(color, uColor * 1.5, vElevation * 0.5 + 0.5);
      
      gl_FragColor = vec4(color, alpha * 0.6);
    }
  `;

  return (
    <mesh ref={meshRef} position={[0, yOffset, -2]} rotation={[-0.2, 0, 0]}>
      <planeGeometry args={[12, 4, 128, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// Floating particles that add depth
function AuroraParticles({ count = 100, isDark }: { count?: number; isDark: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const colorPalette = isDark 
      ? [new THREE.Color('#818cf8'), new THREE.Color('#a78bfa'), new THREE.Color('#f472b6'), new THREE.Color('#60a5fa')]
      : [new THREE.Color('#6366f1'), new THREE.Color('#8b5cf6'), new THREE.Color('#ec4899'), new THREE.Color('#3b82f6')];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 2;

      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = Math.random() * 0.003 + 0.001;
      velocities[i * 3 + 2] = 0;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, velocities, colors };
  }, [count, isDark]);

  useFrame(() => {
    if (pointsRef.current) {
      const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < count; i++) {
        posArray[i * 3] += velocities[i * 3];
        posArray[i * 3 + 1] += velocities[i * 3 + 1];

        // Reset particle if it goes too high
        if (posArray[i * 3 + 1] > 3) {
          posArray[i * 3] = (Math.random() - 0.5) * 10;
          posArray[i * 3 + 1] = -3;
        }
      }

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Glowing orbs in the background
function GlowingOrb({ position, color, scale }: { position: [number, number, number]; color: string; scale: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialPos = useRef(position);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.x = initialPos.current[0] + Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
      meshRef.current.position.y = initialPos.current[1] + Math.cos(state.clock.elapsedTime * 0.15) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Scene({ isDark }: { isDark: boolean }) {
  const { viewport } = useThree();

  const auroraColors = isDark
    ? ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4']
    : ['#818cf8', '#a78bfa', '#f472b6', '#22d3ee'];

  const orbColors = isDark
    ? ['#4338ca', '#7c3aed', '#db2777', '#0891b2']
    : ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <>
      {/* Aurora waves */}
      <AuroraWave color={auroraColors[0]} speed={0.3} amplitude={0.3} frequency={0.8} yOffset={1.5} opacity={0.4} />
      <AuroraWave color={auroraColors[1]} speed={0.25} amplitude={0.25} frequency={1.0} yOffset={0.8} opacity={0.35} />
      <AuroraWave color={auroraColors[2]} speed={0.35} amplitude={0.2} frequency={1.2} yOffset={0.2} opacity={0.3} />
      <AuroraWave color={auroraColors[3]} speed={0.2} amplitude={0.35} frequency={0.6} yOffset={-0.5} opacity={0.25} />

      {/* Background glowing orbs */}
      <GlowingOrb position={[-3, 1, -4]} color={orbColors[0]} scale={2} />
      <GlowingOrb position={[3, 0, -3.5]} color={orbColors[1]} scale={1.5} />
      <GlowingOrb position={[0, -1, -5]} color={orbColors[2]} scale={2.5} />
      <GlowingOrb position={[-2, -0.5, -4]} color={orbColors[3]} scale={1.2} />

      {/* Floating particles */}
      <AuroraParticles count={80} isDark={isDark} />
    </>
  );
}

interface AuroraThreeBackgroundProps {
  className?: string;
}

export function AuroraThreeBackground({ className }: AuroraThreeBackgroundProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  return (
    <div 
      className={className} 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: -1, 
        backgroundColor: isDark ? '#000000' : '#fafafa',
        pointerEvents: 'none'
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance'
        }}
        style={{ background: 'transparent' }}
      >
        <Scene isDark={isDark} />
      </Canvas>
      {/* Dotted overlay for texture */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: isDark 
            ? 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)'
            : 'radial-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}
