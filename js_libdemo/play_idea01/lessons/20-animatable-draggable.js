/**
 * =============================================================================
 * LESSON 20: ANIMATABLE (60FPS TRACKING) & DRAGGABLE (SPRING PHYSICS)
 * Docs: https://animejs.com/documentation/draggable
 * =============================================================================
 */

import { createAnimatable, createDraggable, createSpring } from 'animejs';

export const LESSON_META = {
  summary:
    'Move your mouse inside the arena to test createAnimatable() pointer tracking, and drag/throw the coral box with createDraggable() spring physics.',
  masteryNote:
    'Never call `animate()` inside a `mousemove` listener (creates garbage every frame). `createAnimatable()` pre-allocates reusable property setters!',
  highlightLines: [[27, 44]],
};

export function mount(stage) {
  stage.innerHTML = `
    <div id="arena" style="position:relative; height:260px; background:#06080d; border:1px solid rgba(148,163,184,0.25); border-radius:12px; overflow:hidden;">
      <div id="follower" style="position:absolute; width:24px; height:24px; border-radius:50%; background:#38bdf8; pointer-events:none; opacity:0.85;"></div>
      <div id="drag-box" class="demo-box" style="position:absolute; top:100px; left:140px; cursor:grab; touch-action:none;">DRAG ME</div>
    </div>
  `;

  const arena = stage.querySelector('#arena');

  // 1. Pre-allocated 60fps pointer setter (zero GC churn on pointermove)
  const follower = createAnimatable('#follower', { // @core
    x: 450,
    y: 450,
    ease: 'outExpo',
  });

  const onMove = (e) => {
    const rect = arena.getBoundingClientRect();
    follower.x(e.clientX - rect.left - 12); // @core
    follower.y(e.clientY - rect.top - 12); // @core
  };
  arena.addEventListener('pointermove', onMove);

  // 2. Physics-enabled Draggable within #arena bounds
  const draggable = createDraggable('#drag-box', { // @core
    container: '#arena',
    releaseEase: createSpring({ stiffness: 180, damping: 14 }), // @core
  });

  return () => {
    arena.removeEventListener('pointermove', onMove);
    follower.revert();
    draggable.revert();
  };
}
