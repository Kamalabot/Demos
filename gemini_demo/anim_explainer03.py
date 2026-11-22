import math
import sys
from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple
import dearcygui as dcg

# Open Source Notice:
# DearCyGui (MIT License) - Cython-powered GPU GUI toolkit for Dear ImGui.
# Requirements: dearcygui (installable via pip in target Python virtual environment).

Point = Tuple[float, float]


def cubic_bezier_point(p0: Point, p1: Point, p2: Point, p3: Point, t: float) -> Point:
    """Computes coordinates on a Cubic Bezier curve at parameter t in [0.0, 1.0]."""
    u = 1.0 - t
    tt = t * t
    uu = u * u
    uuu = uu * u
    ttt = tt * t
    x = uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0]
    y = uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1]
    return (x, y)


def ease_in_out(t: float) -> float:
    """Smooth cosine ease-in-out curve for fluid motion."""
    clamped = max(0.0, min(1.0, t))
    return 0.5 - 0.5 * math.cos(math.pi * clamped)


def lerp(a: float, b: float, u: float) -> float:
    return a + (b - a) * u


@dataclass
class AnimationClip:
    """Declarative animation clip defining phase boundaries and update callbacks."""
    start: float
    end: float
    badge: str
    code_line: str
    telemetry_fmt: str
    update_fn: Callable[["ExplainerContext", float], None]


@dataclass
class ExplainerContext:
    """Mutable context passed to animation clips."""
    state: dict
    # Stack widgets
    stack_x_box: dcg.DrawRect
    stack_x_val: dcg.DrawText
    stack_y_box: dcg.DrawRect
    stack_y_val: dcg.DrawText
    stack_arr_box: dcg.DrawRect
    stack_arr_val: dcg.DrawText
    stack_alias_box: dcg.DrawRect
    stack_alias_val: dcg.DrawText
    # Heap widgets
    heap_obj_box: dcg.DrawRect
    heap_header_txt: dcg.DrawText
    heap_elements: List[dcg.DrawRect]
    heap_elem_txts: List[dcg.DrawText]
    heap_elem4_box: dcg.DrawRect
    heap_elem4_txt: dcg.DrawText
    # Pointers
    arr_pointer: dcg.DrawBezierCubic
    arr_pointer_glow: dcg.DrawBezierCubic
    alias_pointer: dcg.DrawBezierCubic
    alias_pointer_glow: dcg.DrawBezierCubic
    # Flight packet for copying
    copy_packet: dcg.DrawRect
    copy_packet_txt: dcg.DrawText
    # HUD / Telemetry
    phase_badge: dcg.Text
    code_badge: dcg.Text
    telemetry_txt: dcg.Text
    type_info_txt: dcg.DrawText
    bits_info_txt: dcg.DrawText


