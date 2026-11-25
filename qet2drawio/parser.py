"""XML parser for QElectroTech (.qet / .qetz) files using lxml."""

import os
import zipfile
from typing import Dict, List, Optional, Tuple

from lxml import etree

from .ir import (
    CollectionDefIR,
    ConductorLinkIR,
    DiagramIR,
    ElementObjIR,
    ProjectIR,
    TerminalIR,
)


def _safe_xml_parser() -> etree.XMLParser:
    return etree.XMLParser(resolve_entities=False, no_network=True, recover=True)


def _load_xml_root(file_path: str) -> etree._Element:
    ext = os.path.splitext(file_path)[1].lower()
    parser = _safe_xml_parser()
    if ext == ".qetz":
        with zipfile.ZipFile(file_path, "r") as zf:
            qet_names = [n for n in zf.namelist() if n.lower().endswith(".qet")]
            if not qet_names:
                raise ValueError(f"No .qet file found inside archive '{file_path}'")
            with zf.open(qet_names[0]) as fh:
                return etree.parse(fh, parser).getroot()
    with open(file_path, "rb") as fh:
        return etree.parse(fh, parser).getroot()


def _pick_localized_name(parent: Optional[etree._Element], fallback: str = "") -> str:
    if parent is None:
        return fallback
    names_el = parent.find("names")
    if names_el is None:
        return fallback
    by_lang: Dict[str, str] = {}
    for n in names_el.findall("name"):
        lang = (n.get("lang") or "").lower()
        txt = (n.text or "").strip()
        if txt:
            by_lang[lang] = txt
    for pref in ("en", "pl", "fr", "de"):
        if pref in by_lang:
            return by_lang[pref]
    return next(iter(by_lang.values()), fallback)


def _parse_collection(root: etree._Element) -> Dict[str, CollectionDefIR]:
    collection: Dict[str, CollectionDefIR] = {}
    coll_el = root.find("collection")
    if coll_el is None:
        return collection

    def _walk_category(cat_el: etree._Element, path_parts: List[str]) -> None:
        cat_name = cat_el.get("name") or "uncategorized"
        cur_parts = path_parts + [cat_name]
        # Leaf category name (skipping generic 'import' if deeper category exists)
        meaningful_cats = [p for p in cur_parts if p.lower() != "import"]
        leaf_category = meaningful_cats[-1] if meaningful_cats else cat_name

        for el_node in cat_el.findall("element"):
            el_name = el_node.get("name") or "unknown.elmt"
            embed_path = "embed://" + "/".join(cur_parts + [el_name])
            defn = el_node.find("definition")
            link_type = defn.get("link_type", "simple") if defn is not None else "simple"
            display_name = _pick_localized_name(defn, fallback=os.path.splitext(el_name)[0])
            desc = defn.find("description") if defn is not None else None
            term_count = len(desc.findall("terminal")) if desc is not None else 0
            info_el = defn.find("informations") if defn is not None else None
            infos = (info_el.text or "").strip() if info_el is not None else ""

            collection[embed_path] = CollectionDefIR(
                embed_path=embed_path,
                name=display_name,
                category=leaf_category,
                link_type=link_type,
                terminal_count=term_count,
                informations=infos,
            )

        for sub_cat in cat_el.findall("category"):
            _walk_category(sub_cat, cur_parts)

    for top_cat in coll_el.findall("category"):
        _walk_category(top_cat, [])

    return collection


def _extract_element_label(
    el_node: etree._Element,
    def_ir: Optional[CollectionDefIR],
    def_path: str,
    fallback_idx: int,
) -> Tuple[str, Dict[str, str]]:
    props: Dict[str, str] = {}
    label = ""

    infos_el = el_node.find("elementInformations")
    if infos_el is not None:
        for info in infos_el.findall("elementInformation"):
            k = (info.get("name") or "").strip()
            v = (info.text or "").strip()
            if k and v:
                props[k] = v
                if k == "label" and not label:
                    label = v

    dyn_el = el_node.find("dynamic_texts")
    if dyn_el is not None:
        for dt in dyn_el.findall("dynamic_elmt_text"):
            txt_node = dt.find("text")
            if txt_node is not None and txt_node.text:
                txt = txt_node.text.strip()
                if txt and txt != "_":
                    props.setdefault("dynamic_text", txt)
                    if not label:
                        label = txt

    inputs_el = el_node.find("inputs")
    if inputs_el is not None:
        for inp in inputs_el.findall("input"):
            txt = (inp.get("text") or "").strip()
            if txt and txt != "_":
                props.setdefault("input_text", txt)
                if not label:
                    label = txt

    if not label:
        if def_ir and def_ir.name:
            label = def_ir.name
        else:
            label = os.path.splitext(os.path.basename(def_path))[0] or f"Elem-{fallback_idx}"

    return label, props


