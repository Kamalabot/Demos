/**
 * =============================================================================
 * ANIME.JS v4.5.0 ACADEMY — PARALLEL STUDIO ORCHESTRATOR (main.js)
 * =============================================================================
 * Responsibilities:
 *   1. Registers 22 progressive lessons spanning Beginner, Intermediate,
 *      Advanced, and Mastery levels across all Anime.js v4 modules—including
 *      External SVG Upload (`play_idea00.svg`) and Three.js Adapters!
 *   2. Renders the live visual exhibit AND the parallel syntax-highlighted
 *      source code side-by-side, highlighting the exact `highlightLines` that
 *      perform the core work and auto-scrolling to them.
 *   3. Supports Difficulty Tier filtering (`All`, `Beginner`, `Intermediate`,
 *      `Advanced`, `Mastery`) and Split/Stage layout toggling.
 * =============================================================================
 */

const lessonModules = import.meta.glob('./lessons/*.js');
const lessonSources = import.meta.glob('./lessons/*.js', {
  query: '?raw',
  import: 'default',
});

const LESSONS = [
  // 1. TIMER
  { group: '1. Timer', id: '01-timer-basics', label: 'Timer Basics & Iteration Progress', level: 'Beginner', doc: 'https://animejs.com/documentation/timer' },
  { group: '1. Timer', id: '02-timer-controls', label: 'Playback, Seek & Speed Controls', level: 'Intermediate', doc: 'https://animejs.com/documentation/timer/timer-methods' },

  // 2. ANIMATION
  { group: '2. Animation', id: '03-animate-targets-props', label: 'Targets, CSS, JS & Colors', level: 'Beginner', doc: 'https://animejs.com/documentation/animation' },
  { group: '2. Animation', id: '04-animate-keyframes', label: 'Keyframes Choreography', level: 'Intermediate', doc: 'https://animejs.com/documentation/animation/keyframes' },
  { group: '2. Animation', id: '05-animate-modifiers-composition', label: 'Modifiers & Blending', level: 'Advanced', doc: 'https://animejs.com/documentation/animation/tween-parameters/modifier' },
  { group: '2. Animation', id: '06-animate-callbacks-promises', label: 'Callbacks & Async Promises', level: 'Intermediate', doc: 'https://animejs.com/documentation/animation/animation-callbacks' },

  // 3. TIMELINE
  { group: '3. Timeline', id: '07-timeline-sequencing', label: 'Sequencing, Labels & Offsets', level: 'Beginner', doc: 'https://animejs.com/documentation/timeline' },
  { group: '3. Timeline', id: '08-timeline-scrubber', label: 'Master Scrubber & .call()', level: 'Advanced', doc: 'https://animejs.com/documentation/timeline/timeline-methods' },

  // 4. EASINGS
  { group: '4. Easings', id: '09-easings-built-in', label: 'Built-in Eases & Curve Plot', level: 'Beginner', doc: 'https://animejs.com/documentation/easings' },
  { group: '4. Easings', id: '10-easings-spring-cubic-steps', label: 'Spring Physics, Bezier & Steps', level: 'Intermediate', doc: 'https://animejs.com/documentation/easings/spring' },

  // 5. STAGGER & UTILS
  { group: '5. Stagger & Utils', id: '11-stagger-basics-grid', label: '2D Grid Stagger & Origins', level: 'Intermediate', doc: 'https://animejs.com/documentation/utilities/stagger' },
  { group: '5. Stagger & Utils', id: '12-stagger-ranges-eased', label: 'Value Ranges & Eased Waves', level: 'Advanced', doc: 'https://animejs.com/documentation/utilities/stagger/stagger-parameters/stagger-ease' },
  { group: '5. Stagger & Utils', id: '13-utils-math-dom', label: 'Utils: Random, Snap & Lerp', level: 'Beginner', doc: 'https://animejs.com/documentation/utilities' },

  // 6. SVG (CRITICAL MODULE + EXTERNAL FILE UPLOADER)
  { group: '6. SVG Studio', id: '14-svg-drawable', label: 'SVG Drawable Strokes', level: 'Beginner', doc: 'https://animejs.com/documentation/svg/createdrawable' },
  { group: '6. SVG Studio', id: '15-svg-morph', label: 'SVG Shape Morphing', level: 'Intermediate', doc: 'https://animejs.com/documentation/svg/morphto' },
  { group: '6. SVG Studio', id: '16-svg-motion-path', label: 'SVG Motion Path', level: 'Advanced', doc: 'https://animejs.com/documentation/svg/createmotionpath' },
  { group: '6. SVG Studio', id: '17-svg-external-upload', label: 'External SVG Upload & play_idea00', level: 'Mastery', doc: 'https://animejs.com/documentation/svg' },

  // 7. TEXT
  { group: '7. Text', id: '18-text-split', label: 'Text Splitting (Chars/Words)', level: 'Intermediate', doc: 'https://animejs.com/documentation/text/splittext' },
  { group: '7. Text', id: '19-text-scramble', label: 'Cipher & Scramble Reveal', level: 'Advanced', doc: 'https://animejs.com/documentation/text' },

  // 8. INTERACTIVITY, SCROLL, SCOPE & WAAPI
  { group: '8. Interactivity & Engine', id: '20-animatable-draggable', label: 'Animatable & Draggable Physics', level: 'Advanced', doc: 'https://animejs.com/documentation/draggable' },
  { group: '8. Interactivity & Engine', id: '21-scroll-scope-waapi', label: 'onScroll, createScope & WAAPI', level: 'Mastery', doc: 'https://animejs.com/documentation/events/onscroll' },

  // 9. THREE.JS ADAPTERS (animejs/adapters/three)
  { group: '9. Three.js Adapters', id: '22-three-adapter-objects', label: 'Three.js Object3D & Lights', level: 'Advanced', doc: 'https://animejs.com/documentation' },
  { group: '9. Three.js Adapters', id: '23-three-adapter-instanced', label: 'InstancedMesh Grid Choreography', level: 'Mastery', doc: 'https://animejs.com/documentation' },
];

