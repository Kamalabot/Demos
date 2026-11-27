/**
 * =============================================================================
 * LESSON 15: SVG SHAPE MORPHING (svg.morphTo)
 * Docs: https://animejs.com/documentation/svg/morphto
 * =============================================================================
 */

import { animate, svg } from 'animejs';

export const LESSON_META = {
  summary:
    'svg.morphTo() smoothly interpolates between two completely different SVG paths by automatically resampling their control points.',
  masteryNote:
    'Normally CSS/SVG path interpolation fails if two paths have unequal command counts. `morphTo()` resamples both paths to matching segment counts before tweening.',
  highlightLines: [[23, 30]],
};

export function mount(stage) {
  stage.innerHTML = `
    <svg viewBox="0 0 200 200" width="220" height="220" style="background:#06080d; border-radius:12px; border:1px solid rgba(148,163,184,0.2);">
      <path id="morph-a" d="M 100 20 L 175 160 L 25 160 Z" fill="#ff4b4b" />
      <path id="morph-b" d="M 100 15 L 122 72 L 184 72 L 134 110 L 152 170 L 100 135 L 48 170 L 66 110 L 16 72 L 78 72 Z" fill="none" opacity="0" />
    </svg>
  `;

  const anim = animate('#morph-a', { // @core
    d: svg.morphTo('#morph-b'), // @core
    fill: '#38bdf8',
    duration: 1400,
    ease: 'inOutQuad',
    loop: true,
    alternate: true,
  });

  return () => anim.revert();
}
