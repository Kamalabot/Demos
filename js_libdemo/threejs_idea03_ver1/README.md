# Three.js + Anime.js + lil-gui — Extended Runway Taxi (`threejs_idea03_ver1`)

Version 1 evolution of `threejs_idea03`: keeps the 6 shapes parked at their original runway coordinates (`z = -12..+12`) while extending the runway symmetrically on both sides (`z = -60..+60`) for realistic **Runway Taxi Takeoff** and **Touchdown + Taxi Rollout to Stop**.

## How to Run (Windows DOS / `cmd.exe`)

From the `js_libdemo` root directory:

```cmd
npx vite threejs_idea03_ver1
```

## What Changed From `threejs_idea03`
- **Extended Dual-End Runway (`runway.js`)**: Stretched runway length from `38` to `120` (`-60` to `+60` on Z), added dual-end threshold markings, extended edge beacon lights (`-56..+56`), and expanded ground apron (`260×260`).
- **Taxi Takeoff (`launchShape` in `main.js`)**: Shapes roll forward along the `-Z` runway with nose-up pitch rotation (`-10°`), ignite thrusters at liftoff, and climb diagonally into space.
- **Approach, Touchdown & Taxi to Stop (`landShape` in `main.js`)**: Shapes descend onto the `+Z` approach zone, fire retro-braking thrusters, touch down with a shockwave ring, and taxi smoothly back (`outCubic`) to their original parked coordinates.
- **`lil-gui` Taxi Controls**: Added `Taxi Distance` and `Taxi Time (ms)` sliders.
