"""Exhaustively commented review of `stack2col.svg` using the `svgelements` library.

Run from the workspace root:
    .venv\Scripts\python.exe drawio_demo\review_stack2col_svgelements.py
"""

from collections import Counter
import os
import sys
import svgelements as se


def describe_color(color_obj) -> str:
    """Convert an svgelements Color (or None) into a human-readable string.

    Nuance:
    - In `svgelements`, `fill` and `stroke` are `svgelements.Color` instances,
      NOT plain strings.
    - When an SVG attribute is `fill="none"` (or omitted on a group), `svgelements`
      represents it as `None` (or `Color(None)` where `color.value is None`).
    - Checking `if color_obj is None or color_obj.value is None:` is the safest
      way to detect "no fill" or "no stroke".
    """
    if color_obj is None or getattr(color_obj, "value", None) is None:
        return "none"
    return f"{color_obj.hex} (alpha={color_obj.alpha})"


def review_svg(svg_path: str) -> int:
    """Parse and inspect an SVG file, highlighting `svgelements` nuances."""
    if not os.path.isfile(svg_path):
        print(f"[ERROR] SVG file not found: {svg_path}", file=sys.stderr)
        return 1

    print(f"[INFO] Parsing SVG: {svg_path}")
    try:
        # `SVG.parse()` reads the XML, resolves CSS/inline styles, builds
        # transformation matrices, and converts `<rect>`, `<path>`, `<circle>`,
        # `<g>`, etc. into typed Python objects.
        svg = se.SVG.parse(svg_path)
    except Exception as exc:
        print(f"[ERROR] Failed to parse SVG: {exc}", file=sys.stderr)
        return 1

    # ------------------------------------------------------------------
    # 1. Document-level metadata: width, height, viewBox
    # ------------------------------------------------------------------
    # Nuance: `svg.width` and `svg.height` are floats (in user units/px),
    # while `svg.viewbox` is a `Viewbox` object (x, y, width, height).
    print("\n=== 1. SVG Document Metadata ===")
    print(f"  ID        : {svg.id}")
    print(f"  Size      : {svg.width} x {svg.height}")
    print(f"  ViewBox   : {svg.viewbox}")

    # ------------------------------------------------------------------
    # 2. Traversing `svg.elements()` — Shapes vs. Groups vs. SVGElement
    # ------------------------------------------------------------------
    # Nuance: `svg.elements()` yields EVERY node in the SVG tree depth-first:
    #   - `se.SVG` (root)
    #   - `se.Group` (`<g>`) — has `.bbox()`, no geometry of its own
    #   - `se.Shape` subclasses (`se.Rect`, `se.Path`, `se.Circle`, etc.) —
    #     have `.bbox()`, `.fill`, `.stroke`, `.stroke_width`, `.transform`
    #   - `se.SVGElement` (e.g. `<defs>`, `<style>`, `<switch>`, `<foreignObject>`)
    #     — does NOT have `.bbox()`! Always guard with `hasattr(el, "bbox")`
    #     or `isinstance(el, se.Shape)`.
    type_counts = Counter()
    shapes = []
    for el in svg.elements():
        type_counts[type(el).__name__] += 1
        if isinstance(el, se.Shape):
            shapes.append(el)

    print("\n=== 2. Element Type Breakdown ===")
    for tname, count in sorted(type_counts.items()):
        print(f"  {tname:<15}: {count}")

    # ------------------------------------------------------------------
    # 3. Inspecting `se.Shape` objects (`Rect`, etc.) and `bbox()`
    # ------------------------------------------------------------------
    # Nuance: `shape.bbox()` returns `(xmin, ymin, xmax, ymax)` in the SVG's
    # root coordinate space (already applying any parent `<g transform="...">`).
    # By contrast, `shape.x`, `shape.y`, `shape.width`, `shape.height` on a
    # `Rect` are its local attributes before transforms—though `reify()` can
    # bake transforms in. Using `bbox()` is the most reliable way to get
    # final screen-space bounds.
    print(f"\n=== 3. Extracted Shapes ({len(shapes)} total) ===")
    outer_boxes = []
    inner_boxes = []
    invisible_rects = []

    for idx, shp in enumerate(shapes):
        bbox = shp.bbox()  # (xmin, ymin, xmax, ymax) or None if empty
        if bbox is None:
            print(f"  [{idx}] {type(shp).__name__}: empty bbox, skipping")
            continue

        xmin, ymin, xmax, ymax = bbox
        w = xmax - xmin
        h = ymax - ymin
        fill_str = describe_color(shp.fill)
        stroke_str = describe_color(shp.stroke)

        print(
            f"  [{idx:02d}] {type(shp).__name__:<6} "
            f"pos=({xmin:5.1f}, {ymin:5.1f}) size=({w:5.1f} x {h:5.1f}) "
            f"fill={fill_str:<22} stroke={stroke_str}"
        )

        # Classify the rectangles in `stack2col.svg`:
        # - Outer container ("big box"): stroked, no fill
        # - Inner boxes: filled (black), 50x50
        # - Invisible layout rect: neither fill nor stroke
        has_fill = shp.fill is not None and getattr(shp.fill, "value", None) is not None
        has_stroke = shp.stroke is not None and getattr(shp.stroke, "value", None) is not None

        if has_stroke and not has_fill:
            outer_boxes.append((shp, bbox))
        elif has_fill:
            inner_boxes.append((shp, bbox))
        else:
            invisible_rects.append((shp, bbox))

    print("\n=== 4. Structural Classification Summary ===")
    print(f"  Outer container boxes : {len(outer_boxes)}")
    print(f"  Inner filled boxes    : {len(inner_boxes)}")
    print(f"  Invisible/layout rects: {len(invisible_rects)}")
    print("[SUCCESS] SVG review complete.")
    return 0


if __name__ == "__main__":
    default_svg = os.path.join(os.path.dirname(__file__), "stack2col.svg")
    target = sys.argv[1] if len(sys.argv) > 1 else default_svg
    sys.exit(review_svg(target))
