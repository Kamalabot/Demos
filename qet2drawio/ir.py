"""Intermediate Representation (IR) for Approach 3: Functional Block & Aggregated Bus Architecture."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class TerminalIR:
    term_id: str
    uuid: str = ""
    name: str = ""
    orientation: str = ""
    rel_x: float = 0.0
    rel_y: float = 0.0


@dataclass
class CollectionDefIR:
    embed_path: str
    name: str
    category: str
    link_type: str = "simple"
    terminal_count: int = 0
    informations: str = ""


@dataclass
class ElementObjIR:
    uuid: str
    def_path: str
    category: str
    display_name: str
    label: str
    terminals: List[TerminalIR] = field(default_factory=list)
    properties: Dict[str, str] = field(default_factory=dict)
    is_annotation: bool = False
    # Layout coordinates (computed by layout.py, not CAD coordinates)
    layout_x: float = 0.0
    layout_y: float = 0.0
    layout_w: float = 220.0
    layout_h: float = 110.0


@dataclass
class ConductorLinkIR:
    uuid: str
    terminal1: str
    terminal2: str
    src_elem_uuid: str
    dst_elem_uuid: str
    num: str = ""
    function: str = ""
    tension_protocol: str = ""
    color: str = ""
    conductor_type: str = "multi"


@dataclass
class BusBundleIR:
    src_elem_uuid: str
    dst_elem_uuid: str
    src_label: str
    dst_label: str
    wires: List[ConductorLinkIR] = field(default_factory=list)
    primary_color: str = "#334155"
    bundle_label: str = ""


@dataclass
class NetGroupIR:
    net_id: int
    label: str
    color: str
    terminal_ids: List[str] = field(default_factory=list)
    element_uuids: List[str] = field(default_factory=list)


@dataclass
class DiagramIR:
    order: int
    title: str
    elements: List[ElementObjIR] = field(default_factory=list)
    annotations: List[ElementObjIR] = field(default_factory=list)
    conductors: List[ConductorLinkIR] = field(default_factory=list)
    bus_bundles: List[BusBundleIR] = field(default_factory=list)
    nets: List[NetGroupIR] = field(default_factory=list)
    unmapped_conductors: int = 0


@dataclass
class ProjectIR:
    title: str
    version: str = ""
    properties: Dict[str, str] = field(default_factory=dict)
    collection: Dict[str, CollectionDefIR] = field(default_factory=dict)
    diagrams: List[DiagramIR] = field(default_factory=list)
