/**
 * =============================================================================
 * SCROLLYTELLING + ANIME.JS + SVG-PAN-ZOOM HARNESS (core/scrollHarness.js)
 * =============================================================================
 * Fixes & Upgrades:
 *   - Uses `svgEl.querySelectorAll('.file-part, .file-wire')` cleanly.
 *   - Because positioning `translate(x, y)` lives on outer wrapper `<g>` nodes,
 *     animating `scale` on `.file-part` keeps every block locked in place!
 * =============================================================================
 */

import { animate, onScroll, stagger, svg, text } from 'animejs';
import scrollama from 'scrollama';
import svgPanZoom from 'svg-pan-zoom';

export function mountScrollHarness({
  svgContainer,
  stepsContainer,
  xrayContainer,
  steps,
  progressBarEl,
  onStepChange,
}) {
  let panZoomInstance = null;
  let scroller = null;
  let wheelZoomEnabled = false;
  let activeWireAnim = null;
  let activePartAnim = null;
  let activeDrawAnim = null;
  let scrollBarAnim = null;

  const svgEl = svgContainer.querySelector('#anatomy-svg');
  if (svgEl) {
    try {
      panZoomInstance = svgPanZoom(svgEl, {
        zoomEnabled: true,
        panEnabled: true,
        controlIconsEnabled: false,
        mouseWheelZoomEnabled: false,
        fit: true,
        center: true,
        minZoom: 0.4,
        maxZoom: 8,
      });
    } catch (err) {
      console.warn('[scrollHarness] svg-pan-zoom init warning:', err);
    }
  }

  function activateStep(index, stepElement) {
    const stepConfig = steps[index];
    if (!stepConfig) return;

    stepsContainer.querySelectorAll('.explainer-step').forEach((el, idx) => {
      el.classList.toggle('is-active', idx === index);
    });

    if (activeWireAnim) activeWireAnim.revert();
    if (activePartAnim) activePartAnim.revert();
    if (activeDrawAnim) activeDrawAnim.revert();
    activeWireAnim = null;
    activePartAnim = null;
    activeDrawAnim = null;

    const allNodes = svgContainer.querySelectorAll('.file-part, .file-wire');
    if (allNodes.length) {
      animate(allNodes, {
        opacity: stepConfig.dimOthers === false ? 1 : 0.22,
        duration: 260,
        ease: 'outQuad',
      });
    }

    const validPartTargets = (stepConfig.highlightIds || [])
      .map((sel) => svgContainer.querySelector(sel))
      .filter(Boolean);

    if (validPartTargets.length) {
      activePartAnim = animate(validPartTargets, {
        opacity: 1,
        scale: [0.95, 1.04, 1],
        duration: 450,
        delay: stagger(60),
        ease: 'outBack(1.3)',
      });
    }

    const wireTargets = (stepConfig.wireIds || [])
      .map((sel) => svgContainer.querySelector(sel))
      .filter(Boolean);

    if (wireTargets.length) {
      activeWireAnim = animate(wireTargets, {
        opacity: 1,
        strokeDashoffset: [24, 0],
        duration: 650,
        ease: 'linear',
        loop: true,
      });
    }

    if (stepConfig.drawSelector) {
      const drawNodes = svgContainer.querySelectorAll(stepConfig.drawSelector);
      if (drawNodes.length) {
        activeDrawAnim = animate(svg.createDrawable(drawNodes), {
          draw: ['0 0', '0 1'],
          duration: 1100,
          delay: stagger(100),
          ease: 'inOutSine',
        });
      }
    }

    if (xrayContainer) {
      const activeTokenIds = new Set(stepConfig.tokenIds || []);
      let firstMatch = null;
      xrayContainer.querySelectorAll('.xray-token').forEach((tok) => {
        const isMatch = activeTokenIds.has(tok.dataset.tokenId);
        tok.classList.toggle('is-active', isMatch);
        if (isMatch && !firstMatch) firstMatch = tok;
      });
      if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    if (stepElement) {
      const heading = stepElement.querySelector('.step-title');
      if (heading) {
        try {
          const split = text.splitText(heading, { words: true });
          animate(split.words, {
            y: [6, 0],
            opacity: [0.4, 1],
            duration: 360,
            delay: stagger(22),
            ease: 'outExpo',
            onComplete: () => split.revert(),
          });
        } catch {
          // Safe fallback
        }
      }
    }

    if (typeof onStepChange === 'function') {
      onStepChange(index, stepConfig);
    }
  }

  scroller = scrollama();
  scroller
    .setup({
      step: '.explainer-step',
      offset: 0.52,
      progress: true,
    })
    .onStepEnter(({ index, element }) => {
      activateStep(index, element);
    });

  if (progressBarEl) {
    scrollBarAnim = animate(progressBarEl, {
      scaleX: [0, 1],
      ease: 'linear',
      autoplay: onScroll({
        sync: 0.2,
      }),
    });
  }

  const onResize = () => {
    if (scroller) scroller.resize();
    if (panZoomInstance) {
      panZoomInstance.resize();
      panZoomInstance.fit();
      panZoomInstance.center();
    }
  };
  window.addEventListener('resize', onResize);

  const firstStep = stepsContainer.querySelector('.explainer-step');
  if (firstStep) activateStep(0, firstStep);

  return {
    zoomIn: () => panZoomInstance?.zoomIn(),
    zoomOut: () => panZoomInstance?.zoomOut(),
    resetZoom: () => {
      if (panZoomInstance) {
        panZoomInstance.resetZoom();
        panZoomInstance.fit();
        panZoomInstance.center();
      }
    },
    toggleWheelZoom: () => {
      if (!panZoomInstance) return false;
      wheelZoomEnabled = !wheelZoomEnabled;
      if (wheelZoomEnabled) panZoomInstance.enableMouseWheelZoom();
      else panZoomInstance.disableMouseWheelZoom();
      return wheelZoomEnabled;
    },
    goToStep: (idx) => {
      const target = stepsContainer.querySelectorAll('.explainer-step')[idx];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        activateStep(idx, target);
      }
    },
    destroy: () => {
      window.removeEventListener('resize', onResize);
      if (activeWireAnim) activeWireAnim.revert();
      if (activePartAnim) activePartAnim.revert();
      if (activeDrawAnim) activeDrawAnim.revert();
      if (scrollBarAnim) scrollBarAnim.revert();
      if (scroller) scroller.destroy();
      if (panZoomInstance) panZoomInstance.destroy();
    },
  };
}
