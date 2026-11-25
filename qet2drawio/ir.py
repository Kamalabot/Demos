"""Intermediate Representation (IR) data models for qet2drawio."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class TerminalIR:
    term_id: str
    uuid: str
    rel_x: float
    rel_y: float
    orientation: str  # "n" | "s" | "e" | "w" | "0" | "1" | "2" | "3"
    label: str = ""


@dataclass
class ElementDefIR:
    embed_path: str
    name: str
    category: str
    width: float
    height: float
    hotspot_x: float
    hotspot_y: float
    link_type: str = "simple"
    primitives: List[Dict[str, Any]] = field(default_factory=list)
    terminals: List[TerminalIR] = field(default_factory=list)


@dataclass
class ElementInstIR:
    uuid: str
    def_path: str
    label: str
    x: float
    y: float
    orientation: int = 0  # 0, 1, 2, 3 -> 0, 90, 180, 270 deg
    is_text_only: bool = False
    properties: Dict[str, str] = field(default_factory=dict)
    terminals: List[TerminalIR] = field(default_factory=list)


@dataclass
class ConductorIR:
    uuid: str
    text: str
    color: str
    section: str
    src_elem_uuid: str
    src_term_id: str
    dst_elem_uuid: str
    dst_term_id: str
    waypoints: List[Tuple[float, float]] = field(default_factory=list)


@dataclass
class FolioIR:
    title: str
    order: int
    width: float
    height: float
    elements: List[ElementInstIR] = field(default_factory=list)
    conductors: List[ConductorIR] = field(default_factory=list)


@dataclass
class QETProjectIR:
    title: str
    definitions: Dict[str, ElementDefIR] = field(default_factory=dict)
    folios: List[FolioIR] = field(default_factory=list)