// DOM References
const navEl = document.getElementById('lesson-nav');
const stageEl = document.getElementById('stage');
const titleEl = document.getElementById('lesson-title');
const badgeEl = document.getElementById('lesson-module-badge');
const levelBadgeEl = document.getElementById('lesson-level-badge');
const descEl = document.getElementById('lesson-desc');
const masteryCallout = document.getElementById('mastery-callout');
const masteryText = document.getElementById('mastery-text');
const docLinkEl = document.getElementById('doc-link');
const btnCopyCode = document.getElementById('btn-copy-code');
const btnReplay = document.getElementById('btn-replay');
const btnToggleLayout = document.getElementById('btn-toggle-layout');
const exhibitSplit = document.getElementById('exhibit-split');

// Parallel Code Panel References
const codeFilenameEl = document.getElementById('code-filename');
const codeLinesEl = document.getElementById('code-lines');
const codeScrollEl = document.getElementById('code-scroll');
const levelFilterEl = document.getElementById('level-filter');

let activeLessonId = null;
let activeCleanup = null;
let activeRawCode = '';
let activeLevelFilter = 'All';

/**
 * Escapes HTML entities and applies lightweight token coloring to a single JS line.
 */
function highlightLineHTML(rawLine) {
  const escaped = rawLine
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const trimmed = escaped.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return `<span class="tok-comment">${escaped}</span>`;
  }

  return escaped
    .replace(/('[^']*'|"[^"]*"|`[^`]*`)/g, '<span class="tok-str">$1</span>')
    .replace(/\b(import|export|from|const|let|var|function|return|async|await|if|else|for|new|true|false|null)\b/g, '<span class="tok-kw">$1</span>')
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
}

/**
 * Renders the source code line-by-line into the parallel Code Panel,
 * highlighting lines specified by `highlightLines` (e.g. [[48, 62]]) or `// @core`.
 */
function renderParallelCode(rawSource, highlightRanges = []) {
  const lines = rawSource.split(/\r?\n/);
  const isLineHighlighted = (lineNumber) => {
    for (const [start, end] of highlightRanges) {
      if (lineNumber >= start && lineNumber <= end) return true;
    }
    return false;
  };

  let firstHighlightLineEl = null;
  codeLinesEl.innerHTML = '';

  const fragment = document.createDocumentFragment();
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const row = document.createElement('div');
    const highlighted = isLineHighlighted(lineNum) || line.includes('@core');
    row.className = `code-line${highlighted ? ' is-highlighted' : ''}`;

    const numSpan = document.createElement('span');
    numSpan.className = 'line-num';
    numSpan.textContent = String(lineNum);

    const textSpan = document.createElement('span');
    textSpan.className = 'line-text';
    textSpan.innerHTML = highlightLineHTML(line) || ' ';

    row.appendChild(numSpan);
    row.appendChild(textSpan);
    fragment.appendChild(row);

    if (highlighted && !firstHighlightLineEl) {
      firstHighlightLineEl = row;
    }
  });

  codeLinesEl.appendChild(fragment);

  // Smoothly scroll the parallel code panel to the first highlighted working block
  if (firstHighlightLineEl) {
    requestAnimationFrame(() => {
      codeScrollEl.scrollTop = Math.max(0, firstHighlightLineEl.offsetTop - 48);
    });
  } else {
    codeScrollEl.scrollTop = 0;
  }
}

