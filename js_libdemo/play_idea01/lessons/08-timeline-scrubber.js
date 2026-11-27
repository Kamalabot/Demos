/**
 * =============================================================================
 * LESSON 08: TIMELINE SCRUBBER & .CALL() TRIGGERS
 * Docs: https://animejs.com/documentation/timeline/timeline-methods
 * =============================================================================
 * CONCEPT:
 *   Timelines can embed arbitrary JavaScript callbacks at exact timestamps
 *   using `.call(fn, position)`, and can be scrubbed interactively via
 *   `tl.seek(time)` or `tl.progress = 0.5`.
 * =============================================================================
 */

import { createTimeline } from 'animejs';

export const LESSON_META = {
  summary:
    'Drag the scrubber to seek() through the timeline in either direction, watching .call() fire at exact milestone timestamps.',
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-controls">
      <button class="btn btn-primary" id="tl-play">Play</button>
      <button class="btn btn-outline" id="tl-pause">Pause</button>
      <input id="tl-scrub" type="range" min="0" max="1" step="0.005" value="0" style="flex:1;" />
      <span id="tl-pct" style="font-family:monospace; font-size:0.8rem;">0%</span>
    </div>
    <div class="demo-row">
      <div id="sc-a" class="demo-box">A</div>
      <div id="sc-b" class="demo-box" style="background:#a855f7;">B</div>
    </div>
    <div class="demo-pill">Last Milestone: <strong id="tl-milestone">None</strong></div>
  `;

  const scrub = stage.querySelector('#tl-scrub');
  const pct = stage.querySelector('#tl-pct');
  const milestone = stage.querySelector('#tl-milestone');

  const tl = createTimeline({
    autoplay: true,
    loop: true,
    onUpdate: (self) => {
      scrub.value = String(self.progress);
      pct.textContent = `${Math.round(self.progress * 100)}%`;
    },
  });

  tl.add('#sc-a', { x: 220, rotate: 180, duration: 1000 })
    .call(() => {
      milestone.textContent = 'Box A arrived (1000ms)';
    })
    .add('#sc-b', { x: 220, scale: 1.3, duration: 1000 }, '-=200')
    .call(() => {
      milestone.textContent = 'Box B arrived (1800ms)';
    });

  stage.querySelector('#tl-play').onclick = () => tl.play();
  stage.querySelector('#tl-pause').onclick = () => tl.pause();
  scrub.oninput = (e) => {
    tl.pause();
    tl.progress = Number(e.target.value);
  };

  return () => tl.revert();
}
