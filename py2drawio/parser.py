"""Python AST / Tree-sitter parser that compiles source code into CFG IR."""

import ast
import os
from typing import Dict, List, Optional, Set, Tuple

from .ir import CFGEdge, CFGNode, FunctionIR, ModuleIR, NodeKind


def _unparse(node: ast.AST) -> str:
    """Safely unparse an AST node into compact Python source text."""
    try:
        return ast.unparse(node)
    except Exception:
        return "<expr>"


def _find_user_call(node: ast.AST, user_funcs: Set[str]) -> Optional[str]:
    """Return the first user-defined function name called inside an AST subtree."""
    for sub in ast.walk(node):
        if isinstance(sub, ast.Call):
            if isinstance(sub.func, ast.Name) and sub.func.id in user_funcs:
                return sub.func.id
    return None


def _extract_ts_comments(source: str) -> Dict[int, str]:
    """Optional tree-sitter-python pass to extract inline/header comments by 1-based line."""
    comments: Dict[int, str] = {}
    try:
        import tree_sitter_python as tspython
        from tree_sitter import Language, Parser

        py_lang = Language(tspython.language())
        parser = Parser(py_lang)
        tree = parser.parse(source.encode("utf-8"))

        def walk(cursor_node) -> None:
            if cursor_node.type == "comment":
                line_no = cursor_node.start_point[0] + 1
                comments[line_no] = cursor_node.text.decode("utf-8", errors="replace").lstrip("# ").strip()
            for child in cursor_node.children:
                walk(child)

        walk(tree.root_node)
    except Exception:
        pass
    return comments