def _category_from_def_path(def_path: str, def_ir: Optional[CollectionDefIR]) -> str:
    if def_ir and def_ir.category:
        return def_ir.category
    parts = [p for p in def_path.replace("embed://", "").split("/") if p and p.lower() != "import"]
    if len(parts) >= 2:
        return parts[-2]
    return "default"


def parse_qet_file(file_path: str) -> ProjectIR:
    """Parse a .qet or .qetz file into a file-centric ProjectIR."""
    root = _load_xml_root(file_path)
    if root is None or root.tag != "project":
        raise ValueError(f"Expected <project> root tag in '{file_path}', got '{getattr(root, 'tag', None)}'")

    title = (root.get("title") or os.path.splitext(os.path.basename(file_path))[0]).strip()
    version = (root.get("version") or "").strip()

    properties: Dict[str, str] = {}
    props_el = root.find("properties")
    if props_el is not None:
        for p in props_el.findall("property"):
            k = (p.get("name") or "").strip()
            v = (p.text or "").strip()
            if k and v:
                properties[k] = v

    collection = _parse_collection(root)
    diagrams: List[DiagramIR] = []

    for idx, diag_el in enumerate(root.findall("diagram"), start=1):
        order = int(diag_el.get("order") or idx)
        diag_title = (diag_el.get("title") or f"Folio {order}").strip()

        elements: List[ElementObjIR] = []
        annotations: List[ElementObjIR] = []
        term_to_elem: Dict[str, str] = {}

        elems_el = diag_el.find("elements")
        if elems_el is not None:
            for e_idx, el_node in enumerate(elems_el.findall("element"), start=1):
                uuid = (el_node.get("uuid") or f"elem-{idx}-{e_idx}").strip()
                def_path = (el_node.get("type") or "").strip()
                def_ir = collection.get(def_path)
                category = _category_from_def_path(def_path, def_ir)
                display_name = def_ir.name if def_ir else os.path.splitext(os.path.basename(def_path))[0]

                terminals: List[TerminalIR] = []
                terms_el = el_node.find("terminals")
                if terms_el is not None:
                    for t_node in terms_el.findall("terminal"):
                        tid = (t_node.get("id") or "").strip()
                        if not tid:
                            continue
                        t_ir = TerminalIR(
                            term_id=tid,
                            uuid=(t_node.get("uuid") or "").strip(),
                            name=(t_node.get("name") or "").strip(),
                            orientation=(t_node.get("orientation") or "").strip(),
                            rel_x=float(t_node.get("x") or 0.0),
                            rel_y=float(t_node.get("y") or 0.0),
                        )
                        terminals.append(t_ir)
                        term_to_elem[tid] = uuid

                label, props = _extract_element_label(el_node, def_ir, def_path, e_idx)
                is_annotation = len(terminals) == 0

                elem_obj = ElementObjIR(
                    uuid=uuid,
                    def_path=def_path,
                    category=category,
                    display_name=display_name,
                    label=label,
                    terminals=terminals,
                    properties=props,
                    is_annotation=is_annotation,
                )
                if is_annotation:
                    annotations.append(elem_obj)
                else:
                    elements.append(elem_obj)

        conductors: List[ConductorLinkIR] = []
        unmapped = 0
        conds_el = diag_el.find("conductors")
        if conds_el is not None:
            for c_idx, c_node in enumerate(conds_el.findall("conductor"), start=1):
                t1 = (c_node.get("terminal1") or "").strip()
                t2 = (c_node.get("terminal2") or "").strip()
                src_uuid = term_to_elem.get(t1, "")
                dst_uuid = term_to_elem.get(t2, "")
                if not src_uuid or not dst_uuid:
                    unmapped += 1
                    continue

                conductors.append(
                    ConductorLinkIR(
                        uuid=(c_node.get("uuid") or f"cond-{idx}-{c_idx}").strip(),
                        terminal1=t1,
                        terminal2=t2,
                        src_elem_uuid=src_uuid,
                        dst_elem_uuid=dst_uuid,
                        num=(c_node.get("num") or "").strip(),
                        function=(c_node.get("function") or "").strip(),
                        tension_protocol=(c_node.get("tension_protocol") or "").strip(),
                        color=(c_node.get("color") or "").strip(),
                        conductor_type=(c_node.get("type") or "multi").strip(),
                    )
                )

        diagrams.append(
            DiagramIR(
                order=order,
                title=diag_title,
                elements=elements,
                annotations=annotations,
                conductors=conductors,
                unmapped_conductors=unmapped,
            )
        )

    diagrams.sort(key=lambda d: d.order)
    return ProjectIR(
        title=title,
        version=version,
        properties=properties,
        collection=collection,
        diagrams=diagrams,
    )
