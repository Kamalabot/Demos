/**
 * =============================================================================
 * LESSON 09: BUILT-IN EASES & LIVE SVG CURVE PLOTTER
 * Docs: https://animejs.com/documentation/easings
 * =============================================================================
 */

import { animate, eases } from 'animejs';

export const LESSON_META = {
  summary:
    'Select any built-in easing function to plot its real-time time-vs-value curve in SVG and feel its physical motion.',
  masteryNote:
    'Every easing function in Anime.js is a pure `f(t) -> y` function—you can call `eases.outElastic(1, 0.5)(0.5)` directly in your own math or shaders!',
  highlightLines: [[42, 57]],
};

const EASE_OPTIONS = [
  { name: 'linear', fn: eases.linear() },
  { name: 'inOutQuad', fn: eases.inOutQuad },
  { name: 'outExpo', fn: eases.outExpo },
  { name: 'inOutBack', fn: eases.inOutBack() },
  { name: 'outElastic', fn: eases.outElastic(1, 0.5) },
  { name: 'outBounce', fn: eases.outBounce },
];

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-controls" id="ease-btns"></div>
    <div class="demo-row" style="align-items:center; gap:20px;">
      <svg id="ease-svg" width="220" height="140" viewBox="-10 -30 220 160" style="background:#06080d; border:1px solid rgba(148,163,184,0.2); border-radius:10px;">
        <line x1="0" y1="100" x2="200" y2="100" stroke="#334155" stroke-dasharray="4" />
        <line x1="0" y1="0" x2="200" y2="0" stroke="#334155" stroke-dasharray="4" />
        <path id="ease-path" fill="none" stroke="#38bdf8" stroke-width="2.5" />
      </svg>
      <div style="flex:1;">
        <div id="ease-box" class="demo-box">EASE</div>
      </div>
    </div>
  `;

  const btns = stage.querySelector('#ease-btns');
  const pathEl = stage.querySelector('#ease-path');
  let activeAnim = null;

  function runEase(opt) {
    let d = '';
    for (let i = 0; i <= 100; i++) { // @core
      const t = i / 100;
      const y = 100 - opt.fn(t) * 100; // @core
      d += `${i === 0 ? 'M' : 'L'} ${t * 200} ${y.toFixed(2)} `;
    }
    pathEl.setAttribute('d', d);

    if (activeAnim) activeAnim.revert();
    activeAnim = animate('#ease-box', { // @core
      x: [0, 200],
      duration: 1400,
      ease: opt.fn, // @core
      loop: true,
      alternate: true,
    });
  }

  EASE_OPTIONS.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = `btn ${i === 2 ? 'btn-accent' : 'btn-outline'}`;
    b.textContent = opt.name;
    b.onclick = () => {
      btns.querySelectorAll('button').forEach((x) => (x.className = 'btn btn-outline'));
      b.className = 'btn btn-accent';
      runEase(opt);
    };
    btns.appendChild(b);
  });

  runEase(EASE_OPTIONS[2]);

  return () => {
    if (activeAnim) activeAnim.revert();
  };
}
