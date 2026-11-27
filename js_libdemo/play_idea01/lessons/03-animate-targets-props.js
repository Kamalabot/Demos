/**
 * =============================================================================
 * LESSON 03: ANIMATE() — TARGETS, CSS TRANSFORMS, JS OBJECTS & COLORS
 * Docs: https://animejs.com/documentation/animation
 * =============================================================================
 */

import { animate } from 'animejs';

export const LESSON_META = {
  summary:
    'animate() unifies DOM CSS transforms (x, rotate, scale), color interpolation, and plain JavaScript object properties under one API.',
  masteryNote:
    'Always prefer `x`, `y`, `scale`, and `rotate` over `left`/`top`/`width`—they map to GPU-composited `transform` matrices and avoid layout reflows.',
  highlightLines: [[34, 52]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-row" style="min-height:110px;">
      <div id="anim-box" class="demo-box">DOM</div>
      <div class="demo-pill">JS Object Counter: <strong id="js-score">0</strong></div>
    </div>
    <p style="font-size:0.8rem; color:#94a3b8;">
      Notice how <code>x</code>, <code>rotate</code>, and <code>scale</code> map directly to GPU-composited CSS <code>transform</code> properties.
    </p>
  `;

  const scoreEl = stage.querySelector('#js-score');
  const state = { score: 0 };

  // 1. DOM Element Animation (Transform + Color)
  const domAnim = animate('#anim-box', { // @core
    x: [0, 260],
    rotate: '1turn',
    scale: [1, 1.35],
    borderRadius: ['12px', '50%'],
    backgroundColor: ['#ff4b4b', '#38bdf8'],
    duration: 2200,
    alternate: true,
    loop: true,
    ease: 'inOutQuad',
  });

  // 2. Plain JavaScript Object Animation
  const objAnim = animate(state, { // @core
    score: 10000,
    duration: 2200,
    alternate: true,
    loop: true,
    ease: 'outExpo',
    onUpdate: () => {
      scoreEl.textContent = Math.round(state.score).toLocaleString();
    },
  });

  return () => {
    domAnim.revert();
    objAnim.revert();
  };
}
