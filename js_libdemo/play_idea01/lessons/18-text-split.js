/**
 * =============================================================================
 * LESSON 18: TEXT SPLITTING (text.splitText)
 * Docs: https://animejs.com/documentation/text/splittext
 * =============================================================================
 */

import { animate, stagger, text } from 'animejs';

export const LESSON_META = {
  summary:
    'text.splitText() decomposes headings into individual chars and words while preserving accessibility, enabling kinetic typography.',
  masteryNote:
    'Setting `chars: { wrap: "clip" }` wraps each character in an `overflow: hidden` mask so letters slide cleanly out of an invisible baseline!',
  highlightLines: [[27, 40]],
};

export function mount(stage) {
  stage.innerHTML = `
    <h2 id="split-heading" style="font-size:2rem; font-weight:800; letter-spacing:0.02em; color:#f8fafc;">
      KINETIC TYPOGRAPHY
    </h2>
    <p style="font-size:0.82rem; color:#94a3b8;">
      Each character is wrapped in an inline-block span and staggered with <code>outElastic</code>.
    </p>
  `;

  const splitter = text.splitText('#split-heading', { // @core
    chars: { wrap: 'clip' }, // @core
  });

  const anim = animate(splitter.chars, { // @core
    y: ['100%', '0%'],
    opacity: [0, 1],
    rotate: [-12, 0],
    duration: 900,
    ease: 'outElastic(1, 0.6)',
    delay: stagger(35), // @core
    loop: true,
    loopDelay: 800,
    alternate: true,
  });

  return () => {
    anim.revert();
    splitter.revert();
  };
}
