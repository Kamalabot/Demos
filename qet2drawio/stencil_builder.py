"""Converts QElectroTech .elmt vector primitives into Draw.io <shape> stencils & mxlibrary XML."""

import base64
import json
import os
import zlib
from typing import Dict, List
from urllib.parse import quote
from xml.etree import ElementTree as ET

from .ir import ElementDefIR, QETProjectIR


def _f(val: str | None, default: float = 0.0) -> float:
    try:
        return float(val) if val is not None else default
    except ValueError:
        return default


def build_drawio_shape_xml(def_ir: ElementDefIR) -> str:
    """Compile an ElementDefIR's primitives into a Draw.io custom <shape> XML string."""
    w = max(10.0, def_ir.width)
    h = max(10.0, def_ir.height)
    hx = def_ir.hotspot_x
    hy = def_ir.hotspot_y

    shape = ET.Element("shape", name=def_ir.name, h=str(h), w=str(w), aspect="variable", strokewidth="inherit")
    fg = ET.SubElement(shape, "foreground")

    for prim in def_ir.primitives:
        ptype = prim.get("type")
        if ptype == "line":
            path = ET.SubElement(fg, "path")
            ET.SubElement(path, "move", x=str(_f(prim.get("x1")) + hx), y=str(_f(prim.get("y1")) + hy))
            ET.SubElement(path, "line", x=str(_f(prim.get("x2")) + hx), y=str(_f(prim.get("y2")) + hy))
            ET.SubElement(fg, "stroke")
        elif ptype in ("rect", "rectangle"):
            ET.SubElement(
                fg,
                "rect",
                x=str(_f(prim.get("x")) + hx),
                y=str(_f(prim.get("y")) + hy),
                w=str(_f(prim.get("width"), 10.0)),
                h=str(_f(prim.get("height"), 10.0)),
            )
            ET.SubElement(fg, "stroke")
        elif ptype in ("circle", "ellipse"):
            diam = _f(prim.get("diameter"), 0.0)
            ew = _f(prim.get("width"), diam if diam > 0 else 10.0)
            eh = _f(prim.get("height"), diam if diam > 0 else 10.0)
            ET.SubElement(
                fg,
                "ellipse",
                x=str(_f(prim.get("x")) + hx),
                y=str(_f(prim.get("y")) + hy),
                w=str(ew),
                h=str(eh),
            )
            ET.SubElement(fg, "stroke")

    return ET.tostring(shape, encoding="unicode")


def export_mxlibrary(project_ir: QETProjectIR, output_path: str) -> str:
    """Export all parsed ElementDefIR definitions as a Draw.io <mxlibrary> XML file."""
    entries: List[Dict] = []
    for def_ir in project_ir.definitions.values():
        shape_xml = build_drawio_shape_xml(def_ir)
        compressed = zlib.compress(quote(shape_xml).encode("utf-8"), 9)[2:-4]
        encoded_shape = base64.b64encode(compressed).decode("ascii")

        mxgraph = ET.Element("mxGraphModel")
        root = ET.SubElement(mxgraph, "root")
        ET.SubElement(root, "mxCell", id="0")
        ET.SubElement(root, "mxCell", id="1", parent="0")
        cell = ET.SubElement(
            root,
            "mxCell",
            id="2",
            value="",
            style=f"shape=stencil({encoded_shape});whiteSpace=wrap;html=1;",
            vertex="1",
            parent="1",
        )
        geom = ET.SubElement(cell, "mxGeometry", width=str(def_ir.width), height=str(def_ir.height))
        geom.set("as", "geometry")

        entries.append(
            {
                "xml": ET.tostring(mxgraph, encoding="unicode"),
                "w": def_ir.width,
                "h": def_ir.height,
                "title": def_ir.name,
            }
        )

    abs_out = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(abs_out), exist_ok=True)
    with open(abs_out, "w", encoding="utf-8") as fh:
        fh.write(f"<mxlibrary>{json.dumps(entries)}</mxlibrary>")
    return abs_out
