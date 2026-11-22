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
    """
    Computes (x, y) coordinates on a Cubic Bezier curve at parameter t in [0.0, 1.0].
    Formula: B(t) = (1-t)^3 * P0 + 3*(1-t)^2 * t * P1 + 3*(1-t) * t^2 * P2 + t^3 * P3
    """
    u = 1.0 - t
    tt = t * t
    uu = u * u
    uuu = uu * u
    ttt = tt * t

    x = uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0]
    y = uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1]
    return (x, y)


def cubic_bezier_tangent(p0: Point, p1: Point, p2: Point, p3: Point, t: float) -> Point:
    """
    Computes first derivative tangent vector (dx, dy) on a Cubic Bezier curve.
    Formula: B'(t) = 3*(1-t)^2*(P1-P0) + 6*(1-t)*t*(P2-P1) + 3*t^2*(P3-P2)
    """
    u = 1.0 - t
    c0 = 3 * u * u
    c1 = 6 * u * t
    c2 = 3 * t * t

    dx = c0 * (p1[0] - p0[0]) + c1 * (p2[0] - p1[0]) + c2 * (p3[0] - p2[0])
    dy = c0 * (p1[1] - p0[1]) + c1 * (p2[1] - p1[1]) + c2 * (p3[1] - p2[1])
    return (dx, dy)


def ease_in_out(t: float) -> float:
    """Smooth cosine ease-in-out curve for fluid, organic motion."""
    clamped = max(0.0, min(1.0, t))
    return 0.5 - 0.5 * math.cos(math.pi * clamped)


@dataclass
class BezierPath:
    """Encapsulates a cubic Bezier curve trajectory with renderable curve element."""
    p0: Point
    p1: Point
    p2: Point
    p3: Point
    curve_item: dcg.DrawBezierCubic
    glow_item: dcg.DrawBezierCubic

    def evaluate(self, t: float) -> Point:
        return cubic_bezier_point(self.p0, self.p1, self.p2, self.p3, t)

    def tangent(self, t: float) -> Point:
        return cubic_bezier_tangent(self.p0, self.p1, self.p2, self.p3, t)

    def update_control_points(self, p0: Point, p1: Point, p2: Point, p3: Point) -> None:
        self.p0, self.p1, self.p2, self.p3 = p0, p1, p2, p3
        self.curve_item.p1 = p0
        self.curve_item.p2 = p1
        self.curve_item.p3 = p2
        self.curve_item.p4 = p3

        self.glow_item.p1 = p0
        self.glow_item.p2 = p1
        self.glow_item.p3 = p2
        self.glow_item.p4 = p3


@dataclass
class CurvedPacket:
    """An animated packet rectangle constrained to move along a Bezier path."""
    box: dcg.DrawRect
    label: dcg.DrawText
    width: float
    height: float

    def place_at(self, pos: Point, text: str, show: bool = True) -> None:
        self.box.show = show
        self.label.show = show
        if not show:
            return

        cx, cy = pos
        hw = self.width * 0.5
        hh = self.height * 0.5
        self.box.pmin = (cx - hw, cy - hh)
        self.box.pmax = (cx + hw, cy + hh)
        self.label.pos = (cx - hw + 8, cy - hh + 6)
        self.label.text = text


@dataclass
class AnimationClip:
    """Declarative animation clip defining phase boundaries and update callbacks."""
    start: float
    end: float
    badge: str
    telemetry_fmt: str
    update_fn: Callable[["ClipContext", float], None]


@dataclass
class ClipContext:
    """Holds shared visual state, curved paths, and mutable widgets."""
    state: dict
    addr_path: BezierPath
    ctrl_path: BezierPath
    data_read_path: BezierPath
    data_write_path: BezierPath
    addr_pkt: CurvedPacket
    ctrl_pkt: CurvedPacket
    data_pkt: CurvedPacket
    mar_box: dcg.DrawRect
    cu_box: dcg.DrawRect
    cu_txt: dcg.DrawText
    mdr_box: dcg.DrawRect
    decoder_box: dcg.DrawRect
    cell_rects: List[dcg.DrawRect]
    ram_led: dcg.DrawCircle
    phase_badge: dcg.Text
    telemetry_txt: dcg.Text
    trail_circles: List[dcg.DrawCircle]


