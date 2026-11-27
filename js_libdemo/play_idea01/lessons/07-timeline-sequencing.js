/**
 * =============================================================================
 * LESSON 07: TIMELINE SEQUENCING, LABELS & RELATIVE OFFSETS
 * Docs: https://animejs.com/documentation/timeline
 * =============================================================================
 */

import { createTimeline } from 'animejs';

export const LESSON_META = {
  summary:
    'createTimeline() choreographs multi-element sequences using relative time offsets (-=, +=, <) and named .label() markers.',
  masteryNote:
    'Relative offsets (`-=350`, `<`) keep choreography decoupled from fixed durations—changing one step automatically shifts downstream elements.',
  highlightLines: [[29, 39]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-row" style="flex-direction:column; align-items:flex-start; gap:14px;">
      <div id="tl-1" class="demo-box">01</div>
      <div id="tl-2" class="demo-box" style="background:#38bdf8;">02</div>
      <div id="tl-3" class="demo-box" style="background:#34d399;">03</div>
    </div>
  `;

  const tl = createTimeline({ // @core
    loop: true,
    alternate: true,
    defaults: { duration: 700, ease: 'outExpo' },
  });

  tl.add('#tl-1', { x: 240 }) // @core
    .label('midway')
    .add('#tl-2', { x: 240, rotate: 90 }, '-=350') // @core
    .add('#tl-3', { x: 240, scale: 1.2 }, '<'); // @core

  return () => tl.revert();
}
