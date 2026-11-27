/**
 * =============================================================================
 * LESSON 02: TIMER PLAYBACK, SEEK & TIME-DILATION CONTROLS
 * Docs: https://animejs.com/documentation/timer/timer-methods
 * =============================================================================
 * CONCEPT:
 *   Every Timer (and Animation/Timeline, which inherit from Timer) exposes:
 *     - `play()`, `pause()`, `restart()`, `reverse()`
 *     - `seek(ms)` and `.iterationCurrentTime` for scrubbing inside a loop
 *     - `.speed = multiplier` (time-dilation without restarting the timer)
 *     - `.stretch(newDuration)` to dynamically rescale total duration
 * =============================================================================
 */

import { createTimer } from 'animejs';

export const LESSON_META = {
  summary:
    'Control a live timer with play(), pause(), reverse(), restart(), seek() scrubbing, and real-time .speed time-dilation.',
  masteryNote:
    'Notice how `self.iterationCurrentTime` wraps cleanly [0..4000ms] across infinite loops, whereas `self.currentTime` accumulates monotonically.',
  highlightLines: [[48, 76]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-controls">
      <button class="btn btn-primary" id="c-play">Play</button>
      <button class="btn btn-outline" id="c-pause">Pause</button>
      <button class="btn btn-outline" id="c-reverse">Reverse</button>
      <button class="btn btn-outline" id="c-restart">Restart</button>
      <label style="font-size:0.78rem; margin-left:6px;">
        Speed: <input id="c-speed" type="range" min="0.2" max="3" step="0.1" value="1" />
        <span id="c-speed-val">1.0x</span>
      </label>
    </div>
    <div class="demo-row">
      <div class="demo-pill">Cycle Time: <strong id="c-iter-time">0 ms</strong></div>
      <div class="demo-pill">Total Time: <strong id="c-total-time">0 ms</strong></div>
      <div class="demo-pill">Reversed: <strong id="c-rev">false</strong></div>
    </div>
    <div style="display:flex; flex-direction:column; gap:6px;">
      <small style="color:#94a3b8;">Scrub Cycle Position (0 – 4000 ms)</small>
      <input id="c-scrub" type="range" min="0" max="4000" value="0" style="width:100%;" />
    </div>
  `;

  const elIterTime = stage.querySelector('#c-iter-time');
  const elTotalTime = stage.querySelector('#c-total-time');
  const elRev = stage.querySelector('#c-rev');
  const scrub = stage.querySelector('#c-scrub');
  const speedSlider = stage.querySelector('#c-speed');
  const speedVal = stage.querySelector('#c-speed-val');

  const timer = createTimer({ // @core
    duration: 4000,
    loop: true,
    autoplay: true,
    onUpdate: (self) => { // @core
      const cycleMs = Math.round(self.iterationCurrentTime); // @core
      elIterTime.textContent = `${cycleMs} ms`;
      elTotalTime.textContent = `${Math.round(self.currentTime)} ms`;
      elRev.textContent = String(self.reversed);
      scrub.value = String(cycleMs);
    },
  });

  stage.querySelector('#c-play').onclick = () => timer.play(); // @core
  stage.querySelector('#c-pause').onclick = () => timer.pause(); // @core
  stage.querySelector('#c-reverse').onclick = () => timer.reverse(); // @core
  stage.querySelector('#c-restart').onclick = () => timer.restart(); // @core

  scrub.oninput = (e) => {
    timer.pause();
    timer.seek(Number(e.target.value)); // @core
  };

  speedSlider.oninput = (e) => {
    const s = Number(e.target.value);
    timer.speed = s; // @core
    speedVal.textContent = `${s.toFixed(1)}x`;
  };

  return () => timer.revert();
}
