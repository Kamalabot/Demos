# `py2drawio` — Python Code to Templatized Draw.io Compiler

`py2drawio` parses Python source files into a deterministic Intermediate Representation (IR), optionally captures live execution traces via `sys.settrace`, solves a swimlane layout, and emits templatized `.drawio` diagrams.

---

## Architecture & Pipeline

1. **Parser (`parser.py`)**: Extracts module imports, globals, classes, functions, calls, and control-flow structures using Python's built-in `ast` or `tree-sitter` (`tree-sitter-python`).
2. **Tracer (`tracer.py`)**: Optional sandboxed `sys.settrace` collector (`--trace`) that records runtime variable snapshots and call counts.
3. **Layout (`layout.py`)**: Deterministic swimlane and card placement solver.
4. **Emitter (`emitter.py`)**: Renders Jinja2 HTML cards (`templates/html_cards.j2`) and theme styles (`templates/theme_blueprint.json`, `templates/theme_dark.json`) into `.drawio` via `drawpyo`.

---

## Open Source Dependencies

| Package | Open Source Status | Active Development Status | Purpose |
| :--- | :--- | :--- | :--- |
| `drawpyo` | Open Source (MIT) | Actively maintained (`0.2.5`/`0.2.6`) | Programmatic `.drawio` XML generation |
| `Jinja2` | Open Source (BSD-3-Clause) | Actively maintained | HTML card & trace table templating |
| `tree-sitter` / `tree-sitter-python` | Open Source (MIT) | Actively maintained | Optional concrete syntax tree parsing |

---

## Usage (Windows `cmd.exe`)

Install dependencies:

```cmd
pip install drawpyo jinja2 tree-sitter tree-sitter-python
```

Compile a Python file using the default `blueprint` theme:

```cmd
python -m py2drawio algo_runs\demo.py -o py2drawio\code_demo_auto.drawio
```

Compile with the `dark` theme, `tree-sitter` backend, and live runtime tracing:

```cmd
python -m py2drawio algo_runs\demo.py -o py2drawio\code_demo_dark.drawio --theme dark --parser tree-sitter --trace
```

---

## CLI Options

| Flag | Default | Description |
| :--- | :--- | :--- |
| `input` | *(required)* | Path to input `.py` file |
| `-o`, `--output` | `<input>.drawio` | Output `.drawio` path |
| `--theme` | `blueprint` | Visual theme (`blueprint` or `dark`) |
| `--parser` | `ast` | Parser backend (`ast` or `tree-sitter`) |
| `--trace` | `false` | Run under `sys.settrace` to embed runtime variable & call trace tables |
