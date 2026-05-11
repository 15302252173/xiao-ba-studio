'use client';

import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Box } from '@react-three/drei';
import type { Mesh } from 'three';
import type { AgentConfig, AgentState } from './agentsConfig';
import VoxelChair from './VoxelChair';
import VoxelKeyboard from './VoxelKeyboard';
import VoxelMacMini from './VoxelMacMini';

interface AgentDeskProps {
  agent: AgentConfig;
  state: AgentState;
  onClick: () => void;
  isSelected: boolean;
}

export default function AgentDesk({ agent, state, onClick, isSelected }: AgentDeskProps) {
  const deskRef = useRef<Mesh>(null);
  const monitorRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { invalidate } = useThree();

  const status = state?.status ?? 'idle';
  const isMain = agent.isMain === true;
  const deskScale = agent.scale ?? 1;

  // Only animate monitor pulse when thinking — and invalidate only then
  useFrame((frameState) => {
    if (monitorRef.current && status === 'thinking') {
      monitorRef.current.scale.setScalar(1 + Math.sin(frameState.clock.elapsedTime * 2) * 0.05);
      invalidate();
    }
  });

  const getStatusColor = () => {
    switch (status) {
      case 'working': return '#22c55e';
      case 'thinking': return '#3b82f6';
      case 'error': return '#ef4444';
      case 'idle':
      default: return '#6b7280';
    }
  };

  const getMonitorEmissive = () => {
    switch (status) {
      case 'working': return '#15803d';
      case 'thinking': return '#1e40af';
      case 'error': return '#991b1b';
      case 'idle':
      default: return '#374151';
    }
  };

  // Main agent gets special high-visibility colors
  const deskColor = isMain ? '#5c3a21' : '#6b4a31';
  const chairColor = isMain ? '#3a2010' : '#4a3828';
  const monitorBorderColor = isMain ? '#FF4444' : '#2d2d2d';
  const nameFontSize = isMain ? 0.22 : 0.15;

  return (
    <group position={agent.deskPosition} scale={deskScale}>
      {/* Desk surface */}
      <Box
        ref={deskRef}
        args={[2, 0.1, 1.5]}
        position={[0, 0.75, 0]}
        castShadow
        receiveShadow
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={hovered || isSelected ? agent.color : deskColor}
          emissive={hovered || isSelected ? agent.color : '#000000'}
          emissiveIntensity={hovered || isSelected ? 0.2 : 0}
        />
      </Box>

      {/* Monitor */}
      <Box
        ref={monitorRef}
        args={[1.2, 0.8, 0.05]}
        position={[0, 1.5, -0.5]}
        castShadow
        onClick={onClick}
      >
        <meshStandardMaterial
          color={getStatusColor()}
          emissive={getMonitorEmissive()}
          emissiveIntensity={status === 'idle' ? 0.1 : 0.5}
        />
      </Box>

      {/* Monitor stand */}
      <Box args={[0.1, 0.4, 0.1]} position={[0, 1, -0.5]} castShadow>
        <meshStandardMaterial color={monitorBorderColor} />
      </Box>

      {/* Keyboard */}
      <VoxelKeyboard position={[0, 0.81, 0.2]} rotation={[0, 0, 0]} />

      {/* Mac mini */}
      <VoxelMacMini position={[0.5, 0.825, -0.5]} />

      {/* Chair */}
      <group scale={2}>
        <VoxelChair
          position={[0, 0, 0.9]}
          rotation={[0, Math.PI, 0]}
          color={chairColor}
        />
      </group>

      {/* Nameplate */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={nameFontSize}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {agent.emoji} {agent.name}
      </Text>

      {/* Status indicator */}
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.1}
        color={getStatusColor()}
        anchorX="center"
        anchorY="middle"
      >
        {status.toUpperCase()}
        {state?.model && ` • ${state.model}`}
      </Text>

      {/* Desk legs */}
      {[-0.8, 0.8].map((x, i) =>
        [-0.6, 0.6].map((z, j) => (
          <Box
            key={`leg-${i}-${j}`}
            args={[0.05, 0.7, 0.05]}
            position={[x, 0.35, z]}
            castShadow
          >
            <meshStandardMaterial color="#5d4037" />
          </Box>
        ))
      )}

      {/* Floor glow when selected */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 32]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}
