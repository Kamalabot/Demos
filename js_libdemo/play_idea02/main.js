/**
 * =============================================================================
 * FILE ANATOMY X-RAY STUDIO — ORCHESTRATOR (play_idea02/main.js)
 * =============================================================================
 * Coordinates:
 *   - 18 built-in format samples + automatic File Upload / Drag-and-Drop routing
 *   - Format Adapters (XML via fast-xml-parser, Text parsers, Binary DataView)
 *   - Scrollama + Anime.js v4 + svg-pan-zoom Scrollytelling Harness
 *   - Kid Explorer vs Engineer Deep-Dive explanation modes
 *   - Classroom Presenter keyboard shortcuts (ArrowUp / ArrowDown)
 * =============================================================================
 */

import { FORMAT_CATALOG } from './samples/sampleRegistry.js';
import {
  parseQetXml,
  parsePlcXml,
  parseWorkdayXml,
  parseDrawioXml,
  parseSvgXml,
  parseMarkupXml,
} from './adapters/xmlAdapters.js';
import {
  parseMarkdown,
  parseYaml,
  parseJson,
  parseCsv,
  parseToml,
} from './adapters/textAdapters.js';
import {
  parsePngBinary,
  parseJpegBinary,
  parseWavBinary,
  parseMp3Binary,
  parseZipBinary,
  parsePdfBinary,
  parseGltfJson,
} from './adapters/binaryAdapters.js';
import { mountScrollHarness } from './core/scrollHarness.js';

const ADAPTER_MAP = {
  qet: parseQetXml,
  plc: parsePlcXml,
  workday: parseWorkdayXml,
  drawio: parseDrawioXml,
  svg: parseSvgXml,
  markup: parseMarkupXml,
  md: parseMarkdown,
  yaml: parseYaml,
  json: parseJson,
  csv: parseCsv,
  toml: parseToml,
  png: parsePngBinary,
  jpg: parseJpegBinary,
  wav: parseWavBinary,
  mp3: parseMp3Binary,
  zip: parseZipBinary,
  pdf: parsePdfBinary,
  gltf: parseGltfJson,
};

// DOM References
const tabsEl = document.getElementById('format-tabs');
const svgStageEl = document.getElementById('svg-stage');
const xrayStripEl = document.getElementById('xray-strip');
const narrativeEl = document.getElementById('narrative-column');
const formatBadgeEl = document.getElementById('format-badge');
const formatTitleEl = document.getElementById('format-title');
const activeFileLabelEl = document.getElementById('active-file-label');
const progressBarEl = document.getElementById('scroll-progress-bar');
const dropBannerEl = document.getElementById('drop-banner');
const fileUploadEl = document.getElementById('file-upload');

// Modal References
const astModal = document.getElementById('ast-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');

let activeFormatId = 'qet';
let activeMode = 'kid'; // 'kid' | 'eng'
let activeStepIdx = 0;
let activeHarness = null;
let activeModel = null;
let activeCleanupUrls = [];

/**
 * Renders the grouped 18-format selector bar.
 */
function buildFormatTabs() {
  tabsEl.innerHTML = '';
  const groups = new Map();
  FORMAT_CATALOG.forEach((item) => {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  });

  groups.forEach((items, groupName) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'tab-group';
    const lbl = document.createElement('span');
    lbl.className = 'tab-group-label';
    lbl.textContent = groupName;
    groupDiv.appendChild(lbl);

    items.forEach((fmt) => {
      const btn = document.createElement('button');
      btn.className = `fmt-tab${fmt.id === activeFormatId ? ' active' : ''}`;
      btn.dataset.id = fmt.id;
      btn.textContent = fmt.id === 'qet' ? '★ .qet (QElectroTech)' : fmt.label;
      btn.onclick = () => loadSampleFormat(fmt.id);
      groupDiv.appendChild(btn);
    });

    tabsEl.appendChild(groupDiv);
  });
}

