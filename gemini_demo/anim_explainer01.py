import math
import sys
from dataclasses import dataclass
from typing import Callable, List, Optional
import dearcygui as dcg

# Open Source Notice:
# DearCyGui (MIT License) - Cython-powered GPU GUI toolkit for Dear ImGui.
# Requirements: dearcygui (installable via pip in target Python virtual environment).


def ease_in_out(t: float) -> float:
    """Smooth cosine ease-in-out curve for fluid, organic motion."""
    clamped = max(0.0, min(1.0, t))
    return 0.5 - 0.5 * math.cos(math.pi * clamped)


def lerp(a: float, b: float, u: float) -> float:
    """Linear interpolation between a and b."""
    return a + (b - a) * u


@dataclass
class AnimationClip:
    """Declarative animation clip defining phase boundaries and update callbacks."""
    start: float
    end: float
    badge: str
    telemetry_fmt: str
    update_fn: Callable[["ClipContext", float], None]  # Receives context and eased u in [0, 1]
    on_enter: Optional[Callable[["ClipContext"], None]] = None


@dataclass
class ClipContext:
    """Context holding mutable visual widgets and simulation state."""
    state: dict
    addr_pkt: dcg.DrawRect
    addr_txt: dcg.DrawText
    ctrl_pkt: dcg.DrawRect
    ctrl_txt: dcg.DrawText
    data_pkt: dcg.DrawRect
    data_txt: dcg.DrawText
    mar_box: dcg.DrawRect
    cu_box: dcg.DrawRect
    cu_txt: dcg.DrawText
    mdr_box: dcg.DrawRect
    decoder_box: dcg.DrawRect
    cell_rects: List[dcg.DrawRect]
    ram_led: dcg.DrawCircle
    phase_badge: dcg.Text
    telemetry_txt: dcg.Text


