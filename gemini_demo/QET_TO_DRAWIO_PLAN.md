# Implementation Plan: QElectroTech File-Centric Block Diagram Compiler (`qet2drawio`)

> **Objective:** Rethink QElectroTech (`.qet`) to Draw.io conversion from the **perspective of the `.qet` file's internal object model**—how `<project>` organizes `<properties>`, `<newdiagrams>`, `<diagram>` folios, `<element>` instances, `<terminal>` IDs, `<conductor>` connections, and embedded `<collection>` `.elmt` definitions—rather than 1:1 CAD coordinate redrawing.
>
> **Workspace Target:** `D:\gitFolders\Demos\qet2drawio\`
> **Status:** Awaiting selection of one of the **3 architectural approaches** below before implementation.

---

## 1. Open Source Stack & Recency Audit

| Component | Package / Tool | Open Source Status | Active Development Status | Role in Pipeline |
| :--- | :--- | :--- | :--- | :--- |
| **QElectroTech Format** | [QElectroTech](https://github.com/qelectrotech/qelectrotech-source-mirror) | Open Source (GPLv2+) | Actively maintained (2025–2026 updates for permanent UUIDs, terminal strips, XML fallbacks) | Source XML specification (`.qet` project, `<diagram>`, `<collection>`). |
| **XML Parser & XPath** | [`lxml`](https://github.com/lxml/lxml) | Open Source (BSD-3-Clause) | Actively maintained (`6.1.3` released Sept 2026; secure entity defaults) | Parses `<project>`, `<diagram>`, `<element>`, `<terminal>`, `<conductor>`, `<collection>`. |
| **Draw.io Builder** | [`drawpyo`](https://github.com/XMCesari/drawpyo) | Open Source (MIT License) | Actively maintained (`0.2.5` / `0.2.6` releases) | Generates multi-page `.drawio` containers, cards, ports, and edges. |
| **Card Templating** | [`Jinja2`](https://github.com/pallets/jinja) | Open Source (BSD-3-Clause) | Actively maintained | Renders structured HTML tables inside Draw.io block cards. |

---

## 2. How a `.qet` File Stores Everything Under `<project>`

Inspecting real `.qet` files (`741.qet` and `ArduinoLCD.qet`) reveals that a `.qet` file is a **self-contained relational archive** rooted at `<project>`:

```text
<project title="..." version="...">
 ├── <properties>                  # Project metadata (author, dates, filename)
 ├── <newdiagrams>                 # Global defaults (<border>, <inset>, <conductors>, <xrefs>, *_autonums)
 ├── <diagram order="1..N" title="...">   # 1 or more Folios (Pages)
 │    ├── <defaultconductor>       # Folio-level wire defaults
 │    ├── <elements>               # Placed object instances
 │    │    └── <element uuid="{...}" type="embed://..." x="..." y="..." orientation="0..3">
 │    │         ├── <terminals>    # Global numeric terminal IDs: <terminal id="15" .../>
 │    │         ├── <inputs> / <elementInformations> / <dynamic_texts>
 │    └── <conductors>             # Point-to-point links referencing terminal IDs
 │         └── <conductor terminal1="15" terminal2="35" type="multi" num="..." color="..."/>
 └── <collection>                  # Embedded symbol library tree
      └── <category name="...">    # e.g. arduino, elektronika, rlc, oznaczenia
           └── <element name="*.elmt">
                └── <definition link_type="..." width="..." height="...">
                     ├── <names> / <informations>
                     └── <description>   # Vector primitives + canonical <terminal> pins
