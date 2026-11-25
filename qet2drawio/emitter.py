"""Multi-page Draw.io emitter for QElectroTech schematics powered by drawpyo."""

import json
import os
from typing import Dict

import drawpyo
from jinja2 import Environment, FileSystemLoader

from .geometry import build_points_style, normalize_bounds, terminal_port_ratio
from .ir import QETProjectIR

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")


def _load_theme(theme_name: str) -> Dict:
    theme_path = os.path.join(TEMPLATES_DIR, f"theme_{theme_name}.json")
    if not os.path.isfile(theme_path):
        raise FileNotFoundError(f"Theme '{theme_name}' not found at {theme_path}")
    with open(theme_path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _sanitize_page_name(title: str, idx: int) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in (" ", "-", "_") else "_" for ch in title).strip()
    return cleaned or f"Folio-{idx}"


def emit_qet_drawio(
    project_ir: QETProjectIR,
    output_path: str,
    mode: str = "block",
    scale: float = 1.25,
    theme_name: str = "iec",
) -> str:
    """Compile a QETProjectIR into a multi-page .drawio file."""
    theme = _load_theme(theme_name)
    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)
    tpl_module = env.get_template("block_card.j2").module

    abs_out = os.path.abspath(output_path)
    out_dir = os.path.dirname(abs_out)
    out_file = os.path.basename(abs_out)
    os.makedirs(out_dir, exist_ok=True)

    dfile = drawpyo.File()
    dfile.file_path = out_dir
    dfile.file_name = out_file

    categories = theme["categories"]

    for f_idx, folio in enumerate(project_ir.folios, start=1):
        page = drawpyo.Page(file=dfile)
        page.name = _sanitize_page_name(folio.title, f_idx)

        obj_map: Dict[str, drawpyo.diagram.Object] = {}
        inst_map = {el.uuid: el for el in folio.elements}

        # 1. Instantiate Elements
        for inst in folio.elements:
            def_ir = project_ir.definitions.get(inst.def_path)
            if inst.is_text_only:
                lbl_obj = drawpyo.diagram.Object(page=page, value=inst.label)
                lbl_obj.position = (inst.x * scale, inst.y * scale)
                lbl_obj.width = max(60.0, len(inst.label) * 7.0)
                lbl_obj.height = 28.0
                lbl_obj.apply_style_string(theme["annotation"])
                obj_map[inst.uuid] = lbl_obj
                continue

            x, y, w, h = normalize_bounds(inst, def_ir, scale=scale)
            # Ensure block labels remain legible on compact QET symbols
            w = max(w, 46.0 if mode == "stencil" else 68.0)
            h = max(h, 30.0 if mode == "stencil" else 42.0)

            cat_key = def_ir.category.lower() if def_ir else "default"
            cat_style = categories.get(cat_key, categories["default"])
            pts_style = build_points_style(inst, def_ir)

            style_str = (
                f"rounded=1;whiteSpace=wrap;html=1;"
                f"fillColor={cat_style['fillColor']};"
                f"strokeColor={cat_style['strokeColor']};"
                f"fontColor={cat_style['fontColor']};"
                f"strokeWidth=1.4;{pts_style}"
            )

            html_val = tpl_module.block_label(inst, def_ir, mode)
            block_obj = drawpyo.diagram.Object(page=page, value=str(html_val))
            block_obj.position = (x, y)
            block_obj.width = w
            block_obj.height = h
            block_obj.apply_style_string(style_str)
            obj_map[inst.uuid] = block_obj

        # 2. Instantiate Conductors (Wires)
        for cond in folio.conductors:
            src_obj = obj_map.get(cond.src_elem_uuid)
            dst_obj = obj_map.get(cond.dst_elem_uuid)
            if src_obj is None or dst_obj is None:
                continue

            src_inst = inst_map[cond.src_elem_uuid]
            dst_inst = inst_map[cond.dst_elem_uuid]
            src_def = project_ir.definitions.get(src_inst.def_path)
            dst_def = project_ir.definitions.get(dst_inst.def_path)

            src_term = next((t for t in src_inst.terminals if t.term_id == cond.src_term_id), None)
            dst_term = next((t for t in dst_inst.terminals if t.term_id == cond.dst_term_id), None)

            port_style = ""
            if src_term is not None:
                sx, sy = terminal_port_ratio(src_term, src_inst, src_def)
                port_style += f"exitX={sx};exitY={sy};exitDx=0;exitDy=0;"
            if dst_term is not None:
                dx, dy = terminal_port_ratio(dst_term, dst_inst, dst_def)
                port_style += f"entryX={dx};entryY={dy};entryDx=0;entryDy=0;"

            edge_label = cond.text
            if cond.section:
                edge_label = f"{cond.text} ({cond.section})" if cond.text else cond.section

            edge_obj = drawpyo.diagram.Edge(page=page, source=src_obj, target=dst_obj, label=edge_label)
            edge_obj.apply_style_string(f"{theme['edge_default']}strokeColor={cond.color};{port_style}")
            if cond.waypoints:
                edge_obj.waypoints = [(wx * scale, wy * scale) for wx, wy in cond.waypoints]

    dfile.write()
    return abs_out
