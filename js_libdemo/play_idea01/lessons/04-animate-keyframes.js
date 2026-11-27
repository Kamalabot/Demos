/**
 * =============================================================================
 * LESSON 04: KEYFRAMES CHOREOGRAPHY
 * Docs: https://animejs.com/documentation/animation/keyframes
 * =============================================================================
 * CONCEPT:
 *   Instead of chaining multiple `.add()` calls, a single `animate()` call can
 *   define multi-step motion using Keyframes in two ways:
 *     1. Property-level Array Keyframes: `x: [0, 200, 100]`
 *     2. Duration-based Keyframe Objects: `keyframes: [{ y: -40, duration: 400 }, ...]`
 * =============================================================================
 */

import { animate } from 'animejs';

export const LESSON_META = {
  summary:
    'Keyframes let a single animate() call choreograph multi-stage motion paths, bounce arcs, and squash-and-stretch sequences.',
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-row" style="height:160px; align-items:flex-end; padding-bottom:16px;">
      <div id="kf-box" class="demo-box">KF</div>
    </div>
  `;

  // Duration-based Keyframe sequence (Squash -> Leap -> Spin -> Land)
  const anim = animate('#kf-box', {
    keyframes: [
      { scaleX: 1.3, scaleY: 0.7, duration: 220, ease: 'outQuad' },
      { y: -90, x: 140, scaleX: 0.85, scaleY: 1.2, rotate: 180, duration: 500, ease: 'outCubic' },
      { y: 0, x: 280, scaleX: 1.25, scaleY: 0.75, rotate: 360, duration: 450, ease: 'inQuad' },
      { scaleX: 1, scaleY: 1, duration: 250, ease: 'outElastic(1, 0.5)' },
    ],
    loop: true,
    loopDelay: 400,
    alternate: true,
  });

  return () => anim.revert();
}
