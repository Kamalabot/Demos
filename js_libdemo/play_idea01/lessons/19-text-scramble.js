/**
 * =============================================================================
 * LESSON 19: CIPHER & SCRAMBLE TEXT REVEAL (text.scrambleText)
 * Docs: https://animejs.com/documentation/text
 * =============================================================================
 */

import { animate, text } from 'animejs';

export const LESSON_META = {
  summary:
    'text.scrambleText() creates a cryptographic glyph-decoding reveal effect on any text element.',
  masteryNote:
    '`scrambleText()` returns a custom tween modifier that maps tween progress `0→1` to a progressive left-to-right character unlock across your `chars` alphabet.',
  highlightLines: [[31, 39]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-controls">
      <button class="btn btn-accent" id="btn-scramble">Decode Signal</button>
    </div>
    <div id="scramble-target" style="font-family:monospace; font-size:1.75rem; font-weight:700; color:#38bdf8;">
      SYSTEM_ONLINE_V4.5
    </div>
  `;

  const targetEl = stage.querySelector('#scramble-target');
  let anim = null;

  function playScramble() {
    if (anim) anim.revert();
    anim = animate(targetEl, { // @core
      innerHTML: text.scrambleText({ // @core
        chars: '01#$%&*@!_XYZ',
        speed: 0.4,
      }),
      duration: 1400,
      ease: 'inOutQuad',
    });
  }

  stage.querySelector('#btn-scramble').onclick = playScramble;
  playScramble();

  return () => {
    if (anim) anim.revert();
  };
}
