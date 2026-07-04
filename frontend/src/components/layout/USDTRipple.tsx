import React, { useEffect } from "react";

interface USDTRippleProps {
  active: boolean;
  onAnimationEnd: () => void;
}

export function USDTRipple({ active, onAnimationEnd }: USDTRippleProps) {
  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        onAnimationEnd();
      }, 1200); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [active, onAnimationEnd]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="payout-ripple" />
    </div>
  );
}
export default USDTRipple;
