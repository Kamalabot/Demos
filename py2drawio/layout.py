"""Deterministic swimlane & CFG coordinate solver for py2drawio."""

from collections import deque
from typing import Dict, List, Set, Tuple

from .ir import FunctionIR, ModuleIR, NodeKind


def _compute_node_dimensions(fn: FunctionIR) -> None:
    """Assign deterministic width and height to each node based on text lines."""
    for node in fn.nodes:
        lines = [ln for ln in node.code_snippet.splitlines() if ln.strip()]
        line_count = len(lines)
        if node.kind == NodeKind.DECISION:
            node.width = 200.0
            node.height = 58.0
        elif node.kind in (NodeKind.START, NodeKind.END):
            node.width = 210.0
            node.height = 40.0
        elif node.kind == NodeKind.RETURN:
            node.width = 160.0
            node.height = 40.0
        elif node.kind == NodeKind.LOOP_FOR:
            node.width = 300.0
            node.height = 48.0
        else:
            node.width = 310.0 if fn.is_entrypoint else 270.0
            node.height = max(44.0, 26.0 + line_count * 15.0)


def _layout_function_cfg(fn: FunctionIR, panel_x: float, panel_y: float, min_width: float) -> None:
    """Arrange CFG nodes top-down inside a bounded swimlane panel."""
    _compute_node_dimensions(fn)
    if not fn.nodes:
        fn.panel_bounds = (panel_x, panel_y, min_width, 160.0)
        return

    node_map = {n.node_id: n for n in fn.nodes}
    adj: Dict[str, List[Tuple[str, str]]] = {n.node_id: [] for n in fn.nodes}
    for edge in fn.edges:
        if edge.edge_type != "loopback":
            adj[edge.source_id].append((edge.target_id, edge.edge_type))

    # BFS level assignment (longest-path style acyclic layering)
    levels: Dict[str, int] = {fn.nodes[0].node_id: 0}
    queue = deque([fn.nodes[0].node_id])
    visited_edges: Set[Tuple[str, str]] = set()

    while queue:
        curr = queue.popleft()
        curr_lvl = levels[curr]
        for nxt, _ in adj.get(curr, []):
            if (curr, nxt) in visited_edges:
                continue
            visited_edges.add((curr, nxt))
            if nxt not in levels or levels[nxt] < curr_lvl + 1:
                levels[nxt] = curr_lvl + 1
                queue.append(nxt)

    # Ensure any unreachable nodes still get a valid level
    max_lvl = max(levels.values(), default=0)
    for n in fn.nodes:
        if n.node_id not in levels:
            max_lvl += 1
            levels[n.node_id] = max_lvl

    # Group nodes by level
    by_level: Dict[int, List[str]] = {}
    for nid, lvl in levels.items():
        by_level.setdefault(lvl, []).append(nid)

    # Calculate row heights and total width needed
    gap_y = 26.0
    gap_x = 24.0
    header_offset = 45.0
    pad_x = 28.0

    max_row_w = min_width - 2 * pad_x
    for lvl_nodes in by_level.values():
        row_w = sum(node_map[nid].width for nid in lvl_nodes) + gap_x * max(0, len(lvl_nodes) - 1)
        max_row_w = max(max_row_w, row_w)

    panel_w = max(min_width, max_row_w + 2 * pad_x)
    center_x = panel_x + panel_w * 0.5

    curr_y = panel_y + header_offset
    for lvl in sorted(by_level.keys()):
        lvl_nodes = by_level[lvl]
        row_w = sum(node_map[nid].width for nid in lvl_nodes) + gap_x * max(0, len(lvl_nodes) - 1)
        start_x = center_x - row_w * 0.5
        row_max_h = max(node_map[nid].height for nid in lvl_nodes)

        curr_x = start_x
        for nid in lvl_nodes:
            node = node_map[nid]
            node.x = curr_x
            node.y = curr_y + (row_max_h - node.height) * 0.5
            curr_x += node.width + gap_x

        curr_y += row_max_h + gap_y

    panel_h = (curr_y - panel_y) + 12.0
    fn.panel_bounds = (panel_x, panel_y, panel_w, panel_h)


def compute_module_layout(module_ir: ModuleIR) -> ModuleIR:
    """Compute deterministic coordinates for all swimlanes, subroutines, and trace panels."""
    header_h = 55.0
    top_y = 20.0 + header_h + 20.0  # 95.0
    margin_x = 40.0
    gap_panel = 24.0

    entry_funcs = [f for f in module_ir.functions if f.is_entrypoint]
    sub_funcs = [f for f in module_ir.functions if not f.is_entrypoint]

    right_col_x = margin_x
    max_bottom = top_y + 300.0

    # 1. Left Swimlane: Entrypoint
    if entry_funcs:
        entry = entry_funcs[0]
        _layout_function_cfg(entry, margin_x, top_y, min_width=460.0)
        ex, ey, ew, eh = entry.panel_bounds
        right_col_x = ex + ew + gap_panel
        max_bottom = max(max_bottom, ey + eh)

    # 2. Top-Right Grid: Subroutines (2 columns)
    sub_x = right_col_x
    sub_y = top_y
    col_idx = 0
    row_max_h = 0.0
    max_right = right_col_x + 420.0

    for sub in sub_funcs:
        _layout_function_cfg(sub, sub_x, sub_y, min_width=400.0)
        sx, sy, sw, sh = sub.panel_bounds
        max_right = max(max_right, sx + sw)
        row_max_h = max(row_max_h, sh)
        col_idx += 1

        if col_idx >= 2:
            col_idx = 0
            sub_x = right_col_x
            sub_y += row_max_h + gap_panel
            max_bottom = max(max_bottom, sub_y)
            row_max_h = 0.0
        else:
            sub_x = sx + sw + gap_panel

    sub_bottom = sub_y + row_max_h if col_idx > 0 else sub_y
    max_bottom = max(max_bottom, sub_bottom)

    # 3. Bottom-Right Panel: Runtime Trace (if enabled)
    if module_ir.trace is not None:
        trace_y = sub_bottom + (gap_panel if sub_funcs else 0.0)
        trace_w = max(820.0, max_right - right_col_x)
        trace_h = 370.0
        module_ir.trace.panel_bounds = (right_col_x, trace_y, trace_w, trace_h)
        max_right = max(max_right, right_col_x + trace_w)
        max_bottom = max(max_bottom, trace_y + trace_h)

    module_ir.page_width = max(1360.0, max_right + margin_x)
    module_ir.page_height = max(800.0, max_bottom + 30.0)
    return module_ir
