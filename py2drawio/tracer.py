"""Optional runtime trace collector using sys.settrace for concrete execution tables."""

import contextlib
import io
import os
import runpy
import sys
from typing import Dict, List, Set, Tuple

from .ir import CallTraceEvent, TraceReport


def run_with_trace(file_path: str, target_funcs: Set[str], max_events: int = 100) -> TraceReport:
    """Execute a Python script under sys.settrace and capture locals, calls, and stdout."""
    abs_path = os.path.abspath(file_path)
    stdout_buf = io.StringIO()
    call_events: List[CallTraceEvent] = []
    active_frames: Dict[int, Tuple[str, str, int]] = {}
    locals_snapshot: List[Tuple[str, str, str]] = []
    error_text: str | None = None

    def _safe_repr(val: object, limit: int = 42) -> str:
        text = repr(val)
        return text if len(text) <= limit else text[: limit - 3] + "..."

    def trace_fn(frame, event: str, arg):
        if os.path.abspath(frame.f_code.co_filename) != abs_path:
            return trace_fn

        fn_name = frame.f_code.co_name
        frame_id = id(frame)

        if event == "call" and fn_name in target_funcs and len(call_events) < max_events:
            arg_names = frame.f_code.co_varnames[: frame.f_code.co_argcount]
            args_str = ", ".join(f"{k}={_safe_repr(frame.f_locals.get(k), 20)}" for k in arg_names)
            active_frames[frame_id] = (fn_name, args_str, frame.f_lineno)

        elif event == "return":
            if fn_name in ("main", "<module>") and not locals_snapshot:
                for k, v in frame.f_locals.items():
                    if not k.startswith("_") and not callable(v):
                        locals_snapshot.append((k, type(v).__name__, _safe_repr(v)))

            if frame_id in active_frames:
                f_name, args_str, line_no = active_frames.pop(frame_id)
                if f_name not in ("main", "<module>") and len(call_events) < max_events:
                    call_events.append(
                        CallTraceEvent(
                            func_name=f_name,
                            args_repr=args_str,
                            return_repr=_safe_repr(arg),
                            line_no=line_no,
                        )
                    )
        return trace_fn

    prev_trace = sys.gettrace()
    try:
        with contextlib.redirect_stdout(stdout_buf):
            sys.settrace(trace_fn)
            runpy.run_path(abs_path, run_name="__main__")
    except Exception as exc:
        error_text = f"{type(exc).__name__}: {exc}"
    finally:
        sys.settrace(prev_trace)

    return TraceReport(
        locals_snapshot=locals_snapshot,
        call_events=call_events,
        stdout_text=stdout_buf.getvalue().strip(),
        error_text=error_text,
    )
