# Anime.js v4.5.0 Parallel Interactive Academy (`play_idea01`)

A **27-file** visual teaching studio covering every module in the official Anime.js v4 documentation (`https://animejs.com/documentation`), structured across **Beginner → Intermediate → Advanced → Mastery** skill tiers.

## How to Run (Windows DOS / `cmd.exe`)

From the `js_libdemo` root directory:

```cmd
npx vite play_idea01
```

---

## Key Studio Features

- **Parallel Live Exhibit + Highlighted Code Panel**: Every animation runs side-by-side with its source code, automatically spotlighting (`@core` / `highlightLines`) the exact lines driving the engine and displaying a **Mastery Insight** callout.
- **Difficulty Tier Filtering**: Filter lessons by `All`, `Beginner`, `Intermediate`, `Advanced`, or `Mastery`.
- **Timer Loop Fix & Deep Dive**: Lessons `01` and `02` teach the crucial distinction between `progress` / `currentTime` and `iterationProgress` / `iterationCurrentTime` on looping timers.
- **External SVG Upload Studio (`17-svg-external-upload.js`)**: Drag-and-drop or upload any `.svg` file—or load the included `play_idea00/play_idea00.svg` Inkscape asset—and animate it across 4 choreography modes (`Blueprint Draw + Fill`, `Stroke Draw`, `Stagger Pop-In`, `Kinetic Wave`).
- **Three.js Adapter Lessons (`22` & `23`)**: Demonstrates `animejs/adapters/three` to directly tween `Object3D` transforms, degrees (`rotateX/Y/Z`), `Material.color`, `PointLight.intensity`, and 36 `InstancedMesh` cubes in a single draw call via `getInstances()`.

---

## Complete 23-Lesson Curriculum Map

| # | Level | Module | File | Focus |
| :--- | :--- | :--- | :--- | :--- |
| 01 | Beginner | Timer | `lessons/01-timer-basics.js` | `createTimer()`, `iterationProgress`, `frameRate: 10` |
| 02 | Intermediate | Timer | `lessons/02-timer-controls.js` | `play()`, `pause()`, `reverse()`, `seek()`, `.speed` |
| 03 | Beginner | Animation | `lessons/03-animate-targets-props.js` | GPU transforms, colors, plain JS objects |
| 04 | Intermediate | Animation | `lessons/04-animate-keyframes.js` | Squash-and-stretch duration keyframes |
| 05 | Advanced | Animation | `lessons/05-animate-modifiers-composition.js` | `modifier: utils.snap(40)` & blending |
| 06 | Intermediate | Animation | `lessons/06-animate-callbacks-promises.js` | `onBegin`, `onComplete`, `await anim` |
| 07 | Beginner | Timeline | `lessons/07-timeline-sequencing.js` | `.add()`, `.label()`, `-=`, `<` relative offsets |
| 08 | Advanced | Timeline | `lessons/08-timeline-scrubber.js` | `tl.progress` scrubber & `.call()` triggers |
| 09 | Beginner | Easings | `lessons/09-easings-built-in.js` | Live SVG curve plotter for `eases` |
| 10 | Intermediate | Easings | `lessons/10-easings-spring-cubic-steps.js` | `createSpring()`, `cubicBezier()`, `steps()`, `irregular()` |
| 11 | Intermediate | Stagger & Utils | `lessons/11-stagger-basics-grid.js` | 2D `grid: [8, 5]` Euclidean `from` ripples |
| 12 | Advanced | Stagger & Utils | `lessons/12-stagger-ranges-eased.js` | Value-range `[min, max]` eased wave choreography |
| 13 | Beginner | Stagger & Utils | `lessons/13-utils-math-dom.js` | `utils.random`, `snap`, `clamp`, `lerp`, `mapRange` |
| 14 | Beginner | SVG Studio | `lessons/14-svg-drawable.js` | `svg.createDrawable()` normalized `'0 1'` strokes |
| 15 | Intermediate | SVG Studio | `lessons/15-svg-morph.js` | `svg.morphTo()` automatic path point resampling |
| 16 | Advanced | SVG Studio | `lessons/16-svg-motion-path.js` | `svg.createMotionPath()` tangent tracking |
| 17 | Mastery | SVG Studio | `lessons/17-svg-external-upload.js` | External `.svg` upload/drop + `play_idea00.svg` animator |
| 18 | Intermediate | Text | `lessons/18-text-split.js` | `text.splitText()` clipped char reveal |
| 19 | Advanced | Text | `lessons/19-text-scramble.js` | `text.scrambleText()` cipher decode |
| 20 | Advanced | Interactivity | `lessons/20-animatable-draggable.js` | `createAnimatable()` 60fps pointer + `createDraggable()` |
| 21 | Mastery | Engine & Scroll | `lessons/21-scroll-scope-waapi.js` | `onScroll()`, `createScope()`, `waapi.animate()` |
| 22 | Advanced | Three.js Adapter | `lessons/22-three-adapter-objects.js` | `animejs/adapters/three` on `Mesh` & `PointLight` |
| 23 | Mastery | Three.js Adapter | `lessons/23-three-adapter-instanced.js` | `getInstances()` + 2D grid `stagger()` on `InstancedMesh` |

## Recommended YouTube References (Titles Only)
- **Anime.js v4 Crash Course & New Features** — *DesignCourse*
- **SVG Line Drawing & Morphing with Anime.js** — *Kevin Powell*
- **Creative Web Animations & Kinetic Typography** — *Codrops / Yuri Artiukh*
