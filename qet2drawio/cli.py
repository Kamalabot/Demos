"""Command-line interface for qet2drawio (Approach 3)."""

import argparse
import os
import sys

from .analyzer import analyze_project
from .emitter import emit_qet_drawio
from .layout import compute_project_layout
from .parser import parse_qet_file


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="qet2drawio",
        description="Compile QElectroTech (.qet / .qetz) projects into Approach 3 Functional Block & Bus Draw.io diagrams.",
    )
    parser.add_argument("input", help="Path to the input .qet or .qetz file.")
    parser.add_argument("-o", "--output", help="Output .drawio file path (defaults to <input>.drawio).")
    parser.add_argument(
        "--theme",
        choices=["qet"],
        default="qet",
        help="Color theme preset (default: qet).",
    )
    parser.add_argument(
        "--no-pins",
        action="store_true",
        help="Hide terminal pin lists inside functional element blocks.",
    )

    args = parser.parse_args(argv)
    if not os.path.isfile(args.input):
        print(f"[ERROR] Input file not found: {args.input}", file=sys.stderr)
        return 1

    output_path = args.output or (os.path.splitext(args.input)[0] + ".drawio")

    try:
        print(f"[INFO] Parsing QElectroTech project: '{args.input}'...")
        project = parse_qet_file(args.input)

        print("[INFO] Analyzing terminal links, bus bundles, and connected nets...")
        analyze_project(project)
        compute_project_layout(project)

        for d in project.diagrams:
            print(
                f"  - Folio {d.order} '{d.title}': {len(d.elements)} blocks, "
                f"{len(d.conductors)} conductors -> {len(d.bus_bundles)} bus(es), "
                f"{len(d.nets)} net(s), {len(d.annotations)} annotation(s)"
            )

        written = emit_qet_drawio(
            project,
            output_path,
            theme_name=args.theme,
            show_pins=not args.no_pins,
        )
        print(f"[SUCCESS] Wrote Draw.io diagram: {written}")
        return 0
    except Exception as exc:
        print(f"[ERROR] Compilation failed: {exc}", file=sys.stderr)
        return 1
