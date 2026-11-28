import type { Variants } from 'framer-motion';

/**
 * GPU-composited directional 3D book page-turn variants.
 * Uses only transform (translateX, rotateY, scale) and opacity for 60/120fps zero-lag transitions.
 */
export function createPageFlipVariants(
  tiltDeg = 26,
  slidePx = 80,
  minScale = 0.96,
  duration = 0.34
): Variants {
  return {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir >= 0 ? slidePx : -slidePx,
      rotateY: dir >= 0 ? tiltDeg : -tiltDeg,
      scale: minScale,
      transformOrigin: dir >= 0 ? 'left center' : 'right center',
    }),
    center: {
      opacity: 1,
      x: 0,
      rotateY: 0,
      scale: 1,
      transition: {
        duration,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir >= 0 ? -slidePx : slidePx,
      rotateY: dir >= 0 ? -tiltDeg : tiltDeg,
      scale: minScale,
      transformOrigin: dir >= 0 ? 'right center' : 'left center',
      transition: {
        duration: duration * 0.72,
        ease: [0.4, 0, 1, 1],
      },
    }),
  };
}

export const PAGE_FLIP_VARIANTS = createPageFlipVariants(26, 80, 0.96, 0.34);
export const TEXT_PAGE_FLIP_VARIANTS = createPageFlipVariants(12, 56, 0.98, 0.3);
