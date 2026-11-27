/**
 * =============================================================================
 * LESSON 13: ANIME.JS UTILITIES (utils.random, snap, clamp, lerp, mapRange)
 * Docs: https://animejs.com/documentation/utilities
 * =============================================================================
 * CONCEPT:
 *   Anime.js v4 bundles a zero-dependency math & DOM toolkit under `utils`:
 *     - `utils.random(min, max, decimalLength)`
 *     - `utils.snap(increment)(val)`
 *     - `utils.clamp(val, min, max)`
 *     - `utils.lerp(start, end, t)`
 *     - `utils.mapRange(val, inMin, inMax, outMin, outMax)`
 * =============================================================================
 */

import { animate, utils } from 'animejs';

export const LESSON_META = {
  summary:
    'Explore Anime.js v4 built-in math utilities: random(), snap(), clamp(), lerp(), and mapRange() driving live DOM bars.',
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-controls">
      <button class="btn btn-accent" id="btn-rand">Randomize Targets</button>
    </div>
    <div id="util-bars" style="display:flex; flex-direction:column; gap:10px;"></div>
    <div class="log-box" id="util-log"></div>
  `;

  const barsEl = stage.querySelector('#util-bars');
  const logEl = stage.querySelector('#util-log');

  for (let i = 0; i < 5; i++) {
    const bar = document.createElement('div');
    bar.className = 'u-bar';
    bar.style.cssText = 'height:22px; width:40px; border-radius:6px; background:#38bdf8;';
    barsEl.appendChild(bar);
  }

  let anim = null;

  function randomize() {
    if (anim) anim.revert();
    anim = animate('.u-bar', {
      width: () => `${utils.random(60, 420)}px`,
      duration: () => utils.random(400, 1100),
      ease: 'outExpo',
    });

    const sample = utils.random(0, 100, 2);
    logEl.textContent = [
      `utils.random(0, 100, 2)        => ${sample}`,
      `utils.snap(25)(${sample})      => ${utils.snap(25)(sample)}`,
      `utils.clamp(${sample}, 20, 80) => ${utils.clamp(sample, 20, 80)}`,
      `utils.lerp(0, 500, 0.35)       => ${utils.lerp(0, 500, 0.35)}`,
      `utils.mapRange(50, 0,100, 0,1) => ${utils.mapRange(50, 0, 100, 0, 1)}`,
    ].join('\n');
  }

  stage.querySelector('#btn-rand').onclick = randomize;
  randomize();

  return () => {
    if (anim) anim.revert();
  };
}
