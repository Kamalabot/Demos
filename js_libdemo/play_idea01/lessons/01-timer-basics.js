/**
 * =============================================================================
 * LESSON 01: TIMER BASICS & ITERATION PROGRESS (createTimer)
 * Docs: https://animejs.com/documentation/timer
 * =============================================================================
 * CONCEPT:
 *   In Anime.js v4, `createTimer()` is the foundational clock primitive.
 *   CRITICAL GOTCHA ON LOOPING TIMERS:
 *     - When `loop: true` is set, total duration is `Infinity`, so
 *       `self.progress` stays near 0 and `self.currentTime` grows forever!
 *     - Always use `self.iterationProgress` ([0..1] per cycle) and
 *       `self.iterationCurrentTime` ([0..duration] per cycle) for loop visuals!
 * =============================================================================
 */

import { createTimer } from 'animejs';

export const LESSON_META = {
  summary:
    'createTimer() tracks time without mutating DOM directly. Compare a 60fps smooth timer against a 10fps throttled timer using iterationProgress.',
  masteryNote:
    'In Anime.js v4, Timer extends Clock. Use `iterationProgress` (0→1 inside the current loop) instead of `progress` whenever `loop: true` is active.',
  highlightLines: [[55, 79]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-row">
      <div class="demo-pill">Smooth (60fps): <strong id="t-smooth">0.00</strong></div>
      <div class="demo-pill">Throttled (10fps): <strong id="t-throttled">0.00</strong></div>
      <div class="demo-pill">Iteration #: <strong id="t-loops">0</strong></div>
      <div class="demo-pill">Elapsed Total: <strong id="t-total">0 ms</strong></div>
    </div>
    <div style="display:flex; flex-direction:column; gap:8px;">
      <small style="color:#94a3b8;">60fps Smooth Bar (<code>self.iterationProgress</code>)</small>
      <div style="background:#1e293b; height:16px; border-radius:999px; overflow:hidden;">
        <div id="bar-smooth" style="width:0%; height:100%; background:#38bdf8; transition:none;"></div>
      </div>
      <small style="color:#94a3b8;">10fps Frame-Throttled Bar (<code>frameRate: 10</code>)</small>
      <div style="background:#1e293b; height:16px; border-radius:999px; overflow:hidden;">
        <div id="bar-throttled" style="width:0%; height:100%; background:#ff4b4b; transition:none;"></div>
      </div>
    </div>
  `;

  const elSmooth = stage.querySelector('#t-smooth');
  const elThrottled = stage.querySelector('#t-throttled');
  const elLoops = stage.querySelector('#t-loops');
  const elTotal = stage.querySelector('#t-total');
  const barSmooth = stage.querySelector('#bar-smooth');
  const barThrottled = stage.querySelector('#bar-throttled');

  // 1. Standard 60fps looping timer with `alternate: true` (ping-pong)
  const smoothTimer = createTimer({ // @core
    duration: 2000,
    loop: true,
    alternate: true,
    onUpdate: (self) => { // @core
      // Use `iterationProgress` [0..1] inside each loop cycle (NOT `progress`!)
      const p = self.iterationProgress; // @core
      elSmooth.textContent = p.toFixed(2);
      barSmooth.style.width = `${(p * 100).toFixed(1)}%`;
      elTotal.textContent = `${Math.round(self.currentTime)} ms`;
    },
    onLoop: (self) => { // @core
      elLoops.textContent = String(self.currentIteration);
    },
  });

  // 2. FrameRate-throttled timer (10 updates/sec for stop-motion / retro FX)
  const throttledTimer = createTimer({ // @core
    duration: 2000,
    loop: true,
    alternate: true,
    frameRate: 10, // @core
    onUpdate: (self) => {
      const p = self.iterationProgress;
      elThrottled.textContent = p.toFixed(2);
      barThrottled.style.width = `${(p * 100).toFixed(1)}%`;
    },
  });

  return () => {
    smoothTimer.revert();
    throttledTimer.revert();
  };
}
