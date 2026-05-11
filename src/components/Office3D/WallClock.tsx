'use client';

import { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';

interface WallClockProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  radius?: number;
}

/**
 * iPhone StandBy-style giant digital clock.
 * Floats in the sky behind the mountains, showing real-time China time.
 */
export default function WallClock({
  position,
  rotation = [0, 0, 0],
}: WallClockProps) {
  const [time, setTime] = useState({ h: '', mm: '' });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTime({ h: String(hours), mm: minutes });
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <group position={position} rotation={rotation}>
      <Html
        center
        distanceFactor={28}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily:
              '"SF Pro Display", -apple-system, "Helvetica Neue", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '180px',
            lineHeight: 1,
            color: '#b0b0b8',
            textShadow:
              '0 2px 8px rgba(0,0,0,0.25), 0 0 60px rgba(180,180,200,0.15)',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            letterSpacing: '-4px',
          }}
        >
          {/* Hours */}
          <span>{time.h}</span>

          {/* iPhone-style colon dots */}
          <span
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '22px',
              margin: '0 8px',
              paddingBottom: '8px',
            }}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#b0b0b8',
                boxShadow: '0 0 12px rgba(180,180,200,0.3)',
              }}
            />
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#b0b0b8',
                boxShadow: '0 0 12px rgba(180,180,200,0.3)',
              }}
            />
          </span>

          {/* Minutes */}
          <span>{time.mm}</span>
        </div>
      </Html>
    </group>
  );
}
