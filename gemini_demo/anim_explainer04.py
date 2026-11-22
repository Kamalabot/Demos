import collections
import math
import random
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple
import dearcygui as dcg

# Open Source Notice:
# DearCyGui (MIT License) - Cython-powered GPU GUI toolkit for Dear ImGui.
# Requirements: dearcygui (installable via pip in target Python virtual environment).

# =============================================================================
# WAVE FUNCTION COLLAPSE: TILE DEFINITIONS & SOCKET RULES
# =============================================================================
# Sockets are ordered: [TOP, RIGHT, BOTTOM, LEFT]
# Binary connection: 0 = No connection, 1 = Wire/Pipe connection
TILES = {
    "BLANK": {"sockets": (0, 0, 0, 0), "wires": (False, False, False, False), "name": "Blank"},
    "HORIZ": {"sockets": (0, 1, 0, 1), "wires": (False, True, False, True), "name": "Horizontal"},
    "VERT": {"sockets": (1, 0, 1, 0), "wires": (True, False, True, False), "name": "Vertical"},
    "CROSS": {"sockets": (1, 1, 1, 1), "wires": (True, True, True, True), "name": "Crossroad"},
    "CORNER_UR": {"sockets": (1, 1, 0, 0), "wires": (True, True, False, False), "name": "Turn Up-Right"},
    "CORNER_DR": {"sockets": (0, 1, 1, 0), "wires": (False, True, True, False), "name": "Turn Down-Right"},
    "CORNER_DL": {"sockets": (0, 0, 1, 1), "wires": (False, False, True, True), "name": "Turn Down-Left"},
    "CORNER_UL": {"sockets": (1, 0, 0, 1), "wires": (True, False, False, True), "name": "Turn Up-Left"},
}
ALL_TILE_KEYS = list(TILES.keys())
GRID_SIZE = 8  # 8x8 grid = 64 cells


def lerp(a: float, b: float, u: float) -> float:
    """Linear interpolation between a and b."""
    return a + (b - a) * u


def compute_compatibility_matrix() -> Dict[str, Dict[str, Set[str]]]:
    """
    Precomputes valid neighbors for every tile across all 4 directions.
    Direction offsets:
      'UP':    Tile A's TOP socket must match Tile B's BOTTOM socket
      'RIGHT': Tile A's RIGHT socket must match Tile B's LEFT socket
      'DOWN':  Tile A's BOTTOM socket must match Tile B's TOP socket
      'LEFT':  Tile A's LEFT socket must match Tile B's RIGHT socket
    """
    compat = {t: {"UP": set(), "RIGHT": set(), "DOWN": set(), "LEFT": set()} for t in ALL_TILE_KEYS}
    opposite = {"UP": "DOWN", "RIGHT": "LEFT", "DOWN": "UP", "LEFT": "RIGHT"}
    dir_to_idx = {"UP": (0, 2), "RIGHT": (1, 3), "DOWN": (2, 0), "LEFT": (3, 1)}

    for t1, data1 in TILES.items():
        s1 = data1["sockets"]
        for t2, data2 in TILES.items():
            s2 = data2["sockets"]
            for direction, (idx1, idx2) in dir_to_idx.items():
                if s1[idx1] == s2[idx2]:
                    compat[t1][direction].add(t2)
    return compat


COMPAT = compute_compatibility_matrix()


@dataclass
class VisualCell:
    row: int
    col: int
    box: dcg.DrawRect
    entropy_txt: dcg.DrawText
    wire_top: dcg.DrawLine
    wire_right: dcg.DrawLine
    wire_bottom: dcg.DrawLine
    wire_left: dcg.DrawLine
    center_dot: dcg.DrawCircle


