import math
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import dearcygui as dcg

# Open Source Notice:
# DearCyGui (MIT License) - Cython-powered GPU GUI toolkit for Dear ImGui.
# Requirements: dearcygui (installable via pip in target Python virtual environment).

Point = Tuple[float, float]


def lerp(a: float, b: float, u: float) -> float:
    """Linear interpolation between a and b."""
    return a + (b - a) * u


def ease_in_out(t: float) -> float:
    """Smooth cosine ease-in-out curve for clean, organic transitions."""
    clamped = max(0.0, min(1.0, t))
    return 0.5 - 0.5 * math.cos(math.pi * clamped)


def cubic_bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: float) -> Point:
    """Evaluates coordinates on a cubic Bezier spline at t in [0.0, 1.0]."""
    u = 1.0 - t
    x = (u**3) * p0[0] + 3 * (u**2) * t * p1[0] + 3 * u * (t**2) * p2[0] + (t**3) * p3[0]
    y = (u**3) * p0[1] + 3 * (u**2) * t * p1[1] + 3 * u * (t**2) * p2[1] + (t**3) * p3[1]
    return (x, y)


@dataclass
class SliceItem:
    id_num: int
    angle_mid: float
    pepperoni_dot: dcg.DrawCircle
    label: dcg.DrawText
    plate_assigned: Optional[int] = None


@dataclass
class PlateUI:
    friend_name: str
    box: dcg.DrawRect
    name_txt: dcg.DrawText
    count_txt: dcg.DrawText
    slot1_box: dcg.DrawRect
    slot1_txt: dcg.DrawText
    slot2_box: dcg.DrawRect
    slot2_txt: dcg.DrawText
    pos_center: Point


