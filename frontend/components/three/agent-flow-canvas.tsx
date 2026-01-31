'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentState } from '@/types';

interface NodeProps {
  position: [number, number, number];
  label: string;
  isActive: boolean;
  color: string;
}

function AgentNode({ position, label, isActive, color }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && isActive) {
      // Subtle pulse when active
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.setScalar(scale);
    }
    if (glowRef.current) {
      glowRef.current.rotation.z += 0.002;
    }
  });

  return (
    <group position={position}>
      {/* Glow ring for active node */}
      {isActive && (
        <mesh ref={glowRef}>
          <ringGeometry args={[0.35, 0.42, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      )}
      {/* Main node */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 0.3 : 0.1}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
    </group>
  );
}

interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
  color: string;
}

function ConnectionLine({ start, end, isActive, color }: ConnectionLineProps) {
  const points = useMemo(() => {
    const midPoint: [number, number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + 0.2,
      (start[2] + end[2]) / 2,
    ];
    return [start, midPoint, end];
  }, [start, end]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={isActive ? 2 : 1}
      opacity={isActive ? 0.8 : 0.3}
      transparent
    />
  );
}

interface SceneProps {
  activeState: AgentState;
  isDark: boolean;
}

function Scene({ activeState, isDark }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Very slow rotation
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  const colors = useMemo(
    () => ({
      observe: isDark ? '#60a5fa' : '#3b82f6',
      reason: isDark ? '#a78bfa' : '#8b5cf6',
      decide: isDark ? '#f472b6' : '#ec4899',
      act: isDark ? '#34d399' : '#10b981',
      idle: isDark ? '#6b7280' : '#9ca3af',
    }),
    [isDark]
  );

  const nodes: { id: AgentState; position: [number, number, number]; label: string }[] = [
    { id: 'observe', position: [-1.2, 0.6, 0], label: 'Observe' },
    { id: 'reason', position: [0, 1, 0], label: 'Reason' },
    { id: 'decide', position: [1.2, 0.6, 0], label: 'Decide' },
    { id: 'act', position: [0, -0.2, 0], label: 'Act' },
  ];

  const connections: { from: number; to: number }[] = [
    { from: 0, to: 1 }, // observe -> reason
    { from: 1, to: 2 }, // reason -> decide
    { from: 2, to: 3 }, // decide -> act
    { from: 3, to: 0 }, // act -> observe (loop)
  ];

  const getActiveConnection = (activeState: AgentState): number => {
    switch (activeState) {
      case 'observe':
        return 0;
      case 'reason':
        return 1;
      case 'decide':
        return 2;
      case 'act':
        return 3;
      default:
        return -1;
    }
  };

  const activeConnection = getActiveConnection(activeState);

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.4} />

      {/* Connection lines */}
      {connections.map((conn, index) => (
        <ConnectionLine
          key={index}
          start={nodes[conn.from].position}
          end={nodes[conn.to].position}
          isActive={index === activeConnection}
          color={colors[nodes[conn.from].id]}
        />
      ))}

      {/* Nodes */}
      {nodes.map((node) => (
        <AgentNode
          key={node.id}
          position={node.position}
          label={node.label}
          isActive={activeState === node.id}
          color={colors[node.id]}
        />
      ))}
    </group>
  );
}

interface AgentFlowCanvasProps {
  activeState?: AgentState;
  className?: string;
}

export function AgentFlowCanvas({
  activeState = 'observe',
  className,
}: AgentFlowCanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

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

  if (!mounted) {
    return (
      <div className={className}>
        <div className="w-full h-full flex items-center justify-center text-foreground-muted">
          Loading visualization...
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene activeState={activeState} isDark={isDark} />
      </Canvas>
    </div>
  );
}