/**
 * Builds the grouped sidebar navigation filtered by `activeLevelFilter`.
 */
function buildSidebar() {
  navEl.innerHTML = '';
  let currentGroup = '';

  LESSONS.forEach((lesson, idx) => {
    if (activeLevelFilter !== 'All' && lesson.level !== activeLevelFilter) {
      return;
    }

    if (lesson.group !== currentGroup) {
      currentGroup = lesson.group;
      const groupHeading = document.createElement('div');
      groupHeading.className = 'nav-group-title';
      groupHeading.textContent = currentGroup;
      navEl.appendChild(groupHeading);
    }

    const btn = document.createElement('button');
    btn.className = `nav-item${lesson.id === activeLessonId ? ' active' : ''}`;
    btn.dataset.id = lesson.id;
    btn.title = `${lesson.level} — ${lesson.label}`;
    btn.innerHTML = `
      <span class="nav-left">
        <span class="nav-num">${String(idx + 1).padStart(2, '0')}</span>
        <span>${lesson.label}</span>
      </span>
      <span class="nav-lvl-dot dot-${lesson.level}"></span>
    `;
    btn.addEventListener('click', () => loadLesson(lesson.id));
    navEl.appendChild(btn);
  });
}

/**
 * Loads a lesson module, mounts its exhibit, and renders its parallel highlighted code.
 */
async function loadLesson(lessonId) {
  const meta = LESSONS.find((l) => l.id === lessonId);
  if (!meta) return;

  if (typeof activeCleanup === 'function') {
    try {
      activeCleanup();
    } catch (err) {
      console.warn('[Academy] Cleanup warning:', err);
    }
    activeCleanup = null;
  }

  stageEl.innerHTML = '';
  activeLessonId = lessonId;

  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === lessonId);
  });

  badgeEl.textContent = meta.group;
  levelBadgeEl.textContent = meta.level;
  levelBadgeEl.className = `level-badge lvl-${meta.level}`;
  titleEl.textContent = meta.label;
  docLinkEl.href = meta.doc;
  codeFilenameEl.textContent = `lessons/${lessonId}.js`;

  const modulePath = `./lessons/${lessonId}.js`;
  try {
    const [mod, rawSource] = await Promise.all([
      lessonModules[modulePath](),
      lessonSources[modulePath](),
    ]);

    activeRawCode = rawSource;
    descEl.textContent = mod.LESSON_META?.summary || '';

    if (mod.LESSON_META?.masteryNote) {
      masteryText.textContent = mod.LESSON_META.masteryNote;
      masteryCallout.classList.remove('hidden');
    } else {
      masteryCallout.classList.add('hidden');
    }

    renderParallelCode(rawSource, mod.LESSON_META?.highlightLines || []);
    activeCleanup = mod.mount(stageEl);
  } catch (err) {
    console.error(`[Academy] Failed to load ${lessonId}:`, err);
    descEl.textContent = `Error loading lesson: ${err.message}`;
  }
}

// Level Filter Handler
levelFilterEl.addEventListener('click', (e) => {
  const pill = e.target.closest('.lvl-pill');
  if (!pill) return;
  activeLevelFilter = pill.dataset.level;
  levelFilterEl.querySelectorAll('.lvl-pill').forEach((p) => p.classList.remove('active'));
  pill.classList.add('active');
  buildSidebar();
});

// Layout Toggle (Split vs Full Exhibit)
btnToggleLayout.addEventListener('click', () => {
  const isStageOnly = exhibitSplit.classList.toggle('stage-only');
  btnToggleLayout.textContent = isStageOnly ? '◫ Show Code' : '◫ Split View';
});

btnReplay.addEventListener('click', () => {
  if (activeLessonId) loadLesson(activeLessonId);
});

btnCopyCode.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(activeRawCode);
    btnCopyCode.textContent = '✓ Copied!';
    setTimeout(() => (btnCopyCode.textContent = 'Copy Code'), 1500);
  } catch {
    btnCopyCode.textContent = 'Copy Failed';
  }
});

// Boot Academy
buildSidebar();
loadLesson(LESSONS[0].id);
