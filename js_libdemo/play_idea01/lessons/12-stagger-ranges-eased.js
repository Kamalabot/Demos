/**
 * =============================================================================
 * LESSON 12: VALUE-RANGE STAGGERING & EASED WAVES
 * Docs: https://animejs.com/documentation/utilities/stagger/stagger-parameters/stagger-ease
 * =============================================================================
 * CONCEPT:
 *   `stagger([min, max], { ease })` doesn't just stagger *delays*—it can
 *   distribute *any property value* (like `y`, `rotate`, or `scale`) across
 *   targets along a custom easing curve!
 * =============================================================================
 */

import { animate, stagger } from 'animejs';

export const LESSON_META = {
  summary:
    'Pass a [min, max] tuple to stagger() to distribute rotation, vertical offset, and delay along an easing curve.',
};

export function mount(stage) {
  stage.innerHTML = `<div id="wave-row" class="demo-row" style="min-height:160px; align-items:center;"></div>`;
  const row = stage.querySelector('#wave-row');

  for (let i = 0; i < 14; i++) {
    const bar = document.createElement('div');
    bar.className = 'wave-bar';
    bar.style.cssText = 'width:16px; height:64px; border-radius:8px; background:linear-gradient(180deg,#ff4b4b,#38bdf8);';
    row.appendChild(bar);
  }

  const anim = animate('.wave-bar', {
    y: stagger([-40, 40], { from: 'center', ease: 'inOutSine' }),
    rotate: stagger([-45, 45]),
    scaleY: stagger([0.6, 1.5], { from: 'center' }),
    delay: stagger(50, { from: 'center' }),
    duration: 1200,
    loop: true,
    alternate: true,
    ease: 'inOutQuad',
  });

  return () => anim.revert();
}
