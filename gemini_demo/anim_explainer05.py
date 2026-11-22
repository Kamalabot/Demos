import math
import sys
from dataclasses import dataclass
from typing import Callable, List, Tuple
import dearcygui as dcg

# Open Source Notice:
# DearCyGui (MIT License) - Cython-powered GPU GUI toolkit for Dear ImGui.
# Requirements: dearcygui (installable via pip in target Python virtual environment).

Point = Tuple[float, float]


def ease_in_out(t: float) -> float:
    """Smooth cosine ease-in-out curve for clean, organic transitions."""
    clamped = max(0.0, min(1.0, t))
    return 0.5 - 0.5 * math.cos(math.pi * clamped)


def lerp(a: float, b: float, u: float) -> float:
    return a + (b - a) * u


@dataclass
class AnimationClip:
    start: float
    end: float
    concept_badge: str
    code_line_idx: int
    flow_node_pos: Point
    explanation: str
    update_fn: Callable[["StageContext", float], None]


@dataclass
class StageContext:
    state: dict
    # Code highlight
    code_cursor: dcg.DrawRect
    # Stack items
    stack_frame_box: dcg.DrawRect
    stack_val_id: dcg.DrawText
    stack_val_score: dcg.DrawText
    stack_val_user_ptr: dcg.DrawText
    stack_val_total: dcg.DrawText
    stack_val_bonus: dcg.DrawText
    # Flow token
    token_box: dcg.DrawRect
    token_txt: dcg.DrawText
    # Condition decision
    cond_diamond: dcg.DrawPolyline
    cond_true_wire: dcg.DrawLine
    cond_status_txt: dcg.DrawText
    # Loop indicator
    loop_badge: dcg.DrawRect
    loop_badge_txt: dcg.DrawText
    # Heap object
    heap_obj_box: dcg.DrawRect
    heap_val_status: dcg.DrawText
    heap_ptr_wire: dcg.DrawLine
    # UI text
    status_text: dcg.Text
    concept_text: dcg.Text


