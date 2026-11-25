# Implementation Plan: QElectroTech XML-to-Draw.io Block Compiler (`qet2drawio`)

> **Objective:** Parse QElectroTech project files (`.qet` / `.qetz`) and component symbol definitions (`.elmt`) using `lxml`, extract components, terminal pins, and conductor netlists into a deterministic Intermediate Representation (IR), and compile them into **templatized Draw.io blocks, custom `mxlibrary` stencils, and wired multi-page schematics**.

---

## 1. Open Source Stack & Recency Audit

| Component                            | Package / Tool                                                            | Open Source Status         | Active Development Status                                                                           | Role in Pipeline                                                                               |
| :----------------------------------- | :------------------------------------------------------------------------ | :------------------------- | :-------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **QElectroTech Format**        | [QElectroTech](https://github.com/qelectrotech/qelectrotech-source-mirror) | Open Source (GPLv2+)       | Actively maintained (2025–2026 updates for permanent UUIDs, terminal strips, and XML fallbacks)    | Source XML specification (`.qet` folios, `.elmt` symbols).                                 |
| **XML Parser & XPath Engine**  | [`lxml`](https://github.com/lxml/lxml)                                   | Open Source (BSD-3-Clause) | Actively maintained (`6.1.3` released Sept 2026; secure entity defaults)                          | Fast XPath queries over `<collection>`, `<diagram>`, `<elements>`, and `<conductors>`. |
| **Draw.io Diagram Builder**    | [`drawpyo`](https://github.com/XMCesari/drawpyo)                         | Open Source (MIT License)  | Actively maintained (`0.2.5` / `0.2.6` releases with `mxlibrary` registration & XML escaping) | Programmatic multi-page `.drawio` file creation, block styling, and edge routing.            |
| **Label & Stencil Templating** | [`Jinja2`](https://github.com/pallets/jinja)                             | Open Source (BSD-3-Clause) | Actively maintained                                                                                 | Renders Draw.io `<shape>` SVG/stencil XML and HTML block property tables.                    |

---

## 2. QElectroTech XML Data Model Mapping

QElectroTech splits schematics across two complementary XML schemas:

1. **Element Definitions (`.elmt` or `<collection>` inside `.qet`)**:
   * `<definition width="..." height="..." hotspot_x="..." hotspot_y="..." link_type="...">`
   * `<names>` / `<information>`: Multilingual component names, manufacturer, article metadata.
   * `<description>`: Vector primitives (`<line>`, `<rectangle>`/`<rect>`, `<ellipse>`/`<circle>`, `<arc>`, `<polygon>`, `<text>`, `<input>`) plus `<terminal x="..." y="..." orientation="n|s|e|w" uuid="..."/>` pins.
2. **Project Folios (`.qet`)**:
   * `<project>` $\rightarrow$ `<diagram>` (one per folio/page).
   * `<elements>` $\rightarrow$ `<element uuid="..." x="..." y="..." orientation="0|1|2|3" type="embed://...">` with `<terminals>` and `<inputs>` (instance labels like `KM1`, `Q1`).
   * `<conductors>` $\rightarrow$ `<conductor uuid="..." text="..." color="..." section="...">` with `<point x="..." y="..."/>` routing vertices and terminal docking references.

---

## 3. System Architecture (5-Stage Pipeline)

```
  [project.qet / symbol.elmt]
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. XML INGESTION & COLLECTION RESOLVER (lxml)                           │
│    • Handles plain .qet, zipped .qetz, or standalone .elmt files        │
│    • Indexes embedded <definition> symbols under embed:// paths         │
│    • Falls back to local QET element library directory if specified     │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. SCHEMATIC INTERMEDIATE REPRESENTATION (IR)                           │
│    • Normalizes coordinates relative to (hotspot_x, hotspot_y)          │
│    • Maps orientation (0..3 -> 0°, 90°, 180°, 270°) to rotated pins     │
│    • Resolves conductor netlists: (src_elem_uuid, pin) -> (dst, pin)    │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. DUAL RENDERING STRATEGY (Block Mode vs. Stencil Mode)                │
│    • Mode A (Engineering Blocks): Clean templatized Draw.io blocks      │
│      with component tag, type badge, and labeled N/S/E/W port pins      │
│    • Mode B (Vector Stencils): Compiles .elmt primitives into Draw.io   │
│      <shape> stencils + connection constraints for exact CAD fidelity   │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. COORDINATE SCALER & ROUTING SOLVER                                   │
│    • Scales QET folio coordinates to Draw.io page units                 │
│    • Preserves <point> waypoints on orthogonal edges or auto-routes     │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. TEMPLATIZED DRAW.IO EMITTER (drawpyo + Jinja2)                       │
│    • Creates 1 drawpyo.Page per <diagram> folio                         │
│    • Applies category color themes (Power, Control, PLC, Protection)    │
│    • Exports project.drawio and optional custom_symbols.xml (mxlibrary) │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Proposed Module Structure

```text
D:\gitFolders\Demos\qet2drawio\
├── __init__.py
├── __main__.py             # Enables: python -m qet2drawio ...
├── cli.py                  # CLI entry point (python -m qet2drawio project.qet -o out.drawio)
├── ir.py                   # Dataclasses: QETProjectIR, FolioIR, ElementDefIR, ElementInstIR, TerminalIR, ConductorIR
├── parser.py               # lxml XPath reader for .qet, .qetz, and .elmt files
├── geometry.py             # Hotspot offset normalization, 90° pin rotation, coordinate scaling
├── stencil_builder.py      # Converts .elmt primitives (line/arc/rect/circle) -> Draw.io <shape> & mxlibrary
├── templates\
│   ├── theme_iec.json      # Color themes by element category (Breaker, Motor, Coil, Terminal, PLC)
│   └── block_card.j2       # Jinja2 HTML label template for Engineering Block Mode
└── emitter.py              # Compiles IR + Theme -> multi-page .drawio via drawpyo
```

---

## 5. Core Intermediate Representation (IR) Schema

```python
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class TerminalIR:
    term_id: str
    uuid: str
    rel_x: float
    rel_y: float
    orientation: str  # "n" | "s" | "e" | "w"
    label: str = ""


@dataclass
class ElementDefIR:
    embed_path: str
    name: str
    width: float
    height: float
    hotspot_x: float
    hotspot_y: float
    link_type: str
    primitives: List[Dict] = field(default_factory=list)  # line, rect, circle, arc, polygon
    terminals: List[TerminalIR] = field(default_factory=list)


@dataclass
class ElementInstIR:
    uuid: str
    def_path: str
    label: str              # e.g. "KM1", "Q1", "M1"
    x: float
    y: float
    orientation: int        # 0, 1, 2, 3 (multiples of 90 deg)
    properties: Dict[str, str] = field(default_factory=dict)
    terminals: List[TerminalIR] = field(default_factory=list)


@dataclass
class ConductorIR:
    uuid: str
    text: str               # Wire potential / net name (e.g. "L1", "24VDC")
    color: str              # Hex color (e.g. "#FF0000")
    section: str            # Wire cross-section (e.g. "1.5")
    src_elem_uuid: str
    src_term_id: str
    dst_elem_uuid: str
    dst_term_id: str
    waypoints: List[Tuple[float, float]] = field(default_factory=list)


@dataclass
class FolioIR:
    title: str
    order: int
    width: float
    height: float
    elements: List[ElementInstIR] = field(default_factory=list)
    conductors: List[ConductorIR] = field(default_factory=list)


@dataclass
class QETProjectIR:
    title: str
    definitions: Dict[str, ElementDefIR] = field(default_factory=dict)
    folios: List[FolioIR] = field(default_factory=list)
```

---

## 6. Key Technical Challenges & Solutions

1. **Hotspot-to-TopLeft Translation**:
   * *Problem*: QET positions elements by `(x, y)` at their internal `(hotspot_x, hotspot_y)`, whereas Draw.io positions blocks by top-left `(x, y)`.
   * *Solution*: `geometry.py` computes `drawio_x = elem.x - def.hotspot_x` and `drawio_y = elem.y - def.hotspot_y` before applying rotation transforms.
2. **Exact Pin Snapping (`points` Constraint Array)**:
   * *Problem*: Wires must terminate on the exact electrical pin rather than the generic center of a block.
   * *Solution*: Convert each `<terminal>` coordinate `(tx, ty)` into Draw.io normalized `[0..1]` port ratios:
     `rx = (tx + hotspot_x) / width`, `ry = (ty + hotspot_y) / height`, and embed `points=[[rx, ry, 0, 0, 0, 0], ...]` in the node's Draw.io `style` string, referencing `exitX`/`exitY` and `entryX`/`entryY` on each `ConductorIR` edge.
3. **Dual Output Modes (Blocks vs. Stencils)**:
   * **Block Mode (`--mode block`)**: Best for high-level system/architecture reviews — renders each component as a clean, labeled card with color-coded category header and port stubs.
   * **Stencil Mode (`--mode stencil`)**: Best for schematic fidelity — compiles `<line>`, `<circle>`, `<arc>`, and `<polygon>` primitives into Draw.io `<shape>` SVG stencils and exports a reusable `.xml` `mxlibrary`.

---

## 7. Phased Execution Roadmap

### Phase 1: `.elmt` & `.qet` XML Reader (`parser.py`, `ir.py`)

* Parse `.qet` (and zipped `.qetz`) using `lxml.etree` with safe entity defaults.
* Extract `<collection>` definitions into `QETProjectIR.definitions` and resolve `embed://` paths.
* Extract all `<diagram>` folios, `<element>` instances, `<terminal>` docks, and `<conductor>` paths.
* **Milestone Check**: Parse a sample `.qet` file and dump a verified netlist summary (`Elements`, `Terminals`, `Conductors`).

### Phase 2: Geometry & Rotation Engine (`geometry.py`)

* Implement hotspot-to-top-left coordinate conversion and 90°/180°/270° terminal rotation math (`orientation` 0–3).
* Compute normalized Draw.io `[0..1]` port anchor coordinates for every terminal pin.

### Phase 3: Templatized Block & Stencil Builders (`templates/`, `stencil_builder.py`)

* Build `templates/theme_iec.json` categorizing components (Circuit Breakers, Contactors, Motors, Terminals, PLCs) by color/stroke.
* Implement `stencil_builder.py` to convert `.elmt` graphical primitives into Draw.io `<shape>` definitions and export a standalone `mxlibrary` XML file.

### Phase 4: Multi-Page Draw.io Emitter (`emitter.py`)

* Map each `FolioIR` to a `drawpyo.Page`.
* Instantiate element blocks/stencils via `drawpyo.diagram.Object` with embedded port constraints.
* Instantiate conductors via `drawpyo.diagram.Edge` using wire color, label (`text`), section badge, and `<point>` waypoints.

### Phase 5: CLI & Validation (`cli.py`)

* Provide CLI switches: `--mode block|stencil`, `--scale`, `--export-library`, `--theme`.
* Validate generated `.drawio` and `mxlibrary` files for XML well-formedness and test visual rendering in Draw.io Desktop / VS Code Draw.io.

---

## 8. Quick-Start Setup Commands (Windows DOS / `cmd.exe`)

Install required packages in your virtual environment:

```cmd
pip install lxml drawpyo jinja2
```

Target CLI usage once implemented:

```cmd
python -m qet2drawio d:\path\to\schematic.qet -o d:\path\to\schematic.drawio --mode block --export-library symbols.xml
```
