/**
 * =============================================================================
 * LESSON 17: EXTERNAL SVG UPLOAD & PRESET ANIMATOR (play_idea00.svg)
 * Docs: https://animejs.com/documentation/svg
 * =============================================================================
 * CONCEPT:
 *   Real production apps load external `.svg` files (exported from Inkscape,
 *   Illustrator, or Figma) and animate their internal vector primitives
 *   (`<path>`, `<rect>`, `<circle>`, `<polygon>`, `<polyline>`, `<line>`).
 *
 * HOW THIS STUDIO WORKS:
 *   1. Imports `play_idea00/play_idea00.svg` directly via Vite `?raw`, OR lets
 *      you upload / drag-and-drop ANY `.svg` file from your computer!
 *   2. Parses the SVG safely via `DOMParser('image/svg+xml')`, strips Inkscape
 *      fixed pixel constraints so it scales responsively, and queries all
 *      drawable vector shapes inside it.
 *   3. Applies 4 selectable Anime.js choreography modes:
 *        - Draw Strokes (svg.createDrawable)
 *        - Blueprint Wireframe + Fill Reveal (Timeline)
 *        - Stagger Pop-In (transformOrigin + outElastic)
 *        - Kinetic Pulse Wave
 * =============================================================================
 */

import { animate, createTimeline, svg, stagger } from 'animejs';
import playIdea00SvgRaw from '../../play_idea00/play_idea00.svg?raw';

export const LESSON_META = {
  summary:
    'Upload any external .svg file (or inspect the built-in play_idea00.svg from Inkscape), parse its vector primitives, and animate them live with Anime.js.',
  masteryNote:
    'External Inkscape/Figma SVGs often lack `stroke` on filled `<rect>` nodes. Switching to Blueprint mode injects strokes dynamically so `svg.createDrawable()` can trace EVERY shape!',
  highlightLines: [[92, 138]],
};

const VECTOR_SELECTOR = 'path, rect, circle, ellipse, polygon, polyline, line';

