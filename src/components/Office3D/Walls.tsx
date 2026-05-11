'use client';

function FrameBar({ position, args, color = '#c9a96e' }: {
  position: [number, number, number];
  args: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.68} metalness={0.08} />
    </mesh>
  );
}

function InteriorPlanter({
  position,
  size = 'medium',
}: {
  position: [number, number, number];
  size?: 'small' | 'medium';
}) {
  const scale = size === 'small' ? 0.78 : 1;

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.6, 0.95]} />
        <meshStandardMaterial color="#D7C9B6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.62, 10]} />
        <meshStandardMaterial color="#8C6B4D" roughness={0.82} />
      </mesh>
      {[
        [-0.16, 1.18, 0.02],
        [0.15, 1.14, -0.06],
        [0.02, 1.34, 0.14],
        [-0.04, 1.45, -0.12],
        [0.18, 1.52, 0.06],
        [-0.2, 1.55, -0.02],
      ].map(([x, y, z], index) => (
        <mesh
          key={`leaf-${index}`}
          position={[x, y, z]}
          rotation={[0, 0, index % 2 === 0 ? 0.45 : -0.45]}
          castShadow
        >
          <boxGeometry args={[0.34, 0.05, 0.16]} />
          <meshStandardMaterial color={index % 3 === 0 ? '#74A970' : index % 3 === 1 ? '#4F8A58' : '#89BC82'} roughness={0.84} />
        </mesh>
      ))}
    </group>
  );
}