class WFCGrid:
    def __init__(self, size: int):
        self.size = size
        self.cells: List[List[Set[str]]] = []
        self.collapsed_count = 0
        self.contradiction = False
        self.last_collapsed_coord: Optional[Tuple[int, int]] = None
        self.propagating_coords: List[Tuple[int, int]] = []
        self.total_propagations = 0
        self.reset()

    def reset(self) -> None:
        self.cells = [[set(ALL_TILE_KEYS) for _ in range(self.size)] for _ in range(self.size)]
        self.collapsed_count = 0
        self.contradiction = False
        self.last_collapsed_coord = None
        self.propagating_coords.clear()
        self.total_propagations = 0

    def find_lowest_entropy_coords(self) -> List[Tuple[int, int]]:
        """Finds all uncollapsed cells with the minimum non-zero entropy."""
        min_entropy = len(ALL_TILE_KEYS) + 1
        candidates = []

        for r in range(self.size):
            for c in range(self.size):
                count = len(self.cells[r][c])
                if count > 1:
                    if count < min_entropy:
                        min_entropy = count
                        candidates = [(r, c)]
                    elif count == min_entropy:
                        candidates.append((r, c))
        return candidates

    def step(self) -> bool:
        """
        Executes one atomic WFC cycle:
        1. Find min-entropy cell.
        2. Collapse to a single random choice.
        3. Propagate constraints to neighbors via BFS queue.
        Returns True if progress was made, False if finished or contradiction.
        """
        if self.contradiction or self.collapsed_count == self.size * self.size:
            return False

        candidates = self.find_lowest_entropy_coords()
        if not candidates:
            return False  # Grid completely solved

        # Step 1: Observation / Collapse
        target_r, target_c = random.choice(candidates)
        chosen_tile = random.choice(list(self.cells[target_r][target_c]))
        self.cells[target_r][target_c] = {chosen_tile}
        self.last_collapsed_coord = (target_r, target_c)
        self.collapsed_count += 1

        # Step 2: Constraint Propagation (BFS Ripple)
        queue = collections.deque([(target_r, target_c)])
        self.propagating_coords = [(target_r, target_c)]
        directions = [
            (-1, 0, "UP"),
            (0, 1, "RIGHT"),
            (1, 0, "DOWN"),
            (0, -1, "LEFT"),
        ]

        while queue:
            cr, cc = queue.popleft()
            current_possibilities = self.cells[cr][cc]

            for dr, dc, direction in directions:
                nr, nc = cr + dr, cc + dc
                if 0 <= nr < self.size and 0 <= nc < self.size:
                    neighbor_possibilities = self.cells[nr][nc]
                    if len(neighbor_possibilities) <= 1:
                        continue  # Already collapsed

                    # Compute set of allowed tiles in neighbor according to current cell possibilities
                    valid_for_neighbor = set()
                    for tile in current_possibilities:
                        valid_for_neighbor.update(COMPAT[tile][direction])

                    # Restrict neighbor
                    eliminated = neighbor_possibilities - valid_for_neighbor
                    if eliminated:
                        self.cells[nr][nc] -= eliminated
                        self.total_propagations += 1
                        self.propagating_coords.append((nr, nc))

                        if len(self.cells[nr][nc]) == 0:
                            self.contradiction = True
                            return False

                        queue.append((nr, nc))

        return True