class _FuncCFGBuilder:
    """Builds a deterministic Control Flow Graph (CFG) for a single Python function."""

    def __init__(self, func_name: str, user_funcs: Set[str], comments: Dict[int, str]) -> None:
        self.func_name = func_name
        self.user_funcs = user_funcs
        self.comments = comments
        self.nodes: List[CFGNode] = []
        self.edges: List[CFGEdge] = []
        self._node_seq = 0
        self._edge_seq = 0

    def _next_node_id(self, suffix: str) -> str:
        self._node_seq += 1
        return f"{self.func_name}_n{self._node_seq}_{suffix}"

    def _add_node(
        self,
        kind: NodeKind,
        title: str,
        code_snippet: str,
        line_no: int,
        calls_target: Optional[str] = None,
    ) -> CFGNode:
        node = CFGNode(
            node_id=self._next_node_id(kind.value),
            kind=kind,
            title=title,
            code_snippet=code_snippet,
            line_no=line_no,
            calls_target=calls_target,
        )
        self.nodes.append(node)
        return node

    def _add_edge(self, src: str, dst: str, label: str = "", edge_type: str = "normal") -> None:
        self._edge_seq += 1
        self.edges.append(
            CFGEdge(
                edge_id=f"{self.func_name}_e{self._edge_seq}",
                source_id=src,
                target_id=dst,
                label=label,
                edge_type=edge_type,
            )
        )

    def _link_exits(self, exits: List[Tuple[str, str, str]], target_id: str) -> None:
        for src_id, lbl, etype in exits:
            self._add_edge(src_id, target_id, label=lbl, edge_type=etype)

    def build(self, body: List[ast.stmt], params: List[str], is_entrypoint: bool) -> FunctionIR:
        sig = f"def {self.func_name}({', '.join(params)})"
        start_node = self._add_node(NodeKind.START, f"START: {self.func_name}", sig, body[0].lineno if body else 1)

        entry_id, exits = self._build_stmt_list(body)
        if entry_id is not None:
            self._add_edge(start_node.node_id, entry_id)
        else:
            exits = [(start_node.node_id, "", "normal")]

        if is_entrypoint and exits:
            end_node = self._add_node(NodeKind.END, f"END: {self.func_name}", "Exit", body[-1].lineno if body else 1)
            self._link_exits(exits, end_node.node_id)

        return FunctionIR(
            name=self.func_name,
            params=params,
            nodes=self.nodes,
            edges=self.edges,
            is_entrypoint=is_entrypoint,
        )

    def _is_simple_stmt(self, stmt: ast.stmt) -> bool:
        if not isinstance(stmt, (ast.Assign, ast.AnnAssign, ast.AugAssign, ast.Expr)):
            return False
        return _find_user_call(stmt, self.user_funcs) is None

    def _build_stmt_list(self, stmts: List[ast.stmt]) -> Tuple[Optional[str], List[Tuple[str, str, str]]]:
        """Compile a sequence of statements, returning (entry_node_id, [(exit_id, label, edge_type)])."""
        if not stmts:
            return None, []

        first_entry: Optional[str] = None
        pending_exits: List[Tuple[str, str, str]] = []
        idx = 0

        while idx < len(stmts):
            stmt = stmts[idx]

            # Batch consecutive simple statements (up to 4) into one readable PROCESS node
            if self._is_simple_stmt(stmt):
                batch_lines: List[str] = []
                first_line = stmt.lineno
                while idx < len(stmts) and self._is_simple_stmt(stmts[idx]) and len(batch_lines) < 4:
                    batch_lines.append(_unparse(stmts[idx]))
                    idx += 1
                title = "Variables / Process" if any("=" in ln for ln in batch_lines) else "Process / Output"
                node = self._add_node(NodeKind.PROCESS, title, "\n".join(batch_lines), first_line)
                if first_entry is None:
                    first_entry = node.node_id
                self._link_exits(pending_exits, node.node_id)
                pending_exits = [(node.node_id, "", "normal")]
                continue

            entry_id, exits = self._build_single_stmt(stmt)
            idx += 1
            if entry_id is None:
                continue
            if first_entry is None:
                first_entry = entry_id
            self._link_exits(pending_exits, entry_id)
            pending_exits = exits

        return first_entry, pending_exits

    def _build_single_stmt(self, stmt: ast.stmt) -> Tuple[Optional[str], List[Tuple[str, str, str]]]:
        line_no = getattr(stmt, "lineno", 1)

        # User-defined function call inside an assignment or expression
        target_fn = _find_user_call(stmt, self.user_funcs)
        if isinstance(stmt, (ast.Assign, ast.AnnAssign, ast.Expr)) and target_fn is not None:
            node = self._add_node(
                NodeKind.CALL,
                f"Call: {target_fn}()",
                _unparse(stmt),
                line_no,
                calls_target=target_fn,
            )
            return node.node_id, [(node.node_id, "", "normal")]

        # If / Elif / Else
        if isinstance(stmt, ast.If):
            cond_txt = _unparse(stmt.test)
            dec_node = self._add_node(NodeKind.DECISION, f"if {cond_txt}?", "", line_no)

            exits: List[Tuple[str, str, str]] = []
            true_entry, true_exits = self._build_stmt_list(stmt.body)
            if true_entry is not None:
                self._add_edge(dec_node.node_id, true_entry, label="True", edge_type="true")
                exits.extend(true_exits)
            else:
                exits.append((dec_node.node_id, "True", "true"))

            if stmt.orelse:
                false_entry, false_exits = self._build_stmt_list(stmt.orelse)
                if false_entry is not None:
                    self._add_edge(dec_node.node_id, false_entry, label="False", edge_type="false")
                    exits.extend(false_exits)
                else:
                    exits.append((dec_node.node_id, "False", "false"))
            else:
                exits.append((dec_node.node_id, "False", "false"))

            return dec_node.node_id, exits

        # For loop
        if isinstance(stmt, ast.For):
            header_txt = f"for {_unparse(stmt.target)} in {_unparse(stmt.iter)}"
            loop_node = self._add_node(NodeKind.LOOP_FOR, "For Loop", header_txt, line_no)
            body_entry, body_exits = self._build_stmt_list(stmt.body)
            if body_entry is not None:
                self._add_edge(loop_node.node_id, body_entry, label="Each item", edge_type="normal")
                for b_id, b_lbl, _ in body_exits:
                    self._add_edge(b_id, loop_node.node_id, label=b_lbl or "Next", edge_type="loopback")
            return loop_node.node_id, [(loop_node.node_id, "Done", "normal")]

        # While loop
        if isinstance(stmt, ast.While):
            cond_txt = _unparse(stmt.test)
            while_node = self._add_node(NodeKind.DECISION, f"while {cond_txt}?", "", line_no)
            body_entry, body_exits = self._build_stmt_list(stmt.body)
            if body_entry is not None:
                self._add_edge(while_node.node_id, body_entry, label="True", edge_type="true")
                for b_id, b_lbl, _ in body_exits:
                    self._add_edge(b_id, while_node.node_id, label=b_lbl or "Loop", edge_type="loopback")
            return while_node.node_id, [(while_node.node_id, "False", "false")]

        # Try / Except
        if isinstance(stmt, ast.Try):
            try_node = self._add_node(NodeKind.TRY_BLOCK, "try:", "Error-guarded block", line_no)
            body_entry, body_exits = self._build_stmt_list(stmt.body)
            exits: List[Tuple[str, str, str]] = []
            if body_entry is not None:
                self._add_edge(try_node.node_id, body_entry, label="Try", edge_type="normal")
                exits.extend(body_exits)
            else:
                exits.append((try_node.node_id, "", "normal"))

            for handler in stmt.handlers:
                exc_type = _unparse(handler.type) if handler.type else "Exception"
                exc_name = f" as {handler.name}" if handler.name else ""
                handler_title = f"except {exc_type}{exc_name}:"
                handler_code = "\n".join(_unparse(s) for s in handler.body[:3])
                exc_node = self._add_node(NodeKind.EXCEPT, handler_title, handler_code, handler.lineno)
                self._add_edge(try_node.node_id, exc_node.node_id, label=f"On {exc_type}", edge_type="exception")
                exits.append((exc_node.node_id, "", "normal"))

            return try_node.node_id, exits

        # Return
        if isinstance(stmt, ast.Return):
            val = _unparse(stmt.value) if stmt.value else "None"
            ret_node = self._add_node(NodeKind.RETURN, f"return {val}", "", line_no)
            return ret_node.node_id, []

        # Raise
        if isinstance(stmt, ast.Raise):
            exc_txt = _unparse(stmt.exc) if stmt.exc else "Exception"
            raise_node = self._add_node(NodeKind.EXCEPT, "raise", exc_txt, line_no)
            return raise_node.node_id, []

        # Fallback for any other statement
        other_node = self._add_node(NodeKind.PROCESS, type(stmt).__name__, _unparse(stmt), line_no)
        return other_node.node_id, [(other_node.node_id, "", "normal")]