```

### Key File-Perspective Observations
1. **Global Terminal Addressing:** `<conductor>` does **not** reference `<element uuid>` directly; it links `terminal1="<id>"` to `terminal2="<id>"`. Resolving which two `<element>` objects are connected requires indexing every `<terminal id>` back to its parent `<element>`.
2. **Type vs. Instance Split:** `<collection>` stores reusable `.elmt` definitions under nested `<category>` folders; `<diagram>/<elements>/<element>` stores placed instances referencing them via `type="embed://..."`.
3. **Mixed Element Roles:** Not all `<element>` nodes are electrical components—some have `0` terminals (e.g., `oznaczenia/tekst_08.elmt` in `741.qet` is a pure text annotation).
4. **Multi-Folio Projects:** A single `<project>` can span multiple `<diagram>` folios (`ArduinoLCD.qet` has 3 folios: `LCD 4 DATA`, `LCD 4 DATA `, `GEIGER`) sharing one `<collection>`.

---

## 3. Three File-Centric Block Diagram Approaches (Choose One)

### Approach 1: Project-to-Folio Structural Containment & Object Tree ("File-Hierarchy Swimlanes")
Mirrors the exact XML containment tree of the `.qet` file inside Draw.io using nested **swimlane/container blocks**.

* **Visual Structure:**
  * **Page 1 (`Project Overview`):**
    * Top banner container: `<project>` metadata (`title`, `version`, `<properties>`, `<newdiagrams>` defaults).
    * Left swimlane: **`<collection>` Library Tree** — nested category containers (`arduino`, `elektronika`, `rlc`, etc.) listing each embedded `.elmt` definition, pin count, and `link_type`.
    * Right swimlanes: **1 Container per `<diagram>` Folio** (`order`, `title`), containing compact `<element>` object cards (`label`, `uuid`, `embed://` badge, terminal count) and `<conductor>` edges between them.
  * **Pages 2..N (Per-Folio Detail):** Each `<diagram>` gets its own page showing its `<elements>` container, `<conductors>` edge list, and `<terminal>` ID mapping.
* **What It Emphasizes:** *How the `.qet` file physically packages `<collection>`, `<diagram>`, `<element>`, and `<conductor>` under `<project>`.*
* **Pros:** Zero ambiguity against the XML schema; ideal for auditing file structure, embedded library usage, and multi-folio organization.
* **Cons:** Can look busy if you draw both `embed://` dependency arrows and electrical conductor edges on the same overview page.

---

### Approach 2: Relational Entity-Graph & Netlist Model ("Object-Link Schema View")
Treats the `.qet` file as a **normalized relational database / object graph** rather than a hierarchical document, explicitly visualizing how IDs and references bind together.

* **Visual Structure (4-Column / Tiered Relational Layout):**
  1. **Tier 1 — `<project>` & `<diagram>` Scope Headers:** Folio badges (`Folio 1: LCD 4 DATA`, etc.) acting as namespace tags.
  2. **Tier 2 — `<collection>` Definition Nodes (`.elmt` Templates):** Unique symbol definitions with `embed://` key and canonical pin list.
  3. **Tier 3 — `<element>` Instance Nodes with `<terminal id>` Ports:** Each placed `<element>` rendered as a UML/ER-style class card showing `uuid`, `label`, `elementInformations`, and explicit `<terminal id>` port rows.
  4. **Tier 4 — Resolved Netlist / Junction Nodes (`<conductor>`):** Conductors grouped into **Electrical Nets** (connected components of `terminal1` $\leftrightarrow$ `terminal2` sharing `num`/potential or color), showing exact pin-to-pin wiring tables.
* **What It Emphasizes:** *Reference resolution* (`embed://` $\rightarrow$ `<element>` $\rightarrow$ `<terminal id>` $\leftrightarrow$ `<conductor>` $\leftrightarrow$ Net).
* **Pros:** Best for debugging connectivity, spotting unconnected/dangling `<terminal>` IDs, verifying netlists, and understanding QET's internal data model.
* **Cons:** Less intuitive as an "engineering system diagram" because it separates definitions, instances, and nets into relational tiers.

---

### Approach 3: Functional Block & Aggregated Bus Architecture ("System-Level Component View")
Abstracts away XML boilerplate and individual wire clutter to produce a **clean, human-readable system block diagram** built from the `.qet` object graph.

