/**
 * =============================================================================
 * LESSON 21: ONSCROLL, CREATESCOPE & WAAPI HARDWARE ACCELERATION
 * Docs: https://animejs.com/documentation/events/onscroll
 * =============================================================================
 */

import { animate, createScope, onScroll, waapi } from 'animejs';

export const LESSON_META = {
  summary:
    'Scroll inside the mini-viewport to scrub an onScroll() animation, while a WAAPI hardware-accelerated badge pulses off-thread inside a createScope() container.',
  masteryNote:
    '`createScope()` tracks every animation, timeline, and ScrollObserver created inside `.add()` so a single `scope.revert()` cleans up an entire component cleanly.',
  highlightLines: [[34, 55]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div id="scope-root" style="display:flex; flex-direction:column; gap:14px;">
      <div class="demo-row">
        <div id="waapi-pill" class="demo-pill">WAAPI Off-Thread Pulse</div>
      </div>

      <div id="scroll-box" style="height:210px; overflow-y:auto; background:#06080d; border:1px solid rgba(148,163,184,0.25); border-radius:12px; padding:16px;">
        <p style="font-size:0.8rem; color:#94a3b8; margin-bottom:130px;">
          ↓ Scroll down inside this container to drive the box below via <code>onScroll({ sync: true })</code> ↓
        </p>
        <div id="scroll-target" class="demo-box">SCROLL</div>
        <div style="height:210px;"></div>
      </div>
    </div>
  `;

  const scope = createScope({ root: '#scope-root' }).add(() => { // @core
    // 1. Hardware-accelerated WAAPI animation (runs on browser compositor thread)
    waapi.animate('#waapi-pill', { // @core
      scale: [1, 1.08],
      duration: 900,
      alternate: true,
      loop: true,
      ease: 'inOutSine',
    });

    // 2. Scroll-synced animation inside #scroll-box
    animate('#scroll-target', { // @core
      x: [0, 220],
      rotate: [0, 360],
      scale: [1, 1.3],
      autoplay: onScroll({ // @core
        container: '#scroll-box',
        sync: true,
      }),
    });
  });

  return () => scope.revert();
}