def parse_python_file(file_path: str, parser_backend: str = "ast") -> ModuleIR:
    """Parse a Python source file into a deterministic ModuleIR."""
    with open(file_path, "r", encoding="utf-8") as fh:
        source = fh.read()

    tree = ast.parse(source, filename=file_path)
    comments = _extract_ts_comments(source) if parser_backend == "tree-sitter" else {}

    func_defs = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
    user_funcs = {fn.name for fn in func_defs}

    # Determine entrypoint function (prefer main() if present)
    entry_name = "main" if "main" in user_funcs else (func_defs[0].name if func_defs else "")

    functions_ir: List[FunctionIR] = []
    # Put entrypoint first so layout places it in the left swimlane
    ordered_defs = sorted(func_defs, key=lambda f: (0 if f.name == entry_name else 1, f.lineno))

    for fn in ordered_defs:
        params = [arg.arg for arg in fn.args.args]
        builder = _FuncCFGBuilder(fn.name, user_funcs, comments)
        fn_ir = builder.build(fn.body, params, is_entrypoint=(fn.name == entry_name))
        functions_ir.append(fn_ir)

    # Handle scripts with top-level statements and no functions
    if not functions_ir:
        top_stmts = [n for n in tree.body if not isinstance(n, (ast.Import, ast.ImportFrom))]
        builder = _FuncCFGBuilder("module", user_funcs, comments)
        functions_ir.append(builder.build(top_stmts, [], is_entrypoint=True))

    return ModuleIR(filename=os.path.basename(file_path), functions=functions_ir)
