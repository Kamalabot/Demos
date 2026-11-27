# Unity UI Toolkit Telemetry Collector

**Exported:** 11/27/2026 16:04:44  
**Link:** [https://gemini.google.com/app/9b589fa30eeb3b72](https://gemini.google.com/app/9b589fa30eeb3b72)  

## Gemini:

> 11/27/2026 15:59:38

Yes—a **`.qet` file** (QElectroTech project XML) is plain XML containing `<diagram>` pages, `<element>` placements (`x`, `y`, `orientation`, embedded `<definition>` symbol primitives), and `<conductor>` wire segments (`x1, y1, x2, y2`). There is no single turnkey package that parses `.qet`, `.drawio`, and `.l5x`/PLCopen formats into a scroll-driven Anime.js explainer out of the box, because each format uses its own XML schema—so the clean sovereign architecture is a **3-stage adapter + scroll-scrollytelling harness**:

`​`​`text
[.qet / .drawio / .svg / PLCopen XML]
   │  1. Format Adapters (normalize to a single Canonical Scene JSON + SVG)
   ▼
[Inline DOM <svg> with <g id="part_id" data-role="...">]
   │  2. Scroll Observer Harness (Anime.js v4 onScroll / Scrollama / GSAP ScrollTrigger)
   ▼
[Sticky Schematic Viewport + Scrolling Narrative Cards highlighting #part_id]
`​`​`

---

### 1. Recommended Package Stack (npm + Python)

You already installed `animejs` and `gsap`. Add these lightweight scroll-storytelling and XML-parsing packages:

`​`​`bat
npm install scrollama fast-xml-parser svg-pan-zoom
`​`​`

| Package | Role in the Harness | Why It Fits |
| :--- | :--- | :--- |
| **`fast-xml-parser`** | Browser/Node XML $\rightarrow$ JS Object parser | Parses `.qet`, `.drawio`, and PLCopen XML directly in the browser (or build step) at native speed with zero DOM bloat. |
| **`scrollama`** | IntersectionObserver scrollytelling harness | Industry standard for "sticky graphic on the left + scrolling narrative steps on the right" explainers; fires `onStepEnter` / `onStepProgress` with step index and `0..1` progress. |
| **`animejs` (`onScroll` + `createTimeline`)** | Part highlighting, stroke-dash flow, and smooth scroll scrubbing | Anime.js v4 includes native **`onScroll({ sync: 0.25 })`** (`ScrollObserver`) for scrubbing animations smoothly with scroll, plus `animate('#part_id', ...)` on step entry. |
| **`svg-pan-zoom`** | Interactive camera zoom/focus on highlighted parts | Lets each scroll step smoothly pan and zoom the SVG viewport onto the active `.qet` breaker, relay coil, or bus segment while keeping user pan/zoom unlocked. |

---

### 2. How the `.qet` $\rightarrow$ DOM SVG Adapter Works

A `.qet` file stores each placed component as `<element type="embed://..." x="..." y="..." orientation="...">` alongside an embedded `<elements>` symbol library (`<definition>` containing `<line>`, `<rect>`, `<ellipse>`, `<polygon>`, `<terminal>`) and `<conductors>` (`<conductor x1="..." y1="..." x2="..." y2="...">`).

1. **Normalize into Semantic SVG Groups (`<g>`):**
   * Each `<element>` becomes `<g id="el_12" class="qet-part" data-label="KM1" data-type="contactor" transform="translate(x, y) rotate(deg)">...</g>` containing its symbol primitives.
   * Each `<conductor>` becomes `<polyline id="cond_04" class="qet-wire" points="..." />`.
2. **Dim-and-Highlight Pattern (Zero Layout Shift):**
   * When a scroll step activates `targets: ["#el_12", "#cond_04"]`, Anime.js dims sibling parts (`opacity: 0.2`) and highlights the active `<g>` (`opacity: 1`, `stroke: "#38bdf8"`, `filter` glow, and `strokeDashoffset` marching current along `#cond_04`).

---

### 3. Minimal Scrollytelling Harness (`qet_scroll_harness.js`)

This snippet wires **`scrollama`** + **`animejs` v4** (`animate` + `onScroll`) to highlight split SVG parts as the user scrolls through explanation cards:

`​`​`javascript
import { animate, onScroll, stagger } from "animejs";
import scrollama from "scrollama";

// 1. Registry mapping scroll step index -> SVG part IDs & camera focus
const explainerSteps = [
  {
    stepId: "step-0",
    highlightIds: ["#el_mcb1", "#cond_l1"],
    dimOthers: true,
  },
  {
    stepId: "step-1",
    highlightIds: ["#el_km1_coil", "#cond_ctrl_01"],
    dimOthers: true,
  },
  {
    stepId: "step-2",
    highlightIds: ["#el_motor_m1", "#cond_u1", "#cond_v1", "#cond_w1"],
    dimOthers: true,
  },
];

// 2. Highlight active parts & animate conductor current flow
function focusSchematicParts(targetSelectors, dimOthers = true) {
  animate(".qet-part, .qet-wire", {
    opacity: dimOthers ? 0.22 : 1.0,
    duration: 300,
    ease: "outQuad",
  });

  if (!targetSelectors.length) return;

  animate(targetSelectors, {
    opacity: 1.0,
    scale: [1, 1.04, 1],
    delay: stagger(60),
    duration: 450,
    ease: "outCubic",
  });

  // Animate dashed current flow on highlighted wires
  animate(
    targetSelectors.filter((id) => id.startsWith("#cond_")),
    {
      strokeDashoffset: [24, 0],
      ease: "linear",
      duration: 600,
      loop: true,
    }
  );
}

// 3. Bind Scrollama to narrative step cards
const scroller = scrollama();

scroller
  .setup({
    step: ".explainer-step",
    offset: 0.55, // Triggers when step card crosses 55% of viewport height
  })
  .onStepEnter(({ index, element }) => {
    document.querySelectorAll(".explainer-step").forEach((el) => el.classList.remove("is-active"));
    element.classList.add("is-active");

    const config = explainerSteps[index];
    if (config) {
      focusSchematicParts(config.highlightIds, config.dimOthers);
    }
  });

// Optional: Continuous scroll-scrubbed progress bar using Anime.js v4 onScroll
animate("#scroll-progress-bar", {
  scaleX: [0, 1],
  ease: "linear",
  autoplay: onScroll({
    container: document.body,
    sync: 0.25,
  }),
});

window.addEventListener("resize", scroller.resize);
`​`​`

### Multi-Format Extensibility
Because the harness only queries **`.qet-part` / `.qet-wire` IDs inside an inline `<svg>`**, you can plug in small format adapters for **`.qet`**, **`.drawio`**, **`.svg` (Inkscape)**, or **PLCopen XML** that all emit the same `<svg>` + `explainerSteps` JSON manifest without changing a single line of the scroll or Anime.js layer.

For a walkthrough of scroll-driven SVG path animations and trigger synchronization, see [A GSAP Scroll Animation Where SVG Noodles Crawl Across, Swap](https://www.youtube.com/watch?v=_2bYFpRmuRY).

Powered by Gemini Exporter (https://www.ai-chat-exporter.com)
