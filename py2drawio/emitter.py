"""Templatized Draw.io XML emitter powered by drawpyo and Jinja2."""

import json
import os
from typing import Dict

import drawpyo
from jinja2 import Environment, FileSystemLoader

from .ir import ModuleIR, NodeKind

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")


def _load_theme(theme_name: str) -> Dict:
    theme_path = os.path.join(TEMPLATES_DIR, f"theme_{theme_name}.json")
    if not os.path.isfile(theme_path):
        raise FileNotFoundError(f"Theme '{theme_name}' not found at {theme_path}")
    with open(theme_path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def emit_drawio(module_ir: ModuleIR, output_path: str, theme_name: str = "blueprint") -> str:
    """Compile a positioned ModuleIR into a .drawio file using drawpyo and templates."""
    theme = _load_theme(theme_name)
    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)
    tpl_module = env.get_template("html_cards.j2").module

    abs_out = os.path.abspath(output_path)
    out_dir = os.path.dirname(abs_out)
    out_file = os.path.basename(abs_out)
    os.makedirs(out_dir, exist_ok=True)

    dfile = drawpyo.File()
    dfile.file_path = out_dir
    dfile.file_name = out_file

    page = drawpyo.Page(file=dfile)
    page.name = "Python-Architecture"

    # 1. Header Banner
    header_w = module_ir.page_width - 80.0
    header_lbl = (
        f"<b><font style='font-size:16px;'>PYTHON CONTROL FLOW &amp; EXECUTION ARCHITECTURE: "
        f"{module_ir.filename}</font></b><br>"
        f"<span style='font-size:11px;'>Generated deterministically by py2drawio "
        f"({len(module_ir.functions)} function(s) • theme: {theme_name})</span>"
    )
    header_obj = drawpyo.diagram.Object(page=page, value=header_lbl)
    header_obj.position = (40, 20)
    header_obj.width = header_w
    header_obj.height = 55
    header_obj.apply_style_string(theme["header"])

    # Track START nodes for cross-lane call links
    func_start_objs: Dict[str, drawpyo.diagram.Object] = {}
    call_links = []

    # 2. Function Swimlane Panels
    for fn in module_ir.functions:
        px, py, pw, ph = fn.panel_bounds
        panel_bg = drawpyo.diagram.Object(page=page, value="")
        panel_bg.position = (px, py)
        panel_bg.width = pw
        panel_bg.height = ph
        panel_bg.apply_style_string(theme["panel"])

        role = "ENTRY POINT SWIMLANE" if fn.is_entrypoint else "SUBROUTINE"
        title_lbl = f"<b>{role}: {fn.name}({', '.join(fn.params)})</b>"
        panel_title = drawpyo.diagram.Object(page=page, value=title_lbl)
        panel_title.position = (px, py + 6)
        panel_title.width = pw
        panel_title.height = 28
        panel_title.apply_style_string(theme["panel_title"])

        obj_map: Dict[str, drawpyo.diagram.Object] = {}
        for node in fn.nodes:
            html_val = tpl_module.node_label(node.title, node.code_snippet)
            node_obj = drawpyo.diagram.Object(page=page, value=str(html_val))
            node_obj.position = (node.x, node.y)
            node_obj.width = node.width
            node_obj.height = node.height
            style_str = theme["nodes"].get(node.kind.value, theme["nodes"]["process"])
            node_obj.apply_style_string(style_str)
            obj_map[node.node_id] = node_obj

            if node.kind == NodeKind.START:
                func_start_objs[fn.name] = node_obj
            if node.kind == NodeKind.CALL and node.calls_target:
                call_links.append((node_obj, node.calls_target))

        for edge in fn.edges:
            src_obj = obj_map.get(edge.source_id)
            dst_obj = obj_map.get(edge.target_id)
            if src_obj is None or dst_obj is None:
                continue
            edge_obj = drawpyo.diagram.Edge(page=page, source=src_obj, target=dst_obj, label=edge.label)
            edge_style = theme["edges"].get(edge.edge_type, theme["edges"]["normal"])
            edge_obj.apply_style_string(edge_style)

    # 3. Cross-lane dashed invocation links
    for caller_obj, target_fn_name in call_links:
        callee_start = func_start_objs.get(target_fn_name)
        if callee_start is not None:
            link_edge = drawpyo.diagram.Edge(page=page, source=caller_obj, target=callee_start, label="Invokes")
            link_edge.apply_style_string(theme["edges"]["call_link"])

    # 4. Optional Runtime Trace Panel
    if module_ir.trace is not None:
        tx, ty, tw, th = module_ir.trace.panel_bounds
        trace_bg = drawpyo.diagram.Object(page=page, value="")
        trace_bg.position = (tx, ty)
        trace_bg.width = tw
        trace_bg.height = th
        trace_bg.apply_style_string(theme["panel"])

        trace_title = drawpyo.diagram.Object(page=page, value="<b>RUNTIME MEMORY STATE &amp; EXECUTION TRACE</b>")
        trace_title.position = (tx, ty + 6)
        trace_title.width = tw
        trace_title.height = 28
        trace_title.apply_style_string(theme["panel_title"])

        card_y = ty + 42
        card_h = th - 58
        col_w = (tw - 60.0) / 3.0

        # Card 1: Memory
        mem_html = tpl_module.memory_table(module_ir.trace.locals_snapshot)
        mem_card = drawpyo.diagram.Object(page=page, value=str(mem_html))
        mem_card.position = (tx + 15, card_y)
        mem_card.width = col_w
        mem_card.height = card_h
        mem_card.apply_style_string(theme["card"])

        # Card 2: Call Trace
        calls_html = tpl_module.call_trace_table(module_ir.trace.call_events)
        calls_card = drawpyo.diagram.Object(page=page, value=str(calls_html))
        calls_card.position = (tx + 30 + col_w, card_y)
        calls_card.width = col_w
        calls_card.height = card_h
        calls_card.apply_style_string(theme["card"])

        # Card 3: STDOUT
        stdout_html = tpl_module.stdout_card(module_ir.trace.stdout_text, module_ir.trace.error_text)
        stdout_card = drawpyo.diagram.Object(page=page, value=str(stdout_html))
        stdout_card.position = (tx + 45 + 2 * col_w, card_y)
        stdout_card.width = col_w
        stdout_card.height = card_h
        stdout_card.apply_style_string(theme["card"])

    dfile.write()
    return abs_out