def main() -> None:
    try:
        C = dcg.Context()
        # Viewport configured for continuous 60 FPS presentation
        C.viewport.initialize(
            title="Everyday Algorithm Visualizer: Fair Pizza Sharing & Dictionary Assignment [algo01]",
            width=1120,
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
            "num_slices": 8,
            "num_friends": 4,
            "last_frame_ns": 0,
            "accumulator": 0.0,
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
            print("[INFO] Pizza sharing reset to start.")

        def step_anim(sender, target, data) -> None:
            state["playing"] = False
            C.viewport.wait_for_input = False
            state["t"] = (state["t"] + 0.25) % 5.0
            C.viewport.wake()
            print(f"[INFO] Stepped to t={state['t']:.2f}s")

        with dcg.Window(C, label="Pizza Slicing & Dictionary Allocation Studio [algo01]", primary=True) as win:
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
                dcg.Button(C, label="Cut Pizza (t=1.0)", callback=lambda s, t, d: state.update(t=1.0))
                dcg.Button(C, label="Serve Slices (t=2.5)", callback=lambda s, t, d: state.update(t=2.5))
                dcg.Button(C, label="Dictionary Ready (t=4.5)", callback=lambda s, t, d: state.update(t=4.5))

            # Progress Bar & Phase Telemetry
            with dcg.HorizontalLayout(C):
                scrubber = dcg.Slider(
                    C,
                    label="Timeline (s)",
                    min_value=0.0,
                    max_value=5.0,
                    value=0.0,
                    width=260,
                    callback=lambda s, t, d: (state.update(t=d), C.viewport.wake()),
                )
                phase_badge = dcg.Text(C, value="Phase: [1/4] WHOLE PIZZA (Uncut Object)")
                telemetry_txt = dcg.Text(C, value=" | Total Slices: 8 | Friends: 4 | Slices Each: 8 // 4 = 2")

            # Main Drawing Canvas
            with dcg.DrawInWindow(C, width=1080, height=600):
                # =========================================================================
                # 1. THE PROBLEM STATEMENT BANNER (Top)
                # =========================================================================
                dcg.DrawRect(C, pmin=(30, 15), pmax=(1050, 68), color=(50, 75, 110), fill=(16, 22, 34), rounding=6)
                dcg.DrawText(
                    C,
                    pos=(45, 23),
                    text="THE EVERYDAY PROBLEM: Fair Pizza Slicing & Dictionary Assignment.",
                    color=(240, 215, 100),
                )
                dcg.DrawText(
                    C,
                    pos=(45, 43),
                    text="How 1 whole pizza is cut into a List of 8 slices, divided evenly (8 // 4 = 2), and assigned to a Dictionary of friends.",
                    color=(180, 205, 230),
                )

                # =========================================================================
                # 2. PIZZA CUTTING BOARD (Left Center: x ~ 270, y ~ 300)
                # =========================================================================
                pizza_cx, pizza_cy = 270.0, 310.0
                crust_radius = 165.0
                cheese_radius = 145.0

                # Wood Cutting Board Base
                dcg.DrawRect(
                    C,
                    pmin=(pizza_cx - 195, pizza_cy - 195),
                    pmax=(pizza_cx + 195, pizza_cy + 195),
                    color=(80, 55, 30),
                    fill=(35, 24, 16),
                    rounding=16,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(pizza_cx - 65, pizza_cy - 180), text="WOODEN CUTTING BOARD", color=(160, 130, 95))

                # Outer Golden Crust Ring
                crust_circle = dcg.DrawCircle(
                    C,
                    center=(pizza_cx, pizza_cy),
                    radius=crust_radius,
                    color=(190, 125, 40),
                    fill=(210, 140, 45),
                    thickness=4,
                )

                # Melted Mozzarella Cheese Center
                cheese_circle = dcg.DrawCircle(
                    C,
                    center=(pizza_cx, pizza_cy),
                    radius=cheese_radius,
                    color=(240, 190, 60),
                    fill=(255, 215, 80),
                    thickness=2,
                )

                # 8 Cut Divider Lines (from center outward)
                cut_lines = []
                for i in range(8):
                    ang = i * (2.0 * math.pi / 8.0)
                    ex = pizza_cx + cheese_radius * math.cos(ang)
                    ey = pizza_cy + cheese_radius * math.sin(ang)
                    line = dcg.DrawLine(C, p1=(pizza_cx, pizza_cy), p2=(ex, ey), color=(140, 60, 20), thickness=3)
                    line.show = False
                    cut_lines.append(line)

                # 8 Pepperoni Discs & Slice ID Labels
                slice_items: List[SliceItem] = []
                for i in range(8):
                    mid_ang = (i + 0.5) * (2.0 * math.pi / 8.0)
                    px = pizza_cx + (cheese_radius * 0.6) * math.cos(mid_ang)
                    py = pizza_cy + (cheese_radius * 0.6) * math.sin(mid_ang)

                    pep = dcg.DrawCircle(C, center=(px, py), radius=15, color=(160, 30, 30), fill=(185, 40, 40), thickness=2)
                    lbl = dcg.DrawText(C, pos=(px - 9, py - 7), text=f"S{i+1}", color=(255, 255, 255))
                    slice_items.append(SliceItem(id_num=i + 1, angle_mid=mid_ang, pepperoni_dot=pep, label=lbl))

                # Center Pizza Pan Dot
                center_pan = dcg.DrawCircle(C, center=(pizza_cx, pizza_cy), radius=10, color=(160, 110, 40), fill=(180, 130, 50))

                # Animated Slicing Roller Blade (Laser Knife)
                blade_line = dcg.DrawLine(
                    C,
                    p1=(pizza_cx - crust_radius - 15, pizza_cy),
                    p2=(pizza_cx + crust_radius + 15, pizza_cy),
                    color=(240, 240, 255, 240),
                    thickness=4,
                )
                blade_line.show = False

                # Slicing Wheel Indicator Badge
                blade_wheel = dcg.DrawCircle(
                    C,
                    center=(pizza_cx, pizza_cy),
                    radius=18,
                    color=(255, 255, 255),
                    fill=(160, 175, 195),
                    thickness=2,
                )
                blade_wheel.show = False

                # Flight Slice (Moving from Pizza to Plates during distribution)
                flight_slice_box = dcg.DrawRect(
                    C,
                    pmin=(0, 0),
                    pmax=(70, 32),
                    color=(255, 215, 80),
                    fill=(210, 140, 45),
                    rounding=6,
                    thickness=2,
                )
                flight_slice_txt = dcg.DrawText(C, pos=(0, 0), text="Slice S1", color=(10, 10, 15))
                flight_slice_box.show = False
                flight_slice_txt.show = False

                # =========================================================================
                # 3. PYTHON DATA STRUCTURES: LIST & DICTIONARY (Right Panel)
                # =========================================================================
                right_x = 550
                dcg.DrawRect(
                    C,
                    pmin=(right_x, 80),
                    pmax=(right_x + 490, 570),
                    color=(55, 75, 110),
                    fill=(16, 22, 34),
                    rounding=8,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(right_x + 20, 92), text="PYTHON DATA STRUCTURES & ALLOCATION", color=(220, 235, 255))
                dcg.DrawLine(C, p1=(right_x + 10, 112), p2=(right_x + 480, 112), color=(35, 50, 75), thickness=1)

                # 3A. The Slices List
                dcg.DrawText(C, pos=(right_x + 20, 122), text="1. The Slices List (Array):", color=(240, 210, 90))
                dcg.DrawText(
                    C,
                    pos=(right_x + 20, 140),
                    text="slices = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']",
                    color=(100, 225, 245),
                )

                # List Slices Boxes
                list_slice_boxes = []
                for i in range(8):
                    sx = right_x + 20 + i * 56
                    s_box = dcg.DrawRect(
                        C,
                        pmin=(sx, 162),
                        pmax=(sx + 50, 192),
                        color=(60, 140, 200),
                        fill=(22, 42, 65),
                        rounding=4,
                        thickness=1,
                    )
                    dcg.DrawText(C, pos=(sx + 15, 168), text=f"S{i+1}", color=(255, 255, 255))
                    list_slice_boxes.append(s_box)

                dcg.DrawLine(C, p1=(right_x + 20, 205), p2=(right_x + 470, 205), color=(35, 50, 75), thickness=1)

                # 3B. The Friends Dictionary (Plates)
                dcg.DrawText(C, pos=(right_x + 20, 215), text="2. Friends' Plates Dictionary (Hash Map):", color=(240, 210, 90))
                dcg.DrawText(
                    C,
                    pos=(right_x + 20, 233),
                    text="plates = { 'Alice': [], 'Bob': [], 'Charlie': [], 'Dana': [] }",
                    color=(220, 140, 245),
                )

                friend_names = ["Alice", "Bob", "Charlie", "Dana"]
                plate_uis: List[PlateUI] = []

                for i, name in enumerate(friend_names):
                    py = 258 + i * 66
                    p_box = dcg.DrawRect(
                        C,
                        pmin=(right_x + 20, py),
                        pmax=(right_x + 470, py + 56),
                        color=(60, 85, 120),
                        fill=(22, 30, 46),
                        rounding=6,
                        thickness=1,
                    )
                    name_txt = dcg.DrawText(C, pos=(right_x + 35, py + 18), text=f"'{name}':", color=(255, 215, 100))
                    count_txt = dcg.DrawText(C, pos=(right_x + 130, py + 18), text="[ ] (0 slices)", color=(170, 185, 205))

                    # Slot 1
                    s1_b = dcg.DrawRect(
                        C,
                        pmin=(right_x + 245, py + 12),
                        pmax=(right_x + 335, py + 44),
                        color=(50, 70, 95),
                        fill=(18, 25, 38),
                        rounding=4,
                    )
                    s1_t = dcg.DrawText(C, pos=(right_x + 265, py + 18), text="--", color=(140, 150, 165))

                    # Slot 2
                    s2_b = dcg.DrawRect(
                        C,
                        pmin=(right_x + 355, py + 12),
                        pmax=(right_x + 445, py + 44),
                        color=(50, 70, 95),
                        fill=(18, 25, 38),
                        rounding=4,
                    )
                    s2_t = dcg.DrawText(C, pos=(right_x + 375, py + 18), text="--", color=(140, 150, 165))

                    plate_center = (right_x + 345.0, py + 28.0)
                    plate_uis.append(
                        PlateUI(
                            friend_name=name,
                            box=p_box,
                            name_txt=name_txt,
                            count_txt=count_txt,
                            slot1_box=s1_b,
                            slot1_txt=s1_t,
                            slot2_box=s2_b,
                            slot2_txt=s2_t,
                            pos_center=plate_center,
                        )
                    )

                # Math explanation box at bottom right
                dcg.DrawRect(
                    C,
                    pmin=(right_x + 20, 526),
                    pmax=(right_x + 470, 560),
                    color=(50, 120, 90),
                    fill=(18, 38, 30),
                    rounding=4,
                )
                math_result_txt = dcg.DrawText(
                    C,
                    pos=(right_x + 35, 534),
                    text="MATH: 8 slices // 4 friends = 2 each (0 leftover). Fair sharing complete!",
                    color=(130, 245, 180),
                )

        # =========================================================================
        # TIMELINE LOGIC & ANIMATED DISTRIBUTION
        # =========================================================================
        def update_timeline(t: float) -> None:
            if t < 1.0:
                # -----------------------------------------------------------------
                # PHASE 1 [0.0s - 1.0s]: Whole Uncut Pizza
                # -----------------------------------------------------------------
                phase_badge.value = "Phase: [1/4] WHOLE PIZZA (Single continuous object)"
                telemetry_txt.value = " | Pizza is uncut. 0 cuts made. plates dictionary is empty."
                for line in cut_lines:
                    line.show = False
                blade_line.show = False
                blade_wheel.show = False
                flight_slice_box.show = False
                flight_slice_txt.show = False

                for item in slice_items:
                    # Reset pepperoni positions to center unexploded pizza
                    px = pizza_cx + (cheese_radius * 0.6) * math.cos(item.angle_mid)
                    py = pizza_cy + (cheese_radius * 0.6) * math.sin(item.angle_mid)
                    item.pepperoni_dot.center = (px, py)
                    item.label.pos = (px - 9, py - 7)

                # Reset plates
                for p in plate_uis:
                    p.count_txt.text = "[ ] (0 slices)"
                    p.box.color = (60, 85, 120)
                    p.box.fill = (22, 30, 46)
                    p.slot1_txt.text = "--"
                    p.slot2_txt.text = "--"
                    p.slot1_box.fill = (18, 25, 38)
                    p.slot2_box.fill = (18, 25, 38)

                for sb in list_slice_boxes:
                    sb.fill = (22, 42, 65)

            elif t < 2.2:
                # -----------------------------------------------------------------
                # PHASE 2 [1.0s - 2.2s]: Cutting the Pizza (Blade Sweep)
                # -----------------------------------------------------------------
                u = (t - 1.0) / 1.2
                eased_u = ease_in_out(u)
                phase_badge.value = "Phase: [2/4] SLICING PIZZA (8 equal radial wedges)"
                telemetry_txt.value = f" | Cutting angle: {int(u * 180)} deg. Creating List of 8 slices."

                # Blade sweeps across angles: 0, 90, 45, 135
                blade_angle = eased_u * math.pi
                bx1 = pizza_cx - (crust_radius + 20) * math.cos(blade_angle)
                by1 = pizza_cy - (crust_radius + 20) * math.sin(blade_angle)
                bx2 = pizza_cx + (crust_radius + 20) * math.cos(blade_angle)
                by2 = pizza_cy + (crust_radius + 20) * math.sin(blade_angle)

                blade_line.show = True
                blade_wheel.show = True
                blade_line.p1 = (bx1, by1)
                blade_line.p2 = (bx2, by2)
                wheel_pos = lerp(bx1, bx2, (math.sin(u * math.pi * 3) * 0.5 + 0.5))
                blade_wheel.center = (wheel_pos, lerp(by1, by2, (math.sin(u * math.pi * 3) * 0.5 + 0.5)))

                # Reveal cut lines progressively
                num_cuts_revealed = int(eased_u * 8)
                for idx, line in enumerate(cut_lines):
                    line.show = idx <= num_cuts_revealed

                # Subtle separation (pizza bursting apart slightly as cuts complete)
                burst_dist = 6.0 * eased_u
                for item in slice_items:
                    px = pizza_cx + (cheese_radius * 0.6 + burst_dist) * math.cos(item.angle_mid)
                    py = pizza_cy + (cheese_radius * 0.6 + burst_dist) * math.sin(item.angle_mid)
                    item.pepperoni_dot.center = (px, py)
                    item.label.pos = (px - 9, py - 7)

            elif t < 4.2:
                # -----------------------------------------------------------------
                # PHASE 3 [2.2s - 4.2s]: Slices Transport to Friends' Plates (Dictionary)
                # -----------------------------------------------------------------
                blade_line.show = False
                blade_wheel.show = False
                u = (t - 2.2) / 2.0  # 0.0 to 1.0
                phase_badge.value = "Phase: [3/4] SERVING SLICES -> DICTIONARY PLATES"

                # 8 slices distributed to 4 plates (2 slices each)
                # Slices 1,2 -> Alice, 3,4 -> Bob, 5,6 -> Charlie, 7,8 -> Dana
                slice_idx = min(7, int(u * 8))
                friend_idx = slice_idx // 2
                friend_name = friend_names[friend_idx]
                target_plate = plate_uis[friend_idx]

                telemetry_txt.value = (
                    f" | Serving Slice S{slice_idx + 1} -> plates['{friend_name}'].append('S{slice_idx + 1}')"
                )

                # Sub-progress within current slice flight
                sub_u = (u * 8.0) % 1.0
                eased_sub = ease_in_out(sub_u)

                # Starting coordinate of current flying slice
                start_p = (
                    pizza_cx + (cheese_radius * 0.6) * math.cos(slice_items[slice_idx].angle_mid),
                    pizza_cy + (cheese_radius * 0.6) * math.sin(slice_items[slice_idx].angle_mid),
                )
                end_p = target_plate.pos_center
                ctrl1 = (pizza_cx + 120, start_p[1] - 40)
                ctrl2 = (right_x + 50, end_p[1] - 30)

                flight_pos = cubic_bezier(start_p, ctrl1, ctrl2, end_p, eased_sub)
                flight_slice_box.show = True
                flight_slice_txt.show = True
                flight_slice_box.pmin = (flight_pos[0] - 35, flight_pos[1] - 16)
                flight_slice_box.pmax = (flight_pos[0] + 35, flight_pos[1] + 16)
                flight_slice_txt.pos = (flight_pos[0] - 25, flight_pos[1] - 8)
                flight_slice_txt.text = f"Slice S{slice_idx + 1}"

                # Update completed plates up to current slice
                for s_i in range(slice_idx):
                    f_i = s_i // 2
                    is_second_slice = (s_i % 2 == 1)
                    p_ui = plate_uis[f_i]
                    p_ui.box.color = (60, 160, 120)
                    p_ui.box.fill = (20, 42, 34)

                    if not is_second_slice:
                        p_ui.count_txt.text = f"['S{s_i+1}'] (1 slice)"
                        p_ui.slot1_box.fill = (35, 75, 55)
                        p_ui.slot1_box.color = (80, 210, 140)
                        p_ui.slot1_txt.text = f"S{s_i+1}"
                    else:
                        p_ui.count_txt.text = f"['S{s_i}', 'S{s_i+1}'] (2 slices)"
                        p_ui.slot2_box.fill = (35, 75, 55)
                        p_ui.slot2_box.color = (80, 210, 140)
                        p_ui.slot2_txt.text = f"S{s_i+1}"

                    list_slice_boxes[s_i].fill = (45, 95, 70)

            else:
                # -----------------------------------------------------------------
                # PHASE 4 [4.2s - 5.0s]: Distribution Complete & Dictionary Finalized
                # -----------------------------------------------------------------
                flight_slice_box.show = False
                flight_slice_txt.show = False
                phase_badge.value = "Phase: [4/4] FAIR SHARING COMPLETE! (Balanced Dictionary)"
                telemetry_txt.value = " | All 8 slices distributed evenly. Each plate holds exactly 2 slices."

                # All 4 plates fully populated
                for idx, p_ui in enumerate(plate_uis):
                    s1_name = f"S{idx * 2 + 1}"
                    s2_name = f"S{idx * 2 + 2}"
                    p_ui.box.color = (60, 190, 130)
                    p_ui.box.fill = (22, 48, 38)
                    p_ui.count_txt.text = f"['{s1_name}', '{s2_name}'] (2 slices)"
                    p_ui.slot1_txt.text = s1_name
                    p_ui.slot2_txt.text = s2_name
                    p_ui.slot1_box.fill = (40, 95, 65)
                    p_ui.slot1_box.color = (80, 230, 150)
                    p_ui.slot2_box.fill = (40, 95, 65)
                    p_ui.slot2_box.color = (80, 230, 150)

                for sb in list_slice_boxes:
                    sb.fill = (40, 110, 75)

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

            update_timeline(state["t"])

            if state["playing"]:
                C.viewport.wake(full_refresh=True)

        dcg.TimeWatcher(C, parent=win, callback=on_viewport_frame)

        while C.running:
            C.viewport.render_frame()

    except Exception as exc:
        print(f"[ERROR] DearCyGui visualizer failed: {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
