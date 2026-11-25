"""lxml XPath reader for QElectroTech (.qet, .qetz, .elmt) XML files."""

import os
import zipfile
from typing import Dict, List, Optional, Tuple
from lxml import etree

from .ir import (
    ConductorIR,
    ElementDefIR,
    ElementInstIR,
    FolioIR,
    QETProjectIR,
    TerminalIR,
)


def _safe_float(val: Optional[str], default: float = 0.0) -> float:
    try:
        return float(val) if val is not None else default
    except ValueError:
        return default


def _safe_int(val: Optional[str], default: int = 0) -> int:
    try:
        return int(float(val)) if val is not None else default
    except ValueError:
        return default


def _parse_definition(defn_el: etree._Element, embed_path: str, category: str) -> ElementDefIR:
    width = _safe_float(defn_el.get("width"), 60.0)
    height = _safe_float(defn_el.get("height"), 60.0)
    hotspot_x = _safe_float(defn_el.get("hotspot_x"), width * 0.5)
    hotspot_y = _safe_float(defn_el.get("hotspot_y"), height * 0.5)
    link_type = defn_el.get("link_type") or defn_el.get("type") or "simple"

    # Prefer English name, fallback to first <name>, fallback to file stem
    name = ""
    names = defn_el.findall("./names/name")
    for n in names:
        if n.get("lang") == "en" and (n.text or "").strip():
            name = n.text.strip()
            break
    if not name and names:
        for n in names:
            if (n.text or "").strip():
                name = n.text.strip()
                break
    if not name:
        name = os.path.splitext(os.path.basename(embed_path))[0]

    primitives: List[Dict] = []
    terminals: List[TerminalIR] = []
    desc = defn_el.find("./description")
    if desc is not None:
        for idx, child in enumerate(desc):
            tag = etree.QName(child).localname
            if tag == "terminal":
                terminals.append(
                    TerminalIR(
                        term_id=child.get("id") or str(idx),
                        uuid=child.get("uuid") or "",
                        rel_x=_safe_float(child.get("x")),
                        rel_y=_safe_float(child.get("y")),
                        orientation=child.get("orientation") or "n",
                    )
                )
            elif tag in ("line", "rect", "rectangle", "circle", "ellipse", "arc", "polygon"):
                prim = {"type": tag}
                prim.update(child.attrib)
                primitives.append(prim)

    return ElementDefIR(
        embed_path=embed_path,
        name=name,
        category=category,
        width=width,
        height=height,
        hotspot_x=hotspot_x,
        hotspot_y=hotspot_y,
        link_type=link_type,
        primitives=primitives,
        terminals=terminals,
    )


def _walk_collection(cat_el: etree._Element, path_parts: List[str], out_defs: Dict[str, ElementDefIR]) -> None:
    cat_name = cat_el.get("name")
    next_parts = path_parts + ([cat_name] if cat_name else [])
    category_tag = next_parts[1] if len(next_parts) > 1 else (next_parts[0] if next_parts else "default")

    for child in cat_el:
        tag = etree.QName(child).localname
        if tag == "category":
            _walk_collection(child, next_parts, out_defs)
        elif tag == "element":
            el_name = child.get("name") or "unknown.elmt"
            defn = child.find("./definition")
            if defn is not None:
                embed_path = "embed://" + "/".join(next_parts + [el_name])
                out_defs[embed_path] = _parse_definition(defn, embed_path, category_tag)


def _extract_element_label(el_node: etree._Element, def_path: str) -> str:
    # 1. elementInformations -> label
    for info in el_node.findall("./elementInformations/elementInformation"):
        if info.get("name") == "label" and (info.text or "").strip():
            return info.text.strip().replace("\n", " ")

    # 2. dynamic_texts -> dynamic_elmt_text -> text
    for txt_node in el_node.findall("./dynamic_texts/dynamic_elmt_text/text"):
        if (txt_node.text or "").strip():
            return txt_node.text.strip().replace("\n", " ")

    # 3. legacy inputs -> input[@text]
    for inp in el_node.findall("./inputs/input"):
        txt = (inp.get("text") or "").strip()
        if txt:
            return txt

    return os.path.splitext(os.path.basename(def_path))[0]


def _load_xml_root(file_path: str) -> etree._Element:
    parser = etree.XMLParser(resolve_entities=False, no_network=True, recover=True)
    if file_path.lower().endswith(".qetz"):
        with zipfile.ZipFile(file_path, "r") as zf:
            qet_names = [n for n in zf.namelist() if n.lower().endswith(".qet")]
            if not qet_names:
                raise ValueError(f"No .qet XML file found inside archive: {file_path}")
            with zf.open(qet_names[0]) as fh:
                return etree.parse(fh, parser).getroot()
    return etree.parse(file_path, parser).getroot()


