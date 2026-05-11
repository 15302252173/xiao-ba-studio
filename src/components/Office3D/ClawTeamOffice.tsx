'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Group, Vector3 } from 'three';
import TempWorkerAvatar from './TempWorkerAvatar';
import Whiteboard from './Whiteboard';

/** ClawTeam member from API */
export interface CTMember {
  name: string;
  agentType: string;
  status: 'working' | 'idle';
  color: string;
  origin?: 'mac' | 'pc';
  originLabel?: string;
}

interface ClawTeamOfficeProps {
  members: CTMember[];
  taskSummary: { pending: number; in_progress: number; completed: number; blocked: number };
  teamName: string;
}

/** Offset: ClawTeam office center */
const CX = -36;

/** Pre-defined desk slots (max 8 workers) */
const SLOTS: Array<{
  deskPos: [number, number, number];
  seatPos: [number, number, number];
  tablePos: [number, number, number];
  faceDir: number;
}> = [
  { deskPos: [CX - 5, 0, -4], seatPos: [CX - 5, 0.62, -3], tablePos: [CX - 1.5, 0.6, -1], faceDir: Math.atan2(5, 4) },
  { deskPos: [CX + 5, 0, -4], seatPos: [CX + 5, 0.62, -3], tablePos: [CX + 1.5, 0.6, -1], faceDir: Math.atan2(-5, 4) },
  { deskPos: [CX - 5, 0, 3], seatPos: [CX - 5, 0.62, 4], tablePos: [CX - 2, 0.6, 0.5], faceDir: Math.atan2(5, -3) },
  { deskPos: [CX + 5, 0, 3], seatPos: [CX + 5, 0.62, 4], tablePos: [CX + 2, 0.6, 0.5], faceDir: Math.atan2(-5, -3) },
  { deskPos: [CX - 3, 0, 6], seatPos: [CX - 3, 0.62, 7], tablePos: [CX - 1, 0.6, 1.5], faceDir: Math.atan2(3, -6) },
  { deskPos: [CX + 3, 0, 6], seatPos: [CX + 3, 0.62, 7], tablePos: [CX + 1, 0.6, 1.5], faceDir: Math.atan2(-3, -6) },
  { deskPos: [CX - 7, 0, 0], seatPos: [CX - 7, 0.62, 1], tablePos: [CX - 2.5, 0.6, 0], faceDir: Math.atan2(7, 0) },
  { deskPos: [CX + 7, 0, 0], seatPos: [CX + 7, 0.62, 1], tablePos: [CX + 2.5, 0.6, 0], faceDir: Math.atan2(-7, 0) },
];

const WORKER_COLORS = ['#c9a96e', '#8b7355', '#6b4a31', '#a08060', '#d4a96a', '#9b7b55', '#b89060', '#c0a070'];

/** Smooth-moving temp worker wrapper */
function MovingTempWorker({ member, slot, color }: { member: CTMember; slot: typeof SLOTS[0]; color: string }) {
  const groupRef = useRef<Group>(null);
  const currentPos = useRef(new Vector3(...slot.seatPos));
  const initialized = useRef(false);
  const { invalidate } = useThree();

  const isWorking = member.status === 'working';
  const target = isWorking ? new Vector3(...slot.tablePos) : new Vector3(...slot.seatPos);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => invalidate());
    return () => cancelAnimationFrame(frameId);
  }, [member.status, invalidate]);

  useFrame((_s, delta) => {
    if (!groupRef.current) return;
    if (!initialized.current) {
      initialized.current = true;
      currentPos.current.set(...slot.seatPos);
      groupRef.current.position.copy(currentPos.current);
      groupRef.current.rotation.y = slot.faceDir;
    }

    const dir = new Vector3().subVectors(target, currentPos.current);
    const dist = dir.length();

    if (dist < 0.05) {
      if (!currentPos.current.equals(target)) {
        currentPos.current.copy(target);
        groupRef.current.position.copy(target);
      }
      const atTable = target.distanceTo(new Vector3(...slot.seatPos)) > 0.5;
      groupRef.current.rotation.y = atTable ? Math.atan2(-(target.x - CX), -target.z) : slot.faceDir;
      return;
    }

    dir.normalize().multiplyScalar(Math.min(6 * delta, dist));
    currentPos.current.add(dir);
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
    invalidate();
  });

  return (
    <group ref={groupRef} scale={3}>
      <TempWorkerAvatar
        name={member.name}
        color={color}
        position={[0, 0, 0]}
        isWorking={isWorking}
        isSitting={!isWorking}
      />
    </group>
  );
}