/**
 * Mounts a parsed Canonical File Anatomy Model into the sticky stage + narrative column.
 */
function mountParsedModel(model, displayLabel) {
  // Teardown previous harness and blob URLs
  if (activeHarness) {
    activeHarness.destroy();
    activeHarness = null;
  }
  activeCleanupUrls.forEach((url) => URL.revokeObjectURL(url));
  activeCleanupUrls = model.cleanupUrls || [];

  activeModel = model;
  activeStepIdx = 0;

  formatBadgeEl.textContent = model.badge;
  formatTitleEl.textContent = model.title;
  activeFileLabelEl.textContent = displayLabel;

  // 1. Mount Semantic SVG
  svgStageEl.innerHTML = model.svgMarkup;

  // 2. Mount Synchronized Raw X-Ray Tokens
  xrayStripEl.innerHTML = '';
  (model.rawTokens || []).forEach((tok) => {
    const chip = document.createElement('div');
    chip.className = 'xray-token';
    chip.dataset.tokenId = tok.id;
    chip.innerHTML = `<strong>${tok.label}</strong><span>${tok.text.replace(/</g, '&lt;')}</span>`;
    xrayStripEl.appendChild(chip);
  });

  // 3. Mount Scrollama Narrative Cards
  renderNarrativeCards();

  // Reset scroll to top cleanly when switching formats
  window.scrollTo({ top: 0, behavior: 'instant' });

  // 4. Boot Scrollama + Anime.js + svg-pan-zoom Harness
  activeHarness = mountScrollHarness({
    svgContainer: svgStageEl,
    stepsContainer: narrativeEl,
    xrayContainer: xrayStripEl,
    steps: model.steps,
    progressBarEl,
    onStepChange: (idx) => {
      activeStepIdx = idx;
    },
  });
}

function renderNarrativeCards() {
  if (!activeModel) return;
  narrativeEl.innerHTML = '';
  activeModel.steps.forEach((st, idx) => {
    const card = document.createElement('article');
    card.className = `explainer-step${idx === activeStepIdx ? ' is-active' : ''}`;
    const bodyText = activeMode === 'kid' ? st.kidText : st.engText;
    const tags = [...(st.highlightIds || []), ...(st.wireIds || [])].slice(0, 4);

    card.innerHTML = `
      <span class="step-badge">${activeMode === 'kid' ? 'KID EXPLORER' : 'ENGINEER DEEP-DIVE'} • STEP ${idx + 1} / ${activeModel.steps.length}</span>
      <h3 class="step-title">${st.title}</h3>
      <p class="step-body">${bodyText}</p>
      <div class="step-tags">
        ${tags.map((t) => `<span class="step-tag">${t}</span>`).join('')}
      </div>
    `;

    card.addEventListener('click', () => activeHarness?.goToStep(idx));
    narrativeEl.appendChild(card);
  });
}

function loadSampleFormat(formatId) {
  const fmt = FORMAT_CATALOG.find((f) => f.id === formatId);
  if (!fmt) return;
  activeFormatId = formatId;

  document.querySelectorAll('.fmt-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === formatId);
  });

  const adapter = ADAPTER_MAP[formatId];
  const payload = fmt.kind === 'binary' ? fmt.getSample() : fmt.sample;
  const model = adapter(payload);
  mountParsedModel(model, `${fmt.label} (Built-in Sample)`);
}

/**
 * Automatically detects uploaded file format by extension & content signatures.
 */
