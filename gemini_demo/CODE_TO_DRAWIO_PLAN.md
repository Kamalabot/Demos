# Implementation Plan: Deterministic Python-to-Draw.io Compiler (`py2drawio`)

> **Objective:** Replace ad-hoc XML generation scripts with a modular, parser-driven pipeline that reads arbitrary Python source files, extracts structural/control-flow metadata and optional runtime traces, and compiles them into **templatized `.drawio` diagrams**.

---

## 1. Open Source Stack & Recency Audit

| Component                                       | Package / Tool                                                                                                                               | Open Source Status         | Active Development Status                                                                  | Role in Pipeline                                                                                                               |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------- | :----------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **Primary Parser (Clean Code)**           | Python stdlib `ast`                                                                                                                        | Open Source (PSF License)  | Core Python stdlib (3.12–3.14+)                                                           | Zero-dependency AST parsing for valid Python files; extracts exact line numbers, control blocks, and call sites.               |
| **Fault-Tolerant / Comment-Aware Parser** | [`tree-sitter`](https://github.com/tree-sitter/py-tree-sitter) + [`tree-sitter-python`](https://github.com/tree-sitter/tree-sitter-python) | Open Source (MIT License)  | Actively maintained (`0.25.x` grammar tracking Python 3.13/3.14 syntax)                  | Incremental CST parsing; preserves inline comments, handles incomplete snippets, and supports future multi-language expansion. |
| **Draw.io Diagram Builder**               | [`drawpyo`](https://github.com/XMCesari/drawpyo)                                                                                            | Open Source (MIT License)  | Actively maintained (`0.2.5` / `0.2.6` releases; `mxlibrary` & XML escaping support) | Programmatic creation of `mxGraphModel` pages, shapes, orthogonal connectors, and custom shape libraries.                    |
| **HTML/Label Templating**                 | [`Jinja2`](https://github.com/pallets/jinja)                                                                                                | Open Source (BSD-3-Clause) | Actively maintained                                                                        | Renders clean, escaped HTML cell labels (e.g., variable tables, trace cards, code snippets) from templates.                    |

---

## 2. System Architecture (5-Stage Pipeline)

```
  [input_script.py]
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. PARSER & CODE READER (ast / tree-sitter-python)                      │
│    • Extracts imports, module-level constants, functions, classes       │
│    • Builds per-function statement trees (if/elif/else, for, while, try)│
│    • Captures docstrings & inline annotations                           │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. INTERMEDIATE REPRESENTATION (IR) & CFG BUILDER                       │
│    • Converts AST into deterministic CFG nodes & directed edges         │
│    • Links caller nodes (e.g. main -> assign_grade) to subroutines      │
│    • Resolves loop back-edges and try/except exception edges            │
└────────┬──────────────────────────────┬─────────────────────────────────┘
         │                              │ (Optional: --trace flag)
         │                              ▼
         │               ┌────────────────────────────────────────────────┐
         │               │ 3. SANDBOXED TRACE COLLECTOR (sys.settrace)    │
         │               │    • Captures concrete variable states, loop   │
         │               │      iterations, branch hits, and stdout       │
         │               └──────────────┬─────────────────────────────────┘
         ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. DETERMINISTIC LAYOUT & SWIMLANE PLANNER                              │
│    • Assigns swimlanes: Main Flow | Subroutines | Runtime Trace         │
│    • Computes collision-free (x, y, w, h) bounding boxes top-down       │
│    • Calculates port anchors (exitX/Y, entryX/Y) for loopback edges     │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. TEMPLATIZED DRAW.IO EMITTER (drawpyo + Jinja2 Theme Templates)       │
│    • Applies JSON/YAML visual theme (colors, fonts, rounding, strokes)  │
│    • Emits valid .drawio XML ready for diagrams.net / VS Code Draw.io   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Proposed Module Structure

```text
D:\gitFolders\Demos\py2drawio\
├── __init__.py
├── __main__.py             # Enables: python -m py2drawio ...
├── cli.py                  # CLI entry point (python -m py2drawio input.py -o out.drawio)
├── ir.py                   # Dataclasses: ModuleIR, FunctionIR, CFGNode, CFGEdge, TraceReport
├── parser.py               # AST / tree-sitter-python visitor converting Python -> IR
├── tracer.py               # Optional sys.settrace runner for concrete execution tables
├── layout.py               # Deterministic swimlane & bounding-box coordinate solver
├── templates\
│   ├── theme_blueprint.json   # Clean technical palette (blue/green/amber/red)
│   ├── theme_dark.json        # Dark-mode engineering palette
│   └── html_cards.j2          # Jinja2 templates for memory tables, trace cards & stdout
└── emitter.py              # Compiles positioned IR + Theme -> .drawio XML via drawpyo
```

---

## 4. Core Intermediate Representation (IR) Schema

Every Python construct maps deterministically to typed `dataclass` primitives in `ir.py`:

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple


class NodeKind(str, Enum):
    START = "start"
    END = "end"
    PROCESS = "process"       # Assignments, expressions, print/log calls
    DECISION = "decision"     # if / elif / while condition
    LOOP_FOR = "loop_for"     # for ... in ... hexagon header
    CALL = "call"             # Function invocation (linked to subroutine lane)
    TRY_BLOCK = "try_block"   # try header
    EXCEPT = "except"         # except / raise error handler
    RETURN = "return"         # return statement


@dataclass
class CFGNode:
    node_id: str
    kind: NodeKind
    title: str
    code_snippet: str
    line_no: int
    calls_target: Optional[str] = None
    x: float = 0.0
    y: float = 0.0
    width: float = 220.0
    height: float = 48.0


@dataclass
class CFGEdge:
    edge_id: str
    source_id: str
    target_id: str
    label: str = ""
    edge_type: str = "normal"  # "normal" | "true" | "false" | "loopback" | "exception" | "call_link"


@dataclass
class FunctionIR:
    name: str
    params: List[str]
    nodes: List[CFGNode] = field(default_factory=list)
    edges: List[CFGEdge] = field(default_factory=list)
    is_entrypoint: bool = False


@dataclass
class ModuleIR:
    filename: str
    functions: List[FunctionIR] = field(default_factory=list)
    module_statements: List[CFGNode] = field(default_factory=list)
```

---

## 5. Templatization Strategy (Decoupling Logic from Visuals)

Instead of embedding style strings (`fillColor=#D1FAE5;strokeColor=#10B981;...`) inside Python logic:

1. **Node-Kind Style Map (JSON Theme)**:
   Each `NodeKind` resolves to a declarative style preset in `templates/theme_blueprint.json`:
   * `START` / `RETURN` $\rightarrow$ Capsule/rounded pill (`#D1FAE5` fill, `#10B981` stroke)
   * `DECISION` $\rightarrow$ Rhombus (`#FEF9C3` fill, `#FACC15` stroke)
   * `LOOP_FOR` $\rightarrow$ Hexagon (`#F3E8FF` fill, `#A855F7` stroke)
   * `EXCEPT` $\rightarrow$ Alert card (`#FEE2E2` fill, `#EF4444` stroke)
   * `CALL` $\rightarrow$ Highlighted process box (`#DBEAFE` fill, `#3B82F6` stroke)
2. **Dynamic Label Templates (`html_cards.j2`)**:
   * **Variable Init Blocks**: Auto-formats `name = value (type)` lines cleanly.
   * **Trace Tables**: Renders HTML `<table>` cells for loop iterations (`Iter | Index | Value | Branch | Output`).
   * **Console Output Card**: Wraps captured `stdout` inside a styled `<pre>` block.

---

## 6. Phased Execution Roadmap

### Phase 1: AST Parser & CFG Builder (`parser.py`, `ir.py`)

* Implement `CFGVisitor(ast.NodeVisitor)` to walk each `ast.FunctionDef`.
* Handle sequential statements, `ast.If` (including chained `elif` ladders), `ast.For` (with automatic loop-back edge), `ast.While`, `ast.Try` (connecting body errors to `ExceptHandler`), and `ast.Return`/`ast.Raise`.
* Detect `if __name__ == "__main__":` and promote `main()` to the primary left swimlane.
* **Milestone Check**: Parse `algo_runs/demo.py` and print deterministic JSON IR matching all nodes and edges.

### Phase 2: Deterministic Swimlane Layout Engine (`layout.py`)

* **Lane 1 (Left)**: Entry point (`main()` or top-level module flow) stacked vertically with fixed vertical padding (`dy = 25px`) and horizontal branch offsets for `if/else` diamonds.
* **Lane 2+ (Top Right)**: Grid of extracted subroutine panels (`assign_grade`, `calculate_average`, etc.), auto-sized to their node count.
* **Bottom Right Panel**: Reserved for Runtime Trace & Memory State tables (when `--trace` is active).
* Compute explicit `exitX/exitY` and `entryX/entryY` anchors for loop-back and exception edges so orthogonal arrows never overlap node text.

### Phase 3: Templatized Draw.io Emitter (`emitter.py`, `templates/`)

* Load selected JSON theme and Jinja2 label templates.
* Use `drawpyo.File`, `drawpyo.Page`, `drawpyo.diagram.Object`, and `drawpyo.diagram.Edge` to instantiate every IR node and edge.
* Write output `.drawio` file and validate XML well-formedness.

### Phase 4: Optional Concrete Runtime Tracer (`tracer.py`)

* Add an opt-in `--trace` CLI flag (disabled by default for untrusted scripts).
* Execute the target script under `sys.settrace` with `io.StringIO` stdout capture.
* Record per-function argument values, loop iteration snapshots, and final return values to populate the bottom-right **Runtime Memory State & Execution Trace** panel automatically.

### Phase 5: CLI & Verification (`cli.py`)

* Expose clean CLI flags:
  * `--input` / positional path to `.py` file
  * `--output` path to `.drawio` file
  * `--theme` (`blueprint` | `dark`)
  * `--trace` (optional concrete execution capture)
  * `--parser` (`ast` | `tree-sitter`)
* Verify against `algo_runs/demo.py`, `algo_runs/algo00.py`, and edge-case snippets (nested loops, empty functions, raised exceptions).

---

## 7. Quick-Start Setup Commands (Windows DOS / `cmd.exe`)

Install required packages in your virtual environment:

```cmd
pip install drawpyo jinja2 tree-sitter tree-sitter-python
```

Target CLI usage once implemented:

```cmd
python -m py2drawio d:\gitFolders\Demos\algo_runs\demo.py -o d:\gitFolders\Demos\algo_runs\code_demo_auto.drawio --trace --theme blueprint
```
