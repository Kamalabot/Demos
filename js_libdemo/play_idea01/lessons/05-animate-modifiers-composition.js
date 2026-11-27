/**
 * =============================================================================
 * LESSON 05: MODIFIERS & COMPOSITION
 * Docs: https://animejs.com/documentation/animation/tween-parameters/modifier
 * =============================================================================
 * CONCEPT:
 *   1. `modifier: (value) => ...`: Intercepts every interpolated value before
 *      it is applied. Ideal for quantizing/snapping to a pixel grid (stepped
 *      retro motion) or formatting numbers.
 *   2. `composition: 'blend' | 'add' | 'replace'`: Controls how overlapping
 *      animations on the SAME target & property interact.
 * =============================================================================
 */

import { animate, utils } from 'animejs';

export const LESSON_META = {
  summary:
    'Modifiers intercept tween values on-the-fly (e.g., snapping to a 40px grid), while composition controls how concurrent animations blend.',
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-row">
      <div>
        <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:6px;">Snapped via modifier (40px steps):</div>
        <div id="mod-snap" class="demo-box">SNAP</div>
      </div>
    </div>
    <div class="demo-row" style="margin-top:12px;">
      <div>
        <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:6px;">Smooth (no modifier):</div>
        <div id="mod-smooth" class="demo-box" style="background:linear-gradient(135deg,#38bdf8,#6366f1);">SMOOTH</div>
      </div>
    </div>
  `;

  // Quantizes the continuous float `x` into 40px increments using `utils.snap`
  const snapAnim = animate('#mod-snap', {
    x: 320,
    duration: 2400,
    loop: true,
    alternate: true,
    ease: 'inOutSine',
    modifier: utils.snap(40),
  });

  const smoothAnim = animate('#mod-smooth', {
    x: 320,
    duration: 2400,
    loop: true,
    alternate: true,
    ease: 'inOutSine',
  });

  return () => {
    snapAnim.revert();
    smoothAnim.revert();
  };
}
