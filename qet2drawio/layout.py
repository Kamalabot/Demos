"""Deterministic category-grouped layout solver for Approach 3."""

from collections import defaultdict
from typing import Dict, List

from .ir import DiagramIR, ElementObjIR, ProjectIR


def compute_diagram_layout(diagram: DiagramIR) -> None:
    """Assign clean, non-overlapping (layout_x, layout_y, layout_w, layout_h) per element.

    Elements are grouped into vertical category columns sorted by connectivity/pin count
    so hub components (e.g., microcontrollers, LCDs, op-amps) stand out clearly.
    """
    if not diagram.elements:
        return

    # Compute bus degree per element
    degree: Dict[str, int] = defaultdict(int)
    for b in diagram.bus_bundles:
        degree[b.src_elem_uuid] += len(b.wires)
        degree[b.dst_elem_uuid] += len(b.wires)

    by_cat: Dict[str, List[ElementObjIR]] = defaultdict(list)
    for el in diagram.elements:
        by_cat[el.category].append(el)

    # Sort categories so highest-degree / largest-pin categories appear first (left-to-right)
    sorted_cats = sorted(
        by_cat.keys(),
        key=lambda c: (-max(degree.get(e.uuid, 0) for e in by_cat[c]), -len(by_cat[c]), c),
    )

    start_x = 40.0
    start_y = 140.0
    col_gap = 320.0
    row_gap = 40.0
    card_w = 230.0
    max_rows_per_col = 7

    col_idx = 0
    for cat in sorted_cats:
        elems = sorted(
            by_cat[cat],
            key=lambda e: (-degree.get(e.uuid, 0), -len(e.terminals), e.label),
        )
        # Split large categories into sub-columns of at most max_rows_per_col
        for chunk_start in range(0, len(elems), max_rows_per_col):
            chunk = elems[chunk_start : chunk_start + max_rows_per_col]
            cur_y = start_y
            cur_x = start_x + col_idx * col_gap
            for el in chunk:
                # Taller cards for multi-pin hubs
                extra_h = min(50.0, max(0, len(el.terminals) - 2) * 4.0)
                el.layout_w = card_w
                el.layout_h = 96.0 + extra_h
                el.layout_x = cur_x
                el.layout_y = cur_y
                cur_y += el.layout_h + row_gap
            col_idx += 1


def compute_project_layout(project: ProjectIR) -> ProjectIR:
    for diag in project.diagrams:
        compute_diagram_layout(diag)
    return project
