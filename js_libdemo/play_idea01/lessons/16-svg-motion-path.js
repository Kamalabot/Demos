/**
 * =============================================================================
 * LESSON 16: SVG MOTION PATH (svg.createMotionPath)
 * Docs: https://animejs.com/documentation/svg/createmotionpath
 * =============================================================================
 */

import { animate, svg } from 'animejs';

export const LESSON_META = {
  summary:
    'svg.createMotionPath() extracts x, y, and tangent rotation from an SVG path so any HTML or SVG element can follow the curve.',
  masteryNote:
    '`createMotionPath()` returns `{ translateX, translateY, rotate }` function-based property getters evaluated via `getPointAtLength()` at each frame.',
  highlightLines: [[25, 32]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div style="position:relative; width:340px; height:180px;">
      <svg viewBox="0 0 340 180" width="340" height="180" style="background:#06080d; border-radius:12px; border:1px solid rgba(148,163,184,0.2);">
        <path id="orbit-path" d="M 40 90 C 40 20, 300 20, 300 90 C 300 160, 40 160, 40 90 Z" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="6" />
      </svg>
      <div id="mover" style="position:absolute; top:-14px; left:-14px; width:28px; height:28px; border-radius:6px; background:#ff4b4b; display:grid; place-items:center; font-size:0.7rem; font-weight:700;">▶</div>
    </div>
  `;

  const motionPath = svg.createMotionPath('#orbit-path'); // @core

  const anim = animate('#mover', { // @core
    ...motionPath, // @core
    duration: 3200,
    ease: 'linear',
    loop: true,
  });

  return () => anim.revert();
}