export function mount(stage) {
  stage.innerHTML = `
    <div class="demo-controls">
      <label class="btn btn-primary" style="cursor:pointer;">
        Upload .SVG File
        <input id="svg-file-input" type="file" accept=".svg,image/svg+xml" style="display:none;" />
      </label>
      <button id="btn-load-sample" class="btn btn-outline" type="button">Load play_idea00.svg</button>
      <select id="svg-mode" class="btn btn-outline" style="background:#0f172a; color:#f8fafc;">
        <option value="blueprint">Mode: Blueprint Draw + Fill</option>
        <option value="draw">Mode: Stroke Draw (createDrawable)</option>
        <option value="pop">Mode: Stagger Pop-In (Elastic)</option>
        <option value="pulse">Mode: Kinetic Wave Pulse</option>
      </select>
    </div>

    <div id="svg-dropzone" class="svg-dropzone">
      Drag & Drop any <code>.svg</code> file here — or use <strong>play_idea00.svg</strong> loaded below
    </div>

    <div id="svg-viewport" style="min-height:220px; background:#06080d; border:1px solid rgba(148,163,184,0.25); border-radius:12px; display:grid; place-items:center; padding:16px;"></div>

    <div class="demo-row">
      <div class="demo-pill">Vector Nodes Found: <strong id="svg-count">0</strong></div>
      <div class="demo-pill">Active Source: <strong id="svg-name">play_idea00.svg</strong></div>
    </div>
  `;

  const fileInput = stage.querySelector('#svg-file-input');
  const btnSample = stage.querySelector('#btn-load-sample');
  const modeSelect = stage.querySelector('#svg-mode');
  const dropzone = stage.querySelector('#svg-dropzone');
  const viewport = stage.querySelector('#svg-viewport');
  const countEl = stage.querySelector('#svg-count');
  const nameEl = stage.querySelector('#svg-name');

  let currentRawSvg = playIdea00SvgRaw;
  let activeInstance = null;

  function cleanupActive() {
    if (activeInstance && typeof activeInstance.revert === 'function') {
      activeInstance.revert();
    }
    activeInstance = null;
  }

  /**
   * Parses raw SVG XML safely, mounts it, and runs the chosen Anime.js mode.
   */
  function renderAndAnimateSvg(rawXml, filenameLabel) { // @core
    cleanupActive();
    nameEl.textContent = filenameLabel;

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawXml, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');

    if (!svgEl || doc.querySelector('parsererror')) {
      viewport.innerHTML = `<span style="color:#ef4444;">Invalid SVG file.</span>`;
      countEl.textContent = '0';
      return;
    }

    // Normalize sizing so any external SVG fits the exhibit cleanly
    if (!svgEl.getAttribute('viewBox')) {
      const w = parseFloat(svgEl.getAttribute('width')) || 128;
      const h = parseFloat(svgEl.getAttribute('height')) || 128;
      svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width = '100%';
    svgEl.style.maxWidth = '260px';
    svgEl.style.height = 'auto';
    svgEl.style.overflow = 'visible';

    viewport.innerHTML = '';
    viewport.appendChild(svgEl);

    const shapes = Array.from(svgEl.querySelectorAll(VECTOR_SELECTOR)); // @core
    countEl.textContent = String(shapes.length);
    if (!shapes.length) return;

    const mode = modeSelect.value;

    if (mode === 'blueprint') { // @core
      // Ensure every primitive has a visible stroke so createDrawable works on filled rects too
      shapes.forEach((el) => {
        if (!el.style.stroke || el.style.stroke === 'none') {
          el.style.stroke = '#38bdf8';
          el.style.strokeWidth = '1.8';
        }
      });

      const tl = createTimeline({ loop: true, alternate: true, loopDelay: 400 }); // @core
      tl.add(svg.createDrawable(shapes), { // @core
        draw: ['0 0', '0 1'],
        duration: 1300,
        delay: stagger(140),
        ease: 'inOutSine',
      }).add(
        shapes,
        {
          fillOpacity: [0.15, 1],
          duration: 600,
          ease: 'outQuad',
        },
        '-=500'
      );
      activeInstance = tl;
    } else if (mode === 'draw') {
      shapes.forEach((el) => {
        if (!el.style.stroke || el.style.stroke === 'none') {
          el.style.stroke = '#ff4b4b';
          el.style.strokeWidth = '2';
        }
        el.style.fillOpacity = '0.2';
      });
      activeInstance = animate(svg.createDrawable(shapes), { // @core
        draw: ['0 0', '0 1'],
        duration: 1500,
        delay: stagger(160),
        ease: 'inOutQuad',
        loop: true,
        alternate: true,
      });
    } else if (mode === 'pop') {
      shapes.forEach((el) => (el.style.transformOrigin = 'center'));
      activeInstance = animate(shapes, {
        scale: [0.2, 1],
        opacity: [0, 1],
        rotate: [-15, 0],
        duration: 900,
        delay: stagger(110),
        ease: 'outElastic(1, 0.55)',
        loop: true,
        loopDelay: 600,
        alternate: true,
      });
    } else {
      shapes.forEach((el) => (el.style.transformOrigin = 'center'));
      activeInstance = animate(shapes, {
        y: [-6, 6],
        scale: [0.95, 1.06],
        duration: 1000,
        delay: stagger(120, { from: 'center' }),
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      });
    }
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentRawSvg = String(ev.target.result || '');
      renderAndAnimateSvg(currentRawSvg, file.name);
    };
    reader.readAsText(file);
  }

  fileInput.onchange = (e) => handleFile(e.target.files?.[0]);
  btnSample.onclick = () => {
    currentRawSvg = playIdea00SvgRaw;
    renderAndAnimateSvg(currentRawSvg, 'play_idea00.svg');
  };
  modeSelect.onchange = () => renderAndAnimateSvg(currentRawSvg, nameEl.textContent);

  dropzone.ondragover = (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  };
  dropzone.ondragleave = () => dropzone.classList.remove('dragover');
  dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFile(e.dataTransfer?.files?.[0]);
  };

  renderAndAnimateSvg(currentRawSvg, 'play_idea00.svg');

  return () => cleanupActive();
}