* **Visual Structure:**
  * **Project Context Header:** Compact `<project>` title/version + `<diagram>` folio tabs (1 Draw.io page per `<diagram>` + 1 Project Summary page).
  * **Category-Grouped Functional Blocks:** `<element>` objects with `terminals > 0` are styled by `<collection>` category (`arduino`, `elektronika`, `semiconducteurs`, `rlc`, `bornes`) as clean HTML-table blocks listing their role, `elementInformations`, and active pins.
  * **Annotation Separation:** Non-electrical `<element>` objects (`terminals == 0`, e.g., `oznaczenia/tekst_08.elmt`) are extracted into a dedicated **Annotations / Notes** callout box instead of polluting the component graph.
  * **Conductor Bus Aggregation:** Multiple `<conductor>` links between the *same pair of `<element>` blocks* are collapsed into a **single labeled Bus / Signal Bundle edge** (e.g., `10 conductors [D0..D7, RS, E]` or color-coded by `#00aaff`), with full `terminal1 -> terminal2` pin mappings attached in a clean edge label or side table.
* **What It Emphasizes:** *Logical architecture and component-to-component signal flow* derived directly from `<element>` + `<conductor>` relationships.
* **Pros:** Dramatically cleaner on dense projects (`741.qet` has 65 elements / 67 conductors; `ArduinoLCD.qet` has 16-pin LCD buses); immediately readable by engineers without CAD noise.
* **Cons:** Individual wire routing and raw XML hierarchy are abstracted away (though preserved in IR metadata).

---

## 4. Comparison Summary

| Dimension | Approach 1: File-Hierarchy Swimlanes | Approach 2: Relational Entity-Graph | Approach 3: Functional Block & Bus |
| :--- | :--- | :--- | :--- |
| **Primary Lens** | XML containment (`<project>` $\rightarrow$ `<diagram>` / `<collection>`) | Data-model foreign keys (`embed://`, `uuid`, `terminal id`) | Logical component & signal-bus architecture |
| **Handling of `<collection>`** | Explicit swimlane of `.elmt` cards | Tier of reusable Type nodes linked to Instances | Category color-themes & metadata badges on blocks |
| **Handling of `<conductor>`** | Individual edges inside each `<diagram>` swimlane | Grouped into Netlist / Junction nodes with pin tables | Aggregated into Bus bundles between element pairs |
| **Handling of 0-pin Elements** | Rendered as element cards in folio swimlane | Rendered as metadata-only instance nodes | Separated into a dedicated Notes/Annotations box |
| **Best For** | Auditing `.qet` file structure & multi-folio assets | Netlist verification & reference-integrity debugging | Architecture reviews & readable system block diagrams |

---

## 5. Shared Foundation & Module Layout (`D:\gitFolders\Demos\qet2drawio\`)

All three approaches share the same **File-Model IR** (`ir.py`) and **XML Parser** (`parser.py`), differing only in `graph_builder.py` / `layout.py` / `emitter.py`:

```text
D:\gitFolders\Demos\qet2drawio\
├── __init__.py
├── __main__.py
├── cli.py                  # python -m qet2drawio <file.qet> -o <out.drawio>
├── ir.py                   # ProjectIR, PropertiesIR, DiagramIR, CollectionDefIR, ElementObjIR, TerminalIR, ConductorIR
├── parser.py               # lxml reader building the exact <project> object & terminal-ID index
├── analyzer.py             # Resolves terminal1/2 -> ElementObjIR, builds connected nets & bus bundles
├── layout.py               # Deterministic Draw.io placement for the chosen approach
├── templates\
│   ├── theme_qet.json      # Category colors (arduino, elektronika, rlc, semiconducteurs, bornes)
│   └── block_card.j2       # Jinja2 HTML card templates
├── emitter.py              # Compiles layout + IR -> multi-page .drawio via drawpyo
└── examples\
    ├── 741.qet             # 1 folio, 11 defs, 65 elements, 67 conductors
    └── ArduinoLCD.qet      # 3 folios, 9 defs, 11 elements, 47 conductors
```

---

## 6. Next Step: Choose Your Approach

Reply with **Approach 1**, **Approach 2**, or **Approach 3** (or a hybrid, e.g., *"Approach 1 for Page 1 Overview + Approach 3 for per-folio pages"*), and implementation will proceed against `741.qet` and `ArduinoLCD.qet`.