def main() -> None:
    try:
        C = dcg.Context()
        # Viewport configuration for uninterrupted 60 FPS presentation
        C.viewport.initialize(
            title="Curved Trace Micro-Architecture Bus Explainer [v02]",
            width=1080,
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
            "mode": "READ",  # "READ" (RAM -> CPU) or "WRITE" (CPU -> RAM)
            "target_addr": 0x0040,
            "target_val": 0xCAFE,
            "curve_arch": 80.0,  # Curvature flex in pixels
            "show_handles": True,
            "last_frame_ns": 0,
            "accumulator": 0.0,
            "sim_time": 0.0,
        }

        memory_cells = [
            {"addr": 0x003C, "val": 0x10A2},
            {"addr": 0x0040, "val": 0xCAFE},
            {"addr": 0x0044, "val": 0xDEAD},
            {"addr": 0x0048, "val": 0xBEEF},
        ]

        def toggle_play(sender, target, data) -> None:
            state["playing"] = not state["playing"]
            C.viewport.wait_for_input = not state["playing"]
            if state["playing"]:
                state["last_frame_ns"] = 0
                C.viewport.wake()
            print(f"[INFO] Bus simulation: {'RUNNING' if state['playing'] else 'PAUSED'}")

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

        def set_mode_read(sender, target, data) -> None:
            state["mode"] = "READ"
            state["t"] = 0.0
            C.viewport.wake()
            print("[INFO] Mode: READ (RAM -> CPU MDR via Curved Data Bus)")

        def set_mode_write(sender, target, data) -> None:
            state["mode"] = "WRITE"
            state["t"] = 0.0
            C.viewport.wake()
            print("[INFO] Mode: WRITE (CPU MDR -> RAM via Curved Data Bus)")

        with dcg.Window(C, label="Curved PCB Trace Studio [v02]", primary=True) as main_win:
            # Top Control Toolbar
            with dcg.HorizontalLayout(C):
                dcg.Button(C, label="Play / Pause", callback=toggle_play)
                dcg.Button(C, label="Step +0.25s", callback=step_anim)
                dcg.Button(C, label="Reset", callback=reset_anim)
                dcg.Button(C, label="Mode: READ", callback=set_mode_read)
                dcg.Button(C, label="Mode: WRITE", callback=set_mode_write)
                dcg.Slider(
                    C,
                    label="Speed",
                    min_value=0.2,
                    max_value=3.0,
                    value=1.0,
                    width=130,
                    callback=lambda s, t, d: state.update(speed=d),
                )
                dcg.Slider(
                    C,
                    label="Curve Arch",
                    min_value=20.0,
                    max_value=160.0,
                    value=80.0,
                    width=130,
                    callback=lambda s, t, d: (state.update(curve_arch=d), C.viewport.wake()),
                )

            # Scrubbing Bar & Live Telemetry
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
                phase_badge = dcg.Text(C, value="Phase: [1/4] ADDRESS BROADCAST (Curved Arch)")
                telemetry_txt = dcg.Text(C, value=" | ADDR: 0x0040 | CTRL: IDLE | CURVE: B(t) CUBIC")

            # Main Vector Canvas
            with dcg.DrawInWindow(C, width=1040, height=560):
                # PCB Background subtle grid
                for gy in range(40, 560, 40):
                    dcg.DrawLine(C, p1=(20, gy), p2=(1020, gy), color=(20, 32, 28, 90), thickness=1)

                # ==========================================
                # 1. CPU CORE (Left Component)
                # ==========================================
                dcg.DrawRect(
                    C,
                    pmin=(40, 40),
                    pmax=(240, 500),
                    color=(60, 130, 220),
                    fill=(16, 24, 38),
                    rounding=12,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(80, 55), text="CPU CORE (x86_64)", color=(210, 230, 255))
                dcg.DrawLine(C, p1=(50, 78), p2=(230, 78), color=(40, 70, 110), thickness=1)

                # PC (Program Counter)
                dcg.DrawRect(C, pmin=(55, 95), pmax=(225, 140), color=(55, 85, 140), fill=(22, 34, 56), rounding=6)
                dcg.DrawText(C, pos=(65, 102), text="PC (Program Counter)", color=(140, 180, 240))
                dcg.DrawText(C, pos=(135, 120), text="0x0040", color=(255, 255, 255))

                # MAR (Memory Address Register) - Pin Out at (225, 175)
                mar_box = dcg.DrawRect(
                    C,
                    pmin=(55, 155),
                    pmax=(225, 205),
                    color=(240, 190, 60),
                    fill=(38, 48, 70),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(65, 163), text="MAR (Addr Out)", color=(240, 200, 90))
                dcg.DrawText(C, pos=(135, 182), text="0x0040", color=(255, 240, 180))

                # Control Unit (CU) - Pin Out at (225, 260)
                cu_box = dcg.DrawRect(
                    C,
                    pmin=(55, 235),
                    pmax=(225, 295),
                    color=(210, 90, 230),
                    fill=(34, 25, 48),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(65, 243), text="Control Unit (CU)", color=(230, 150, 250))
                cu_strobe_txt = dcg.DrawText(C, pos=(125, 265), text="MEM_RD=1", color=(255, 200, 255))

                # MDR (Memory Data Register) - Pin Out at (225, 365)
                mdr_box = dcg.DrawRect(
                    C,
                    pmin=(55, 340),
                    pmax=(225, 400),
                    color=(40, 215, 235),
                    fill=(20, 45, 58),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(65, 348), text="MDR (Data In/Out)", color=(110, 235, 250))
                dcg.DrawText(C, pos=(135, 370), text="0xCAFE", color=(200, 255, 255))

                # Clock LED
                dcg.DrawText(C, pos=(65, 450), text="CORE CLK:", color=(160, 175, 200))
                clk_led = dcg.DrawCircle(C, center=(165, 458), radius=8, color=(255, 255, 255), fill=(0, 255, 120))

                # ==========================================
                # 2. RAM SUBSYSTEM (Right Component)
                # ==========================================
                dcg.DrawRect(
                    C,
                    pmin=(780, 40),
                    pmax=(1000, 500),
                    color=(50, 190, 120),
                    fill=(14, 30, 24),
                    rounding=12,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(830, 55), text="DDR4 RAM BANK", color=(180, 245, 210))
                dcg.DrawLine(C, p1=(790, 78), p2=(990, 78), color=(30, 75, 50), thickness=1)

                # Address Decoder - Pin In at (780, 125)
                decoder_box = dcg.DrawRect(
                    C,
                    pmin=(795, 95),
                    pmax=(985, 150),
                    color=(240, 190, 60),
                    fill=(32, 45, 38),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(805, 102), text="ADDR DECODER", color=(240, 210, 100))
                dcg.DrawText(C, pos=(835, 125), text="ROW 1 [0x0040]", color=(255, 255, 255))

                # Memory Array Rows
                cell_rects = []
                for i, cell in enumerate(memory_cells):
                    cy = 180 + i * 55
                    box = dcg.DrawRect(
                        C,
                        pmin=(795, cy),
                        pmax=(985, cy + 45),
                        color=(50, 130, 90),
                        fill=(20, 44, 36),
                        rounding=6,
                        thickness=1,
                    )
                    cell_rects.append(box)
                    dcg.DrawText(C, pos=(805, cy + 8), text=f"ADDR: 0x{cell['addr']:04X}", color=(160, 210, 185))
                    dcg.DrawText(C, pos=(905, cy + 22), text=f"0x{cell['val']:04X}", color=(255, 255, 255))

                # RAM Status LED
                dcg.DrawText(C, pos=(805, 450), text="BANK STATUS:", color=(160, 200, 180))
                ram_led = dcg.DrawCircle(C, center=(920, 458), radius=8, color=(255, 255, 255), fill=(0, 255, 120))

                # =========================================================================
                # 3. CURVED PCB BUS HIGHWAYS (Rendered via DrawBezierCubic)
                # =========================================================================
                # Track 1: CURVED ADDRESS BUS (Golden Arch: MAR (225, 180) -> DECODER (795, 125))
                addr_glow = dcg.DrawBezierCubic(
                    C,
                    p1=(225, 180),
                    p2=(450, 100),
                    p3=(600, 70),
                    p4=(795, 125),
                    color=(240, 190, 60, 45),
                    thickness=10,
                )
                addr_wire = dcg.DrawBezierCubic(
                    C,
                    p1=(225, 180),
                    p2=(450, 100),
                    p3=(600, 70),
                    p4=(795, 125),
                    color=(245, 195, 65, 220),
                    thickness=4,
                )
                dcg.DrawText(C, pos=(420, 65), text="[CURVED ADDRESS BUS B(t)]", color=(245, 205, 80))

                # Track 2: CURVED CONTROL BUS (Violet S-Curve: CU (225, 265) -> RAM (795, 265))
                ctrl_glow = dcg.DrawBezierCubic(
                    C,
                    p1=(225, 265),
                    p2=(460, 215),
                    p3=(580, 315),
                    p4=(795, 265),
                    color=(210, 90, 230, 45),
                    thickness=10,
                )
                ctrl_wire = dcg.DrawBezierCubic(
                    C,
                    p1=(225, 265),
                    p2=(460, 215),
                    p3=(580, 315),
                    p4=(795, 265),
                    color=(220, 95, 240, 220),
                    thickness=4,
                )
                dcg.DrawText(C, pos=(420, 245), text="[CURVED CONTROL BUS B(t)]", color=(230, 130, 245))

                # Track 3: CURVED DATA BUS (Cyan Dip: MDR (225, 370) -> RAM ROW 1 (795, 260))
                data_glow = dcg.DrawBezierCubic(
                    C,
                    p1=(225, 370),
                    p2=(440, 470),
                    p3=(620, 420),
                    p4=(795, 260),
                    color=(40, 215, 235, 45),
                    thickness=10,
                )
                data_wire = dcg.DrawBezierCubic(
                    C,
                    p1=(225, 370),
                    p2=(440, 470),
                    p3=(620, 420),
                    p4=(795, 260),
                    color=(50, 225, 245, 220),
                    thickness=4,
                )
                dcg.DrawText(C, pos=(420, 445), text="[CURVED DATA BUS B(t)]", color=(80, 230, 250))

                # Trailing particle glow circles along active curve
                trail_circles = []
                for _ in range(5):
                    tc = dcg.DrawCircle(C, center=(0, 0), radius=4, color=(255, 255, 255), fill=(255, 255, 255))
                    tc.show = False
                    trail_circles.append(tc)

                # =========================================================================
                # 4. ANIMATED RECTANGLES MOVING ON CURVES
                # =========================================================================
                # Address Packet (moves on Address Bezier Path)
                addr_box = dcg.DrawRect(
                    C,
                    pmin=(0, 0),
                    pmax=(64, 28),
                    color=(255, 235, 130),
                    fill=(245, 175, 25),
                    rounding=6,
                    thickness=2,
                )
                addr_txt = dcg.DrawText(C, pos=(0, 0), text="0x0040", color=(10, 10, 15))
                addr_pkt = CurvedPacket(box=addr_box, label=addr_txt, width=68, height=28)

                # Control Strobe Packet (moves on Control Bezier Path)
                ctrl_box = dcg.DrawRect(
                    C,
                    pmin=(0, 0),
                    pmax=(76, 28),
                    color=(255, 190, 255),
                    fill=(210, 60, 230),
                    rounding=6,
                    thickness=2,
                )
                ctrl_txt = dcg.DrawText(C, pos=(0, 0), text="MEM_RD", color=(255, 255, 255))
                ctrl_pkt = CurvedPacket(box=ctrl_box, label=ctrl_txt, width=76, height=28)

                # Data Packet (moves on Data Bezier Path)
                data_box = dcg.DrawRect(
                    C,
                    pmin=(0, 0),
                    pmax=(68, 28),
                    color=(180, 255, 255),
                    fill=(0, 200, 225),
                    rounding=6,
                    thickness=2,
                )
                data_txt = dcg.DrawText(C, pos=(0, 0), text="0xCAFE", color=(10, 15, 25))
                data_pkt = CurvedPacket(box=data_box, label=data_txt, width=68, height=28)

                # Explanatory footer legend
                dcg.DrawText(
                    C,
                    pos=(50, 525),
                    text="MATH: Rectangles translate along parametric B(u) coordinates computed from cubic polynomials.",
                    color=(160, 180, 205),
                )

        # Instantiate Bezier Paths
        addr_path = BezierPath(
            p0=(225, 180),
            p1=(450, 100),
            p2=(600, 70),
            p3=(795, 125),
            curve_item=addr_wire,
            glow_item=addr_glow,
        )

        ctrl_path = BezierPath(
            p0=(225, 265),
            p1=(460, 215),
            p2=(580, 315),
            p3=(795, 265),
            curve_item=ctrl_wire,
            glow_item=ctrl_glow,
        )

        # Data path in forward direction (CPU -> RAM)
        data_write_path = BezierPath(
            p0=(225, 370),
            p1=(440, 470),
            p2=(620, 420),
            p3=(795, 235),
            curve_item=data_wire,
            glow_item=data_glow,
        )

        # Data path in reverse direction (RAM -> CPU)
        data_read_path = BezierPath(
            p0=(795, 235),
            p1=(620, 420),
            p2=(440, 470),
            p3=(225, 370),
            curve_item=data_wire,
            glow_item=data_glow,
        )

        ctx = ClipContext(
            state=state,
            addr_path=addr_path,
            ctrl_path=ctrl_path,
            data_read_path=data_read_path,
            data_write_path=data_write_path,
            addr_pkt=addr_pkt,
            ctrl_pkt=ctrl_pkt,
            data_pkt=data_pkt,
            mar_box=mar_box,
            cu_box=cu_box,
            cu_txt=cu_strobe_txt,
            mdr_box=mdr_box,
            decoder_box=decoder_box,
            cell_rects=cell_rects,
            ram_led=ram_led,
            phase_badge=phase_badge,
            telemetry_txt=telemetry_txt,
            trail_circles=trail_circles,
        )

        # =========================================================================
        # CURVE-BASED DECLARATIVE TIMELINE PHASES
        # =========================================================================
        def update_addr_curve(c: ClipContext, u: float) -> None:
            # Eased progress along the cubic Bezier arch
            eased_u = ease_in_out(u)
            pos = c.addr_path.evaluate(eased_u)
            c.addr_pkt.place_at(pos, f"0x{c.state['target_addr']:04X}", show=True)
            c.ctrl_pkt.place_at((0, 0), "", show=False)
            c.data_pkt.place_at((0, 0), "", show=False)

            # Trailing particle ghost nodes along the curve
            for i, circle in enumerate(c.trail_circles):
                lag_u = max(0.0, eased_u - (i + 1) * 0.05)
                trail_pos = c.addr_path.evaluate(lag_u)
                circle.show = (u > 0.05 and lag_u > 0.0)
                circle.center = trail_pos
                circle.fill = (245, 195, 65)

            # Subsystem highlights
            c.mar_box.fill = (60, 55, 30)
            c.decoder_box.fill = (32, 45, 38)
            c.cu_box.fill = (34, 25, 48)
            c.ram_led.fill = (80, 100, 90)
            for box in c.cell_rects:
                box.fill = (20, 44, 36)
                box.color = (50, 130, 90)

        def update_strobe_curve(c: ClipContext, u: float) -> None:
            eased_u = ease_in_out(u)
            pos = c.ctrl_path.evaluate(eased_u)
            cmd = "MEM_RD" if c.state["mode"] == "READ" else "MEM_WR"
            c.ctrl_pkt.place_at(pos, cmd, show=True)
            c.addr_pkt.place_at(c.addr_path.p3, f"0x{c.state['target_addr']:04X}", show=True)
            c.data_pkt.place_at((0, 0), "", show=False)

            for i, circle in enumerate(c.trail_circles):
                lag_u = max(0.0, eased_u - (i + 1) * 0.05)
                circle.show = (u > 0.05 and lag_u > 0.0)
                circle.center = c.ctrl_path.evaluate(lag_u)
                circle.fill = (220, 95, 240)

            c.cu_txt.text = f"{cmd}=1"
            c.decoder_box.fill = (65, 60, 30)
            c.decoder_box.color = (255, 220, 80)
            c.mar_box.fill = (38, 48, 70)
            c.cu_box.fill = (65, 30, 75)
            c.cell_rects[1].fill = (55, 85, 45)
            c.cell_rects[1].color = (100, 255, 140)
            c.ram_led.fill = (0, 255, 120)

        def update_data_curve(c: ClipContext, u: float) -> None:
            eased_u = ease_in_out(u)
            c.addr_pkt.place_at((0, 0), "", show=False)
            c.ctrl_pkt.place_at(c.ctrl_path.p3, "ACK_WAIT", show=True)

            val_hex = f"0x{c.state['target_val']:04X}"
            active_path = c.data_read_path if c.state["mode"] == "READ" else c.data_write_path
            pos = active_path.evaluate(eased_u)
            c.data_pkt.place_at(pos, val_hex, show=True)

            for i, circle in enumerate(c.trail_circles):
                lag_u = max(0.0, eased_u - (i + 1) * 0.05)
                circle.show = (u > 0.05 and lag_u > 0.0)
                circle.center = active_path.evaluate(lag_u)
                circle.fill = (50, 225, 245)

            c.cell_rects[1].fill = (60, 95, 55)
            c.cell_rects[1].color = (120, 255, 170)

        def update_latch_curve(c: ClipContext, u: float) -> None:
            c.addr_pkt.place_at((0, 0), "", show=False)
            c.ctrl_pkt.place_at((0, 0), "", show=False)
            c.data_pkt.place_at((0, 0), "", show=False)
            for circle in c.trail_circles:
                circle.show = False

            mdr_pulse = 0.5 + 0.5 * math.sin(u * math.pi)
            c.mdr_box.fill = (int(20 + 70 * mdr_pulse), int(45 + 110 * mdr_pulse), int(58 + 120 * mdr_pulse))
            c.mdr_box.color = (int(40 + 215 * mdr_pulse), 255, 255)
            c.cu_txt.text = "ACK_RECVD"
            c.cu_box.fill = (34, 25, 48)
            c.decoder_box.fill = (32, 45, 38)
            c.decoder_box.color = (240, 190, 60)

        timeline: List[AnimationClip] = [
            AnimationClip(
                start=0.0,
                end=1.0,
                badge="Phase: [1/4] ADDRESS ARCH (B(u) MAR -> Decoder)",
                telemetry_fmt=" | ADDR: 0x{addr:04X} ON CURVE | CTRL: IDLE | DATA: HIGH-Z",
                update_fn=update_addr_curve,
            ),
            AnimationClip(
                start=1.0,
                end=2.0,
                badge="Phase: [2/4] CONTROL S-CURVE (B(u) CU -> RAM)",
                telemetry_fmt=" | ADDR: LATCHED | CTRL: {mode}=1 S-CURVE | DATA: PREPARING",
                update_fn=update_strobe_curve,
            ),
            AnimationClip(
                start=2.0,
                end=3.2,
                badge="Phase: [3/4] DATA BURST DIP (B(u) RAM <-> MDR)",
                telemetry_fmt=" | ADDR: 0x{addr:04X} | CTRL: {mode}=1 | DATA: 0x{val:04X}",
                update_fn=update_data_curve,
            ),
            AnimationClip(
                start=3.2,
                end=4.0,
                badge="Phase: [4/4] LATCH & CYCLE COMPLETE (ACK)",
                telemetry_fmt=" | MDR: 0x{val:04X} [LATCHED] | CTRL: ACK=1 | READY FOR NEXT CYCLE",
                update_fn=update_latch_curve,
            ),
        ]

        def evaluate_timeline(t: float) -> None:
            for clip in timeline:
                if clip.start <= t < clip.end:
                    u = (t - clip.start) / (clip.end - clip.start)
                    clip.update_fn(ctx, u)
                    phase_badge.value = clip.badge
                    cmd = "MEM_RD" if state["mode"] == "READ" else "MEM_WR"
                    telemetry_txt.value = clip.telemetry_fmt.format(
                        addr=state["target_addr"],
                        mode=cmd,
                        val=state["target_val"],
                    )
                    return

        # =========================================================================
        # DYNAMIC CURVATURE RE-CALCULATION & FRAME TIMING
        # =========================================================================
        def update_curve_geometry() -> None:
            """Allows the curve arch slider to flex the Bezier control points live."""
            arch = state["curve_arch"]
            addr_path.update_control_points(
                p0=(225, 180),
                p1=(450, 180 - arch),
                p2=(600, 125 - arch * 0.7),
                p3=(795, 125),
            )
            ctrl_path.update_control_points(
                p0=(225, 265),
                p1=(460, 265 - arch * 0.6),
                p2=(580, 265 + arch * 0.6),
                p3=(795, 265),
            )
            data_write_path.update_control_points(
                p0=(225, 370),
                p1=(440, 370 + arch * 0.9),
                p2=(620, 235 + arch * 0.9),
                p3=(795, 235),
            )
            data_read_path.update_control_points(
                p0=(795, 235),
                p1=(620, 235 + arch * 0.9),
                p2=(440, 370 + arch * 0.9),
                p3=(225, 370),
            )

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
            sim_t = state["sim_time"]

            # Clock LED oscillation
            clk_val = 0.5 + 0.5 * math.sin(sim_t * 12.0)
            clk_led.fill = (int(40 + 200 * clk_val), int(180 + 75 * clk_val), 100)

            # Update live curve geometry
            update_curve_geometry()

            # Evaluate timeline and translate rectangles along curves
            evaluate_timeline(state["t"])

            # Maintain continuous GPU buffer submission
            if state["playing"]:
                C.viewport.wake(full_refresh=True)

        dcg.TimeWatcher(C, parent=main_win, callback=on_viewport_frame)

        while C.running:
            C.viewport.render_frame()

    except Exception as exc:
        print(f"[ERROR] DearCyGui visualizer failed: {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
