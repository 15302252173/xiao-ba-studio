'use client';

export default function Lights() {
  return (
    <>
      <ambientLight intensity={0.72} color="#ffe8d0" />

      <directionalLight
        position={[-8, 14, 10]}
        intensity={1.1}
        color="#fff5e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <hemisphereLight args={['#ffe8d0', '#8b7355', 0.4]} />

      <pointLight position={[0, 4.3, -0.5]} intensity={0.3} color="#ffe4c0" distance={11} />
      <pointLight position={[11.2, 2.8, 7.1]} intensity={0.35} color="#ffe0c0" distance={9} />
      <pointLight position={[-11.0, 3.0, -4.8]} intensity={0.22} color="#ffe8d0" distance={7} />
    </>
  );
}
