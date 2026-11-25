"""Coordinate transformation, hotspot normalization, and Draw.io port constraint solver."""

from typing import Dict, List, Optional, Tuple

from .ir import ElementDefIR, ElementInstIR, TerminalIR


def normalize_bounds(inst: ElementInstIR, def_ir: Optional[ElementDefIR], scale: float = 1.0) -> Tuple[float, float, float, float]:
    """Convert QET hotspot-centered (x, y) into Draw.io top-left (x, y, w, h)."""
    if def_ir is not None:
        w = max(24.0, def_ir.width)
        h = max(24.0, def_ir.height)
        hx = def_ir.hotspot_x
        hy = def_ir.hotspot_y
    else:
        w = 80.0
        h = 50.0
        hx = 40.0
        hy = 25.0

    # Swap dimensions for 90 or 270 deg rotation
    if inst.orientation in (1, 3):
        w, h = h, w
        hx, hy = hy, hx

    top_x = (inst.x - hx) * scale
    top_y = (inst.y - hy) * scale
    return top_x, top_y, w * scale, h * scale


def rotate_offset(rx: float, ry: float, orientation: int) -> Tuple[float, float]:
    """Rotate a relative terminal offset around the element hotspot by orientation * 90 deg."""
    ori = orientation % 4
    if ori == 1:
        return -ry, rx
    if ori == 2:
        return -rx, -ry
    if ori == 3:
        return ry, -rx
    return rx, ry


def terminal_port_ratio(
    term: TerminalIR,
    inst: ElementInstIR,
    def_ir: Optional[ElementDefIR],
) -> Tuple[float, float]:
    """Compute normalized [0..1] Draw.io anchor ratio (rx, ry) for a terminal pin."""
    if def_ir is None or def_ir.width <= 0 or def_ir.height <= 0:
        return 0.5, 0.5

    w = def_ir.width
    h = def_ir.height
    hx = def_ir.hotspot_x
    hy = def_ir.hotspot_y

    tx, ty = rotate_offset(term.rel_x, term.rel_y, inst.orientation)
    if inst.orientation in (1, 3):
        w, h = h, w
        hx, hy = hy, hx

    rx = max(0.0, min(1.0, (tx + hx) / max(1.0, w)))
    ry = max(0.0, min(1.0, (ty + hy) / max(1.0, h)))
    return round(rx, 4), round(ry, 4)


def build_points_style(inst: ElementInstIR, def_ir: Optional[ElementDefIR]) -> str:
    """Build Draw.io `points=[[rx,ry,0,0,0,0],...]` connection constraint string."""
    if not inst.terminals or def_ir is None:
        return ""
    pts: List[str] = []
    for t in inst.terminals:
        rx, ry = terminal_port_ratio(t, inst, def_ir)
        pts.append(f"[{rx},{ry},0,0,0,0]")
    return f"points=[{','.join(pts)}];"