def main() -> None:
    try:
        C = dcg.Context()
        # Viewport configuration for uninterrupted 60 FPS presentation
        C.viewport.initialize(
            title="Visual Programming Explainer: Variables & Memory Types [v03]",
            width=1100,
            height=700,
            wait_for_input=False,
            vsync=True,
            always_submit_to_gpu=True,
        )
        C.viewport.always_submit_to_gpu = True

        state = {
            "playing": True,
            "t": 0.0,
            "speed": 1.0,
            "active_type": "INT",  # "INT", "FLOAT", "STRING", "LIST"
            "last_frame_ns": 0,
            "accumulator": 0.0,
            "sim_time": 0.0,
        }

        def toggle_play(sender, target, data) -> None:
            state["playing"] = not state["playing"]
            C.viewport.wait_for_input = not state["playing"]
            if state["playing"]:
                state["last_frame_ns"] = 0
                C.viewport.wake()
            print(f"[INFO] Simulation: {'RUNNING' if state['playing'] else 'PAUSED'}")

        def reset_anim(sender, target, data) -> None:
            state["t"] = 0.0
            state["accumulator"] = 0.0
            C.viewport.wake()
            print("[INFO] Timeline reset to 0.0s")

        def step_anim(sender, target, data) -> None:
            state["playing"] = False
            C.viewport.wait_for_input = False
            state["t"] = (state["t"] + 0.25) % 4.0
            C.viewport.wake()
            print(f"[INFO] Stepped to t={state['t']:.2f}s")

        with dcg.Window(C, label="Interactive Memory Architecture: Variables & Types [v03]", primary=True) as win:
            # Control Toolbar
            with dcg.HorizontalLayout(C):
                dcg.Button(C, label="Play / Pause", callback=toggle_play)
                dcg.Button(C, label="Step +0.25s", callback=step_anim)
                dcg.Button(C, label="Reset", callback=reset_anim)
                dcg.Slider(
                    C,
                    label="Speed",
                    min_value=0.2,
                    max_value=3.0,
                    value=1.0,
                    width=130,
                    callback=lambda s, t, d: state.update(speed=d),
                )
                code_badge = dcg.Text(C, value="CODE: let x = 42")

            # Timeline Scrubber & Phase Telemetry
            with dcg.HorizontalLayout(C):
                scrubber = dcg.Slider(
                    C,
                    label="Timeline (s)",
                    min_value=0.0,
                    max_value=4.0,
                    value=0.0,
                    width=250,
                    callback=lambda s, t, d: (state.update(t=d), C.viewport.wake()),
                )
                phase_badge = dcg.Text(C, value="Phase: [1/4] VARIABLE ALLOCATION (Stack Binding)")
                telemetry_txt = dcg.Text(C, value=" | STACK: 0x7FFF0010 | TYPE: i64 (8 bytes)")

            # Vector Graphics Canvas
            with dcg.DrawInWindow(C, width=1060, height=560):
                # Background circuit / memory cell grid
                for gy in range(40, 560, 40):
                    dcg.DrawLine(C, p1=(20, gy), p2=(1040, gy), color=(22, 28, 40, 80), thickness=1)

                # =========================================================================
                # 1. STACK MEMORY REGION (Left Panel: Fast, Fixed-Size Activation Frame)
                # =========================================================================
                dcg.DrawRect(
                    C,
                    pmin=(40, 40),
                    pmax=(340, 500),
                    color=(70, 140, 240),
                    fill=(16, 24, 40),
                    rounding=10,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(90, 55), text="CALL STACK (Fast, LIFO)", color=(210, 230, 255))
                dcg.DrawText(C, pos=(50, 75), text="[Identifier]     [Type Tag]    [Memory Slot: 0x7FFF...]", color=(120, 150, 190))
                dcg.DrawLine(C, p1=(50, 95), p2=(330, 95), color=(40, 65, 100), thickness=1)

                # Slot 1: Variable `x` (Primitive int)
                stack_x_box = dcg.DrawRect(
                    C,
                    pmin=(55, 110),
                    pmax=(325, 160),
                    color=(50, 110, 180),
                    fill=(24, 38, 62),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(65, 120), text="let x", color=(240, 200, 90))
                dcg.DrawText(C, pos=(135, 120), text="i64 (8B)", color=(140, 180, 220))
                stack_x_val = dcg.DrawText(C, pos=(235, 120), text="42", color=(255, 255, 255))
                dcg.DrawText(C, pos=(65, 142), text="Addr: 0x7FFF0010  (Stack Slot)", color=(100, 130, 160))

                # Slot 2: Variable `y` (Primitive copy of x)
                stack_y_box = dcg.DrawRect(
                    C,
                    pmin=(55, 180),
                    pmax=(325, 230),
                    color=(50, 110, 180),
                    fill=(20, 30, 48),
                    rounding=6,
                    thickness=1,
                )
                dcg.DrawText(C, pos=(65, 190), text="let y", color=(240, 200, 90))
                dcg.DrawText(C, pos=(135, 190), text="i64 (8B)", color=(140, 180, 220))
                stack_y_val = dcg.DrawText(C, pos=(235, 190), text="--", color=(180, 180, 180))
                dcg.DrawText(C, pos=(65, 212), text="Addr: 0x7FFF0018  (Independent Slot)", color=(100, 130, 160))

                # Slot 3: Variable `data` (Reference / Pointer to Heap)
                stack_arr_box = dcg.DrawRect(
                    C,
                    pmin=(55, 260),
                    pmax=(325, 310),
                    color=(50, 110, 180),
                    fill=(20, 30, 48),
                    rounding=6,
                    thickness=1,
                )
                dcg.DrawText(C, pos=(65, 270), text="let data", color=(100, 235, 245))
                dcg.DrawText(C, pos=(135, 270), text="ptr (8B)", color=(140, 180, 220))
                stack_arr_val = dcg.DrawText(C, pos=(205, 270), text="0x00A034F0", color=(180, 180, 180))
                dcg.DrawText(C, pos=(65, 292), text="Addr: 0x7FFF0020  (Points -> Heap)", color=(100, 130, 160))

                # Slot 4: Variable `alias` (Reference alias)
                stack_alias_box = dcg.DrawRect(
                    C,
                    pmin=(55, 335),
                    pmax=(325, 385),
                    color=(50, 110, 180),
                    fill=(20, 30, 48),
                    rounding=6,
                    thickness=1,
                )
                dcg.DrawText(C, pos=(65, 345), text="let alias", color=(235, 130, 245))
                dcg.DrawText(C, pos=(135, 345), text="ptr (8B)", color=(140, 180, 220))
                stack_alias_val = dcg.DrawText(C, pos=(205, 345), text="--", color=(180, 180, 180))
                dcg.DrawText(C, pos=(65, 367), text="Addr: 0x7FFF0028  (Shared Pointer)", color=(100, 130, 160))

                # Stack explanation footnote
                dcg.DrawText(
                    C,
                    pos=(55, 420),
                    text="PRIMITIVE RULE: Primitives (int, float, bool)\nare stored directly inside the stack frame slot.\nAssignment (=) copies the raw bits.",
                    color=(140, 175, 215),
                )

                # =========================================================================
                # 2. HEAP MEMORY REGION (Right Panel: Dynamic, Managed Allocations)
                # =========================================================================
                dcg.DrawRect(
                    C,
                    pmin=(720, 40),
                    pmax=(1020, 500),
                    color=(50, 190, 120),
                    fill=(14, 30, 24),
                    rounding=10,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(770, 55), text="MANAGED HEAP (Dynamic Objects)", color=(180, 245, 210))
                dcg.DrawText(C, pos=(740, 75), text="[Heap Block: 0x00A034F0]  |  [Ref Count: 1]", color=(120, 190, 160))
                dcg.DrawLine(C, p1=(735, 95), p2=(1005, 95), color=(30, 75, 50), thickness=1)

                # Heap Object Container: `List<int>`
                heap_obj_box = dcg.DrawRect(
                    C,
                    pmin=(740, 120),
                    pmax=(1000, 320),
                    color=(40, 140, 90),
                    fill=(20, 44, 34),
                    rounding=8,
                    thickness=2,
                )
                heap_header_txt = dcg.DrawText(
                    C,
                    pos=(755, 130),
                    text="OBJECT: Array (type=i64[], len=3, cap=4)",
                    color=(240, 220, 100),
                )

                # Array Elements inside the heap object
                heap_elements = []
                heap_elem_txts = []
                raw_vals = ["10", "20", "30"]
                for i in range(3):
                    ey = 165 + i * 42
                    box = dcg.DrawRect(
                        C,
                        pmin=(760, ey),
                        pmax=(980, ey + 36),
                        color=(60, 160, 110),
                        fill=(26, 56, 42),
                        rounding=4,
                        thickness=1,
                    )
                    heap_elements.append(box)
                    t_lbl = dcg.DrawText(C, pos=(775, ey + 10), text=f"Index [{i}]:", color=(160, 215, 185))
                    t_val = dcg.DrawText(C, pos=(885, ey + 10), text=raw_vals[i], color=(255, 255, 255))
                    heap_elem_txts.append(t_val)

                # Dynamically appended Element [3] for Phase 4 mutation
                heap_elem4_box = dcg.DrawRect(
                    C,
                    pmin=(760, 165 + 3 * 42),
                    pmax=(980, 165 + 3 * 42 + 36),
                    color=(235, 130, 245),
                    fill=(45, 25, 50),
                    rounding=4,
                    thickness=2,
                )
                heap_elem4_box.show = False
                heap_elem4_lbl = dcg.DrawText(C, pos=(775, 165 + 3 * 42 + 10), text="Index [3]:", color=(235, 160, 245))
                heap_elem4_lbl.show = False
                heap_elem4_txt = dcg.DrawText(C, pos=(885, 165 + 3 * 42 + 10), text="99 (Appended)", color=(255, 255, 255))
                heap_elem4_txt.show = False

                # Heap explanation footnote
                dcg.DrawText(
                    C,
                    pos=(740, 360),
                    text="REFERENCE RULE: Heap objects are allocated\ndynamically. Variables hold references (pointers).\nMultiple variables can point to the same object!",
                    color=(150, 205, 180),
                )

                # =========================================================================
                # 3. INTERACTIVE POINTER HIGHWAYS (Curved Bezier Paths Stack -> Heap)
                # =========================================================================
                # Pointer 1: `data` variable -> Heap Object
                arr_pointer_glow = dcg.DrawBezierCubic(
                    C,
                    p1=(325, 285),
                    p2=(480, 220),
                    p3=(600, 180),
                    p4=(740, 180),
                    color=(40, 215, 235, 40),
                    thickness=10,
                )
                arr_pointer = dcg.DrawBezierCubic(
                    C,
                    p1=(325, 285),
                    p2=(480, 220),
                    p3=(600, 180),
                    p4=(740, 180),
                    color=(40, 215, 235, 220),
                    thickness=3,
                )

                # Pointer 2: `alias` variable -> Same Heap Object
                alias_pointer_glow = dcg.DrawBezierCubic(
                    C,
                    p1=(325, 360),
                    p2=(480, 360),
                    p3=(620, 250),
                    p4=(740, 220),
                    color=(210, 90, 230, 40),
                    thickness=10,
                )
                alias_pointer = dcg.DrawBezierCubic(
                    C,
                    p1=(325, 360),
                    p2=(480, 360),
                    p3=(620, 250),
                    p4=(740, 220),
                    color=(220, 95, 240, 220),
                    thickness=3,
                )

                # Initially hide pointers until phase 3 & 4
                arr_pointer_glow.show = False
                arr_pointer.show = False
                alias_pointer_glow.show = False
                alias_pointer.show = False

                # Flight Packet for visualizing Value Copying (Stack Slot X -> Y)
                copy_packet = dcg.DrawRect(
                    C,
                    pmin=(0, 0),
                    pmax=(50, 30),
                    color=(255, 220, 80),
                    fill=(240, 180, 30),
                    rounding=6,
                    thickness=2,
                )
                copy_packet_txt = dcg.DrawText(C, pos=(0, 0), text="42", color=(10, 10, 15))
                copy_packet.show = False
                copy_packet_txt.show = False

                # Central Type Inspector HUD
                dcg.DrawRect(
                    C,
                    pmin=(370, 70),
                    pmax=(690, 470),
                    color=(60, 80, 110),
                    fill=(18, 24, 34, 180),
                    rounding=8,
                    thickness=1,
                )
                dcg.DrawText(C, pos=(420, 85), text="[TYPE DESCRIPTOR & MEMORY HUD]", color=(180, 205, 240))
                type_info_txt = dcg.DrawText(C, pos=(385, 120), text="TYPE: 64-bit Signed Integer (i64)", color=(255, 220, 100))
                bits_info_txt = dcg.DrawText(
                    C,
                    pos=(385, 150),
                    text="RAW BITS:\n00000000 00000000\n00000000 00000000\n00000000 00000000\n00000000 00101010",
                    color=(140, 210, 180),
                )

                dcg.DrawText(
                    C,
                    pos=(385, 280),
                    text="KEY INSIGHT:\nVariables don't store objects.\nVariables store bit patterns:\n- Primitives = Literal Values\n- Objects = Memory Addresses",
                    color=(210, 225, 255),
                )

        ctx = ExplainerContext(
            state=state,
            stack_x_box=stack_x_box,
            stack_x_val=stack_x_val,
            stack_y_box=stack_y_box,
            stack_y_val=stack_y_val,
            stack_arr_box=stack_arr_box,
            stack_arr_val=stack_arr_val,
            stack_alias_box=stack_alias_box,
            stack_alias_val=stack_alias_val,
            heap_obj_box=heap_obj_box,
            heap_header_txt=heap_header_txt,
            heap_elements=heap_elements,
            heap_elem_txts=heap_elem_txts,
            heap_elem4_box=heap_elem4_box,
            heap_elem4_txt=heap_elem4_txt,
            arr_pointer=arr_pointer,
            arr_pointer_glow=arr_pointer_glow,
            alias_pointer=alias_pointer,
            alias_pointer_glow=alias_pointer_glow,
            copy_packet=copy_packet,
            copy_packet_txt=copy_packet_txt,
            phase_badge=phase_badge,
            code_badge=code_badge,
            telemetry_txt=telemetry_txt,
            type_info_txt=type_info_txt,
            bits_info_txt=bits_info_txt,
        )

        # =========================================================================
        # DECLARATIVE ANIMATION PHASES
        # =========================================================================
        def update_phase_1(c: ExplainerContext, u: float) -> None:
            # Phase 1: Allocation of Primitive `x = 42`
            eased_u = ease_in_out(u)
            c.stack_x_box.color = (int(50 + 190 * eased_u), int(110 + 100 * eased_u), 80)
            c.stack_x_box.fill = (int(24 + 40 * eased_u), int(38 + 30 * eased_u), 70)
            c.stack_x_val.text = "42"

            # Reset subsequent slots
            c.stack_y_val.text = "--"
            c.stack_y_box.fill = (20, 30, 48)
            c.stack_arr_val.text = "--"
            c.stack_alias_val.text = "--"
            c.copy_packet.show = False
            c.copy_packet_txt.show = False
            c.arr_pointer.show = False
            c.arr_pointer_glow.show = False
            c.alias_pointer.show = False
            c.alias_pointer_glow.show = False
            c.heap_elem4_box.show = False
            c.heap_elem4_txt.show = False

            c.type_info_txt.text = "TYPE: Primitive Signed Integer (i64, 8 Bytes)"
            c.bits_info_txt.text = "RAW MEMORY BITS:\n00000000 00000000\n00000000 00000000\n00000000 00000000\n00000000 00101010  (= 42)"

        def update_phase_2(c: ExplainerContext, u: float) -> None:
            # Phase 2: Primitive Value Copy `y = x`
            eased_u = ease_in_out(u)
            c.stack_x_box.color = (50, 110, 180)
            c.stack_x_box.fill = (24, 38, 62)

            # Flight packet copying bits from Slot 1 (y=135) to Slot 2 (y=205)
            pkt_y = lerp(135.0, 205.0, eased_u)
            c.copy_packet.show = True
            c.copy_packet_txt.show = True
            c.copy_packet.pmin = (220, pkt_y - 14)
            c.copy_packet.pmax = (270, pkt_y + 14)
            c.copy_packet_txt.pos = (235, pkt_y - 8)

            if u > 0.8:
                c.stack_y_val.text = "42"
                c.stack_y_box.fill = (35, 60, 45)
                c.stack_y_box.color = (80, 230, 140)
            else:
                c.stack_y_val.text = "--"
                c.stack_y_box.fill = (20, 30, 48)

            c.arr_pointer.show = False
            c.arr_pointer_glow.show = False
            c.alias_pointer.show = False
            c.alias_pointer_glow.show = False

            c.type_info_txt.text = "OPERATION: Value Copy (Duplicate Bits)"
            c.bits_info_txt.text = "RESULT: Independent Storage\nStack Slot x: 0x7FFF0010 = 42\nStack Slot y: 0x7FFF0018 = 42\nModifying y will NEVER affect x!"

        def update_phase_3(c: ExplainerContext, u: float) -> None:
            # Phase 3: Reference Allocation `data = [10, 20, 30]`
            eased_u = ease_in_out(u)
            c.copy_packet.show = False
            c.copy_packet_txt.show = False

            c.stack_y_val.text = "42"
            c.stack_y_box.color = (50, 110, 180)
            c.stack_y_box.fill = (24, 38, 62)

            # Pointer grows from Stack Slot 3 to Heap Block
            c.stack_arr_val.text = "0x00A034F0"
            c.stack_arr_box.fill = (20, 50, 60)
            c.stack_arr_box.color = (40, 215, 235)

            c.arr_pointer.show = True
            c.arr_pointer_glow.show = True
            # Dynamically animate pointer curve endpoint arriving at Heap
            head_x = lerp(325.0, 740.0, eased_u)
            head_y = lerp(285.0, 180.0, eased_u)
            c.arr_pointer.p4 = (head_x, head_y)
            c.arr_pointer_glow.p4 = (head_x, head_y)

            # Highlight Heap Object
            c.heap_obj_box.color = (80, 235, 170)
            c.heap_obj_box.fill = (24, 55, 42)
            c.heap_header_txt.text = "OBJECT: Array (Heap: 0x00A034F0, RefCount: 1)"

            c.alias_pointer.show = False
            c.alias_pointer_glow.show = False
            c.stack_alias_val.text = "--"
            c.heap_elem4_box.show = False
            c.heap_elem4_txt.show = False

            c.type_info_txt.text = "TYPE: Reference / Pointer (Heap Allocated)"
            c.bits_info_txt.text = "STACK VALUE: 0x00A034F0\nThe variable holds only a 64-bit\nmemory address (pointer).\nThe actual array elements live\nin Dynamic Heap RAM."

        def update_phase_4(c: ExplainerContext, u: float) -> None:
            # Phase 4: Aliasing & Shared Mutation `alias = data; alias.append(99)`
            eased_u = ease_in_out(u)
            c.arr_pointer.show = True
            c.arr_pointer_glow.show = True
            c.arr_pointer.p4 = (740, 180)
            c.arr_pointer_glow.p4 = (740, 180)

            c.stack_alias_val.text = "0x00A034F0"
            c.stack_alias_box.fill = (45, 25, 52)
            c.stack_alias_box.color = (220, 95, 240)

            c.alias_pointer.show = True
            c.alias_pointer_glow.show = True
            alias_head_x = lerp(325.0, 740.0, min(1.0, eased_u * 1.5))
            alias_head_y = lerp(360.0, 220.0, min(1.0, eased_u * 1.5))
            c.alias_pointer.p4 = (alias_head_x, alias_head_y)
            c.alias_pointer_glow.p4 = (alias_head_x, alias_head_y)

            c.heap_header_txt.text = "OBJECT: Array (Heap: 0x00A034F0, RefCount: 2)"

            # Show mutated 4th element at end of phase
            if u > 0.5:
                c.heap_elem4_box.show = True
                c.heap_elem4_txt.show = True
                c.heap_elem4_box.color = (235, 130, 245)
                c.heap_header_txt.text = "OBJECT: Array (Heap: 0x00A034F0, len=4, RefCount: 2)"

            c.type_info_txt.text = "MUTATION: Aliased Reference Modification"
            c.bits_info_txt.text = "KEY TAKEAWAY:\nBoth 'data' & 'alias' point to\nthe SAME Heap memory address!\nMutating 'alias' immediately\naffects 'data'!"

        timeline: List[AnimationClip] = [
            AnimationClip(
                start=0.0,
                end=1.0,
                badge="Phase: [1/4] PRIMITIVE ALLOCATION (let x = 42)",
                code_line="CODE: let x: i64 = 42;  // Stack allocated directly",
                telemetry_fmt=" | STACK: 0x7FFF0010 | VALUE: 42 | SIZE: 8 Bytes",
                update_fn=update_phase_1,
            ),
            AnimationClip(
                start=1.0,
                end=2.0,
                badge="Phase: [2/4] VALUE COPYING (let y = x)",
                code_line="CODE: let y: i64 = x;   // Deep copy of literal bits",
                telemetry_fmt=" | STACK: 0x7FFF0018 | COPIED: 42 | SLOTS ARE DECOUPLED",
                update_fn=update_phase_2,
            ),
            AnimationClip(
                start=2.0,
                end=3.0,
                badge="Phase: [3/4] HEAP REFERENCE (let data = [10, 20, 30])",
                code_line="CODE: let data = [10, 20, 30]; // Stack holds Heap pointer",
                telemetry_fmt=" | PTR: 0x00A034F0 -> HEAP | REF_COUNT: 1",
                update_fn=update_phase_3,
            ),
            AnimationClip(
                start=3.0,
                end=4.0,
                badge="Phase: [4/4] ALIASING & MUTATION (alias = data; alias.push(99))",
                code_line="CODE: let alias = data; alias.push(99); // Shared object mutated!",
                telemetry_fmt=" | SHARED PTR: 0x00A034F0 | REF_COUNT: 2 | LEN: 4",
                update_fn=update_phase_4,
            ),
        ]

        def evaluate_timeline(t: float) -> None:
            for clip in timeline:
                if clip.start <= t < clip.end:
                    u = (t - clip.start) / (clip.end - clip.start)
                    clip.update_fn(ctx, u)
                    phase_badge.value = clip.badge
                    code_badge.value = clip.code_line
                    telemetry_txt.value = clip.telemetry_fmt
                    return

        # =========================================================================
        # 60 HZ FIXED-TIMESTEP NATIVE TIMING
        # =========================================================================
        FIXED_STEP = 1.0 / 60.0

        def on_viewport_frame(sender, target, metrics: tuple) -> None:
            current_ns = metrics[2]

            if state["last_frame_ns"] == 0:
                state["last_frame_ns"] = current_ns
                return

            dt = (current_ns - state["last_frame_ns"]) * 1e-9
            state["last_frame_ns"] = current_ns
            clamped_dt = min(dt, 0.1)

            if state["playing"]:
                state["accumulator"] += clamped_dt * state["speed"]
                while state["accumulator"] >= FIXED_STEP:
                    state["t"] = (state["t"] + FIXED_STEP) % 4.0
                    state["accumulator"] -= FIXED_STEP
                scrubber.value = state["t"]

            state["sim_time"] += clamped_dt
            evaluate_timeline(state["t"])

            if state["playing"]:
                C.viewport.wake(full_refresh=True)

        dcg.TimeWatcher(C, parent=win, callback=on_viewport_frame)

        while C.running:
            C.viewport.render_frame()

    except Exception as exc:
        print(f"[ERROR] DearCyGui explainer failed: {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
