# Algorithm Visualizer Suite: `algo_runs`

A collection of creative, GPU-accelerated algorithm explainers built in Python with **[DearCyGui](https://github.com/hoffstadt/DearPyGui)**.

---

## 1. `algo00.py`: The Halving Search (Binary Search Space Slicer)

[algo00.py](file:///d:/gitFolders/Demos/algo_runs/algo00.py) tackles the most fundamental problem in computer science: **searching for an element in a sorted list**.

### The Problem
Given a sorted array of 16 numbers:
```python
[3, 8, 12, 17, 21, 28, 33, 39, 42, 51, 60, 68, 77, 85, 91, 99]
```
Find the secret target number (e.g. `42`).
* **Linear Search ($O(N)$)**: Checks element-by-element from left to right; worst-case requires 16 comparisons.
* **Binary Search ($O(\log N)$)**: Slices the remaining search space in half at each probe; mathematically guaranteed to locate any element in at most $\lceil \log_2(16) \rceil = 4$ steps!

---

### Creative DearCyGui Visualization Mechanics

```
               [MID: 7 (39)]  ◄─── (Golden Laser Scanner)
                     │
+───+───+───+───+───+▼──+───+───+───+───+───+───+───+───+───+───+
| 3 | 8 | 12| 17| 21| 28| 33| 39| 42| 51| 60| 68| 77| 85| 91| 99|
+───+───+───+───+───+───+───+───+───+───+───+───+───+───+───+───+
  ▲                                                           ▲
 [LOW: 0] (Cyan Caliper)                       (Magenta) [HIGH: 15]
  ██████████████████████████████ ◄─── (Red Translucent Elimination Curtain)
  (Discarded 50% search space!)
```

1. **Animated Caliper Pointers**:
   * **LOW (Cyan Arrow)**: Glides smoothly along the bottom to the lower search boundary.
   * **HIGH (Magenta Arrow)**: Glides smoothly to the upper search boundary.
   * **MID (Golden Laser)**: Drops vertically from the top directly onto the pivot element $M = \lfloor\frac{L + H}{2}\rfloor$.

2. **The Slicing Red Curtains**:
   * When `arr[mid] < target`, an animated translucent red curtain drops over the left half `[low .. mid]`, visually demonstrating the discarded search space.
   * When `arr[mid] > target`, the curtain covers the right half `[mid .. high]`.

3. **Comparison Balance HUD**:
   * Displays the active arithmetic comparison in real time (`39 < 42 -> Discard Left Half`).

4. **Exponential Halving Gauge**:
   * A progress bar representing remaining candidate count shrinking exponentially:
     $$16 \;\longrightarrow\; 8 \;\longrightarrow\; 4 \;\longrightarrow\; 2 \;\longrightarrow\; 1$$

5. **Victory Pulse**:
   * When `arr[mid] == target`, a pulsing green beacon frames the winning element and confirms the exact number of steps taken.

---

### Interactive Controls
* **Play / Pause**: Smooth continuous execution.
* **Step (+1)**: Single-step through individual comparisons to study each phase.
* **Target Selectors**: Instant 1-click test targets:
  * `Target: 17` (Found in 2 steps)
  * `Target: 42` (Found in 4 steps)
  * `Target: 85` (Found in 3 steps)
  * `Target: 99` (Found in 5 steps)
* **Speed Slider**: Dynamic speed control ($0.3\times$ to $3.0\times$).

---

## 2. `algo01.py`: Fair Pizza Sharing & Dictionary Allocation

[algo01.py](file:///d:/gitFolders/Demos/algo_runs/algo01.py) translates an everyday real-world problem into fundamental computer science concepts: **how a physical object is sliced into a List, divided evenly, and distributed into a Python Dictionary**.

```
WOODEN CUTTING BOARD (Center Pizza)               PYTHON DATA STRUCTURES
+─────────────────────────────────+               +───────────────────────────────────+
|         CRUST & MOZZARELLA      |               | 1. Slices List (Array):           |
|                                 |               | ['S1','S2','S3','S4','S5'...]     |
|          \      |      /        |               |                                   |
|       S8  \ S1  |  S2 /  S3     |               | 2. Friends Dictionary (Hash Map): |
|     ───────┼────●────┼───────   | ─(Bezier)─►   | 'Alice'  : ['S1', 'S2'] (2 slices)|
|       S7  / S6  |  S5 \  S4     |               | 'Bob'    : ['S3', 'S4'] (2 slices)|
|          /      |      \        |               | 'Charlie': ['S5', 'S6'] (2 slices)|
|                                 |               | 'Dana'   : ['S7', 'S8'] (2 slices)|
|   [=== Roller Cutter Blade ===] |               |                                   |
+─────────────────────────────────+               | MATH: 8 // 4 = 2 (0 leftover)     |
                                                  +───────────────────────────────────+
```

### Concepts Demonstrated Visually
1. **Lists (Arrays)**:
   * A whole pizza is cut into 8 discrete slices (`slices = ['S1', 'S2', ... 'S8']`), visualized as indexed item boxes in memory.
2. **Integer Division (`//`) & Modulo (`%`)**:
   * Slices per person: $8 \mathbin{//} 4 = 2$.
   * Remainder / leftover slices: $8 \pmod 4 = 0$.
3. **Dictionaries (Key-Value Hash Maps)**:
   * Friends' plates are modeled as a dictionary of lists:
     `plates = {'Alice': [], 'Bob': [], 'Charlie': [], 'Dana': []}`
4. **Animated Blade Sweep & Curved Bezier Slices Delivery**:
   * An animated silver roller blade sweeps across the pizza circle, creating the cut lines.
   * Slice tokens lift off the pizza and travel along smooth cubic Bezier flight arcs to land on each friend's plate.

---

## 3. Running the Scripts (DOS / `cmd.exe`)

Prerequisites:
```cmd
pip install dearcygui
```

Run the Pizza Slicing & Dictionary Visualizer:
```cmd
python d:\gitFolders\Demos\algo_runs\algo01.py
```

Run the Binary Search Visualizer:
```cmd
python d:\gitFolders\Demos\algo_runs\algo00.py
```
