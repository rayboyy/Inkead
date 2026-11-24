import React, { useEffect, useState } from 'react';

interface FocusRulerProps {
  isActive: boolean;
  height?: number; // Band height in pixels
}

export const FocusRuler: React.FC<FocusRulerProps> = ({ isActive, height = 56 }) => {
  const [mouseY, setMouseY] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isActive]);

  if (!isActive || mouseY === null) return null;

  const topMaskHeight = Math.max(0, mouseY - height / 2);
  const bottomMaskTop = mouseY + height / 2;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden transition-opacity duration-300">
      {/* Upper Dimming Mask */}
      <div
        className="absolute top-0 left-0 right-0 bg-stone-950/35 backdrop-blur-[0.5px] transition-all duration-75"
        style={{ height: `${topMaskHeight}px` }}
      />

      {/* Illuminated Reading Band Hairlines */}
      <div
        className="absolute left-0 right-0 pointer-events-none border-y border-amber-500/20 bg-amber-500/[0.02]"
        style={{
          top: `${topMaskHeight}px`,
          height: `${height}px`,
        }}
      />

      {/* Lower Dimming Mask */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-stone-950/35 backdrop-blur-[0.5px] transition-all duration-75"
        style={{ top: `${bottomMaskTop}px` }}
      />
    </div>
  );
};
