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


PRESETS = [
    {
        "name": "Fruits",
        "text": "apple banana apple orange banana apple",
        "tokens": ["apple", "banana", "apple", "orange", "banana", "apple"],
        "keys": ["apple", "banana", "orange"],
        "colors": {
            "apple": (230, 80, 80),
            "banana": (240, 200, 60),
            "orange": (240, 140, 40),
        },
    },
    {
        "name": "Shakespeare",
        "text": "to be or not to be",
        "tokens": ["to", "be", "or", "not", "to", "be"],
        "keys": ["to", "be", "or", "not"],
        "colors": {
            "to": (80, 180, 240),
            "be": (160, 100, 240),
            "or": (80, 220, 160),
            "not": (240, 120, 180),
        },
    },
    {
        "name": "Tech Stack",
        "text": "code data code algo data code",
        "tokens": ["code", "data", "code", "algo", "data", "code"],
        "keys": ["code", "data", "algo"],
        "colors": {
            "code": (70, 200, 230),
            "data": (230, 160, 60),
            "algo": (180, 110, 240),
        },
    },
]


def main() -> None:
    try:
        C = dcg.Context()
        # Viewport configured for continuous 60 FPS presentation
        C.viewport.initialize(
            title="Algorithm Visualizer: String Split & Word Counting (Hash Map) [algo02]",
            width=1160,
            height=740,
            wait_for_input=False,
            vsync=True,
            always_submit_to_gpu=True,
        )
        C.viewport.always_submit_to_gpu = True

        state = {
            "playing": True,
            "t": 0.0,
            "speed": 1.0,
            "preset_idx": 0,
            "last_frame_ns": 0,
            "accumulator": 0.0,
        }

        current_preset = PRESETS[state["preset_idx"]]

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
            print("[INFO] Animation reset to start.")

        def step_anim(sender, target, data) -> None:
            state["playing"] = False
            C.viewport.wait_for_input = False
            state["t"] = (state["t"] + 0.25) % 6.0
            C.viewport.wake()
            print(f"[INFO] Stepped to t={state['t']:.2f}s")

        def select_preset(idx: int) -> None:
            state["preset_idx"] = idx
            state["t"] = 0.0
            state["accumulator"] = 0.0
            rebuild_preset_views()
            C.viewport.wake()
            print(f"[INFO] Selected Preset: {PRESETS[idx]['name']}")

        with dcg.Window(C, label="String Split & Word Counting Visualizer [algo02]", primary=True) as win:
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
                dcg.Button(C, label="Preset: Fruits", callback=lambda s, t, d: select_preset(0))
                dcg.Button(C, label="Preset: Shakespeare", callback=lambda s, t, d: select_preset(1))
                dcg.Button(C, label="Preset: Tech Stack", callback=lambda s, t, d: select_preset(2))

            # Progress Bar & Phase Telemetry
            with dcg.HorizontalLayout(C):
                scrubber = dcg.Slider(
                    C,
                    label="Timeline (s)",
                    min_value=0.0,
                    max_value=6.0,
                    value=0.0,
                    width=280,
                    callback=lambda s, t, d: (state.update(t=d), C.viewport.wake()),
                )
                dcg.Button(C, label="Raw Tape (t=0.0)", callback=lambda s, t, d: state.update(t=0.0))
                dcg.Button(C, label="Split Cuts (t=1.4)", callback=lambda s, t, d: state.update(t=1.4))
                dcg.Button(C, label="Counting Loop (t=2.2)", callback=lambda s, t, d: state.update(t=2.2))
                dcg.Button(C, label="Final Dict (t=5.6)", callback=lambda s, t, d: state.update(t=5.6))

            with dcg.HorizontalLayout(C):
                phase_badge = dcg.Text(C, value="Phase: [1/4] RAW STRING TAPE (In Memory)")
                telemetry_txt = dcg.Text(C, value=" | Total Tokens: 6 | Active Step: Scanning Delimiters")

            # Main Drawing Canvas
            with dcg.DrawInWindow(C, width=1120, height=620):
                # =========================================================================
                # 1. THE PROBLEM STATEMENT BANNER (Top)
                # =========================================================================
                dcg.DrawRect(C, pmin=(20, 10), pmax=(1100, 62), color=(50, 75, 110), fill=(16, 22, 34), rounding=6)
                dcg.DrawText(
                    C,
                    pos=(35, 17),
                    text="THE PROBLEM: Split a Sentence into Words & Count Word Frequencies with a Hash Map.",
                    color=(240, 215, 100),
                )
                dcg.DrawText(
                    C,
                    pos=(35, 37),
                    text="Step 1: text.split(' ') scans and chops at spaces -> List of tokens. Step 2: Hash Map tallies counts[word] = counts.get(word, 0) + 1.",
                    color=(180, 205, 230),
                )

                # =========================================================================
                # 2. RAW STRING TAPE SECTION (y: 75 .. 160)
                # =========================================================================
                tape_bg = dcg.DrawRect(
                    C,
                    pmin=(20, 75),
                    pmax=(1100, 160),
                    color=(60, 75, 95),
                    fill=(20, 26, 38),
                    rounding=8,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(35, 82), text="1. RAW STRING IN MEMORY: text (Continuous Character Sequence)", color=(170, 190, 220))

                # Pool of character cell rectangles and texts (up to 45 chars)
                MAX_CHARS = 45
                char_cells = []
                for i in range(MAX_CHARS):
                    box = dcg.DrawRect(
                        C,
                        pmin=(0, 0),
                        pmax=(0, 0),
                        color=(70, 85, 110),
                        fill=(30, 38, 52),
                        rounding=4,
                        thickness=1,
                    )
                    txt = dcg.DrawText(C, pos=(0, 0), text="", color=(230, 240, 255))
                    idx_txt = dcg.DrawText(C, pos=(0, 0), text="", color=(120, 140, 165))
                    char_cells.append({"box": box, "txt": txt, "idx": idx_txt, "char": "", "is_space": False, "orig_x": 0.0})

                # Slicer Blades (Laser Cuts that drop down at space positions)
                MAX_CUTS = 10
                laser_cuts = []
                for i in range(MAX_CUTS):
                    line = dcg.DrawLine(C, p1=(0, 0), p2=(0, 0), color=(255, 80, 80), thickness=3)
                    scissors_txt = dcg.DrawText(C, pos=(0, 0), text="[CUT ' ']", color=(255, 120, 120))
                    laser_cuts.append({"line": line, "txt": scissors_txt})

                # =========================================================================
                # 3. EXTRACTED TOKEN ARRAY (CONVEYOR) (y: 175 .. 265)
                # =========================================================================
                token_bg = dcg.DrawRect(
                    C,
                    pmin=(20, 175),
                    pmax=(1100, 265),
                    color=(50, 80, 120),
                    fill=(18, 28, 44),
                    rounding=8,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(35, 182), text="2. EXTRACTED TOKEN LIST: tokens = text.split(' ') [Array of Strings]", color=(140, 210, 255))

                MAX_TOKENS = 8
                token_boxes = []
                for i in range(MAX_TOKENS):
                    box = dcg.DrawRect(
                        C,
                        pmin=(0, 0),
                        pmax=(0, 0),
                        color=(80, 130, 180),
                        fill=(28, 45, 70),
                        rounding=6,
                        thickness=2,
                    )
                    word_txt = dcg.DrawText(C, pos=(0, 0), text="", color=(255, 255, 255))
                    idx_badge = dcg.DrawText(C, pos=(0, 0), text="", color=(140, 180, 220))
                    token_boxes.append({"box": box, "word_txt": word_txt, "idx_badge": idx_badge, "word": "", "center": (0.0, 0.0)})

                # Active Loop Scanner Arrow over Token Array
                loop_pointer_box = dcg.DrawRect(
                    C,
                    pmin=(0, 0),
                    pmax=(0, 0),
                    color=(255, 220, 80),
                    fill=(0, 0, 0, 0),
                    rounding=8,
                    thickness=3,
                )
                loop_pointer_txt = dcg.DrawText(C, pos=(0, 0), text="CURRENT TARGET", color=(255, 220, 80))

                # Flying Clone Token (Bezier traveling from Token list down to Dictionary)
                flying_token_box = dcg.DrawRect(
                    C,
                    pmin=(0, 0),
                    pmax=(0, 0),
                    color=(255, 220, 90),
                    fill=(240, 160, 40),
                    rounding=6,
                    thickness=3,
                )
                flying_token_txt = dcg.DrawText(C, pos=(0, 0), text="", color=(20, 20, 20))
                flying_token_box.show = False
                flying_token_txt.show = False

                # =========================================================================
                # 4. HASH MAP / DICTIONARY STORAGE & BAR CHARTS (y: 280 .. 600, Left Side)
                # =========================================================================
                dict_bg = dcg.DrawRect(
                    C,
                    pmin=(20, 280),
                    pmax=(640, 600),
                    color=(60, 85, 115),
                    fill=(16, 24, 36),
                    rounding=8,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(35, 290), text="3. HASH MAP STORAGE: counts = {} (Key-Value Lookups)", color=(240, 215, 100))
                dcg.DrawText(C, pos=(35, 310), text="Key (String Word)               Count Tally               Frequency Bar", color=(150, 180, 210))

                MAX_KEYS = 5
                dict_rows = []
                for i in range(MAX_KEYS):
                    y_top = 340 + i * 50
                    row_box = dcg.DrawRect(
                        C,
                        pmin=(35, y_top),
                        pmax=(625, y_top + 42),
                        color=(50, 65, 85),
                        fill=(24, 32, 46),
                        rounding=6,
                        thickness=1,
                    )
                    key_badge = dcg.DrawRect(
                        C,
                        pmin=(45, y_top + 6),
                        pmax=(160, y_top + 36),
                        color=(80, 120, 160),
                        fill=(35, 55, 80),
                        rounding=4,
                        thickness=1,
                    )
                    key_txt = dcg.DrawText(C, pos=(55, y_top + 12), text="", color=(255, 255, 255))

                    tally_box = dcg.DrawRect(
                        C,
                        pmin=(180, y_top + 6),
                        pmax=(240, y_top + 36),
                        color=(100, 150, 200),
                        fill=(40, 65, 95),
                        rounding=4,
                        thickness=2,
                    )
                    tally_txt = dcg.DrawText(C, pos=(198, y_top + 12), text="0", color=(255, 240, 140))

                    # Bar chart gauge
                    bar_bg = dcg.DrawRect(
                        C,
                        pmin=(260, y_top + 11),
                        pmax=(610, y_top + 31),
                        color=(40, 50, 65),
                        fill=(20, 25, 35),
                        rounding=4,
                        thickness=1,
                    )
                    bar_fill = dcg.DrawRect(
                        C,
                        pmin=(260, y_top + 11),
                        pmax=(260, y_top + 31),
                        color=(80, 200, 120),
                        fill=(50, 180, 100),
                        rounding=4,
                        thickness=1,
                    )
                    bar_txt = dcg.DrawText(C, pos=(270, y_top + 13), text="", color=(255, 255, 255))

                    dict_rows.append({
                        "row_box": row_box,
                        "key_badge": key_badge,
                        "key_txt": key_txt,
                        "tally_box": tally_box,
                        "tally_txt": tally_txt,
                        "bar_bg": bar_bg,
                        "bar_fill": bar_fill,
                        "bar_txt": bar_txt,
                        "key_str": "",
                        "center": (102.0, y_top + 21.0),
                    })

                # =========================================================================
                # 5. CODE EXECUTION HUD & LIVE TELEMETRY (y: 280 .. 600, Right Side)
                # =========================================================================
                code_bg = dcg.DrawRect(
                    C,
                    pmin=(655, 280),
                    pmax=(1100, 600),
                    color=(70, 85, 110),
                    fill=(16, 22, 34),
                    rounding=8,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(670, 290), text="4. PYTHON CODE & EXECUTION TELEMETRY", color=(130, 220, 255))

                code_lines = [
                    (325, "1: text = 'apple banana apple...'"),
                    (348, "2: tokens = text.split(' ')"),
                    (371, "3: counts = {}"),
                    (394, "4: for word in tokens:"),
                    (417, "5:     if word in counts:"),
                    (440, "6:         counts[word] += 1"),
                    (463, "7:     else:"),
                    (486, "8:         counts[word] = 1"),
                ]

                code_highlighters = []
                for y_pos, txt_code in code_lines:
                    hl_box = dcg.DrawRect(
                        C,
                        pmin=(670, y_pos - 3),
                        pmax=(1085, y_pos + 18),
                        color=(0, 0, 0, 0),
                        fill=(40, 70, 110, 0),
                        rounding=4,
                    )
                    txt_elem = dcg.DrawText(C, pos=(680, y_pos), text=txt_code, color=(190, 210, 230))
                    code_highlighters.append({"box": hl_box, "txt": txt_elem})

                # Live Execution Variables Inspector
                dcg.DrawRect(
                    C,
                    pmin=(670, 515),
                    pmax=(1085, 588),
                    color=(50, 70, 95),
                    fill=(22, 30, 44),
                    rounding=6,
                )
                dcg.DrawText(C, pos=(680, 522), text="LIVE VARIABLES INSPECTOR:", color=(240, 215, 100))
                var_token_txt = dcg.DrawText(C, pos=(680, 542), text="word = None", color=(180, 220, 255))
                var_dict_txt = dcg.DrawText(C, pos=(680, 562), text="counts = {}", color=(180, 240, 180))

            # -------------------------------------------------------------------------
            # Rebuild Preset Layout
            # -------------------------------------------------------------------------
            def rebuild_preset_views() -> None:
                nonlocal current_preset
                current_preset = PRESETS[state["preset_idx"]]
                raw_text = current_preset["text"]
                tokens = current_preset["tokens"]
                keys = current_preset["keys"]

                # Configure Raw String Character Tape
                cell_w = 21.0
                start_x = 35.0
                char_y = 105.0

                for i in range(MAX_CHARS):
                    if i < len(raw_text):
                        ch = raw_text[i]
                        cx = start_x + i * (cell_w + 2.0)
                        char_cells[i]["box"].pmin = (cx, char_y)
                        char_cells[i]["box"].pmax = (cx + cell_w, char_y + 36.0)
                        char_cells[i]["box"].show = True
                        char_cells[i]["char"] = ch
                        char_cells[i]["orig_x"] = cx
                        char_cells[i]["is_space"] = (ch == " ")

                        if ch == " ":
                            char_cells[i]["box"].fill = (60, 35, 35)
                            char_cells[i]["box"].color = (180, 70, 70)
                            char_cells[i]["txt"].text = "[_]"
                            char_cells[i]["txt"].color = (255, 120, 120)
                        else:
                            char_cells[i]["box"].fill = (30, 38, 52)
                            char_cells[i]["box"].color = (70, 85, 110)
                            char_cells[i]["txt"].text = ch
                            char_cells[i]["txt"].color = (235, 245, 255)

                        char_cells[i]["txt"].pos = (cx + 5, char_y + 5)
                        char_cells[i]["txt"].show = True
                        char_cells[i]["idx"].text = str(i)
                        char_cells[i]["idx"].pos = (cx + 4, char_y + 22)
                        char_cells[i]["idx"].show = True
                    else:
                        char_cells[i]["box"].show = False
                        char_cells[i]["txt"].show = False
                        char_cells[i]["idx"].show = False

                # Configure Laser Cuts at Space Positions
                cut_idx = 0
                for i, ch in enumerate(raw_text):
                    if ch == " " and cut_idx < MAX_CUTS:
                        cx = start_x + i * (cell_w + 2.0) + cell_w * 0.5
                        laser_cuts[cut_idx]["line"].p1 = (cx, char_y - 8)
                        laser_cuts[cut_idx]["line"].p2 = (cx, char_y + 44)
                        laser_cuts[cut_idx]["txt"].pos = (cx - 24, char_y - 20)
                        laser_cuts[cut_idx]["line"].show = False
                        laser_cuts[cut_idx]["txt"].show = False
                        cut_idx += 1
                for j in range(cut_idx, MAX_CUTS):
                    laser_cuts[j]["line"].show = False
                    laser_cuts[j]["txt"].show = False

                # Configure Extracted Token Array Conveyor
                t_w = 110.0
                t_start_x = 40.0
                t_y = 208.0

                for i in range(MAX_TOKENS):
                    if i < len(tokens):
                        w = tokens[i]
                        tx = t_start_x + i * (t_w + 20.0)
                        token_boxes[i]["box"].pmin = (tx, t_y)
                        token_boxes[i]["box"].pmax = (tx + t_w, t_y + 42.0)
                        token_boxes[i]["box"].show = True
                        token_boxes[i]["word_txt"].pos = (tx + 14, t_y + 8)
                        token_boxes[i]["word_txt"].text = f"'{w}'"
                        token_boxes[i]["word_txt"].show = True
                        token_boxes[i]["idx_badge"].pos = (tx + 14, t_y + 26)
                        token_boxes[i]["idx_badge"].text = f"tokens[{i}]"
                        token_boxes[i]["idx_badge"].show = True
                        token_boxes[i]["word"] = w
                        token_boxes[i]["center"] = (tx + t_w * 0.5, t_y + 21.0)
                    else:
                        token_boxes[i]["box"].show = False
                        token_boxes[i]["word_txt"].show = False
                        token_boxes[i]["idx_badge"].show = False

                # Configure Hash Map Rows for Unique Keys
                for i in range(MAX_KEYS):
                    if i < len(keys):
                        k = keys[i]
                        dict_rows[i]["row_box"].show = True
                        dict_rows[i]["key_badge"].show = True
                        dict_rows[i]["key_txt"].text = f"'{k}'"
                        dict_rows[i]["key_txt"].show = True
                        dict_rows[i]["tally_box"].show = True
                        dict_rows[i]["tally_txt"].text = "0"
                        dict_rows[i]["tally_txt"].show = True
                        dict_rows[i]["bar_bg"].show = True
                        dict_rows[i]["bar_fill"].show = True
                        dict_rows[i]["bar_txt"].show = True
                        dict_rows[i]["key_str"] = k
                        dict_rows[i]["bar_fill"].pmax = (260, dict_rows[i]["bar_bg"].pmax[1])
                    else:
                        dict_rows[i]["row_box"].show = False
                        dict_rows[i]["key_badge"].show = False
                        dict_rows[i]["key_txt"].show = False
                        dict_rows[i]["tally_box"].show = False
                        dict_rows[i]["tally_txt"].show = False
                        dict_rows[i]["bar_bg"].show = False
                        dict_rows[i]["bar_fill"].show = False
                        dict_rows[i]["bar_txt"].show = False

            rebuild_preset_views()

            # -------------------------------------------------------------------------
            # Timeline & Interpolation Engine (6.0s Total Loop)
            # -------------------------------------------------------------------------
            def update_timeline(t: float) -> None:
                scrubber.value = t
                raw_text = current_preset["text"]
                tokens = current_preset["tokens"]
                keys = current_preset["keys"]
                key_colors = current_preset["colors"]

                # Reset highlights on code
                for hl in code_highlighters:
                    hl["box"].fill = (40, 70, 110, 0)
                    hl["box"].color = (0, 0, 0, 0)

                # =====================================================================
                # Phase 1: SCANNING & DELIMITER RECOGNITION (t: 0.0 .. 1.2s)
                # =====================================================================
                if t < 1.2:
                    phase_badge.value = "Phase: [1/4] STRING TAPE & DELIMITER SCAN"
                    telemetry_txt.value = f" | Raw length: {len(raw_text)} chars | Scanning whitespace delimiters ' '"
                    code_highlighters[0]["box"].fill = (50, 100, 180, 160)
                    code_highlighters[0]["box"].color = (100, 180, 255)

                    scan_u = t / 1.2
                    active_char_idx = int(scan_u * len(raw_text))

                    # Display laser blades slicing as scanner arrives
                    for cut in laser_cuts:
                        cut["line"].show = False
                        cut["txt"].show = False

                    for i in range(len(raw_text)):
                        if i < len(char_cells):
                            cell = char_cells[i]
                            orig_x = cell["orig_x"]
                            cell["box"].pmin = (orig_x, 105.0)
                            cell["box"].pmax = (orig_x + 21.0, 141.0)
                            cell["txt"].pos = (orig_x + 5, 110.0)
                            cell["idx"].pos = (orig_x + 4, 127.0)

                            if i <= active_char_idx:
                                if cell["is_space"]:
                                    cell["box"].fill = (140, 40, 40)
                                    cell["box"].color = (255, 100, 100)
                                    cell["txt"].color = (255, 220, 220)
                                else:
                                    cell["box"].fill = (45, 65, 95)
                                    cell["box"].color = (100, 150, 210)
                                    cell["txt"].color = (255, 255, 255)
                            else:
                                if cell["is_space"]:
                                    cell["box"].fill = (50, 30, 30)
                                    cell["box"].color = (140, 60, 60)
                                    cell["txt"].color = (200, 100, 100)
                                else:
                                    cell["box"].fill = (25, 32, 44)
                                    cell["box"].color = (60, 75, 95)
                                    cell["txt"].color = (160, 175, 195)

                    loop_pointer_box.show = False
                    loop_pointer_txt.show = False
                    flying_token_box.show = False
                    flying_token_txt.show = False

                    # Reset dictionary visual tallies to 0
                    for row in dict_rows:
                        row["tally_txt"].text = "0"
                        row["bar_fill"].pmax = (260, row["bar_bg"].pmax[1])
                        row["bar_txt"].text = ""
                    var_token_txt.text = "word = None"
                    var_dict_txt.text = "counts = {}"
                    return

                # =====================================================================
                # Phase 2: SLICING / SPLITTING INTO LIST TOKENS (t: 1.2 .. 2.0s)
                # =====================================================================
                if t < 2.0:
                    phase_badge.value = "Phase: [2/4] SLICING & TOKEN EXTRACTION (text.split(' '))"
                    telemetry_txt.value = f" | Slicing at spaces | Discarding delimiters | Created list of {len(tokens)} tokens"
                    code_highlighters[1]["box"].fill = (50, 100, 180, 160)
                    code_highlighters[1]["box"].color = (100, 180, 255)

                    split_u = ease_in_out((t - 1.2) / 0.8)

                    # Show laser cuts flashing and separating
                    for cut in laser_cuts:
                        cut["line"].show = True
                        cut["txt"].show = True

                    # Word chunks drift apart
                    running_char_idx = 0
                    for token_idx, word in enumerate(tokens):
                        offset_x = (token_idx - len(tokens) / 2.0) * 16.0 * split_u
                        for c_in_word in word:
                            if running_char_idx < len(char_cells):
                                cell = char_cells[running_char_idx]
                                orig_x = cell["orig_x"] + offset_x
                                cell["box"].pmin = (orig_x, 105.0)
                                cell["box"].pmax = (orig_x + 21.0, 141.0)
                                cell["txt"].pos = (orig_x + 5, 110.0)
                                cell["idx"].pos = (orig_x + 4, 127.0)
                                cell["box"].fill = (40, 70, 110)
                                cell["box"].color = (80, 140, 220)
                            running_char_idx += 1
                        # Space character disappears / fades down
                        if running_char_idx < len(char_cells) and running_char_idx < len(raw_text):
                            space_cell = char_cells[running_char_idx]
                            orig_x = space_cell["orig_x"]
                            space_cell["box"].pmin = (orig_x, 105.0 + 20.0 * split_u)
                            space_cell["box"].pmax = (orig_x + 21.0, 141.0 + 20.0 * split_u)
                            space_cell["txt"].pos = (orig_x + 5, 110.0 + 20.0 * split_u)
                            space_cell["idx"].pos = (orig_x + 4, 127.0 + 20.0 * split_u)
                            space_cell["box"].fill = (70, 25, 25)
                            space_cell["box"].color = (180, 60, 60)
                            running_char_idx += 1

                    # Token boxes in conveyor belt become active
                    for i in range(len(tokens)):
                        token_boxes[i]["box"].fill = (35, 55, 85)
                        token_boxes[i]["box"].color = (100, 160, 230)

                    loop_pointer_box.show = False
                    loop_pointer_txt.show = False
                    flying_token_box.show = False
                    flying_token_txt.show = False
                    var_token_txt.text = "word = None"
                    var_dict_txt.text = "counts = {}"
                    return

                # Hide laser cuts after split
                for cut in laser_cuts:
                    cut["line"].show = False
                    cut["txt"].show = False

                # =====================================================================
                # Phase 3 & 4: HASH MAP COUNTING LOOP (t: 2.0 .. 5.5s) & SUMMARY (5.5 .. 6.0s)
                # =====================================================================
                loop_start_t = 2.0
                loop_end_t = 5.5
                num_tokens = len(tokens)
                dt_per_token = (loop_end_t - loop_start_t) / num_tokens

                # Tally counts up to current progress
                current_counts: Dict[str, int] = {}
                active_token_idx = int((t - loop_start_t) / dt_per_token)
                active_token_idx = min(active_token_idx, num_tokens - 1)

                token_u = ((t - loop_start_t) - active_token_idx * dt_per_token) / dt_per_token
                token_u = max(0.0, min(1.0, token_u))

                # Count all previous tokens
                for i in range(active_token_idx):
                    w = tokens[i]
                    current_counts[w] = current_counts.get(w, 0) + 1

                curr_word = tokens[active_token_idx] if t < 5.5 else tokens[-1]
                is_existing_key = curr_word in current_counts

                # Code line highlighting based on execution step
                if t >= 5.5:
                    phase_badge.value = "Phase: [4/4] COMPLETE: FINAL FREQUENCY DICTIONARY"
                    telemetry_txt.value = f" | Scanned all {num_tokens} tokens | Distinct unique keys: {len(keys)}"
                    code_highlighters[3]["box"].fill = (50, 100, 180, 120)
                    code_highlighters[3]["box"].color = (100, 180, 255)
                    # All tokens fully counted
                    for i in range(num_tokens):
                        w = tokens[i]
                        current_counts[w] = current_counts.get(w, 0) + (1 if i >= active_token_idx else 0)
                    var_token_txt.text = "word = None (Loop finished)"
                    var_dict_txt.text = f"counts = {current_counts}"
                    loop_pointer_box.show = False
                    loop_pointer_txt.show = False
                    flying_token_box.show = False
                    flying_token_txt.show = False
                else:
                    phase_badge.value = f"Phase: [3/4] COUNTING TOKEN {active_token_idx + 1}/{num_tokens}: '{curr_word}'"
                    code_highlighters[3]["box"].fill = (40, 80, 140, 120)
                    code_highlighters[3]["box"].color = (80, 150, 220)

                    if token_u < 0.4:
                        # Checking condition: if word in counts
                        code_highlighters[4]["box"].fill = (60, 110, 190, 160)
                        code_highlighters[4]["box"].color = (120, 190, 255)
                        telemetry_txt.value = f" | Checking: '{curr_word}' in counts? {'YES (Increment)' if is_existing_key else 'NO (Insert Key)'}"
                    elif is_existing_key:
                        # counts[word] += 1
                        code_highlighters[5]["box"].fill = (50, 140, 80, 180)
                        code_highlighters[5]["box"].color = (90, 230, 130)
                        telemetry_txt.value = f" | Key '{curr_word}' found -> counts['{curr_word}'] += 1"
                    else:
                        # counts[word] = 1
                        code_highlighters[7]["box"].fill = (140, 100, 40, 180)
                        code_highlighters[7]["box"].color = (240, 180, 70)
                        telemetry_txt.value = f" | Key '{curr_word}' is new -> counts['{curr_word}'] = 1"

                    var_token_txt.text = f"word = '{curr_word}' (tokens[{active_token_idx}])"

                    # When token_u >= 0.7, add the count
                    if token_u >= 0.7:
                        current_counts[curr_word] = current_counts.get(curr_word, 0) + 1
                    var_dict_txt.text = f"counts = {current_counts}"

                    # Update Token Array Box styles and highlight current target
                    t_box = token_boxes[active_token_idx]
                    loop_pointer_box.show = True
                    loop_pointer_txt.show = True
                    loop_pointer_box.pmin = (t_box["box"].pmin[0] - 4, t_box["box"].pmin[1] - 4)
                    loop_pointer_box.pmax = (t_box["box"].pmax[0] + 4, t_box["box"].pmax[1] + 4)
                    loop_pointer_txt.pos = (t_box["box"].pmin[0] + 8, t_box["box"].pmin[1] - 18)

                    # Animate flying token on Bezier curve down to dictionary row
                    dest_row_idx = keys.index(curr_word) if curr_word in keys else 0
                    p0 = t_box["center"]
                    p3 = dict_rows[dest_row_idx]["center"]
                    p1 = (p0[0], p0[1] + 60.0)
                    p2 = (p3[0] + 80.0, p3[1] - 30.0)

                    flight_t = ease_in_out(token_u)
                    fly_x, fly_y = cubic_bezier(p0, p1, p2, p3, flight_t)

                    flying_token_box.show = True
                    flying_token_txt.show = True
                    fw, fh = 80.0, 30.0
                    flying_token_box.pmin = (fly_x - fw * 0.5, fly_y - fh * 0.5)
                    flying_token_box.pmax = (fly_x + fw * 0.5, fly_y + fh * 0.5)
                    col = key_colors.get(curr_word, (200, 200, 200))
                    flying_token_box.fill = (col[0], col[1], col[2], 220)
                    flying_token_txt.pos = (fly_x - fw * 0.5 + 14, fly_y - fh * 0.5 + 7)
                    flying_token_txt.text = f"'{curr_word}'"

                # Update Dictionary Rows & Visual Bar Charts
                max_possible_count = max(tokens.count(k) for k in keys) if keys else 1
                bar_max_width = 340.0

                for i, k in enumerate(keys):
                    if i < len(dict_rows):
                        row = dict_rows[i]
                        count_val = current_counts.get(k, 0)
                        row["tally_txt"].text = str(count_val)

                        # Check if this row is being hit right now
                        is_current_target = (t < 5.5 and curr_word == k and token_u > 0.5)

                        if is_current_target:
                            row["row_box"].fill = (38, 52, 75)
                            row["row_box"].color = (120, 180, 255)
                            row["tally_box"].fill = (60, 100, 150)
                            row["tally_box"].color = (255, 220, 80)
                        else:
                            row["row_box"].fill = (24, 32, 46)
                            row["row_box"].color = (50, 65, 85)
                            row["tally_box"].fill = (40, 65, 95)
                            row["tally_box"].color = (100, 150, 200)

                        # Bar chart growth
                        target_bar_len = (count_val / max_possible_count) * bar_max_width if max_possible_count > 0 else 0
                        bx_start = 260.0
                        row["bar_fill"].pmin = (bx_start, row["bar_bg"].pmin[1])
                        row["bar_fill"].pmax = (bx_start + target_bar_len, row["bar_bg"].pmax[1])

                        k_col = key_colors.get(k, (100, 200, 120))
                        row["bar_fill"].fill = (k_col[0], k_col[1], k_col[2], 200)
                        row["bar_fill"].color = k_col

                        if count_val > 0:
                            row["bar_txt"].text = f"{count_val}x ({int((count_val / len(tokens)) * 100)}%)"
                            row["bar_txt"].pos = (bx_start + target_bar_len + 12, row["bar_bg"].pmin[1] + 2)
                        else:
                            row["bar_txt"].text = ""

            # -------------------------------------------------------------------------
            # 60 FPS Fixed-Timestep TimeWatcher Frame Callback
            # -------------------------------------------------------------------------
            FIXED_STEP = 1.0 / 60.0

            def on_viewport_frame(sender, target, metrics) -> None:
                if metrics and len(metrics) > 2 and metrics[2]:
                    now_ns = metrics[2]
                else:
                    import time
                    now_ns = time.perf_counter_ns()

                if state["last_frame_ns"] == 0:
                    state["last_frame_ns"] = now_ns
                    update_timeline(state["t"])
                    return

                raw_dt = (now_ns - state["last_frame_ns"]) / 1_000_000_000.0
                state["last_frame_ns"] = now_ns
                clamped_dt = min(raw_dt, 0.1)

                if state["playing"]:
                    state["accumulator"] += clamped_dt * state["speed"]
                    while state["accumulator"] >= FIXED_STEP:
                        state["t"] += FIXED_STEP
                        if state["t"] >= 6.0:
                            state["t"] = 0.0
                        state["accumulator"] -= FIXED_STEP

                    update_timeline(state["t"])
                    C.viewport.wake(full_refresh=True)

            dcg.TimeWatcher(C, parent=win, callback=on_viewport_frame)
            update_timeline(0.0)

        while C.running:
            C.viewport.render_frame()

    except Exception as e:
        print(f"[FATAL] Error running algo02: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
