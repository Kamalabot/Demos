"""Command-line interface for py2drawio."""

import argparse
import os
import sys

from .emitter import emit_drawio
from .layout import compute_module_layout
from .parser import parse_python_file
from .tracer import run_with_trace


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="py2drawio",
        description="Compile Python source code into templatized Draw.io diagrams.",
    )
    parser.add_argument("input", help="Path to the input Python (.py) file.")
    parser.add_argument("-o", "--output", help="Output .drawio file path (defaults to <input>.drawio).")
    parser.add_argument(
        "--theme",
        choices=["blueprint", "dark"],
        default="blueprint",
        help="Visual template theme (default: blueprint).",
    )
    parser.add_argument(
        "--parser",
        choices=["ast", "tree-sitter"],
        default="ast",
        help="Parser backend (default: ast).",
    )
    parser.add_argument(
        "--trace",
        action="store_true",
        help="Execute the script under sys.settrace to include runtime variable & call trace tables.",
    )

    args = parser.parse_args(argv)
    if not os.path.isfile(args.input):
        print(f"[ERROR] Input file not found: {args.input}", file=sys.stderr)
        return 1

    output_path = args.output or (os.path.splitext(args.input)[0] + ".drawio")

    try:
        print(f"[INFO] Parsing '{args.input}' using backend='{args.parser}'...")
        module_ir = parse_python_file(args.input, parser_backend=args.parser)

        if args.trace:
            print("[INFO] Running sandboxed trace collector (sys.settrace)...")
            target_funcs = {fn.name for fn in module_ir.functions}
            module_ir.trace = run_with_trace(args.input, target_funcs)

        print("[INFO] Solving deterministic swimlane layout...")
        compute_module_layout(module_ir)

        print(f"[INFO] Emitting Draw.io diagram with theme='{args.theme}'...")
        written_path = emit_drawio(module_ir, output_path, theme_name=args.theme)
        print(f"[SUCCESS] Wrote diagram: {written_path}")
        return 0
    except Exception as exc:
        print(f"[ERROR] Compilation failed: {exc}", file=sys.stderr)
        return 1