function LoungeDecor() {
  return (
    <group>
      <group position={[CX - 8.25, 0, -6.65]}>
        <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.75, 0.88, 0.76]} />
          <meshStandardMaterial color="#8B6F61" roughness={0.74} />
        </mesh>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.08, 0.9]} />
          <meshStandardMaterial color="#E1D6CB" roughness={0.48} />
        </mesh>
        <mesh position={[-0.38, 1.18, -0.05]} castShadow>
          <boxGeometry args={[0.48, 0.62, 0.34]} />
          <meshStandardMaterial color="#444B52" roughness={0.3} metalness={0.45} />
        </mesh>
        <mesh position={[-0.38, 1.28, 0.18]} castShadow>
          <boxGeometry args={[0.08, 0.14, 0.08]} />
          <meshStandardMaterial color="#1F2937" roughness={0.28} metalness={0.55} />
        </mesh>
        <mesh position={[-0.38, 0.82, 0.15]}>
          <cylinderGeometry args={[0.08, 0.1, 0.14, 14]} />
          <meshStandardMaterial color="#F4EEDF" roughness={0.42} />
        </mesh>
        <mesh position={[-0.38, 0.83, 0.15]}>
          <cylinderGeometry args={[0.07, 0.09, 0.08, 14]} />
          <meshStandardMaterial color="#6C4425" roughness={0.55} />
        </mesh>
        <mesh position={[-0.2, 1.16, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 14]} />
          <meshStandardMaterial color="#4ADE80" emissive="#166534" emissiveIntensity={0.45} />
        </mesh>

        <mesh position={[0.5, 0.8, 0.02]} castShadow>
          <boxGeometry args={[0.28, 0.12, 0.28]} />
          <meshStandardMaterial color="#A3B18A" roughness={0.72} />
        </mesh>
        <mesh position={[0.5, 0.98, 0.02]} castShadow>
          <boxGeometry args={[0.06, 0.22, 0.06]} />
          <meshStandardMaterial color="#3B6E45" roughness={0.78} />
        </mesh>
        {[
          [0.38, 1.08, 0.02],
          [0.62, 1.12, 0.06],
          [0.48, 1.2, -0.08],
          [0.58, 1.26, 0.1],
        ].map(([x, y, z], index) => (
          <mesh key={`coffee-plant-leaf-${index}`} position={[x, y, z]} rotation={[0, 0, index % 2 === 0 ? 0.45 : -0.45]} castShadow>
            <boxGeometry args={[0.22, 0.04, 0.12]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#4CAF50' : '#66BB6A'} roughness={0.82} />
          </mesh>
        ))}
      </group>

      <mesh position={[CX + 6.8, 2.12, -8.15]} castShadow receiveShadow>
        <boxGeometry args={[6.25, 0.1, 0.36]} />
        <meshStandardMaterial color="#B0BEC5" roughness={0.45} metalness={0.15} />
      </mesh>
      {[-2.1, -0.7, 0.7, 2.1].map((offset, index) => (
        <group key={`plant-wall-${index}`} position={[CX + 6.8 + offset, 2.12, -8.02]}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.34, 0.16, 0.24]} />
            <meshStandardMaterial color="#9A6E52" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.34, 0]} castShadow>
            <boxGeometry args={[0.06, 0.24, 0.06]} />
            <meshStandardMaterial color="#3E704A" roughness={0.8} />
          </mesh>
          {[
            [-0.08, 0.42, 0],
            [0.08, 0.46, 0.04],
            [0, 0.56, -0.05],
          ].map(([x, y, z], leafIndex) => (
            <mesh key={`plant-wall-leaf-${leafIndex}`} position={[x, y, z]} rotation={[0, 0, leafIndex % 2 === 0 ? 0.4 : -0.4]} castShadow>
              <boxGeometry args={[0.2, 0.04, 0.1]} />
              <meshStandardMaterial color={leafIndex === 1 ? '#7BC67B' : '#4CAF50'} roughness={0.82} />
            </mesh>
          ))}
        </group>
      ))}

      <Whiteboard position={[CX + 10.7, 0.6, -1.1]} rotation={[0, 0, 0]} />

      <group position={[CX + 7.9, 0, 6.3]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <planeGeometry args={[3.6, 2.5]} />
          <meshStandardMaterial color="#F1E7D2" roughness={0.95} />
        </mesh>

        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.1, 0.62, 0.92]} />
          <meshStandardMaterial color="#A1887F" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.88, -0.34]} castShadow>
          <boxGeometry args={[2.1, 0.78, 0.24]} />
          <meshStandardMaterial color="#8D6E63" roughness={0.72} />
        </mesh>
        <mesh position={[-0.78, 0.75, 0]} castShadow>
          <boxGeometry args={[0.22, 0.55, 0.92]} />
          <meshStandardMaterial color="#8D6E63" roughness={0.72} />
        </mesh>
        <mesh position={[0.78, 0.75, 0]} castShadow>
          <boxGeometry args={[0.22, 0.55, 0.92]} />
          <meshStandardMaterial color="#8D6E63" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.76, 0]} castShadow>
          <boxGeometry args={[2.02, 0.08, 0.16]} />
          <meshStandardMaterial color="#D7CCC8" roughness={0.6} />
        </mesh>

        <mesh position={[-0.95, 0.3, 0.88]} castShadow receiveShadow>
          <cylinderGeometry args={[0.36, 0.42, 0.42, 16]} />
          <meshStandardMaterial color="#C9ADA7" roughness={0.8} />
        </mesh>
        <mesh position={[0.92, 0.3, 0.88]} castShadow receiveShadow>
          <cylinderGeometry args={[0.36, 0.42, 0.42, 16]} />
          <meshStandardMaterial color="#D6BFA9" roughness={0.8} />
        </mesh>

        <mesh position={[0, 0.32, -1.02]} castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.46, 0.64, 16]} />
          <meshStandardMaterial color="#ECEFF1" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.66, -1.02]} castShadow receiveShadow>
          <cylinderGeometry args={[0.36, 0.36, 0.08, 16]} />
          <meshStandardMaterial color="#CFD8DC" roughness={0.25} metalness={0.05} />
        </mesh>

        <mesh position={[1.42, 0.24, -0.82]} castShadow>
          <boxGeometry args={[0.34, 0.16, 0.34]} />
          <meshStandardMaterial color="#9A6E52" roughness={0.8} />
        </mesh>
        <mesh position={[1.42, 0.46, -0.82]} castShadow>
          <boxGeometry args={[0.06, 0.26, 0.06]} />
          <meshStandardMaterial color="#3F7448" roughness={0.8} />
        </mesh>
        {[
          [1.3, 0.56, -0.82],
          [1.54, 0.6, -0.78],
          [1.42, 0.68, -0.9],
          [1.48, 0.76, -0.72],
        ].map(([x, y, z], index) => (
          <mesh key={`sofa-plant-leaf-${index}`} position={[x, y, z]} rotation={[0, 0, index % 2 === 0 ? 0.45 : -0.45]} castShadow>
            <boxGeometry args={[0.22, 0.04, 0.12]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#4CAF50' : '#6BBF6B'} roughness={0.82} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function ClawTeamOffice({ members, taskSummary, teamName }: ClawTeamOfficeProps) {
  return (
    <group>
      {/* === FLOOR: warm off-white / cream === */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CX, 0.001, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.75} metalness={0.03} />
      </mesh>
      {/* Floor accent area — slightly lighter center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CX, 0.005, 0]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color="#F0EAE0" roughness={0.7} metalness={0.02} />
      </mesh>

      {/* === WALLS: glass curtain wall === */}
      {/* Back wall */}
      <mesh position={[CX, 3, -8.5]}>
        <boxGeometry args={[22, 6, 0.1]} />
        <meshStandardMaterial color="#B0BEC5" transparent opacity={0.2} roughness={0.1} metalness={0.3} />
      </mesh>
      {/* Left wall */}
      <mesh position={[CX - 11, 3, 0]}>
        <boxGeometry args={[0.1, 6, 17]} />
        <meshStandardMaterial color="#B0BEC5" transparent opacity={0.2} roughness={0.1} metalness={0.3} />
      </mesh>
      {/* Front wall (partial - entrance) */}
      <mesh position={[CX - 5.5, 3, 8.5]}>
        <boxGeometry args={[11, 6, 0.1]} />
        <meshStandardMaterial color="#B0BEC5" transparent opacity={0.15} roughness={0.1} metalness={0.3} />
      </mesh>
      <mesh position={[CX + 5.5, 3, 8.5]}>
        <boxGeometry args={[11, 6, 0.1]} />
        <meshStandardMaterial color="#B0BEC5" transparent opacity={0.15} roughness={0.1} metalness={0.3} />
      </mesh>

      {/* Metal frame pillars */}
      {[
        [CX - 11, 3, -8.5], [CX + 11, 3, -8.5],
        [CX - 11, 3, 8.5], [CX + 11, 3, 8.5],
      ].map(([x, y, z], i) => (
        <mesh key={`ct-pillar-${i}`} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.15, 6, 0.15]} />
          <meshStandardMaterial color="#546E7A" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}

      {/* === SIGN: ClawTeam Outsourcing Dept === */}
      <group position={[CX, 5.5, -8.4]}>
        <mesh>
          <boxGeometry args={[6, 0.8, 0.05]} />
          <meshStandardMaterial color="#1A237E" roughness={0.5} />
        </mesh>
        <Text position={[0, 0, 0.04]} fontSize={0.35} color="#FFFFFF" anchorX="center" anchorY="middle" fontWeight="bold">
          🏗️ ClawTeam Outsourcing Dept
        </Text>
      </group>

      {/* Team name subtitle */}
      <Text position={[CX, 4.9, -8.35]} fontSize={0.18} color="#90CAF9" anchorX="center" anchorY="middle">
        {teamName || 'Standby'}
      </Text>

      {/* === CENTRAL WORK TABLE === */}
      <group position={[CX, 0, 0]}>
        {/* Table top - white/modern */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.5, 0.08, 1.8]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Metal legs */}
        {[-1.5, 1.5].map((x, i) =>
          [-0.7, 0.7].map((z, j) => (
            <mesh key={`tleg-${i}-${j}`} position={[x, 0.23, z]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.46, 6]} />
              <meshStandardMaterial color="#78909C" roughness={0.3} metalness={0.5} />
            </mesh>
          ))
        )}
        {/* Monitor stands on table */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.6, 0.02, 0.4]} />
          <meshStandardMaterial color="#90A4AE" />
        </mesh>
      </group>

      {/* === STATUS BOARD (floating) === */}
      <group position={[CX, 4, 0]}>
        <mesh>
          <boxGeometry args={[4, 1.2, 0.05]} />
          <meshStandardMaterial color="#263238" transparent opacity={0.85} />
        </mesh>
        <Text position={[-1.5, 0.3, 0.03]} fontSize={0.2} color="#FFC107" anchorX="left" anchorY="middle">
          ⏳ {taskSummary.pending}
        </Text>
        <Text position={[-0.3, 0.3, 0.03]} fontSize={0.2} color="#4CAF50" anchorX="left" anchorY="middle">
          🔄 {taskSummary.in_progress}
        </Text>
        <Text position={[0.8, 0.3, 0.03]} fontSize={0.2} color="#2196F3" anchorX="left" anchorY="middle">
          ✅ {taskSummary.completed}
        </Text>
        <Text position={[-1.5, -0.1, 0.03]} fontSize={0.15} color="#B0BEC5" anchorX="left" anchorY="middle">
          Workers: {members.length}
        </Text>
        <Text position={[0, -0.1, 0.03]} fontSize={0.15} color="#B0BEC5" anchorX="left" anchorY="middle">
          Blocked: {taskSummary.blocked}
        </Text>
      </group>

      <LoungeDecor />

      {/* === LIGHTING === */}
      <pointLight position={[CX, 5, 0]} color="#FFFFFF" intensity={0.8} distance={20} />
      <pointLight position={[CX - 6, 4, -4]} color="#E3F2FD" intensity={0.4} distance={12} />
      <pointLight position={[CX + 6, 4, -4]} color="#E3F2FD" intensity={0.4} distance={12} />

      {/* === DESKS for each member slot === */}
      {members.map((member, i) => {
        const slot = SLOTS[i % SLOTS.length];
        if (!slot) return null;
        const color = WORKER_COLORS[i % WORKER_COLORS.length];
        return (
          <group key={member.name}>
            {/* Desk */}
            <group position={slot.deskPos}>
              <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.5, 0.06, 0.8]} />
                <meshStandardMaterial color="#ECEFF1" roughness={0.4} />
              </mesh>
              {/* Desk legs */}
              {[-0.65, 0.65].map((x, li) =>
                [-0.3, 0.3].map((z, lj) => (
                  <mesh key={`dl-${i}-${li}-${lj}`} position={[x, 0.23, z]} castShadow>
                    <cylinderGeometry args={[0.02, 0.02, 0.46, 6]} />
                    <meshStandardMaterial color="#78909C" metalness={0.4} />
                  </mesh>
                ))
              )}
              {/* Monitor */}
              <mesh position={[0, 1.0, -0.25]} castShadow>
                <boxGeometry args={[0.8, 0.5, 0.03]} />
                <meshStandardMaterial
                  color={member.status === 'working' ? '#1B5E20' : '#37474F'}
                  emissive={member.status === 'working' ? '#4CAF50' : '#455A64'}
                  emissiveIntensity={member.status === 'working' ? 0.4 : 0.1}
                />
              </mesh>
              {/* Nameplate */}
              <Text position={[0, 1.6, 0]} fontSize={0.12} color={color} anchorX="center" anchorY="middle">
                {member.originLabel ? `${member.originLabel} ${member.name}` : member.name}
              </Text>

              {/* Office Chair */}
              <group position={[0, 0, 0.7]}>
                {/* Seat */}
                <mesh position={[0, 0.38, 0]} castShadow>
                  <boxGeometry args={[0.45, 0.05, 0.45]} />
                  <meshStandardMaterial color="#37474F" />
                </mesh>
                {/* Backrest */}
                <mesh position={[0, 0.62, -0.2]} castShadow>
                  <boxGeometry args={[0.42, 0.45, 0.04]} />
                  <meshStandardMaterial color="#37474F" />
                </mesh>
                {/* Center column */}
                <mesh position={[0, 0.2, 0]} castShadow>
                  <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
                  <meshStandardMaterial color="#616161" metalness={0.5} />
                </mesh>
                {/* Base star (5 legs) */}
                {[0, 1, 2, 3, 4].map((li) => {
                  const angle = (li / 5) * Math.PI * 2;
                  return (
                    <mesh key={`chair-leg-${li}`} position={[Math.sin(angle) * 0.18, 0.04, Math.cos(angle) * 0.18]} castShadow>
                      <boxGeometry args={[0.03, 0.04, 0.2]} />
                      <meshStandardMaterial color="#616161" metalness={0.4} />
                    </mesh>
                  );
                })}
              </group>
            </group>

            {/* Moving temp worker avatar */}
            <MovingTempWorker member={member} slot={slot} color={color} />
          </group>
        );
      })}
    </group>
  );
}
