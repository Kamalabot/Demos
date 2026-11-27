"""Animate `stack2col.svg` in DearCyGui: inner boxes move IN toward center, then OUT.

Run from the workspace root:
    .venv\Scripts\python.exe drawio_demo\animate_stack2col_dcg.py
"""

from dataclasses import dataclass
import os
import sys
import time
from typing import Generator, List, Tuple

import dearcygui as dcg
import svgelements as se


@dataclass
class AnimatedBox:
    """Tracks an inner SVG rectangle's rest bounds, inward target, and DearCyGui item."""

    rest_pmin: Tuple[float, float]
    rest_pmax: Tuple[float, float]
    in_pmin: Tuple[float, float]
    in_pmax: Tuple[float, float]
    dcg_rect: dcg.DrawRect


def _smoothstep(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def _lerp_pt(
    a: Tuple[float, float], b: Tuple[float, float], alpha: float
) -> Tuple[float, float]:
    return (a[0] + (b[0] - a[0]) * alpha, a[1] + (b[1] - a[1]) * alpha)


def _animation_timeline() -> Generator[Tuple[str, float], float, None]:
    """Generator coroutine driving deterministic 4-phase IN/OUT playback.

    Yields `(phase_name, blend_alpha)` where `blend_alpha` is:
      0.0 -> boxes at their original SVG rest positions (OUT)
      1.0 -> boxes collapsed inward toward the big box center (IN)
    Receives `dt` (seconds) each frame via `.send(dt)`.
    """
    phases = [
        ("HOLD_OUT", 0.5, 0.0, 0.0),
        ("MOVE_IN", 1.1, 0.0, 1.0),
        ("HOLD_IN", 0.4, 1.0, 1.0),
        ("MOVE_OUT", 1.1, 1.0, 0.0),
    ]
    while True:
        for name, duration, a0, a1 in phases:
            elapsed = 0.0
            print(f"[ANIM] Entering phase: {name} ({duration:.1f}s)")
            while elapsed < duration:
                dt = yield (name, a0 + (a1 - a0) * _smoothstep(elapsed / duration))
                elapsed += dt


def _load_svg_boxes(
    svg_path: str,
) -> Tuple[Tuple[float, float], Tuple[float, float, float, float], List[Tuple[float, float, float, float]]]:
    """Parse `stack2col.svg` and return `(svg_size, outer_bbox, inner_bboxes)`."""
    svg = se.SVG.parse(svg_path)
    outer_bbox = None
    inner_bboxes: List[Tuple[float, float, float, float]] = []

    for el in svg.elements():
        if not isinstance(el, se.Rect):
            continue
        bbox = el.bbox()
        if bbox is None:
            continue
        has_fill = el.fill is not None and getattr(el.fill, "value", None) is not None
        has_stroke = el.stroke is not None and getattr(el.stroke, "value", None) is not None
        if has_stroke and not has_fill and outer_bbox is None:
            outer_bbox = bbox
        elif has_fill:
            inner_bboxes.append(bbox)

    if outer_bbox is None or not inner_bboxes:
        raise ValueError("Could not find outer container and inner filled boxes in SVG.")

    return (float(svg.width), float(svg.height)), outer_bbox, inner_bboxes


def main() -> int:
    svg_path = os.path.join(os.path.dirname(__file__), "stack2col.svg")
    if not os.path.isfile(svg_path):
        print(f"[ERROR] SVG file not found: {svg_path}", file=sys.stderr)
        return 1

    try:
        (svg_w, svg_h), outer_bbox, inner_bboxes = _load_svg_boxes(svg_path)
        print(
            f"[INFO] Loaded '{svg_path}' ({svg_w}x{svg_h}): "
            f"1 outer box, {len(inner_bboxes)} inner boxes."
        )
    except Exception as exc:
        print(f"[ERROR] Failed to load SVG: {exc}", file=sys.stderr)
        return 1

    # Scale SVG (141x388) cleanly into a 720x680 DearCyGui viewport
    win_w, win_h = 720, 680
    scale = 1.45
    offset_x = (win_w - svg_w * scale) * 0.5
    offset_y = (win_h - svg_h * scale) * 0.5 - 10.0

    def to_screen(x: float, y: float) -> Tuple[float, float]:
        return (offset_x + x * scale, offset_y + y * scale)

    C = dcg.Context()
    C.viewport.initialize(title="stack2col.svg — DearCyGui In/Out Animation", width=win_w, height=win_h)
    # Render every frame continuously without waiting for mouse/keyboard events
    C.viewport.wait_for_input = False

    with dcg.Window(
        C,
        label="SVG Canvas",
        no_title_bar=True,
        no_resize=True,
        no_move=True,
        width=win_w,
        height=win_h,
    ):
        with dcg.DrawInWindow(C, width=win_w - 20, height=win_h - 20):
            # Light background card
            dcg.DrawRect(
                C,
                pmin=(0, 0),
                pmax=(win_w, win_h),
                fill=(245, 247, 250, 255),
                color=(245, 247, 250, 255),
            )

            # Big outer box from SVG
            ox0, oy0, ox1, oy1 = outer_bbox
            outer_pmin = to_screen(ox0, oy0)
            outer_pmax = to_screen(ox1, oy1)
            dcg.DrawRect(
                C,
                pmin=outer_pmin,
                pmax=outer_pmax,
                color=(20, 30, 45, 255),
                fill=(255, 255, 255, 255),
                thickness=2.5,
            )

            # Center of the big outer box (target for "move in")
            cx = (outer_pmin[0] + outer_pmax[0]) * 0.5
            cy = (outer_pmin[1] + outer_pmax[1]) * 0.5

            animated_boxes: List[AnimatedBox] = []
            for ix0, iy0, ix1, iy1 in inner_bboxes:
                pmin = to_screen(ix0, iy0)
                pmax = to_screen(ix1, iy1)
                # Pull each box 65% of the way toward the big box center
                pull = 0.65
                in_pmin = _lerp_pt(pmin, (cx - (pmax[0] - pmin[0]) * 0.5, cy - (pmax[1] - pmin[1]) * 0.5), pull)
                in_pmax = _lerp_pt(pmax, (cx + (pmax[0] - pmin[0]) * 0.5, cy + (pmax[1] - pmin[1]) * 0.5), pull)

                rect_item = dcg.DrawRect(
                    C,
                    pmin=pmin,
                    pmax=pmax,
                    color=(15, 23, 42, 255),
                    fill=(30, 64, 175, 230),
                    thickness=1.5,
                )
                animated_boxes.append(
                    AnimatedBox(
                        rest_pmin=pmin,
                        rest_pmax=pmax,
                        in_pmin=in_pmin,
                        in_pmax=in_pmax,
                        dcg_rect=rect_item,
                    )
                )

    timeline = _animation_timeline()
    next(timeline)  # Prime generator

    last_t = time.perf_counter()
    print("[INFO] Starting DearCyGui render loop (close window to exit)...")
    try:
        while C.running:
            now = time.perf_counter()
            dt = min(0.05, now - last_t)  # Clamp dt for deterministic playback
            last_t = now

            _phase, alpha = timeline.send(dt)
            for box in animated_boxes:
                box.dcg_rect.pmin = _lerp_pt(box.rest_pmin, box.in_pmin, alpha)
                box.dcg_rect.pmax = _lerp_pt(box.rest_pmax, box.in_pmax, alpha)

            C.viewport.render_frame()
    except KeyboardInterrupt:
        print("[INFO] Interrupted by user.")
    finally:
        C.viewport.delete_item()
        print("[SUCCESS] DearCyGui animation exited cleanly.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
