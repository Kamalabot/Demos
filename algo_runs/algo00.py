import math
import sys
from dataclasses import dataclass
from typing import List, Optional, Tuple
import dearcygui as dcg

# Open Source Notice:
# DearCyGui (MIT License) - Cython-powered GPU GUI toolkit for Dear ImGui.
# Requirements: dearcygui (installable via pip in target Python virtual environment).


def ease_in_out(t: float) -> float:
    """Smooth cosine ease-in-out curve for clean, organic transitions."""
    clamped = max(0.0, min(1.0, t))
    return 0.5 - 0.5 * math.cos(math.pi * clamped)


def lerp(a: float, b: float, u: float) -> float:
    return a + (b - a) * u


# The 16-element sorted array for the classic search problem
ARRAY = [3, 8, 12, 17, 21, 28, 33, 39, 42, 51, 60, 68, 77, 85, 91, 99]


@dataclass
class SearchStep:
    step_num: int
    low: int
    high: int
    mid: int
    mid_val: int
    target: int
    comparison: str  # "<", ">", "=="
    eliminated_range: Optional[Tuple[int, int]]  # (start_idx, end_idx)
    explanation: str


def compute_binary_search_steps(arr: List[int], target: int) -> List[SearchStep]:
    """Precomputes the step-by-step trace of binary search."""
    steps = []
    low, high = 0, len(arr) - 1
    step_num = 1

    while low <= high:
        mid = (low + high) // 2
        mid_val = arr[mid]

        if mid_val == target:
            steps.append(
                SearchStep(
                    step_num=step_num,
                    low=low,
                    high=high,
                    mid=mid,
                    mid_val=mid_val,
                    target=target,
                    comparison="==",
                    eliminated_range=None,
                    explanation=f"MATCH FOUND! arr[{mid}] == {target}. Search completed in {step_num} checks!",
                )
            )
            break
        elif mid_val < target:
            steps.append(
                SearchStep(
                    step_num=step_num,
                    low=low,
                    high=high,
                    mid=mid,
                    mid_val=mid_val,
                    target=target,
                    comparison="<",
                    eliminated_range=(low, mid),
                    explanation=f"arr[{mid}] ({mid_val}) < {target}: Target must be on the right. Discarding left 50% (indices {low}..{mid}).",
                )
            )
            low = mid + 1
        else:
            steps.append(
                SearchStep(
                    step_num=step_num,
                    low=low,
                    high=high,
                    mid=mid,
                    mid_val=mid_val,
                    target=target,
                    comparison=">",
                    eliminated_range=(mid, high),
                    explanation=f"arr[{mid}] ({mid_val}) > {target}: Target must be on the left. Discarding right 50% (indices {mid}..{high}).",
                )
            )
            high = mid - 1
        step_num += 1

    return steps


@dataclass
class VisualBar:
    idx: int
    val: int
    rect: dcg.DrawRect
    text_val: dcg.DrawText
    text_idx: dcg.DrawText
    curtain: dcg.DrawRect
    x_center: float
    top_y: float


