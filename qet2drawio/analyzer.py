"""Analyzer for Approach 3: aggregates conductors into BusBundles and connected Nets."""

from collections import Counter, defaultdict
from typing import Dict, List, Set, Tuple

from .ir import BusBundleIR, ConductorLinkIR, DiagramIR, NetGroupIR, ProjectIR


def _format_bundle_label(wires: List[ConductorLinkIR]) -> str:
    count = len(wires)
    nums = [w.num for w in wires if w.num]
    unique_nums = list(dict.fromkeys(nums))

    if count == 1:
        w = wires[0]
        pin_txt = f"T{w.terminal1} ↔ T{w.terminal2}"
        if unique_nums:
            return f"{unique_nums[0]} [{pin_txt}]"
        return pin_txt

    preview_pairs = [f"T{w.terminal1}↔T{w.terminal2}" for w in wires[:3]]
    suffix = ", ..." if count > 3 else ""
    pin_summary = ", ".join(preview_pairs) + suffix
    if unique_nums:
        net_preview = ", ".join(unique_nums[:3]) + (", ..." if len(unique_nums) > 3 else "")
        return f"{count} wires ({net_preview})\n[{pin_summary}]"
    return f"{count} wires\n[{pin_summary}]"


def _pick_bundle_color(wires: List[ConductorLinkIR]) -> str:
    colors = [w.color for w in wires if w.color and w.color.lower() not in ("#000000", "black", "none")]
    if colors:
        return Counter(colors).most_common(1)[0][0]
    return "#334155"


def _build_nets(diagram: DiagramIR, term_to_elem: Dict[str, str]) -> List[NetGroupIR]:
    adj: Dict[str, Set[str]] = defaultdict(set)
    edge_meta: Dict[Tuple[str, str], ConductorLinkIR] = {}

    for c in diagram.conductors:
        adj[c.terminal1].add(c.terminal2)
        adj[c.terminal2].add(c.terminal1)
        edge_meta[(c.terminal1, c.terminal2)] = c
        edge_meta[(c.terminal2, c.terminal1)] = c

    visited: Set[str] = set()
    nets: List[NetGroupIR] = []
    net_idx = 1

    for start_t in sorted(adj.keys()):
        if start_t in visited:
            continue
        stack = [start_t]
        comp_terms: List[str] = []
        comp_elems: Set[str] = set()
        comp_nums: List[str] = []
        comp_colors: List[str] = []

        while stack:
            cur = stack.pop()
            if cur in visited:
                continue
            visited.add(cur)
            comp_terms.append(cur)
            if cur in term_to_elem:
                comp_elems.add(term_to_elem[cur])
            for nxt in adj[cur]:
                link = edge_meta.get((cur, nxt))
                if link:
                    if link.num:
                        comp_nums.append(link.num)
                    if link.color:
                        comp_colors.append(link.color)
                if nxt not in visited:
                    stack.append(nxt)

        label = Counter(comp_nums).most_common(1)[0][0] if comp_nums else f"NET-{net_idx}"
        color = Counter(comp_colors).most_common(1)[0][0] if comp_colors else "#334155"
        nets.append(
            NetGroupIR(
                net_id=net_idx,
                label=label,
                color=color,
                terminal_ids=sorted(comp_terms),
                element_uuids=sorted(comp_elems),
            )
        )
        net_idx += 1

    return nets


def analyze_project(project: ProjectIR) -> ProjectIR:
    """Populate bus_bundles and nets on every DiagramIR in the project."""
    for diag in project.diagrams:
        elem_map = {e.uuid: e for e in diag.elements}
        term_to_elem: Dict[str, str] = {}
        for e in diag.elements:
            for t in e.terminals:
                term_to_elem[t.term_id] = e.uuid

        pair_groups: Dict[Tuple[str, str], List[ConductorLinkIR]] = defaultdict(list)
        for c in diag.conductors:
            if c.src_elem_uuid == c.dst_elem_uuid:
                continue
            pair = tuple(sorted((c.src_elem_uuid, c.dst_elem_uuid)))
            pair_groups[(pair[0], pair[1])].append(c)

        bundles: List[BusBundleIR] = []
        for (u_a, u_b), wires in pair_groups.items():
            src_el = elem_map.get(u_a)
            dst_el = elem_map.get(u_b)
            # Order so higher-pin-count hub is src when possible
            if src_el and dst_el and len(dst_el.terminals) > len(src_el.terminals):
                u_a, u_b = u_b, u_a
                src_el, dst_el = dst_el, src_el

            src_lbl = src_el.label if src_el else u_a[:8]
            dst_lbl = dst_el.label if dst_el else u_b[:8]
            bundles.append(
                BusBundleIR(
                    src_elem_uuid=u_a,
                    dst_elem_uuid=u_b,
                    src_label=src_lbl,
                    dst_label=dst_lbl,
                    wires=wires,
                    primary_color=_pick_bundle_color(wires),
                    bundle_label=_format_bundle_label(wires),
                )
            )

        bundles.sort(key=lambda b: (-len(b.wires), b.src_label, b.dst_label))
        diag.bus_bundles = bundles
        diag.nets = _build_nets(diag, term_to_elem)

    return project