export default function Walls() {
  return (
    <group>
      <group position={[-14.9, 3, 0]}>
        <mesh>
          <boxGeometry args={[0.08, 5.8, 19]} />
          <meshStandardMaterial
            color="#e8dfd0"
            transparent
            opacity={0.26}
            roughness={0.12}
            metalness={0.1}
          />
        </mesh>
        <FrameBar position={[0, 2.95, 0]} args={[0.18, 0.18, 19.2]} />
        <FrameBar position={[0, -2.95, 0]} args={[0.18, 0.18, 19.2]} color="#B8AA98" />
        {[-6.1, 0, 6.1].map((z, index) => (
          <FrameBar key={`left-mullion-${index}`} position={[0, 0, z]} args={[0.12, 5.7, 0.12]} color="#D8CBB9" />
        ))}
        <pointLight position={[1.2, 1.2, -4]} color="#FFF9EF" intensity={0.45} distance={12} />
        <pointLight position={[1.2, 1.2, 4]} color="#FFF9EF" intensity={0.45} distance={12} />
      </group>

      <group position={[14.9, 3, 0]}>
        <mesh>
          <boxGeometry args={[0.08, 5.8, 19]} />
          <meshStandardMaterial
            color="#D7E6EC"
            transparent
            opacity={0.26}
            roughness={0.12}
            metalness={0.1}
          />
        </mesh>
        <FrameBar position={[0, 2.95, 0]} args={[0.18, 0.18, 19.2]} />
        <FrameBar position={[0, -2.95, 0]} args={[0.18, 0.18, 19.2]} color="#B8AA98" />
        {[-6.1, 0, 6.1].map((z, index) => (
          <FrameBar key={`right-mullion-${index}`} position={[0, 0, z]} args={[0.12, 5.7, 0.12]} color="#D8CBB9" />
        ))}
        <pointLight position={[-1.2, 1.2, -4]} color="#F3FBFF" intensity={0.45} distance={12} />
        <pointLight position={[-1.2, 1.2, 4]} color="#F3FBFF" intensity={0.45} distance={12} />
      </group>

      <group position={[0, 3, -9.9]}>
        <mesh>
          <boxGeometry args={[29, 5.8, 0.08]} />
          <meshStandardMaterial
            color="#E2ECEB"
            transparent
            opacity={0.24}
            roughness={0.16}
            metalness={0.08}
          />
        </mesh>
        <FrameBar position={[0, 2.95, 0]} args={[29.2, 0.18, 0.18]} />
        <FrameBar position={[0, -2.95, 0]} args={[29.2, 0.18, 0.18]} color="#B8AA98" />
        {[-9.5, 0, 9.5].map((x, index) => (
          <FrameBar key={`back-mullion-${index}`} position={[x, 0, 0]} args={[0.12, 5.7, 0.12]} color="#D8CBB9" />
        ))}
      </group>

      {[[-16.5, 0, -6], [-17, 0, -2], [-16.5, 0, 2], [-17.5, 0, 5], [-16.8, 0, 7]].map(([x, y, z], i) => (
        <group key={`bamboo-${i}`} position={[x, y, z]}>
          <mesh position={[0, 2, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 4, 6]} />
            <meshStandardMaterial color="#5B8E5A" roughness={0.7} />
          </mesh>
          <mesh position={[0.15, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 3, 6]} />
            <meshStandardMaterial color="#6A9C66" roughness={0.7} />
          </mesh>
          <mesh position={[0, 3.8, 0]}>
            <sphereGeometry args={[0.5, 6, 6]} />
            <meshStandardMaterial color="#7DB57A" roughness={0.92} transparent opacity={0.82} />
          </mesh>
        </group>
      ))}

      <group position={[17, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <planeGeometry args={[6, 18]} />
          <meshStandardMaterial
            color="#80C7DA"
            emissive="#A8DDEA"
            emissiveIntensity={0.08}
            transparent
            opacity={0.84}
            roughness={0.18}
            metalness={0.08}
          />
        </mesh>
        {[
          [0.5, 0.1, -3],
          [-0.8, 0.1, 1],
          [1.0, 0.1, 4],
          [-0.3, 0.1, -6],
          [0.7, 0.1, 7],
        ].map(([x, y, z], i) => (
          <mesh key={`koi-${i}`} position={[x, y, z]} rotation={[0, i * 1.2, 0]}>
            <boxGeometry args={[0.3, 0.1, 0.6]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#F7B267' : '#F3F0E8'}
              emissive={i % 2 === 0 ? '#C97C3B' : '#CFC5B2'}
              emissiveIntensity={0.08}
            />
          </mesh>
        ))}
        {[[1.5, 0.08, -2], [-1.2, 0.08, 3], [0.8, 0.08, 6], [-0.5, 0.08, -5]].map(([x, y, z], i) => (
          <mesh key={`lily-${i}`} position={[x, y, z]} rotation={[-Math.PI / 2, 0, i * 0.8]}>
            <circleGeometry args={[0.5, 8]} />
            <meshStandardMaterial color="#5F9B64" roughness={0.9} />
          </mesh>
        ))}
        {[[-2.8, 0.2, -4], [2.8, 0.3, 2], [-2.5, 0.2, 5], [2.5, 0.15, -7]].map(([x, y, z], i) => (
          <mesh key={`rock-${i}`} position={[x, y, z]}>
            <boxGeometry args={[0.8, 0.4, 0.6]} />
            <meshStandardMaterial color="#B4B0AA" roughness={0.96} />
          </mesh>
        ))}
        {[[19.5, 0, -5], [19, 0, 3], [20, 0, 7]].map(([x, y, z], i) => (
          <group key={`rtree-${i}`} position={[x - 17, y, z]}>
            <mesh position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.06, 0.1, 2.4, 6]} />
              <meshStandardMaterial color="#7D5E43" />
            </mesh>
            <mesh position={[0, 2.8, 0]}>
              <sphereGeometry args={[0.9, 8, 8]} />
              <meshStandardMaterial color="#6EA56B" roughness={0.82} />
            </mesh>
          </group>
        ))}
      </group>

      {[[-8, 0, -12], [0, 0, -13], [8, 0, -12], [-4, 0, -11.5], [5, 0, -11]].map(([x, y, z], i) => (
        <group key={`btree-${i}`} position={[x, y, z]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 3, 6]} />
            <meshStandardMaterial color="#7C5F45" />
          </mesh>
          <mesh position={[0, 3.5, 0]}>
            <coneGeometry args={[1, 2.5, 6]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#577F57' : '#6A9568'} roughness={0.84} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3, -16]}>
        <boxGeometry args={[40, 6, 0.5]} />
        <meshStandardMaterial color="#A5B9A0" roughness={1} />
      </mesh>
      <mesh position={[-6, 5, -17]}>
        <coneGeometry args={[5, 6, 4]} />
        <meshStandardMaterial color="#96AB93" roughness={1} />
      </mesh>
      <mesh position={[7, 4.5, -18]}>
        <coneGeometry args={[6, 5, 4]} />
        <meshStandardMaterial color="#879E84" roughness={1} />
      </mesh>

      <InteriorPlanter position={[11.9, 0, -6.55]} />
      <InteriorPlanter position={[-11.95, 0, 6.3]} size="small" />
      <InteriorPlanter position={[12.55, 0, 2.3]} size="small" />
    </group>
  );
}