async function handleUploadedFile(file) {
  if (!file) return;
  const name = file.name.toLowerCase();

  let targetId = 'markup';
  if (name.endsWith('.qet')) targetId = 'qet';
  else if (name.endsWith('.drawio')) targetId = 'drawio';
  else if (name.endsWith('.svg')) targetId = 'svg';
  else if (name.endsWith('.gltf')) targetId = 'gltf';
  else if (name.endsWith('.json')) targetId = 'json';
  else if (name.endsWith('.csv')) targetId = 'csv';
  else if (name.endsWith('.yaml') || name.endsWith('.yml')) targetId = 'yaml';
  else if (name.endsWith('.md')) targetId = 'md';
  else if (name.endsWith('.toml') || name.endsWith('.ini')) targetId = 'toml';
  else if (name.endsWith('.png')) targetId = 'png';
  else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) targetId = 'jpg';
  else if (name.endsWith('.wav')) targetId = 'wav';
  else if (name.endsWith('.mp3')) targetId = 'mp3';
  else if (name.endsWith('.zip')) targetId = 'zip';
  else if (name.endsWith('.pdf')) targetId = 'pdf';
  else if (name.endsWith('.xml')) {
    const txt = await file.text();
    if (txt.includes('plcopen') || txt.includes('<LD>')) targetId = 'plc';
    else if (txt.includes('wd:') || txt.includes('workday')) targetId = 'workday';
    else targetId = 'markup';
    activeFormatId = targetId;
    buildFormatTabs();
    mountParsedModel(ADAPTER_MAP[targetId](txt), file.name);
    return;
  }

  const fmtMeta = FORMAT_CATALOG.find((f) => f.id === targetId);
  const isBinary = fmtMeta?.kind === 'binary';
  const payload = isBinary ? await file.arrayBuffer() : await file.text();

  activeFormatId = targetId;
  buildFormatTabs();
  mountParsedModel(ADAPTER_MAP[targetId](payload), `${file.name} (${file.size} bytes)`);
}

// Audience Mode Toggle
document.querySelectorAll('.aud-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.aud-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeMode = btn.dataset.mode;
    renderNarrativeCards();
    if (activeHarness) {
      activeHarness.goToStep(activeStepIdx);
    }
  });
});

// Camera & Step Presenter Controls
document.getElementById('btn-zoom-in').onclick = () => activeHarness?.zoomIn();
document.getElementById('btn-zoom-out').onclick = () => activeHarness?.zoomOut();
document.getElementById('btn-zoom-reset').onclick = () => activeHarness?.resetZoom();
document.getElementById('btn-wheel-toggle').onclick = (e) => {
  const on = activeHarness?.toggleWheelZoom();
  e.target.textContent = `Wheel: ${on ? 'On' : 'Off'}`;
};

document.getElementById('btn-prev-step').onclick = () => {
  if (activeModel) activeHarness?.goToStep(Math.max(0, activeStepIdx - 1));
};
document.getElementById('btn-next-step').onclick = () => {
  if (activeModel) activeHarness?.goToStep(Math.min(activeModel.steps.length - 1, activeStepIdx + 1));
};

window.addEventListener('keydown', (e) => {
  if (!activeModel) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeHarness?.goToStep(Math.min(activeModel.steps.length - 1, activeStepIdx + 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeHarness?.goToStep(Math.max(0, activeStepIdx - 1));
  }
});

// File Upload & Drag-and-Drop
fileUploadEl.onchange = (e) => handleUploadedFile(e.target.files?.[0]);
document.body.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropBannerEl.classList.add('dragover');
});
document.body.addEventListener('dragleave', () => dropBannerEl.classList.remove('dragover'));
document.body.addEventListener('drop', (e) => {
  e.preventDefault();
  dropBannerEl.classList.remove('dragover');
  handleUploadedFile(e.dataTransfer?.files?.[0]);
});

// AST Modal
document.getElementById('btn-view-ast').onclick = () => {
  if (!activeModel) return;
  modalTitle.textContent = `${activeModel.title} — Parsed AST`;
  modalContent.textContent = JSON.stringify(activeModel.ast, null, 2);
  astModal.classList.remove('hidden');
};
document.getElementById('btn-close-modal').onclick = () => astModal.classList.add('hidden');
astModal.onclick = (e) => {
  if (e.target === astModal) astModal.classList.add('hidden');
};

// Boot into QElectroTech (.qet) by default
buildFormatTabs();
loadSampleFormat('qet');
