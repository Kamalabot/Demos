/**
 * =============================================================================
 * LESSON 11: STAGGER GRID & ORIGINS (stagger)
 * Docs: https://animejs.com/documentation/utilities/stagger
 * =============================================================================
 */

import { animate, stagger } from 'animejs';

export const LESSON_META = {
  summary:
    'stagger() with grid: [8, 5] calculates 2D Euclidean distance from the chosen origin ("center", "first", "last") to create ripple waves.',
  masteryNote:
    'For a `[cols, rows]` matrix, Anime.js computes `Math.hypot(dx, dy)` from the `from` cell—creating radial shockwaves with a single line of code.',
  highlightLines: [[34, 44]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-controls">
      <button class="btn btn-accent" data-from="center">from: 'center'</button>
      <button class="btn btn-outline" data-from="first">from: 'first'</button>
      <button class="btn btn-outline" data-from="last">from: 'last'</button>
    </div>
    <div id="stagger-grid" style="display:grid; grid-template-columns:repeat(8, 34px); gap:8px;"></div>
  `;

  const gridEl = stage.querySelector('#stagger-grid');
  for (let i = 0; i < 40; i++) {
    const cell = document.createElement('div');
    cell.className = 'sg-cell';
    cell.style.cssText = 'width:34px; height:34px; border-radius:6px; background:#38bdf8;';
    gridEl.appendChild(cell);
  }

  let currentAnim = null;

  function trigger(from) {
    if (currentAnim) currentAnim.revert();
    currentAnim = animate('.sg-cell', { // @core
      scale: [
        { to: 0.2, ease: 'outSine', duration: 350 },
        { to: 1, ease: 'outElastic(1, 0.5)', duration: 700 },
      ],
      backgroundColor: ['#ff4b4b', '#38bdf8'],
      delay: stagger(60, { grid: [8, 5], from }), // @core
      loop: true,
      loopDelay: 300,
    });
  }

  stage.querySelectorAll('.demo-controls button').forEach((btn) => {
    btn.onclick = () => {
      stage.querySelectorAll('.demo-controls button').forEach((b) => (b.className = 'btn btn-outline'));
      btn.className = 'btn btn-accent';
      trigger(btn.dataset.from);
    };
  });

  trigger('center');

  return () => {
    if (currentAnim) currentAnim.revert();
  };
}