def main() -> None:
    try:
        C = dcg.Context()
        # Viewport initialized for 60 FPS continuous presentation
        C.viewport.initialize(
            title="Algorithm Visualizer: Binary Search Space Halver [algo00]",
            width=1120,
            height=700,
            wait_for_input=False,
            vsync=True,
            always_submit_to_gpu=True,
        )
        C.viewport.always_submit_to_gpu = True

        target_val = 42
        steps = compute_binary_search_steps(ARRAY, target_val)

        state = {
            "playing": True,
            "target": target_val,
            "current_step_idx": 0,
            "step_progress": 0.0,  # 0.0 to 1.0 within the current step
            "step_duration": 1.6,  # Seconds per step
            "speed": 1.0,
            "last_frame_ns": 0,
            "total_eliminated": set(),
        }

        def set_target(new_target: int) -> None:
            state["target"] = new_target
            nonlocal steps
            steps = compute_binary_search_steps(ARRAY, new_target)
            state["current_step_idx"] = 0
            state["step_progress"] = 0.0
            state["total_eliminated"].clear()
            C.viewport.wake()
            print(f"[INFO] New target set to: {new_target} (Solvable in {len(steps)} steps)")

        def toggle_play(sender, target, data) -> None:
            state["playing"] = not state["playing"]
            C.viewport.wait_for_input = not state["playing"]
            if state["playing"]:
                state["last_frame_ns"] = 0
                C.viewport.wake()
            print(f"[INFO] Simulation: {'RUNNING' if state['playing'] else 'PAUSED'}")

        def reset_anim(sender, target, data) -> None:
            state["current_step_idx"] = 0
            state["step_progress"] = 0.0
            state["total_eliminated"].clear()
            C.viewport.wake()
            print("[INFO] Search reset to initial array state.")

        def step_manual(sender, target, data) -> None:
            state["playing"] = False
            C.viewport.wait_for_input = False
            if state["current_step_idx"] < len(steps) - 1:
                # Add eliminated range of current step
                cur_step = steps[state["current_step_idx"]]
                if cur_step.eliminated_range:
                    for i in range(cur_step.eliminated_range[0], cur_step.eliminated_range[1] + 1):
                        state["total_eliminated"].add(i)
                state["current_step_idx"] += 1
                state["step_progress"] = 0.0
            C.viewport.wake()

        with dcg.Window(C, label="Binary Search Visual Studio [algo00]", primary=True) as win:
            # Control Toolbar
            with dcg.HorizontalLayout(C):
                dcg.Button(C, label="Play / Pause", callback=toggle_play)
                dcg.Button(C, label="Step (+1)", callback=step_manual)
                dcg.Button(C, label="Reset", callback=reset_anim)
                dcg.Slider(
                    C,
                    label="Speed",
                    min_value=0.3,
                    max_value=3.0,
                    value=1.0,
                    width=130,
                    callback=lambda s, t, d: state.update(speed=d),
                )
                dcg.Button(C, label="Target: 17", callback=lambda s, t, d: set_target(17))
                dcg.Button(C, label="Target: 42", callback=lambda s, t, d: set_target(42))
                dcg.Button(C, label="Target: 85", callback=lambda s, t, d: set_target(85))
                dcg.Button(C, label="Target: 99", callback=lambda s, t, d: set_target(99))

            # Status Banner & Live Telemetry
            with dcg.HorizontalLayout(C):
                step_banner = dcg.Text(C, value="Step 1/4: Probing middle element...")
                telemetry_txt = dcg.Text(C, value=" | Low: 0 | High: 15 | Mid: 7 (Val=39) | Target: 42")

            # Main Visual Canvas
            with dcg.DrawInWindow(C, width=1080, height=600):
                # =========================================================================
                # 1. THE PROBLEM STATEMENT BANNER (Top)
                # =========================================================================
                dcg.DrawRect(C, pmin=(30, 15), pmax=(1050, 75), color=(50, 75, 110), fill=(16, 22, 34), rounding=6)
                dcg.DrawText(
                    C,
                    pos=(45, 23),
                    text="THE PROBLEM: Find secret Target X in a sorted array of 16 numbers.",
                    color=(240, 215, 100),
                )
                dcg.DrawText(
                    C,
                    pos=(45, 45),
                    text="Linear Search takes up to 16 checks (O(N)). Binary Search slices the remaining array in half each step (O(log N) -> max 4 checks!).",
                    color=(180, 205, 230),
                )

                # =========================================================================
                # 2. THE SORTED ARRAY BARS & SLICING CURTAINS (Center Array Area)
                # =========================================================================
                array_origin_x = 45
                bar_width = 54
                bar_gap = 10
                base_y = 350
                max_bar_height = 180

                visual_bars: List[VisualBar] = []

                for i, val in enumerate(ARRAY):
                    bx = array_origin_x + i * (bar_width + bar_gap)
                    # Bar height proportional to value (val / 99)
                    bar_h = 30 + (val / 100.0) * (max_bar_height - 30)
                    top_y = base_y - bar_h

                    # Main array bar rectangle
                    bar_rect = dcg.DrawRect(
                        C,
                        pmin=(bx, top_y),
                        pmax=(bx + bar_width, base_y),
                        color=(50, 120, 190),
                        fill=(22, 42, 68),
                        rounding=4,
                        thickness=1,
                    )

                    # Number label on top
                    text_val = dcg.DrawText(
                        C,
                        pos=(bx + 14, top_y - 20),
                        text=str(val),
                        color=(255, 255, 255),
                    )

                    # Index label underneath
                    text_idx = dcg.DrawText(
                        C,
                        pos=(bx + 16, base_y + 8),
                        text=f"[{i}]",
                        color=(120, 150, 185),
                    )

                    # Elimination Red Curtain (initially hidden)
                    curtain = dcg.DrawRect(
                        C,
                        pmin=(bx, top_y - 25),
                        pmax=(bx + bar_width, base_y + 26),
                        color=(180, 40, 40, 160),
                        fill=(80, 18, 18, 140),
                        rounding=4,
                        thickness=1,
                    )
                    curtain.show = False

                    visual_bars.append(
                        VisualBar(
                            idx=i,
                            val=val,
                            rect=bar_rect,
                            text_val=text_val,
                            text_idx=text_idx,
                            curtain=curtain,
                            x_center=bx + bar_width * 0.5,
                            top_y=top_y,
                        )
                    )

                # =========================================================================
                # 3. DYNAMIC CALIPER POINTERS (Low, High, Mid)
                # =========================================================================
                # LOW Pointer (Cyan Arrow at bottom)
                low_arrow = dcg.DrawTriangle(
                    C,
                    p1=(0, base_y + 45),
                    p2=(0, base_y + 30),
                    p3=(0, base_y + 45),
                    color=(40, 215, 235),
                    fill=(40, 215, 235),
                )
                low_label = dcg.DrawText(C, pos=(0, base_y + 50), text="LOW", color=(40, 215, 235))

                # HIGH Pointer (Magenta Arrow at bottom)
                high_arrow = dcg.DrawTriangle(
                    C,
                    p1=(0, base_y + 45),
                    p2=(0, base_y + 30),
                    p3=(0, base_y + 45),
                    color=(220, 95, 240),
                    fill=(220, 95, 240),
                )
                high_label = dcg.DrawText(C, pos=(0, base_y + 50), text="HIGH", color=(220, 95, 240))

                # MID Probing Laser Scanner (Golden line + scanner badge from top)
                mid_laser = dcg.DrawLine(C, p1=(0, 90), p2=(0, base_y), color=(255, 210, 50, 220), thickness=3)
                mid_badge = dcg.DrawRect(
                    C,
                    pmin=(0, 90),
                    pmax=(0, 116),
                    color=(255, 220, 60),
                    fill=(60, 48, 15),
                    rounding=4,
                    thickness=2,
                )
                mid_badge_txt = dcg.DrawText(C, pos=(0, 94), text="MID = 7", color=(255, 240, 140))

                # Target Match Glow Ring (pulses on victory)
                match_glow = dcg.DrawRect(
                    C,
                    pmin=(0, 0),
                    pmax=(0, 0),
                    color=(50, 255, 140),
                    fill=(20, 100, 50, 60),
                    rounding=8,
                    thickness=4,
                )
                match_glow.show = False

                # =========================================================================
                # 4. LOWER DASHBOARD: COMPARISON HUD & SEARCH SPACE HALVER GAUGE
                # =========================================================================
                # Left HUD: Live Comparison Balance Box
                dcg.DrawRect(C, pmin=(30, 420), pmax=(490, 580), color=(55, 75, 105), fill=(16, 22, 34), rounding=6)
                dcg.DrawText(C, pos=(45, 432), text="[ACTIVE PROBE & COMPARISON]", color=(240, 205, 90))
                cmp_probe_txt = dcg.DrawText(C, pos=(45, 458), text="PROBING: arr[7] == 39", color=(255, 255, 255))
                cmp_math_txt = dcg.DrawText(C, pos=(45, 486), text="DECISION: 39 < 42  (Too Small)", color=(255, 180, 100))
                cmp_action_txt = dcg.DrawText(
                    C,
                    pos=(45, 514),
                    text="ACTION: Discard left half [0..7]\nNew Search Range: [8..15]",
                    color=(160, 215, 245),
                )

                # Right HUD: Exponential Search Space Gauge
                dcg.DrawRect(C, pmin=(520, 420), pmax=(1050, 580), color=(55, 75, 105), fill=(16, 22, 34), rounding=6)
                dcg.DrawText(C, pos=(535, 432), text="[EXPONENTIAL SEARCH SPACE REDUCTION]", color=(240, 205, 90))

                # Halving Gauge Bar
                dcg.DrawRect(C, pmin=(535, 460), pmax=(1030, 485), color=(40, 60, 90), fill=(20, 30, 45), rounding=4)
                gauge_fill = dcg.DrawRect(
                    C,
                    pmin=(535, 460),
                    pmax=(1030, 485),
                    color=(40, 215, 235),
                    fill=(30, 160, 180),
                    rounding=4,
                )
                gauge_txt = dcg.DrawText(C, pos=(545, 465), text="Remaining Candidates: 16 / 16 (100%)", color=(255, 255, 255))

                gauge_steps_txt = dcg.DrawText(
                    C,
                    pos=(535, 500),
                    text="Step 1: 16 items  ->  Step 2: 8 items  ->  Step 3: 4 items  ->  Step 4: 1 item!\nMathematically: ceil(log2(16)) = 4 maximum steps guaranteed.",
                    color=(180, 205, 230),
                )

        # =========================================================================
        # FRAME LOGIC & ANIMATED CALIPER MOTION
        # =========================================================================
        def update_frame(dt: float) -> None:
            if state["playing"] and state["current_step_idx"] < len(steps):
                state["step_progress"] += (dt * state["speed"]) / state["step_duration"]
                if state["step_progress"] >= 1.0:
                    # Finalize current step and advance
                    cur_s = steps[state["current_step_idx"]]
                    if cur_s.eliminated_range:
                        for i in range(cur_s.eliminated_range[0], cur_s.eliminated_range[1] + 1):
                            state["total_eliminated"].add(i)

                    if state["current_step_idx"] < len(steps) - 1:
                        state["current_step_idx"] += 1
                        state["step_progress"] = 0.0
                    else:
                        state["step_progress"] = 1.0

            step_idx = min(state["current_step_idx"], len(steps) - 1)
            cur_step = steps[step_idx]
            u = ease_in_out(state["step_progress"])

            # Determine previous caliper positions for smooth interpolation
            if step_idx > 0:
                prev_step = steps[step_idx - 1]
                prev_low_x = visual_bars[prev_step.low].x_center
                prev_high_x = visual_bars[prev_step.high].x_center
                prev_mid_x = visual_bars[prev_step.mid].x_center
            else:
                prev_low_x = visual_bars[0].x_center
                prev_high_x = visual_bars[15].x_center
                prev_mid_x = visual_bars[7].x_center

            curr_low_x = visual_bars[cur_step.low].x_center
            curr_high_x = visual_bars[cur_step.high].x_center
            curr_mid_x = visual_bars[cur_step.mid].x_center

            interp_low_x = lerp(prev_low_x, curr_low_x, u)
            interp_high_x = lerp(prev_high_x, curr_high_x, u)
            interp_mid_x = lerp(prev_mid_x, curr_mid_x, u)

            # 1. Update LOW Arrow
            low_arrow.p1 = (interp_low_x - 8, base_y + 44)
            low_arrow.p2 = (interp_low_x, base_y + 28)
            low_arrow.p3 = (interp_low_x + 8, base_y + 44)
            low_label.pos = (interp_low_x - 14, base_y + 48)

            # 2. Update HIGH Arrow
            high_arrow.p1 = (interp_high_x - 8, base_y + 44)
            high_arrow.p2 = (interp_high_x, base_y + 28)
            high_arrow.p3 = (interp_high_x + 8, base_y + 44)
            high_label.pos = (interp_high_x - 16, base_y + 48)

            # 3. Update MID Laser & Badge
            mid_laser.p1 = (interp_mid_x, 118)
            mid_laser.p2 = (interp_mid_x, base_y)
            mid_badge.pmin = (interp_mid_x - 38, 90)
            mid_badge.pmax = (interp_mid_x + 38, 116)
            mid_badge_txt.pos = (interp_mid_x - 30, 95)
            mid_badge_txt.text = f"MID: [{cur_step.mid}]"

            # 4. Update Bars & Curtains
            active_elim = set(state["total_eliminated"])
            # If current step is past halfway, animate current elimination range
            if u > 0.4 and cur_step.eliminated_range:
                for i in range(cur_step.eliminated_range[0], cur_step.eliminated_range[1] + 1):
                    active_elim.add(i)

            for bar in visual_bars:
                is_eliminated = bar.idx in active_elim
                bar.curtain.show = is_eliminated

                if bar.idx == cur_step.mid:
                    # Highlight mid element
                    bar.rect.color = (255, 215, 60)
                    bar.rect.fill = (80, 65, 20)
                elif bar.idx < cur_step.low or bar.idx > cur_step.high or is_eliminated:
                    # Out-of-bounds / discarded
                    bar.rect.color = (40, 50, 70)
                    bar.rect.fill = (14, 18, 26)
                else:
                    # Active search candidate
                    bar.rect.color = (50, 140, 220)
                    bar.rect.fill = (22, 48, 76)

            # 5. Victory Glow Ring if Matched
            if cur_step.comparison == "==":
                matched_bar = visual_bars[cur_step.mid]
                match_glow.show = True
                bx = matched_bar.x_center
                by = matched_bar.top_y
                pulse = 0.5 + 0.5 * math.sin(state["step_progress"] * math.pi * 4.0)
                match_glow.pmin = (bx - 32 - 4 * pulse, by - 26 - 4 * pulse)
                match_glow.pmax = (bx + 32 + 4 * pulse, base_y + 28 + 4 * pulse)
            else:
                match_glow.show = False

            # 6. Update HUD Telemetry
            step_banner.value = f"Step {cur_step.step_num} / {len(steps)}: Probing arr[{cur_step.mid}] = {cur_step.mid_val}"
            telemetry_txt.value = (
                f" | Low: {cur_step.low} | High: {cur_step.high} | Mid: {cur_step.mid} ({cur_step.mid_val}) | Target: {state['target']}"
            )

            cmp_probe_txt.text = f"PROBING: arr[{cur_step.mid}] == {cur_step.mid_val}"
            if cur_step.comparison == "==":
                cmp_math_txt.text = f"DECISION: {cur_step.mid_val} == {state['target']} (EQUAL!)"
                cmp_action_txt.text = f"SUCCESS: Target {state['target']} found at index {cur_step.mid}!\nCompleted in {cur_step.step_num} iterations."
            elif cur_step.comparison == "<":
                cmp_math_txt.text = f"DECISION: {cur_step.mid_val} < {state['target']} (Too Small)"
                cmp_action_txt.text = f"ACTION: Discard left half [{cur_step.low}..{cur_step.mid}]\nNew Search Range: [{cur_step.mid + 1}..{cur_step.high}]"
            else:
                cmp_math_txt.text = f"DECISION: {cur_step.mid_val} > {state['target']} (Too Large)"
                cmp_action_txt.text = f"ACTION: Discard right half [{cur_step.mid}..{cur_step.high}]\nNew Search Range: [{cur_step.low}..{cur_step.mid - 1}]"

            # 7. Update Search Space Gauge
            remaining_count = max(1, cur_step.high - cur_step.low + 1)
            pct = remaining_count / 16.0
            gauge_w = 495.0 * pct
            gauge_fill.pmax = (535.0 + gauge_w, 485.0)
            gauge_txt.text = f"Remaining Candidates: {remaining_count} / 16 ({int(pct * 100)}%)"

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

            update_frame(clamped_dt)

            if state["playing"]:
                C.viewport.wake(full_refresh=True)

        dcg.TimeWatcher(C, parent=win, callback=on_viewport_frame)

        while C.running:
            C.viewport.render_frame()

    except Exception as exc:
        print(f"[ERROR] DearCyGui algorithm visualizer failed: {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