def main() -> None:
    try:
        C = dcg.Context()
        # Viewport configuration for smooth 60 FPS presentation
        C.viewport.initialize(
            title="Interactive Wave Function Collapse (WFC) Explainer [v04]",
            width=1120,
            height=700,
            wait_for_input=False,
            vsync=True,
            always_submit_to_gpu=True,
        )
        C.viewport.always_submit_to_gpu = True

        wfc = WFCGrid(GRID_SIZE)

        state = {
            "playing": True,
            "step_interval": 0.12,  # Seconds per collapse step
            "time_since_step": 0.0,
            "last_frame_ns": 0,
            "auto_restart": True,
        }

        def toggle_play(sender, target, data) -> None:
            state["playing"] = not state["playing"]
            C.viewport.wait_for_input = not state["playing"]
            if state["playing"]:
                state["last_frame_ns"] = 0
                C.viewport.wake()
            print(f"[INFO] WFC Simulation: {'RUNNING' if state['playing'] else 'PAUSED'}")

        def step_manual(sender, target, data) -> None:
            state["playing"] = False
            C.viewport.wait_for_input = False
            wfc.step()
            C.viewport.wake()

        def restart_grid(sender, target, data) -> None:
            wfc.reset()
            state["time_since_step"] = 0.0
            C.viewport.wake()
            print("[INFO] WFC Grid reset to pure superposition.")

        with dcg.Window(C, label="Wave Function Collapse Studio [v04]", primary=True) as win:
            # Control Toolbar
            with dcg.HorizontalLayout(C):
                dcg.Button(C, label="Play / Pause", callback=toggle_play)
                dcg.Button(C, label="Step Collapse (+1)", callback=step_manual)
                dcg.Button(C, label="Restart / Re-seed", callback=restart_grid)
                dcg.Slider(
                    C,
                    label="Speed (s/step)",
                    min_value=0.02,
                    max_value=0.5,
                    value=0.12,
                    width=140,
                    callback=lambda s, t, d: state.update(step_interval=d),
                )
                status_txt = dcg.Text(C, value="Status: COLLAPSING SUPERPOSITION")

            # Main Drawing Canvas
            with dcg.DrawInWindow(C, width=1080, height=620):
                # =========================================================================
                # 1. THE 8x8 WFC SUPERPOSITION / COLLAPSE GRID (Left Area)
                # =========================================================================
                grid_origin_x = 40
                grid_origin_y = 30
                cell_size = 56
                gap = 4

                visual_cells: List[List[VisualCell]] = []

                for r in range(GRID_SIZE):
                    row_cells = []
                    for c in range(GRID_SIZE):
                        x0 = grid_origin_x + c * (cell_size + gap)
                        y0 = grid_origin_y + r * (cell_size + gap)
                        x1 = x0 + cell_size
                        y1 = y0 + cell_size
                        cx = (x0 + x1) * 0.5
                        cy = (y0 + y1) * 0.5

                        box = dcg.DrawRect(
                            C,
                            pmin=(x0, y0),
                            pmax=(x1, y1),
                            color=(50, 70, 100),
                            fill=(20, 26, 38),
                            rounding=6,
                            thickness=1,
                        )

                        # Entropy counter text
                        entropy_txt = dcg.DrawText(C, pos=(cx - 6, cy - 8), text="8", color=(180, 200, 240))

                        # 4 orthogonal wire line primitives
                        w_top = dcg.DrawLine(C, p1=(cx, y0 + 4), p2=(cx, cy), color=(40, 215, 235), thickness=4)
                        w_right = dcg.DrawLine(C, p1=(cx, cy), p2=(x1 - 4, cy), color=(40, 215, 235), thickness=4)
                        w_bottom = dcg.DrawLine(C, p1=(cx, cy), p2=(cx, y1 - 4), color=(40, 215, 235), thickness=4)
                        w_left = dcg.DrawLine(C, p1=(x0 + 4, cy), p2=(cx, cy), color=(40, 215, 235), thickness=4)

                        center_dot = dcg.DrawCircle(C, center=(cx, cy), radius=4, color=(255, 255, 255), fill=(40, 215, 235))

                        w_top.show = False
                        w_right.show = False
                        w_bottom.show = False
                        w_left.show = False
                        center_dot.show = False

                        v_cell = VisualCell(
                            row=r,
                            col=c,
                            box=box,
                            entropy_txt=entropy_txt,
                            wire_top=w_top,
                            wire_right=w_right,
                            wire_bottom=w_bottom,
                            wire_left=w_left,
                            center_dot=center_dot,
                        )
                        row_cells.append(v_cell)
                    visual_cells.append(row_cells)

                # Propagation Ripple Highlight Box
                ripple_box = dcg.DrawRect(
                    C,
                    pmin=(0, 0),
                    pmax=(cell_size, cell_size),
                    color=(255, 200, 50),
                    fill=(255, 180, 30, 40),
                    rounding=8,
                    thickness=3,
                )
                ripple_box.show = False

                # =========================================================================
                # 2. WFC ALGORITHM & CONCEPT INSPECTOR (Right Area)
                # =========================================================================
                hud_x = 560
                dcg.DrawRect(
                    C,
                    pmin=(hud_x, 30),
                    pmax=(hud_x + 480, 590),
                    color=(55, 75, 110),
                    fill=(16, 22, 34),
                    rounding=8,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(hud_x + 20, 45), text="WAVE FUNCTION COLLAPSE ARCHITECTURE", color=(220, 235, 255))
                dcg.DrawLine(C, p1=(hud_x + 10, 68), p2=(hud_x + 470, 68), color=(35, 50, 75), thickness=1)

                # Live Metrics Dashboard
                dcg.DrawText(C, pos=(hud_x + 20, 80), text="[LIVE TELEMETRY]", color=(240, 200, 90))
                metric_collapsed = dcg.DrawText(C, pos=(hud_x + 20, 102), text="Collapsed Cells: 0 / 64", color=(255, 255, 255))
                metric_entropy = dcg.DrawText(C, pos=(hud_x + 20, 124), text="Lowest Entropy: 8 possibilities", color=(100, 225, 245))
                metric_props = dcg.DrawText(C, pos=(hud_x + 20, 146), text="Constraint Propagations: 0", color=(180, 150, 240))

                # Step-by-Step Cycle Guide
                dcg.DrawText(C, pos=(hud_x + 20, 180), text="[THE 3 PHASES OF WFC]", color=(240, 200, 90))

                step1_box = dcg.DrawRect(C, pmin=(hud_x + 20, 205), pmax=(hud_x + 460, 255), color=(60, 90, 130), fill=(22, 30, 48), rounding=6)
                dcg.DrawText(C, pos=(hud_x + 30, 212), text="1. Shannon Entropy Scan", color=(255, 220, 100))
                dcg.DrawText(C, pos=(hud_x + 30, 230), text="Scan all cells; find minimum non-zero possibility count.", color=(160, 185, 215))

                step2_box = dcg.DrawRect(C, pmin=(hud_x + 20, 265), pmax=(hud_x + 460, 315), color=(60, 90, 130), fill=(22, 30, 48), rounding=6)
                dcg.DrawText(C, pos=(hud_x + 30, 272), text="2. Quantum Collapse (Observe)", color=(255, 220, 100))
                dcg.DrawText(C, pos=(hud_x + 30, 290), text="Pick one cell; collapse superposition to 1 definite tile.", color=(160, 185, 215))

                step3_box = dcg.DrawRect(C, pmin=(hud_x + 20, 325), pmax=(hud_x + 460, 375), color=(60, 90, 130), fill=(22, 30, 48), rounding=6)
                dcg.DrawText(C, pos=(hud_x + 30, 332), text="3. Arc-Consistency Ripple Propagation", color=(255, 220, 100))
                dcg.DrawText(C, pos=(hud_x + 30, 350), text="Propagate boundary constraints outward via BFS queue.", color=(160, 185, 215))

                # Tile Sockets Legend
                dcg.DrawText(C, pos=(hud_x + 20, 395), text="[SOCKET COMPATIBILITY MATRIX (8 TILES)]", color=(240, 200, 90))
                tile_legend_text = (
                    "Connections are verified across 4 orthogonal sockets:\n"
                    "- Touching sockets must match: Wire connects to Wire (1==1),\n"
                    "  Blank boundary touches Blank boundary (0==0).\n"
                    "Tiles: Blank, Horizontal, Vertical, Cross (+), and 4 Turns (L)."
                )
                dcg.DrawText(C, pos=(hud_x + 20, 420), text=tile_legend_text, color=(170, 195, 225))

                # Color Legend Key
                dcg.DrawRect(C, pmin=(hud_x + 20, 495), pmax=(hud_x + 40, 515), color=(50, 70, 100), fill=(20, 26, 50), rounding=3)
                dcg.DrawText(C, pos=(hud_x + 48, 498), text="Blue: Superposition (Number = remaining states)", color=(180, 205, 235))

                dcg.DrawRect(C, pmin=(hud_x + 20, 525), pmax=(hud_x + 40, 545), color=(255, 200, 50), fill=(80, 60, 20), rounding=3)
                dcg.DrawText(C, pos=(hud_x + 48, 528), text="Gold: Collapsing cell / Active propagation wave", color=(255, 225, 120))

                dcg.DrawRect(C, pmin=(hud_x + 20, 555), pmax=(hud_x + 40, 575), color=(40, 215, 235), fill=(16, 32, 28), rounding=3)
                dcg.DrawText(C, pos=(hud_x + 48, 558), text="Cyan: Collapsed definite circuit tile", color=(100, 255, 240))

        # =========================================================================
        # UPDATE VISUALS FROM WFC STATE
        # =========================================================================
        def update_visuals() -> None:
            min_entropy = 99
            for r in range(GRID_SIZE):
                for c in range(GRID_SIZE):
                    v_cell = visual_cells[r][c]
                    possibilities = wfc.cells[r][c]
                    p_count = len(possibilities)

                    if p_count > 1:
                        # SUPERPOSITION CELL
                        min_entropy = min(min_entropy, p_count)
                        v_cell.entropy_txt.show = True
                        v_cell.entropy_txt.text = str(p_count)

                        # Color cell according to entropy (fewer choices = warmer highlight)
                        norm = (p_count - 2) / 6.0  # 0.0 (near collapse) to 1.0 (pure superposition)
                        fill_r = int(lerp(70, 18, norm))
                        fill_g = int(lerp(45, 24, norm))
                        fill_b = int(lerp(25, 45, norm))
                        v_cell.box.fill = (fill_r, fill_g, fill_b)
                        v_cell.box.color = (int(fill_r * 1.5), int(fill_g * 1.5), int(fill_b * 1.8))

                        # Hide wires
                        v_cell.wire_top.show = False
                        v_cell.wire_right.show = False
                        v_cell.wire_bottom.show = False
                        v_cell.wire_left.show = False
                        v_cell.center_dot.show = False

                    elif p_count == 1:
                        # COLLAPSED DEFINITE TILE
                        v_cell.entropy_txt.show = False
                        v_cell.box.fill = (14, 28, 24)
                        v_cell.box.color = (35, 95, 75)

                        tile_name = next(iter(possibilities))
                        wires = TILES[tile_name]["wires"]
                        v_cell.wire_top.show = wires[0]
                        v_cell.wire_right.show = wires[1]
                        v_cell.wire_bottom.show = wires[2]
                        v_cell.wire_left.show = wires[3]
                        v_cell.center_dot.show = any(wires)

                    else:
                        # Contradiction
                        v_cell.box.fill = (90, 20, 20)
                        v_cell.entropy_txt.show = True
                        v_cell.entropy_txt.text = "!"

            # Update Ripple Box on the last collapsed cell
            if wfc.last_collapsed_coord:
                lr, lc = wfc.last_collapsed_coord
                x0 = grid_origin_x + lc * (cell_size + gap)
                y0 = grid_origin_y + lr * (cell_size + gap)
                ripple_box.show = True
                ripple_box.pmin = (x0 - 2, y0 - 2)
                ripple_box.pmax = (x0 + cell_size + 2, y0 + cell_size + 2)
            else:
                ripple_box.show = False

            # Update HUD Metrics
            metric_collapsed.text = f"Collapsed Cells: {wfc.collapsed_count} / {GRID_SIZE * GRID_SIZE}"
            entropy_display = f"{min_entropy} possibilities" if min_entropy < 90 else "SOLVED (0)"
            metric_entropy.text = f"Lowest Entropy: {entropy_display}"
            metric_props.text = f"Constraint Propagations: {wfc.total_propagations}"

            if wfc.contradiction:
                status_txt.value = "Status: CONTRADICTION MET (Auto-resetting)"
            elif wfc.collapsed_count == GRID_SIZE * GRID_SIZE:
                status_txt.value = "Status: WAVE FUNCTION COLLAPSED (100% Solved)"
            else:
                status_txt.value = f"Status: RUNNING WFC (Collapsed {wfc.collapsed_count}/64)"

        # =========================================================================
        # FRAME EXECUTION (TimeWatcher & GPU Submission)
        # =========================================================================
        def on_viewport_frame(sender, target, metrics: tuple) -> None:
            current_ns = metrics[2]

            if state["last_frame_ns"] == 0:
                state["last_frame_ns"] = current_ns
                return

            dt = (current_ns - state["last_frame_ns"]) * 1e-9
            state["last_frame_ns"] = current_ns
            clamped_dt = min(dt, 0.1)

            if state["playing"]:
                state["time_since_step"] += clamped_dt
                if state["time_since_step"] >= state["step_interval"]:
                    state["time_since_step"] = 0.0

                    if wfc.contradiction:
                        wfc.reset()
                    elif wfc.collapsed_count == GRID_SIZE * GRID_SIZE:
                        if state["auto_restart"]:
                            wfc.reset()
                    else:
                        wfc.step()

            update_visuals()

            if state["playing"]:
                C.viewport.wake(full_refresh=True)

        dcg.TimeWatcher(C, parent=win, callback=on_viewport_frame)

        while C.running:
            C.viewport.render_frame()

    except Exception as exc:
        print(f"[ERROR] DearCyGui WFC visualizer failed: {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
