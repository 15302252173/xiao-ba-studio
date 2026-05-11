'use client';

interface RoundTableProps {
  onClick?: () => void;
}

export default function RoundTable({ onClick }: RoundTableProps) {
  return (
    <group position={[0, 0, 0]} onClick={onClick}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.1, 1.6]} />
        <meshStandardMaterial color="#faf7f0" roughness={0.62} metalness={0.04} />
      </mesh>

      {[-1.28, 1.28].map((x, i) =>
        [-0.58, 0.58].map((z, j) => (
          <mesh key={`leg-${i}-${j}`} position={[x, 0.24, z]} castShadow>
            <cylinderGeometry args={[0.045, 0.055, 0.48, 10]} />
            <meshStandardMaterial color="#B18F68" roughness={0.7} />
          </mesh>
        ))
      )}

      <mesh position={[0, 0.63, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.82, 0.06, 0.42]} />
        <meshStandardMaterial color="#F5F1EA" roughness={0.32} />
      </mesh>

      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.18, 0.14, 0.18]} />
        <meshStandardMaterial color="#D6C5AF" roughness={0.74} />
      </mesh>
      <mesh position={[0, 0.86, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.24, 10]} />
        <meshStandardMaterial color="#7C5F42" roughness={0.82} />
      </mesh>
      {[
        [-0.08, 0.98, 0.02],
        [0.08, 1.03, -0.02],
        [0.02, 1.12, 0.08],
      ].map(([x, y, z], index) => (
        <mesh key={`table-leaf-${index}`} position={[x, y, z]} rotation={[0, 0, index % 2 === 0 ? 0.45 : -0.45]} castShadow>
          <boxGeometry args={[0.18, 0.03, 0.09]} />
          <meshStandardMaterial color={index === 1 ? '#89BC82' : '#6EA56B'} roughness={0.84} />
        </mesh>
      ))}
    </group>
  );
}