def main() -> None:
    try:
        C = dcg.Context()
        # Viewport configured for clean 60 FPS presentation
        C.viewport.initialize(
            title="All-in-One Programming Concepts Explainer [v05]",
            width=1120,
            height=720,
            wait_for_input=False,
            vsync=True,
            always_submit_to_gpu=True,
        )
        C.viewport.always_submit_to_gpu = True

        state = {
            "playing": True,
            "t": 0.0,
            "speed": 1.0,
            "last_frame_ns": 0,
            "accumulator": 0.0,
        }

        def toggle_play(sender, target, data) -> None:
            state["playing"] = not state["playing"]
            C.viewport.wait_for_input = not state["playing"]
            if state["playing"]:
                state["last_frame_ns"] = 0
                C.viewport.wake()
            print(f"[INFO] Execution: {'RUNNING' if state['playing'] else 'PAUSED'}")

        def reset_anim(sender, target, data) -> None:
            state["t"] = 0.0
            state["accumulator"] = 0.0
            C.viewport.wake()
            print("[INFO] Execution reset to t=0.0s")

        def step_anim(sender, target, data) -> None:
            state["playing"] = False
            C.viewport.wait_for_input = False
            state["t"] = (state["t"] + 0.25) % 5.0
            C.viewport.wake()
            print(f"[INFO] Stepped to t={state['t']:.2f}s")

        def jump_to(t_target: float) -> None:
            state["t"] = t_target
            state["accumulator"] = 0.0
            C.viewport.wake()

        with dcg.Window(C, label="Programming Fundamentals Unified Studio [v05]", primary=True) as win:
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
                    width=120,
                    callback=lambda s, t, d: state.update(speed=d),
                )
                dcg.Button(C, label="1. Variables", callback=lambda s, t, d: jump_to(0.1))
                dcg.Button(C, label="2. Objects", callback=lambda s, t, d: jump_to(1.1))
                dcg.Button(C, label="3. Loops", callback=lambda s, t, d: jump_to(2.1))
                dcg.Button(C, label="4. Conditions", callback=lambda s, t, d: jump_to(3.1))
                dcg.Button(C, label="5. Functions", callback=lambda s, t, d: jump_to(4.1))

            # Progress Bar & Concept Badges
            with dcg.HorizontalLayout(C):
                scrubber = dcg.Slider(
                    C,
                    label="Program Timeline (s)",
                    min_value=0.0,
                    max_value=5.0,
                    value=0.0,
                    width=280,
                    callback=lambda s, t, d: (state.update(t=d), C.viewport.wake()),
                )
                concept_text = dcg.Text(C, value="Concept: [1/5] VARIABLES & TYPES")
                status_text = dcg.Text(C, value=" | Allocating stack frame & primitive values")

            # Main Visual Canvas (All 5 Concepts in one clean page)
            with dcg.DrawInWindow(C, width=1080, height=580):
                # =========================================================================
                # SECTION 1: SOURCE CODE TRACER (Top-Left)
                # =========================================================================
                dcg.DrawRect(C, pmin=(30, 20), pmax=(330, 210), color=(60, 75, 100), fill=(16, 20, 30), rounding=6)
                dcg.DrawText(C, pos=(45, 28), text="SOURCE CODE TRACE", color=(180, 205, 240))
                dcg.DrawLine(C, p1=(30, 48), p2=(330, 48), color=(40, 50, 70), thickness=1)

                code_cursor = dcg.DrawRect(
                    C,
                    pmin=(35, 52),
                    pmax=(325, 74),
                    color=(240, 190, 60),
                    fill=(45, 42, 28),
                    rounding=4,
                    thickness=1,
                )

                code_lines = [
                    "1: def process_user(id, score):",
                    "2:   user = User(id, score)",
                    "3:   total = 0",
                    "4:   for bonus in [10, 20]:",
                    "5:     total += bonus",
                    "6:   if total > 20: user.status = 'PASS'",
                    "7:   return user",
                ]
                for i, line in enumerate(code_lines):
                    dcg.DrawText(C, pos=(45, 56 + i * 21), text=line, color=(220, 225, 235))

                # =========================================================================
                # SECTION 2: CALL STACK & VARIABLES (Bottom-Left)
                # =========================================================================
                stack_frame_box = dcg.DrawRect(
                    C,
                    pmin=(30, 230),
                    pmax=(330, 510),
                    color=(50, 110, 180),
                    fill=(16, 24, 40),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(45, 238), text="STACK FRAME: process_user()", color=(140, 190, 255))
                dcg.DrawLine(C, p1=(30, 258), p2=(330, 258), color=(35, 55, 85), thickness=1)

                # Variable Slot: id
                dcg.DrawRect(C, pmin=(40, 268), pmax=(320, 304), color=(45, 65, 95), fill=(20, 30, 48), rounding=4)
                dcg.DrawText(C, pos=(50, 276), text="id (i32):", color=(160, 185, 220))
                stack_val_id = dcg.DrawText(C, pos=(240, 276), text="1", color=(255, 255, 255))

                # Variable Slot: score
                dcg.DrawRect(C, pmin=(40, 312), pmax=(320, 348), color=(45, 65, 95), fill=(20, 30, 48), rounding=4)
                dcg.DrawText(C, pos=(50, 320), text="score (i32):", color=(160, 185, 220))
                stack_val_score = dcg.DrawText(C, pos=(240, 320), text="95", color=(255, 255, 255))

                # Variable Slot: user (Object Pointer)
                dcg.DrawRect(C, pmin=(40, 356), pmax=(320, 392), color=(50, 100, 110), fill=(18, 38, 44), rounding=4)
                dcg.DrawText(C, pos=(50, 364), text="user (ptr):", color=(100, 230, 240))
                stack_val_user_ptr = dcg.DrawText(C, pos=(210, 364), text="0x00A034", color=(180, 240, 245))

                # Variable Slot: total (Loop Accumulator)
                dcg.DrawRect(C, pmin=(40, 400), pmax=(320, 436), color=(45, 65, 95), fill=(20, 30, 48), rounding=4)
                dcg.DrawText(C, pos=(50, 408), text="total (i32):", color=(160, 185, 220))
                stack_val_total = dcg.DrawText(C, pos=(240, 408), text="0", color=(255, 255, 255))

                # Variable Slot: bonus (Iterator)
                dcg.DrawRect(C, pmin=(40, 444), pmax=(320, 480), color=(45, 65, 95), fill=(20, 30, 48), rounding=4)
                dcg.DrawText(C, pos=(50, 452), text="bonus (i32):", color=(160, 185, 220))
                stack_val_bonus = dcg.DrawText(C, pos=(240, 452), text="--", color=(255, 255, 255))

                # Stack footnote
                dcg.DrawText(C, pos=(40, 490), text="Stack: Fast memory for local variables", color=(120, 150, 180))

                # =========================================================================
                # SECTION 3: CONTROL FLOW GRAPH (Center)
                # =========================================================================
                dcg.DrawRect(C, pmin=(355, 20), pmax=(735, 510), color=(50, 60, 80), fill=(15, 18, 26), rounding=6)
                dcg.DrawText(C, pos=(375, 28), text="CONTROL FLOW GRAPH (Execution Path)", color=(180, 200, 230))
                dcg.DrawLine(C, p1=(355, 48), p2=(735, 48), color=(35, 45, 60), thickness=1)

                # Node 1: Entry
                dcg.DrawRect(C, pmin=(490, 65), pmax=(600, 100), color=(60, 130, 200), fill=(22, 38, 58), rounding=4)
                dcg.DrawText(C, pos=(505, 75), text="1. FUNCTION", color=(200, 230, 255))
                dcg.DrawLine(C, p1=(545, 100), p2=(545, 130), color=(80, 100, 130), thickness=2)

                # Node 2: Object Creation
                dcg.DrawRect(C, pmin=(480, 130), pmax=(610, 165), color=(50, 150, 120), fill=(18, 42, 34), rounding=4)
                dcg.DrawText(C, pos=(495, 140), text="2. ALLOC OBJ", color=(180, 240, 210))
                dcg.DrawLine(C, p1=(545, 165), p2=(545, 195), color=(80, 100, 130), thickness=2)

                # Node 3: Loop Block
                dcg.DrawRect(C, pmin=(475, 195), pmax=(615, 250), color=(200, 140, 50), fill=(38, 30, 18), rounding=4)
                dcg.DrawText(C, pos=(490, 205), text="3. LOOP (For)", color=(245, 205, 120))
                loop_badge = dcg.DrawRect(C, pmin=(485, 225), pmax=(605, 245), color=(240, 180, 50), fill=(60, 45, 20), rounding=3)
                loop_badge_txt = dcg.DrawText(C, pos=(495, 228), text="Iter: [10, 20]", color=(255, 255, 255))

                # Loop Back-Edge
                dcg.DrawLine(C, p1=(615, 220), p2=(650, 220), color=(200, 140, 50), thickness=2)
                dcg.DrawLine(C, p1=(650, 220), p2=(650, 180), color=(200, 140, 50), thickness=2)
                dcg.DrawLine(C, p1=(650, 180), p2=(545, 180), color=(200, 140, 50), thickness=2)
                dcg.DrawText(C, pos=(658, 195), text="Repeat", color=(200, 160, 80))

                dcg.DrawLine(C, p1=(545, 250), p2=(545, 280), color=(80, 100, 130), thickness=2)

                # Node 4: Condition Diamond (`IF total > 20`)
                diamond_pts = [(545, 280), (620, 320), (545, 360), (470, 320), (545, 280)]
                cond_diamond = dcg.DrawPolyline(C, points=diamond_pts, color=(200, 80, 80), thickness=2)
                dcg.DrawText(C, pos=(505, 312), text="total > 20 ?", color=(255, 220, 220))

                # Branch: True (Right)
                cond_true_wire = dcg.DrawLine(C, p1=(620, 320), p2=(690, 320), color=(80, 200, 120), thickness=2)
                dcg.DrawText(C, pos=(630, 302), text="TRUE", color=(100, 240, 150))
                dcg.DrawLine(C, p1=(690, 320), p2=(690, 410), color=(80, 200, 120), thickness=2)
                dcg.DrawLine(C, p1=(690, 410), p2=(590, 410), color=(80, 200, 120), thickness=2)

                # Branch: False (Straight Down)
                dcg.DrawLine(C, p1=(545, 360), p2=(545, 395), color=(180, 70, 70), thickness=2)
                dcg.DrawText(C, pos=(550, 368), text="FALSE", color=(220, 100, 100))

                cond_status_txt = dcg.DrawText(C, pos=(480, 375), text="Status: PENDING", color=(180, 180, 180))

                # Node 5: Return / Exit
                dcg.DrawRect(C, pmin=(485, 410), pmax=(605, 445), color=(70, 120, 180), fill=(20, 34, 52), rounding=4)
                dcg.DrawText(C, pos=(505, 420), text="5. RETURN user", color=(210, 230, 255))

                # Execution Token (Flow Marker)
                token_box = dcg.DrawRect(
                    C,
                    pmin=(530, 70),
                    pmax=(560, 95),
                    color=(255, 240, 100),
                    fill=(255, 200, 40),
                    rounding=4,
                    thickness=2,
                )
                token_txt = dcg.DrawText(C, pos=(538, 75), text="PC", color=(10, 10, 15))

                # =========================================================================
                # SECTION 4: HEAP MEMORY & OBJECTS (Right)
                # =========================================================================
                dcg.DrawRect(C, pmin=(760, 20), pmax=(1050, 510), color=(50, 130, 90), fill=(14, 28, 22), rounding=6)
                dcg.DrawText(C, pos=(780, 28), text="MANAGED HEAP (Object Storage)", color=(160, 235, 190))
                dcg.DrawLine(C, p1=(760, 48), p2=(1050, 48), color=(30, 65, 45), thickness=1)

                # Heap Object: User Instance
                heap_obj_box = dcg.DrawRect(
                    C,
                    pmin=(775, 110),
                    pmax=(1035, 280),
                    color=(40, 140, 90),
                    fill=(20, 42, 32),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(790, 120), text="User Instance @ 0x00A034", color=(240, 215, 90))
                dcg.DrawLine(C, p1=(775, 140), p2=(1035, 140), color=(35, 80, 55), thickness=1)

                # Object Fields
                dcg.DrawText(C, pos=(790, 155), text=".id:", color=(160, 205, 180))
                dcg.DrawText(C, pos=(920, 155), text="1", color=(255, 255, 255))

                dcg.DrawText(C, pos=(790, 190), text=".score:", color=(160, 205, 180))
                dcg.DrawText(C, pos=(920, 190), text="95", color=(255, 255, 255))

                dcg.DrawText(C, pos=(790, 225), text=".status:", color=(160, 205, 180))
                heap_val_status = dcg.DrawText(C, pos=(920, 225), text="'PENDING'", color=(240, 200, 90))

                # Reference Pointer Wire (Stack user_ptr -> Heap User Instance)
                heap_ptr_wire = dcg.DrawLine(C, p1=(320, 374), p2=(775, 180), color=(40, 215, 235, 180), thickness=3)

                # Heap Footnote
                dcg.DrawText(
                    C,
                    pos=(775, 340),
                    text="Heap: Stores complex objects.\nStack stores pointers.\nField mutations update the\nsingle shared heap instance.",
                    color=(140, 195, 170),
                )

                # =========================================================================
                # SECTION 5: UNIFIED EXPLANATION FOOTER (Bottom)
                # =========================================================================
                dcg.DrawRect(C, pmin=(30, 520), pmax=(1050, 570), color=(55, 70, 90), fill=(18, 22, 30), rounding=6)
                dcg.DrawText(
                    C,
                    pos=(45, 532),
                    text="CONCEPTS DEMONSTRATED: 1. Variables (Stack slots) | 2. Objects (Heap struct) | 3. Loops (Iteration) | 4. Conditions (Branch) | 5. Functions (Call/Return)",
                    color=(200, 215, 235),
                )

        ctx = StageContext(
            state=state,
            code_cursor=code_cursor,
            stack_frame_box=stack_frame_box,
            stack_val_id=stack_val_id,
            stack_val_score=stack_val_score,
            stack_val_user_ptr=stack_val_user_ptr,
            stack_val_total=stack_val_total,
            stack_val_bonus=stack_val_bonus,
            token_box=token_box,
            token_txt=token_txt,
            cond_diamond=cond_diamond,
            cond_true_wire=cond_true_wire,
            cond_status_txt=cond_status_txt,
            loop_badge=loop_badge,
            loop_badge_txt=loop_badge_txt,
            heap_obj_box=heap_obj_box,
            heap_val_status=heap_val_status,
            heap_ptr_wire=heap_ptr_wire,
            status_text=status_text,
            concept_text=concept_text,
        )

        # =========================================================================
        # 5 DECLARATIVE PHASES COVERING ALL 5 CONCEPTS
        # =========================================================================
        def update_phase_1(c: StageContext, u: float) -> None:
            # Concept 1: VARIABLES & TYPES (Call Stack Allocation)
            # Code line 1: def process_user(id=1, score=95)
            c.code_cursor.pmin = (35, 52)
            c.code_cursor.pmax = (325, 74)

            # Move flow token to Node 1
            c.token_box.pmin = (530, 70)
            c.token_box.pmax = (560, 95)
            c.token_txt.pos = (538, 75)

            c.stack_val_id.text = "1"
            c.stack_val_score.text = "95"
            c.stack_val_user_ptr.text = "--"
            c.stack_val_total.text = "0"
            c.stack_val_bonus.text = "--"
            c.heap_ptr_wire.show = False
            c.heap_val_status.text = "'PENDING'"
            c.cond_status_txt.text = "Status: PENDING"

        def update_phase_2(c: StageContext, u: float) -> None:
            # Concept 2: OBJECTS & MEMORY (Heap Allocation + Pointer Binding)
            # Code line 2: user = User(id, score)
            c.code_cursor.pmin = (35, 73)
            c.code_cursor.pmax = (325, 95)

            # Token moves from Node 1 to Node 2
            ty = lerp(70.0, 135.0, ease_in_out(u))
            c.token_box.pmin = (530, ty)
            c.token_box.pmax = (560, ty + 25)
            c.token_txt.pos = (538, ty + 5)

            c.stack_val_user_ptr.text = "0x00A034"
            c.heap_ptr_wire.show = True
            c.heap_obj_box.color = (60, 200, 140)
            c.heap_obj_box.fill = (24, 52, 40)

        def update_phase_3(c: StageContext, u: float) -> None:
            # Concept 3: LOOPS & ITERATION
            # Code line 4 & 5: for bonus in [10, 20]: total += bonus
            c.heap_ptr_wire.show = True

            if u < 0.5:
                # First loop iteration: bonus = 10, total = 10
                c.code_cursor.pmin = (35, 115)
                c.code_cursor.pmax = (325, 137)
                c.stack_val_bonus.text = "10"
                c.stack_val_total.text = "10"
                c.loop_badge_txt.text = "Iter 1: +10 (tot=10)"
                c.loop_badge.fill = (80, 50, 20)
            else:
                # Second loop iteration: bonus = 20, total = 30
                c.code_cursor.pmin = (35, 136)
                c.code_cursor.pmax = (325, 158)
                c.stack_val_bonus.text = "20"
                c.stack_val_total.text = "30"
                c.loop_badge_txt.text = "Iter 2: +20 (tot=30)"
                c.loop_badge.fill = (110, 70, 25)

            # Token cycles on loop node
            angle = u * math.pi * 4.0
            cx = 545 + 25 * math.cos(angle)
            cy = 222 + 15 * math.sin(angle)
            c.token_box.pmin = (cx - 15, cy - 12)
            c.token_box.pmax = (cx + 15, cy + 12)
            c.token_txt.pos = (cx - 8, cy - 7)

        def update_phase_4(c: StageContext, u: float) -> None:
            # Concept 4: CONDITIONS & BRANCHING
            # Code line 6: if total > 20: user.status = 'PASS'
            c.code_cursor.pmin = (35, 157)
            c.code_cursor.pmax = (325, 179)

            c.stack_val_total.text = "30"
            c.stack_val_bonus.text = "DONE"

            # Token travels down to condition diamond and follows TRUE branch
            eased_u = ease_in_out(u)
            if eased_u < 0.4:
                ty = lerp(240.0, 320.0, eased_u / 0.4)
                c.token_box.pmin = (530, ty - 12)
                c.token_box.pmax = (560, ty + 13)
                c.token_txt.pos = (538, ty - 7)
            else:
                # Take TRUE branch rightward
                sub_u = (eased_u - 0.4) / 0.6
                tx = lerp(545.0, 680.0, sub_u)
                c.token_box.pmin = (tx - 15, 308)
                c.token_box.pmax = (tx + 15, 333)
                c.token_txt.pos = (tx - 7, 313)

            c.cond_status_txt.text = "30 > 20 -> TRUE!"
            c.heap_val_status.text = "'PASSED'"
            c.heap_val_status.color = (100, 255, 150)

        def update_phase_5(c: StageContext, u: float) -> None:
            # Concept 5: FUNCTIONS & CALL/RETURN
            # Code line 7: return user
            c.code_cursor.pmin = (35, 178)
            c.code_cursor.pmax = (325, 200)

            # Token returns to exit node
            eased_u = ease_in_out(u)
            ty = lerp(320.0, 422.0, eased_u)
            c.token_box.pmin = (530, ty - 12)
            c.token_box.pmax = (560, ty + 13)
            c.token_txt.pos = (538, ty - 7)

            c.cond_status_txt.text = "Branch: RETIRED"
            c.stack_frame_box.color = (int(50 + 150 * math.sin(u * math.pi)), 110, 180)

        timeline: List[AnimationClip] = [
            AnimationClip(
                start=0.0,
                end=1.0,
                concept_badge="Concept: [1/5] VARIABLES & TYPES",
                code_line_idx=0,
                flow_node_pos=(545, 80),
                explanation=" | STACK: Allocating local variables (id=1, score=95) as 32-bit integers directly in stack slots.",
                update_fn=update_phase_1,
            ),
            AnimationClip(
                start=1.0,
                end=2.0,
                concept_badge="Concept: [2/5] OBJECTS & MEMORY",
                code_line_idx=1,
                flow_node_pos=(545, 145),
                explanation=" | HEAP: Allocating User object at 0x00A034; stack variable holds only a pointer.",
                update_fn=update_phase_2,
            ),
            AnimationClip(
                start=2.0,
                end=3.0,
                concept_badge="Concept: [3/5] LOOPS & ITERATION",
                code_line_idx=3,
                flow_node_pos=(545, 220),
                explanation=" | LOOP: Iterating over [10, 20]; accumulator total advances: 0 -> 10 -> 30.",
                update_fn=update_phase_3,
            ),
            AnimationClip(
                start=3.0,
                end=4.0,
                concept_badge="Concept: [4/5] CONDITIONS & BRANCHING",
                code_line_idx=5,
                flow_node_pos=(545, 320),
                explanation=" | BRANCH: Predicate total > 20 evaluates to TRUE; taking branch and mutating user.status.",
                update_fn=update_phase_4,
            ),
            AnimationClip(
                start=4.0,
                end=5.0,
                concept_badge="Concept: [5/5] FUNCTIONS & CALL STACK",
                code_line_idx=6,
                flow_node_pos=(545, 425),
                explanation=" | RETURN: Function returns object pointer to caller; stack frame prepares to unwind.",
                update_fn=update_phase_5,
            ),
        ]

        def evaluate_timeline(t: float) -> None:
            for clip in timeline:
                if clip.start <= t < clip.end:
                    u = (t - clip.start) / (clip.end - clip.start)
                    clip.update_fn(ctx, u)
                    concept_text.value = clip.concept_badge
                    status_text.value = clip.explanation
                    return

        # =========================================================================
        # 60 HZ FIXED TIMESTEP LOOP (Native TimeWatcher)
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
                    state["t"] = (state["t"] + FIXED_STEP) % 5.0
                    state["accumulator"] -= FIXED_STEP
                scrubber.value = state["t"]

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
