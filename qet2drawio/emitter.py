"""Multi-page Draw.io emitter for Approach 3 (Functional Block & Aggregated Bus Architecture)."""

import json
import os
from collections import Counter, defaultdict
from typing import Dict, List

import drawpyo
from jinja2 import Environment, FileSystemLoader

from .ir import ProjectIR

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")


def _load_theme(theme_name: str) -> Dict:
    theme_path = os.path.join(TEMPLATES_DIR, f"theme_{theme_name}.json")
    if not os.path.isfile(theme_path):
        raise FileNotFoundError(f"Theme '{theme_name}' not found at {theme_path}")
    with open(theme_path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _sanitize_page_name(title: str, idx: int) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in (" ", "-", "_") else "_" for ch in title).strip()
    return f"{idx}_{cleaned}" if cleaned else f"Folio-{idx}"


def emit_qet_drawio(
    project: ProjectIR,
    output_path: str,
    theme_name: str = "qet",
    show_pins: bool = True,
) -> str:
    """Compile an analyzed & laid-out ProjectIR into a multi-page .drawio file."""
    theme = _load_theme(theme_name)
    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)
    tpl = env.get_template("block_card.j2").module

    abs_out = os.path.abspath(output_path)
    out_dir = os.path.dirname(abs_out)
    out_file = os.path.basename(abs_out)
    os.makedirs(out_dir, exist_ok=True)

    dfile = drawpyo.File()
    dfile.file_path = out_dir
    dfile.file_name = out_file

    # ------------------------------------------------------------------
    # Page 1: Project Overview
    # ------------------------------------------------------------------
    overview_page = drawpyo.Page(file=dfile)
    overview_page.name = "0_Project_Overview"

    total_elems = sum(len(d.elements) for d in project.diagrams)
    total_conds = sum(len(d.conductors) for d in project.diagrams)
    total_buses = sum(len(d.bus_bundles) for d in project.diagrams)
    total_annots = sum(len(d.annotations) for d in project.diagrams)

    banner = drawpyo.diagram.Object(
        page=overview_page,
        value=str(tpl.project_banner(project, total_elems, total_conds, total_buses, total_annots)),
    )
    banner.position = (40, 30)
    banner.width = 760
    banner.height = 120
    banner.apply_style_string(theme["overview_banner"])

    # Folio summary cards
    folio_objs: List[drawpyo.diagram.Object] = []
    cur_y = 180.0
    for diag in project.diagrams:
        cat_counts = dict(Counter(e.category for e in diag.elements))
        f_card = drawpyo.diagram.Object(
            page=overview_page,
            value=str(tpl.folio_summary(diag, cat_counts)),
        )
        f_card.position = (40, cur_y)
        f_card.width = 360
        f_card.height = 125
        f_card.apply_style_string(theme["folio_card"])
        folio_objs.append(f_card)
        cur_y += 145.0

    # Collection summary card
    cat_defs: Dict[str, List[str]] = defaultdict(list)
    for cdef in project.collection.values():
        cat_defs[cdef.category].append(cdef.name)
    coll_card = drawpyo.diagram.Object(
        page=overview_page,
        value=str(tpl.collection_summary(dict(cat_defs))),
    )
    coll_card.position = (440, 180)
    coll_card.width = 360
    coll_card.height = max(140.0, 55.0 + len(cat_defs) * 24.0)
    coll_card.apply_style_string(theme["collection_card"])

    for f_obj in folio_objs:
        link = drawpyo.diagram.Edge(page=overview_page, source=banner, target=f_obj)
        link.apply_style_string("edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#64748B;endArrow=classic;")

    # ------------------------------------------------------------------
    # Pages 2..N: Per-Diagram Functional Block & Aggregated Bus Views
    # ------------------------------------------------------------------
    categories = theme["categories"]

    for diag in project.diagrams:
        page = drawpyo.Page(file=dfile)
        page.name = _sanitize_page_name(diag.title, diag.order)

        # Header bar
        max_x = max((e.layout_x + e.layout_w for e in diag.elements), default=600.0)
        hdr = drawpyo.diagram.Object(page=page, value=str(tpl.diagram_header(diag)))
        hdr.position = (40, 30)
        hdr.width = max(720.0, max_x - 40.0)
        hdr.height = 56
        hdr.apply_style_string(theme["page_header"])

        obj_map: Dict[str, drawpyo.diagram.Object] = {}
        for el in diag.elements:
            cat_style = categories.get(el.category.lower(), categories["default"])
            style_str = (
                f"rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=8;"
                f"fillColor={cat_style['fillColor']};"
                f"strokeColor={cat_style['strokeColor']};"
                f"fontColor={cat_style['fontColor']};"
                f"strokeWidth=1.6;"
            )
            card_html = str(tpl.element_card(el, cat_style["badgeBg"], show_pins))
            blk = drawpyo.diagram.Object(page=page, value=card_html)
            blk.position = (el.layout_x, el.layout_y)
            blk.width = el.layout_w
            blk.height = el.layout_h
            blk.apply_style_string(style_str)
            obj_map[el.uuid] = blk

        # Aggregated Bus Edges
        for bus in diag.bus_bundles:
            src_obj = obj_map.get(bus.src_elem_uuid)
            dst_obj = obj_map.get(bus.dst_elem_uuid)
            if src_obj is None or dst_obj is None:
                continue

            stroke_w = min(4.5, 1.4 + 0.35 * (len(bus.wires) - 1))
            edge = drawpyo.diagram.Edge(page=page, source=src_obj, target=dst_obj, label=bus.bundle_label)
            edge.apply_style_string(
                f"edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;"
                f"strokeColor={bus.primary_color};strokeWidth={stroke_w:.1f};"
                f"endArrow=none;startArrow=none;fontSize=10;"
                f"labelBackgroundColor=#FFFFFF;fontColor=#0F172A;"
            )

        # Annotations Panel (if any 0-pin elements exist)
        if diag.annotations:
            annot_x = max_x + 60.0
            annot_h = min(520.0, 65.0 + min(len(diag.annotations), 15) * 20.0)
            annot_box = drawpyo.diagram.Object(
                page=page,
                value=str(tpl.annotations_panel(diag.annotations)),
            )
            annot_box.position = (annot_x, 140)
            annot_box.width = 270
            annot_box.height = annot_h
            annot_box.apply_style_string(theme["annotations_box"])

    dfile.write()
    return abs_out
