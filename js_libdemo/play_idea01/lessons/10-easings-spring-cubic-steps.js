/**
 * =============================================================================
 * LESSON 10: SPRING PHYSICS, CUBIC BEZIER, STEPS & IRREGULAR
 * Docs: https://animejs.com/documentation/easings/spring
 * =============================================================================
 * CONCEPT:
 *   Beyond standard polynomial eases, Anime.js v4 includes specialized
 *   generators:
 *     - `createSpring({ mass, stiffness, damping, velocity })`: Real Hooke's Law physics
 *     - `cubicBezier(x1, y1, x2, y2)`: CSS-compatible Bezier curves
 *     - `steps(n)`: Discrete frame-by-frame sprite-sheet stepping
 *     - `irregular(length, randomness)`: Organic, jittery hand-drawn motion
 * =============================================================================
 */

import { animate, createSpring, cubicBezier, steps, irregular } from 'animejs';

export const LESSON_META = {
  summary:
    'Compare real Spring physics (mass, stiffness, damping), CubicBezier, discrete Steps(6), and Irregular organic motion side-by-side.',
};

export function mount(stage) {
  stage.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div><small style="color:#94a3b8;">createSpring({ mass: 1, stiffness: 120, damping: 10 })</small><div id="e-spring" class="demo-box" style="margin-top:4px;">SPRING</div></div>
      <div><small style="color:#94a3b8;">cubicBezier(0.68, -0.6, 0.32, 1.6)</small><div id="e-bezier" class="demo-box" style="margin-top:4px; background:#38bdf8;">BEZIER</div></div>
      <div><small style="color:#94a3b8;">steps(6)</small><div id="e-steps" class="demo-box" style="margin-top:4px; background:#34d399;">STEPS</div></div>
      <div><small style="color:#94a3b8;">irregular(12, 0.8)</small><div id="e-irreg" class="demo-box" style="margin-top:4px; background:#a855f7;">JITTER</div></div>
    </div>
  `;

  const anims = [
    animate('#e-spring', {
      x: 280,
      ease: createSpring({ mass: 1, stiffness: 120, damping: 10 }),
      loop: true,
      alternate: true,
    }),
    animate('#e-bezier', {
      x: 280,
      duration: 1600,
      ease: cubicBezier(0.68, -0.6, 0.32, 1.6),
      loop: true,
      alternate: true,
    }),
    animate('#e-steps', {
      x: 280,
      duration: 1600,
      ease: steps(6),
      loop: true,
      alternate: true,
    }),
    animate('#e-irreg', {
      x: 280,
      duration: 1600,
      ease: irregular(12, 0.8),
      loop: true,
      alternate: true,
    }),
  ];

  return () => anims.forEach((a) => a.revert());
}
