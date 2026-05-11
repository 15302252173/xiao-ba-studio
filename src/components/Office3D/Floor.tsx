'use client';

import { useMemo } from 'react';
import { CanvasTexture, RepeatWrapping } from 'three';

function buildMicrocementTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#f5f0e8');
  gradient.addColorStop(1, '#DDD8D0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 1800; i++) {
    const shade = 220 + (i % 5) * 3;
    ctx.fillStyle = `rgba(${shade}, ${shade - 2}, ${shade - 5}, 0.06)`;
    ctx.fillRect((i * 37) % 512, (i * 53) % 512, 2, 2);
  }

  for (let y = 48; y < 512; y += 112) {
    ctx.strokeStyle = 'rgba(205, 198, 188, 0.32)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + 12);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(7, 7);
  return texture;
}

function buildWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#D8BE97';
  ctx.fillRect(0, 0, 512, 512);

  const plankWidth = 48;
  for (let x = 0; x < 512; x += plankWidth) {
    const tone = 204 + ((x / plankWidth) % 4) * 8;
    ctx.fillStyle = `rgb(${tone}, ${tone - 22}, ${tone - 48})`;
    ctx.fillRect(x, 0, plankWidth - 2, 512);

    ctx.strokeStyle = 'rgba(109, 84, 54, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + plankWidth - 2, 0);
    ctx.lineTo(x + plankWidth - 2, 512);
    ctx.stroke();

    for (let y = 0; y < 512; y += 24) {
      ctx.fillStyle = `rgba(154, 114, 66, ${0.05 + ((x + y) % 3) * 0.02})`;
      ctx.fillRect(x + 4, y + ((x / plankWidth) % 2 === 0 ? 3 : 8), plankWidth - 10, 1.5);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(4.5, 4.5);
  return texture;
}

export default function Floor() {
  const microcementTexture = useMemo(() => buildMicrocementTexture(), []);
  const woodTexture = useMemo(() => buildWoodTexture(), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial map={microcementTexture} roughness={0.93} metalness={0.04} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.01, -0.4]} receiveShadow>
        <planeGeometry args={[16.5, 11.5]} />
        <meshStandardMaterial map={woodTexture} roughness={0.78} metalness={0.04} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[11.15, 0.012, 7.15]} receiveShadow>
        <planeGeometry args={[7.8, 6.8]} />
        <meshStandardMaterial map={woodTexture} roughness={0.74} metalness={0.05} color="#f4ede2" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, -8.15]} receiveShadow>
        <planeGeometry args={[9.2, 3.2]} />
        <meshStandardMaterial color="#F7F3ED" roughness={0.9} metalness={0.02} />
      </mesh>
    </group>
  );
}
