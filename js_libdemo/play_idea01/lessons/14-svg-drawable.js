/**
 * =============================================================================
 * LESSON 14: SVG DRAWABLE STROKES (svg.createDrawable)
 * Docs: https://animejs.com/documentation/svg/createdrawable
 * =============================================================================
 */

import { animate, svg, stagger } from 'animejs';

export const LESSON_META = {
  summary:
    'svg.createDrawable() automates stroke-dashoffset line-drawing animations using normalized "0 1" progress strings.',
  masteryNote:
    'Under the hood, `createDrawable()` computes `getTotalLength()`, injects a `pathLength="1000"` normalization proxy, and animates `stroke-dasharray`/`stroke-dashoffset` seamlessly.',
  highlightLines: [[26, 33]],
};

export function mount(stage) {
  stage.innerHTML = `
    <svg viewBox="0 0 320 140" width="340" height="150" style="background:#06080d; border-radius:12px; border:1px solid rgba(148,163,184,0.2);">
      <path class="draw-line" d="M 30 110 L 80 30 L 130 110 Z" fill="none" stroke="#ff4b4b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <circle class="draw-line" cx="195" cy="70" r="38" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />
      <path class="draw-line" d="M 255 30 L 295 110 M 295 30 L 255 110" fill="none" stroke="#34d399" stroke-width="4" stroke-linecap="round" />
    </svg>
  `;

  const anim = animate(svg.createDrawable('.draw-line'), { // @core
    draw: ['0 0', '0 1'], // @core
    ease: 'inOutSine',
    duration: 1600,
    delay: stagger(200),
    loop: true,
    alternate: true,
  });

  return () => anim.revert();
}
