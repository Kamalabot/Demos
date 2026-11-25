"""Intermediate Representation (IR) data models for py2drawio."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class NodeKind(str, Enum):
    START = "start"
    END = "end"
    PROCESS = "process"
    DECISION = "decision"
    LOOP_FOR = "loop_for"
    CALL = "call"
    TRY_BLOCK = "try_block"
    EXCEPT = "except"
    RETURN = "return"


@dataclass
class CFGNode:
    node_id: str
    kind: NodeKind
    title: str
    code_snippet: str
    line_no: int
    calls_target: Optional[str] = None
    x: float = 0.0
    y: float = 0.0
    width: float = 240.0
    height: float = 48.0


@dataclass
class CFGEdge:
    edge_id: str
    source_id: str
    target_id: str
    label: str = ""
    edge_type: str = "normal"  # normal | true | false | loopback | exception | call_link


@dataclass
class FunctionIR:
    name: str
    params: List[str]
    nodes: List[CFGNode] = field(default_factory=list)
    edges: List[CFGEdge] = field(default_factory=list)
    is_entrypoint: bool = False
    panel_bounds: Tuple[float, float, float, float] = (0.0, 0.0, 420.0, 300.0)


@dataclass
class CallTraceEvent:
    func_name: str
    args_repr: str
    return_repr: str
    line_no: int


@dataclass
class TraceReport:
    locals_snapshot: List[Tuple[str, str, str]] = field(default_factory=list)  # (name, type, repr)
    call_events: List[CallTraceEvent] = field(default_factory=list)
    stdout_text: str = ""
    error_text: Optional[str] = None
    panel_bounds: Tuple[float, float, float, float] = (0.0, 0.0, 860.0, 340.0)


@dataclass
class ModuleIR:
    filename: str
    functions: List[FunctionIR] = field(default_factory=list)
    trace: Optional[TraceReport] = None
    page_width: float = 1420.0
    page_height: float = 1060.0