def parse_qet_file(file_path: str) -> QETProjectIR:
    """Parse a .qet, .qetz, or .elmt XML file into a QETProjectIR."""
    root = _load_xml_root(file_path)
    root_tag = etree.QName(root).localname

    # Standalone .elmt element preview
    if root_tag == "definition":
        embed_path = f"embed://{os.path.basename(file_path)}"
        def_ir = _parse_definition(root, embed_path, "default")
        inst = ElementInstIR(
            uuid="{standalone-1}",
            def_path=embed_path,
            label=def_ir.name,
            x=def_ir.hotspot_x + 120.0,
            y=def_ir.hotspot_y + 120.0,
            terminals=def_ir.terminals,
        )
        folio = FolioIR(title=def_ir.name, order=1, width=600.0, height=400.0, elements=[inst])
        return QETProjectIR(title=def_ir.name, definitions={embed_path: def_ir}, folios=[folio])

    project_title = root.get("title") or os.path.splitext(os.path.basename(file_path))[0]
    definitions: Dict[str, ElementDefIR] = {}

    collection = root.find("./collection")
    if collection is not None:
        for cat in collection.findall("./category"):
            _walk_collection(cat, [], definitions)

    folios: List[FolioIR] = []
    for diag_idx, diag in enumerate(root.findall("./diagram"), start=1):
        folio_title = diag.get("title") or f"Folio-{diag_idx}"
        order = _safe_int(diag.get("order"), diag_idx)
        cols = _safe_int(diag.get("cols"), 17)
        colsize = _safe_float(diag.get("colsize"), 60.0)
        rows = _safe_int(diag.get("rows"), 8)
        rowsize = _safe_float(diag.get("rowsize"), 80.0)
        width = cols * colsize
        height = _safe_float(diag.get("height"), rows * rowsize)

        elements: List[ElementInstIR] = []
        term_to_elem: Dict[str, Tuple[str, str]] = {}

        for el_idx, el_node in enumerate(diag.findall("./elements/element")):
            el_uuid = el_node.get("uuid") or f"elem_{diag_idx}_{el_idx}"
            def_path = el_node.get("type") or ""
            x = _safe_float(el_node.get("x"))
            y = _safe_float(el_node.get("y"))
            ori = _safe_int(el_node.get("orientation"), 0) % 4
            label = _extract_element_label(el_node, def_path)

            inst_terms: List[TerminalIR] = []
            for t_idx, t_node in enumerate(el_node.findall("./terminals/terminal")):
                t_id = t_node.get("id") or f"{el_uuid}_t{t_idx}"
                t_ir = TerminalIR(
                    term_id=t_id,
                    uuid=t_node.get("uuid") or "",
                    rel_x=_safe_float(t_node.get("x")),
                    rel_y=_safe_float(t_node.get("y")),
                    orientation=t_node.get("orientation") or "0",
                    label=t_node.get("number") or t_node.get("name") or "",
                )
                inst_terms.append(t_ir)
                term_to_elem[t_id] = (el_uuid, t_id)

            is_text_only = (len(inst_terms) == 0) and (
                "tekst" in def_path.lower() or "text" in def_path.lower()
            )
            elements.append(
                ElementInstIR(
                    uuid=el_uuid,
                    def_path=def_path,
                    label=label,
                    x=x,
                    y=y,
                    orientation=ori,
                    is_text_only=is_text_only,
                    terminals=inst_terms,
                )
            )

        conductors: List[ConductorIR] = []
        for c_idx, c_node in enumerate(diag.findall("./conductors/conductor")):
            t1 = c_node.get("terminal1") or ""
            t2 = c_node.get("terminal2") or ""
            e1 = c_node.get("element1") or ""
            e2 = c_node.get("element2") or ""

            src_elem, src_term = term_to_elem.get(t1, (e1, t1))
            dst_elem, dst_term = term_to_elem.get(t2, (e2, t2))
            if not src_elem or not dst_elem:
                continue

            waypoints: List[Tuple[float, float]] = []
            for pt in c_node.findall("./point"):
                waypoints.append((_safe_float(pt.get("x")), _safe_float(pt.get("y"))))

            wire_text = (c_node.get("num") or c_node.get("text") or "").strip()
            wire_color = (c_node.get("color") or c_node.get("conductor_color") or "#1E293B").strip()
            if not wire_color.startswith("#"):
                wire_color = "#1E293B"
            wire_section = (c_node.get("conductor_section") or c_node.get("section") or "").strip()

            conductors.append(
                ConductorIR(
                    uuid=c_node.get("uuid") or f"cond_{diag_idx}_{c_idx}",
                    text=wire_text,
                    color=wire_color,
                    section=wire_section,
                    src_elem_uuid=src_elem,
                    src_term_id=src_term,
                    dst_elem_uuid=dst_elem,
                    dst_term_id=dst_term,
                    waypoints=waypoints,
                )
            )

        folios.append(
            FolioIR(
                title=folio_title,
                order=order,
                width=width,
                height=height,
                elements=elements,
                conductors=conductors,
            )
        )

    folios.sort(key=lambda f: f.order)
    return QETProjectIR(title=project_title, definitions=definitions, folios=folios)
