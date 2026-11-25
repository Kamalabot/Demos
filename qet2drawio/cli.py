"""Command-line interface for qet2drawio."""

import argparse
import os
import sys

from .emitter import emit_qet_drawio
from .parser import parse_qet_file
from .stencil_builder import export_mxlibrary


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="qet2drawio",
        description="Compile QElectroTech (.qet, .qetz, .elmt) XML schematics into Draw.io blocks.",
    )
    parser.add_argument("input", help="Path to the input .qet, .qetz, or .elmt file.")
    parser.add_argument("-o", "--output", help="Output .drawio file path (defaults to <input>.drawio).")
    parser.add_argument(
        "--mode",
        choices=["block", "stencil"],
        default="block",
        help="Rendering mode: engineering blocks or compact stencil blocks (default: block).",
    )
    parser.add_argument(
        "--scale",
        type=float,
        default=1.25,
        help="Coordinate scale factor from QET units to Draw.io pixels (default: 1.25).",
    )
    parser.add_argument(
        "--theme",
        choices=["iec"],
        default="iec",
        help="Color theme preset (default: iec).",
    )
    parser.add_argument(
        "--export-library",
        help="Optional output path to export embedded .elmt symbols as a Draw.io mxlibrary XML file.",
    )

    args = parser.parse_args(argv)
    if not os.path.isfile(args.input):
        print(f"[ERROR] Input file not found: {args.input}", file=sys.stderr)
        return 1

    output_path = args.output or (os.path.splitext(args.input)[0] + ".drawio")

    try:
        print(f"[INFO] Parsing QElectroTech XML: '{args.input}'...")
        project_ir = parse_qet_file(args.input)
        total_elems = sum(len(f.elements) for f in project_ir.folios)
        total_wires = sum(len(f.conductors) for f in project_ir.folios)
        print(
            f"[INFO] Loaded '{project_ir.title}': {len(project_ir.folios)} folio(s), "
            f"{len(project_ir.definitions)} symbol def(s), {total_elems} element(s), {total_wires} conductor(s)."
        )

        written_path = emit_qet_drawio(
            project_ir,
            output_path,
            mode=args.mode,
            scale=args.scale,
            theme_name=args.theme,
        )
        print(f"[SUCCESS] Wrote Draw.io schematic: {written_path}")

        if args.export_library:
            lib_path = export_mxlibrary(project_ir, args.export_library)
            print(f"[SUCCESS] Exported mxlibrary ({len(project_ir.definitions)} shapes): {lib_path}")

        return 0
    except Exception as exc:
        print(f"[ERROR] Compilation failed: {exc}", file=sys.stderr)
        return 1