def main() -> None:
    try:
        C = dcg.Context()
        # CRITICAL FIX for smooth animation:
        # 1. always_submit_to_gpu=True prevents DearCyGui from skipping GPU submissions
        #    when mouse input ceases (which previously caused stilting upon releasing the slider).
        # 2. wait_for_input=False keeps continuous frame pacing during playback.
        C.viewport.initialize(
            title="Interactive Tri-Bus CPU <-> RAM Micro-Architecture Explainer [v01]",
            width=1040,
            height=660,
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
            "active_clip_idx": -1,
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
            state["active_clip_idx"] = -1
            state["accumulator"] = 0.0
            C.viewport.wake()
            print("[INFO] Animation timeline reset to 0.0s")

        def step_anim(sender, target, data) -> None:
            state["playing"] = False
            C.viewport.wait_for_input = False
            state["t"] = (state["t"] + 0.25) % 4.0
            C.viewport.wake()
            print(f"[INFO] Stepped to t={state['t']:.2f}s")

        def set_mode_read(sender, target, data) -> None:
            state["mode"] = "READ"
            state["t"] = 0.0
            state["active_clip_idx"] = -1
            C.viewport.wake()
            print("[INFO] Bus Mode set to: READ (LOAD RAM -> CPU MDR)")

        def set_mode_write(sender, target, data) -> None:
            state["mode"] = "WRITE"
            state["t"] = 0.0
            state["active_clip_idx"] = -1
            C.viewport.wake()
            print("[INFO] Bus Mode set to: WRITE (STORE CPU MDR -> RAM)")

        with dcg.Window(C, label="Micro-Architecture Bus Transaction Studio [v01]", primary=True) as main_win:
            # Top Control Bar
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
                    width=140,
                    callback=lambda s, t, d: state.update(speed=d),
                )

            # Scrubbing Bar & Live Telemetry
            with dcg.HorizontalLayout(C):
                scrubber = dcg.Slider(
                    C,
                    label="Timeline (s)",
                    min_value=0.0,
                    max_value=4.0,
                    value=0.0,
                    width=260,
                    callback=lambda s, t, d: (state.update(t=d), C.viewport.wake()),
                )
                phase_badge = dcg.Text(C, value="Phase: [1/4] ADDRESS BROADCAST")
                telemetry_txt = dcg.Text(C, value=" | ADDR: 0x0040 | CTRL: MEM_RD | DATA: HIGH-Z")

            # Canvas Drawing Zone
            with dcg.DrawInWindow(C, width=1000, height=520):
                # Background circuit grid
                for gy in range(40, 520, 40):
                    dcg.DrawLine(C, p1=(20, gy), p2=(980, gy), color=(25, 30, 42, 90), thickness=1)

                # ==========================================
                # 1. CPU CORE (Left)
                # ==========================================
                dcg.DrawRect(
                    C,
                    pmin=(40, 40),
                    pmax=(250, 470),
                    color=(70, 140, 240),
                    fill=(18, 26, 42),
                    rounding=10,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(90, 55), text="CPU CORE (x86_64)", color=(210, 230, 255))
                dcg.DrawLine(C, p1=(50, 78), p2=(240, 78), color=(45, 75, 120), thickness=1)

                # PC (Program Counter)
                dcg.DrawRect(C, pmin=(55, 95), pmax=(235, 140), color=(60, 95, 150), fill=(24, 38, 62), rounding=6)
                dcg.DrawText(C, pos=(65, 102), text="PC (Program Counter)", color=(140, 180, 240))
                dcg.DrawText(C, pos=(145, 120), text="0x0040", color=(255, 255, 255))

                # MAR (Memory Address Register)
                mar_box = dcg.DrawRect(
                    C,
                    pmin=(55, 155),
                    pmax=(235, 205),
                    color=(240, 190, 60),
                    fill=(38, 48, 70),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(65, 163), text="MAR (Addr Register)", color=(240, 200, 90))
                dcg.DrawText(C, pos=(145, 182), text="0x0040", color=(255, 240, 180))

                # Control Unit (CU)
                cu_box = dcg.DrawRect(
                    C,
                    pmin=(55, 220),
                    pmax=(235, 280),
                    color=(210, 90, 230),
                    fill=(34, 25, 48),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(65, 228), text="Control Unit (CU)", color=(230, 150, 250))
                cu_strobe_txt = dcg.DrawText(C, pos=(135, 250), text="MEM_RD=1", color=(255, 200, 255))

                # MDR (Memory Data Register)
                mdr_box = dcg.DrawRect(
                    C,
                    pmin=(55, 320),
                    pmax=(235, 375),
                    color=(40, 215, 235),
                    fill=(20, 45, 58),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(65, 328), text="MDR (Data Register)", color=(110, 235, 250))
                dcg.DrawText(C, pos=(145, 348), text="0xCAFE", color=(200, 255, 255))

                # Clock LED
                dcg.DrawText(C, pos=(65, 420), text="CORE CLK:", color=(160, 175, 200))
                clk_led = dcg.DrawCircle(C, center=(165, 428), radius=8, color=(255, 255, 255), fill=(0, 255, 120))

                # ==========================================
                # 2. SYSTEM BUS HIGHWAYS (Center)
                # ==========================================
                # Address Bus Track
                dcg.DrawRect(C, pmin=(250, 168), pmax=(730, 192), color=(70, 55, 20), fill=(28, 24, 15), rounding=4)
                dcg.DrawLine(C, p1=(235, 180), p2=(745, 180), color=(240, 190, 60, 180), thickness=4)
                dcg.DrawText(C, pos=(420, 150), text="[ADDRESS BUS - 16-BIT UNIDIRECTIONAL]", color=(245, 205, 80))

                # Control Bus Track
                dcg.DrawRect(C, pmin=(250, 243), pmax=(730, 267), color=(60, 25, 68), fill=(26, 16, 30), rounding=4)
                dcg.DrawLine(C, p1=(235, 255), p2=(745, 255), color=(210, 90, 230, 180), thickness=4)
                dcg.DrawText(C, pos=(425, 226), text="[CONTROL BUS - RD/WR/ACK HANDSHAKE]", color=(230, 130, 245))

                # Data Bus Track
                dcg.DrawRect(C, pmin=(250, 336), pmax=(730, 360), color=(20, 55, 62), fill=(14, 26, 32), rounding=4)
                dcg.DrawLine(C, p1=(235, 348), p2=(745, 348), color=(40, 215, 235, 180), thickness=4)
                dcg.DrawText(C, pos=(425, 320), text="[DATA BUS - 16-BIT BIDIRECTIONAL]", color=(80, 230, 250))

                # Micro-pulse particles
                pulse_addr = dcg.DrawCircle(C, center=(250, 180), radius=5, color=(255, 255, 255), fill=(255, 220, 80))
                pulse_ctrl = dcg.DrawCircle(C, center=(250, 255), radius=5, color=(255, 255, 255), fill=(255, 120, 255))
                pulse_data = dcg.DrawCircle(C, center=(730, 348), radius=5, color=(255, 255, 255), fill=(100, 255, 255))

                # Animated flight packets
                addr_packet = dcg.DrawRect(
                    C,
                    pmin=(250, 164),
                    pmax=(320, 196),
                    color=(255, 230, 120),
                    fill=(255, 180, 30),
                    rounding=6,
                    thickness=2,
                )
                addr_pkt_txt = dcg.DrawText(C, pos=(258, 172), text="0x0040", color=(10, 10, 15))

                ctrl_packet = dcg.DrawRect(
                    C,
                    pmin=(250, 241),
                    pmax=(325, 269),
                    color=(255, 180, 255),
                    fill=(210, 60, 230),
                    rounding=6,
                    thickness=2,
                )
                ctrl_pkt_txt = dcg.DrawText(C, pos=(256, 248), text="MEM_RD", color=(255, 255, 255))

                data_packet = dcg.DrawRect(
                    C,
                    pmin=(660, 332),
                    pmax=(730, 364),
                    color=(180, 255, 255),
                    fill=(0, 200, 225),
                    rounding=6,
                    thickness=2,
                )
                data_pkt_txt = dcg.DrawText(C, pos=(668, 340), text="0xCAFE", color=(10, 15, 25))

                # ==========================================
                # 3. RAM SUBSYSTEM (Right)
                # ==========================================
                dcg.DrawRect(
                    C,
                    pmin=(745, 40),
                    pmax=(970, 470),
                    color=(50, 190, 120),
                    fill=(16, 32, 26),
                    rounding=10,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(795, 55), text="DDR4 RAM BANK", color=(180, 245, 210))
                dcg.DrawLine(C, p1=(755, 78), p2=(960, 78), color=(35, 80, 55), thickness=1)

                # Address Decoder
                decoder_box = dcg.DrawRect(
                    C,
                    pmin=(760, 95),
                    pmax=(955, 150),
                    color=(240, 190, 60),
                    fill=(32, 45, 38),
                    rounding=6,
                    thickness=2,
                )
                dcg.DrawText(C, pos=(770, 102), text="ADDR DECODER (Row Select)", color=(240, 210, 100))
                dcg.DrawText(C, pos=(810, 125), text="DEC: ROW 1 [0x0040]", color=(255, 255, 255))

                # Memory cells
                cell_rects = []
                for i, cell in enumerate(memory_cells):
                    cy = 175 + i * 55
                    box = dcg.DrawRect(
                        C,
                        pmin=(760, cy),
                        pmax=(955, cy + 45),
                        color=(50, 130, 90),
                        fill=(22, 48, 38),
                        rounding=6,
                        thickness=1,
                    )
                    cell_rects.append(box)
                    dcg.DrawText(C, pos=(770, cy + 8), text=f"ADDR: 0x{cell['addr']:04X}", color=(160, 210, 185))
                    dcg.DrawText(C, pos=(875, cy + 22), text=f"0x{cell['val']:04X}", color=(255, 255, 255))

                # RAM Status LED
                dcg.DrawText(C, pos=(770, 420), text="BANK STATUS:", color=(160, 200, 180))
                ram_led = dcg.DrawCircle(C, center=(885, 428), radius=8, color=(255, 255, 255), fill=(0, 255, 120))

                dcg.DrawText(
                    C,
                    pos=(50, 485),
                    text="LEGEND: [Amber] Address Bus  |  [Violet] Control Line Strobe  |  [Cyan] Bidirectional Data Word",
                    color=(165, 180, 205),
                )

        ctx = ClipContext(
            state=state,
            addr_pkt=addr_packet,
            addr_txt=addr_pkt_txt,
            ctrl_pkt=ctrl_packet,
            ctrl_txt=ctrl_pkt_txt,
            data_pkt=data_packet,
            data_txt=data_pkt_txt,
            mar_box=mar_box,
            cu_box=cu_box,
            cu_txt=cu_strobe_txt,
            mdr_box=mdr_box,
            decoder_box=decoder_box,
            cell_rects=cell_rects,
            ram_led=ram_led,
            phase_badge=phase_badge,
            telemetry_txt=telemetry_txt,
        )

        # =========================================================================
        # DECLARATIVE TRACK / CLIP SEQUENCER (No if/elif state ladders)
        # =========================================================================
        def update_addr_clip(c: ClipContext, u: float) -> None:
            pkt_x = lerp(250.0, 675.0, ease_in_out(u))
            c.addr_pkt.show = True
            c.addr_pkt.pmin = (pkt_x, 164)
            c.addr_pkt.pmax = (pkt_x + 70, 196)
            c.addr_txt.pos = (pkt_x + 10, 172)
            c.addr_txt.text = f"0x{c.state['target_addr']:04X}"
            c.ctrl_pkt.show = False
            c.data_pkt.show = False
            c.mar_box.fill = (60, 55, 30)
            c.decoder_box.fill = (32, 45, 38)
            c.cu_box.fill = (34, 25, 48)
            c.ram_led.fill = (80, 100, 90)
            for box in c.cell_rects:
                box.fill = (22, 48, 38)
                box.color = (50, 130, 90)

        def update_strobe_clip(c: ClipContext, u: float) -> None:
            ctrl_x = lerp(250.0, 670.0, ease_in_out(u))
            c.addr_pkt.show = True
            c.addr_pkt.pmin = (675, 164)
            c.addr_pkt.pmax = (745, 196)
            c.addr_txt.pos = (685, 172)
            c.ctrl_pkt.show = True
            c.ctrl_pkt.pmin = (ctrl_x, 241)
            c.ctrl_pkt.pmax = (ctrl_x + 75, 269)
            c.ctrl_txt.pos = (ctrl_x + 8, 248)
            cmd = "MEM_RD" if c.state["mode"] == "READ" else "MEM_WR"
            c.ctrl_txt.text = cmd
            c.cu_txt.text = f"{cmd}=1"
            c.decoder_box.fill = (65, 60, 30)
            c.decoder_box.color = (255, 220, 80)
            c.mar_box.fill = (38, 48, 70)
            c.cu_box.fill = (65, 30, 75)
            c.cell_rects[1].fill = (55, 85, 45)
            c.cell_rects[1].color = (100, 255, 140)
            c.ram_led.fill = (0, 255, 120)
            c.data_pkt.show = False

        def update_data_clip(c: ClipContext, u: float) -> None:
            c.addr_pkt.show = False
            c.ctrl_pkt.show = True
            c.ctrl_pkt.pmin = (670, 241)
            c.ctrl_pkt.pmax = (745, 269)
            c.ctrl_txt.pos = (678, 248)
            c.data_pkt.show = True
            val_hex = f"0x{c.state['target_val']:04X}"
            c.data_txt.text = val_hex
            if c.state["mode"] == "READ":
                data_x = lerp(660.0, 250.0, ease_in_out(u))
            else:
                data_x = lerp(250.0, 660.0, ease_in_out(u))
            c.data_pkt.pmin = (data_x, 332)
            c.data_pkt.pmax = (data_x + 70, 364)
            c.data_txt.pos = (data_x + 8, 340)
            c.cell_rects[1].fill = (60, 95, 55)
            c.cell_rects[1].color = (120, 255, 170)

        def update_latch_clip(c: ClipContext, u: float) -> None:
            c.addr_pkt.show = False
            c.ctrl_pkt.show = False
            c.data_pkt.show = False
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
                badge="Phase: [1/4] ADDRESS BROADCAST",
                telemetry_fmt=" | ADDR: 0x{addr:04X} -> DECODER | CTRL: IDLE | DATA: HIGH-Z",
                update_fn=update_addr_clip,
            ),
            AnimationClip(
                start=1.0,
                end=2.0,
                badge="Phase: [2/4] CONTROL STROBE & ROW SELECT",
                telemetry_fmt=" | ADDR: 0x{addr:04X} LATCHED | CTRL: {mode}=1 | DATA: PREPARING",
                update_fn=update_strobe_clip,
            ),
            AnimationClip(
                start=2.0,
                end=3.2,
                badge="Phase: [3/4] DATA BURST TRANSFER",
                telemetry_fmt=" | ADDR: 0x{addr:04X} | CTRL: {mode}=1 | DATA: 0x{val:04X}",
                update_fn=update_data_clip,
            ),
            AnimationClip(
                start=3.2,
                end=4.0,
                badge="Phase: [4/4] MDR LATCH & BUS RETIRED",
                telemetry_fmt=" | MDR: 0x{val:04X} [LATCHED] | CTRL: ACK=1 | READY FOR NEXT CYCLE",
                update_fn=update_latch_clip,
            ),
        ]

        def evaluate_timeline(t: float) -> None:
            """Dispatches the active clip without cascading if/elif checks."""
            for idx, clip in enumerate(timeline):
                if clip.start <= t < clip.end:
                    u = (t - clip.start) / (clip.end - clip.start)
                    if state["active_clip_idx"] != idx:
                        state["active_clip_idx"] = idx
                        if clip.on_enter:
                            clip.on_enter(ctx)
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
        # NATIVE DEARCYGUI FRAME TIMING & CONTINUOUS GPU REFRESH
        # =========================================================================
        FIXED_STEP = 1.0 / 60.0  # 60 Hz deterministic simulation tick

        def on_viewport_frame(sender, target, metrics: tuple) -> None:
            """
            Callback driven natively by dcg.TimeWatcher.
            metrics tuple contains: (render_start_ns, render_finish_ns, viewport_start_ns, frame_count)
            """
            current_ns = metrics[2]  # Hardware viewport frame start timestamp in nanoseconds

            if state["last_frame_ns"] == 0:
                state["last_frame_ns"] = current_ns
                return

            dt = (current_ns - state["last_frame_ns"]) * 1e-9
            state["last_frame_ns"] = current_ns

            # Clamp dt to protect against huge jumps when window is dragged/unfocused
            clamped_dt = min(dt, 0.1)

            if state["playing"]:
                state["accumulator"] += clamped_dt * state["speed"]
                while state["accumulator"] >= FIXED_STEP:
                    state["t"] = (state["t"] + FIXED_STEP) % 4.0
                    state["accumulator"] -= FIXED_STEP
                scrubber.value = state["t"]

            state["sim_time"] += clamped_dt
            sim_t = state["sim_time"]

            # Pulsing clock LED
            clk_val = 0.5 + 0.5 * math.sin(sim_t * 12.0)
            clk_color = (int(40 + 200 * clk_val), int(180 + 75 * clk_val), 100)
            clk_led.fill = clk_color

            # Micro-particle flow on active buses
            p_bus_x1 = 250.0 + ((sim_t * 240.0) % 480.0)
            p_bus_x2 = 730.0 - ((sim_t * 280.0) % 480.0)
            pulse_addr.center = (p_bus_x1, 180.0)
            pulse_ctrl.center = (p_bus_x1, 255.0)
            pulse_data.center = (p_bus_x2 if state["mode"] == "READ" else p_bus_x1, 348.0)

            # Evaluate declarative timeline
            evaluate_timeline(state["t"])

            # Request continuous viewport refresh for the subsequent frame
            if state["playing"]:
                C.viewport.wake(full_refresh=True)

        # Attach dcg.TimeWatcher directly to the window hierarchy
        dcg.TimeWatcher(C, parent=main_win, callback=on_viewport_frame)

        # Frame Render Handler
        def on_window_render(handler, item, data) -> None:
            pass

        main_win.handlers = [dcg.RenderHandler(C, callback=on_window_render)]

        # Execution loop: vsync-synchronized, continuous GPU submission
        while C.running:
            C.viewport.render_frame()

    except Exception as exc:
        print(f"[ERROR] DearCyGui visualizer failed: {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
