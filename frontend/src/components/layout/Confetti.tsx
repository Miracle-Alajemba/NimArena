import React, { useEffect, useRef, useState } from "react";

interface ConfettiProps {
  active: boolean;
}

const COLORS = ["#7C3AED", "#F59E0B", "#10B981", "#A78BFA", "#FBBF24", "#34D399"];

export function Confetti({ active }: ConfettiProps) {
  const [particles, setParticles] = useState<
    { id: number; x: number; color: string; duration: number; delay: number; size: number }[]
  >([]);

  useEffect(() => {
    if (!active) { setParticles([]); return; }
    const ps = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      duration: 2.5 + Math.random() * 2,
      delay: Math.random() * 1.2,
      size: 6 + Math.random() * 8,
    }));
    setParticles(ps);
    const timeout = setTimeout(() => setParticles([]), 5000);
    return () => clearTimeout(timeout);
  }, [active]);

  if (!particles.length) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            top: "-20px",
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
export default Confetti;
