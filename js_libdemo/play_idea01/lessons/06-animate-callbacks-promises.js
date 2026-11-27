/**
 * =============================================================================
 * LESSON 06: CALLBACKS & ASYNC PROMISE CHAINING
 * Docs: https://animejs.com/documentation/animation/animation-callbacks
 * =============================================================================
 * CONCEPT:
 *   Animations expose lifecycle hooks (`onBegin`, `onUpdate`, `onComplete`)
 *   AND are natively `await`-able via `.then()`! This makes sequencing async
 *   UI transitions clean without callback hell.
 * =============================================================================
 */

import { animate } from 'animejs';

export const LESSON_META = {
  summary:
    'Every animate() instance supports onBegin/onUpdate/onComplete callbacks and returns a Promise via .then() for clean async/await orchestration.',
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-row">
      <div id="cb-box" class="demo-box">ASYNC</div>
    </div>
    <div class="log-box" id="cb-log">Waiting for sequence...</div>
  `;

  const logEl = stage.querySelector('#cb-log');
  let cancelled = false;
  const activeAnims = [];

  const log = (msg) => {
    logEl.textContent += `\n${msg}`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  async function runSequence() {
    logEl.textContent = '[0ms] Sequence started...';

    const a1 = animate('#cb-box', {
      x: 240,
      duration: 900,
      ease: 'outExpo',
      onBegin: () => log('→ onBegin: Moving right'),
      onComplete: () => log('✓ onComplete: Reached right'),
    });
    activeAnims.push(a1);
    await a1;
    if (cancelled) return;

    const a2 = animate('#cb-box', {
      rotate: 180,
      scale: 1.3,
      duration: 600,
      ease: 'inOutBack',
      onBegin: () => log('→ onBegin: Rotating & scaling'),
    });
    activeAnims.push(a2);
    await a2;
    if (cancelled) return;

    const a3 = animate('#cb-box', {
      x: 0,
      rotate: 0,
      scale: 1,
      duration: 800,
      ease: 'outBounce',
      onComplete: () => log('✓ Promise resolved: Returned home!'),
    });
    activeAnims.push(a3);
  }

  runSequence();

  return () => {
    cancelled = true;
    activeAnims.forEach((a) => a.revert());
  };
}
