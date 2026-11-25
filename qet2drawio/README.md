# `qet2drawio` — QElectroTech XML to Functional Block & Bus Draw.io Compiler

`qet2drawio` compiles QElectroTech (`.qet` / `.qetz`) project files into multi-page Draw.io block diagrams using **Approach 3: Functional Block & Aggregated Bus Architecture**.

Rather than redrawing raw CAD coordinates, `qet2drawio` models how a `.qet` file stores and links objects under `<project>`: `<diagram>` folios, `<collection>` symbol categories, `<element>` objects, `<terminal id>` pins, and `<conductor>` links.

---

## Architecture & Pipeline

1. **XML Parser (`parser.py`)**: Uses `lxml` with safe entity defaults to parse `<project>`, `<properties>`, `<collection>` `.elmt` definitions, `<diagram>` folios, `<element>` instances, and `<conductor>` links. Separates electrical elements (`terminals > 0`) from 0-pin text annotations (`is_annotation=True`).
2. **Analyzer (`analyzer.py`)**:
   * Resolves `<conductor terminal1="..." terminal2="...">` to parent `<element>` UUIDs.
   * Aggregates parallel conductors between the same pair of elements into labeled **`BusBundleIR`** edges (e.g. `10 wires [T32↔T57, ...]`).
   * Computes connected electrical **`NetGroupIR`** components.
3. **Layout (`layout.py`)**: Groups functional blocks into clean, non-overlapping category columns sorted by connectivity degree and pin count.
4. **Emitter (`emitter.py`)**: Uses `drawpyo` and Jinja2 (`templates/block_card.j2`, `templates/theme_qet.json`) to generate:
   * **`0_Project_Overview`**: Project metadata banner, per-folio summary cards, and `<collection>` category breakdown.
   * **Per-Folio Pages**: Category-colored functional element blocks, aggregated bus edges, and a dedicated **Folio Annotations** box for 0-pin elements.

---

## Open Source Dependencies

| Package | Open Source Status | Active Development Status | Purpose |
| :--- | :--- | :--- | :--- |
| `lxml` | Open Source (BSD-3-Clause) | Actively maintained (`6.1.3`) | Fast, secure `.qet` / `.qetz` XML parsing |
| `drawpyo` | Open Source (MIT) | Actively maintained (`0.2.5`/`0.2.6`) | Multi-page `.drawio` file generation |
| `Jinja2` | Open Source (BSD-3-Clause) | Actively maintained | HTML card & summary templating |

---

## Usage (Windows `cmd.exe`)

Install dependencies:

```cmd
pip install lxml drawpyo jinja2
```

Compile a `.qet` or `.qetz` project:

```cmd
python -m qet2drawio qet2drawio\examples\ArduinoLCD.qet -o qet2drawio\examples\ArduinoLCD.drawio
```

Hide pin lists inside element cards for a more compact overview:

```cmd
python -m qet2drawio qet2drawio\examples\741.qet -o qet2drawio\examples\741.drawio --no-pins
```

---

## Verified Examples

| Example File | Folios | Functional Blocks | Raw Conductors $\rightarrow$ Aggregated Buses | 0-Pin Annotations | Output |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `examples\741.qet` | 1 | 39 | 67 $\rightarrow$ 61 | 26 | `examples\741.drawio` |
| `examples\ArduinoLCD.qet` | 3 | 11 | 47 $\rightarrow$ 8 | 0 | `examples\ArduinoLCD.drawio` |
