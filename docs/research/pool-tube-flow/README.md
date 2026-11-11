# The flow under the tube's surface (2026-11-11)

**What this is for.** The Wave Pool Barrel draws its tube from simulated breaking waves (Basilisk). Those runs kept the surface's shape only. The water's speed inside the wall is made up in the game: 0.85 of the wave's speed before the throw, the full speed after. Ruling 4 (rank 3) and ruling 5 ask for one flow inside the wall. This folder will hold the measured one.

**The one command, on the M4 Pro:**

```
tools/basilisk/run_velocity.sh
```

It reruns the game's three cases (`pool_straight_small`, `pool_straight_big`, `canyon23_a38`) at level 13 with the velocity written out, side by side, in about 3.5 hours. It touches no finished run. When it ends it writes `data/periodic_<case>_L13_velocity.json` here. Commit that `data` folder.

- `tools/basilisk/run_velocity.sh status` says where each case is.
- If the Mac sleeps or the run stops, the same command resumes it.
- It needs what the earlier pool runs needed (Basilisk in `~/basilisk-C`, the Python with numpy in `tools/basilisk/.venv`).

**What the files hold.** For every stored frame and each of its 128 profile points: the water's velocity (u towards the shore, v up, in √(g h0), the fixed frame) at five depths under the surface: 1.5 cells, then 0.01, 0.02, 0.05 and 0.1 h0 (4.5 to 45 cm at the pool's 4.5 m). The format is in `tools/basilisk/README.md`, "The velocity under the surface".

**What it will answer.**
- How fast the surface water runs along the face as it steepens (the game's 0.85, and when it is reached).
- How the speed changes just under the surface, where the board's hull and the rider's legs are.
- Whether the streamline formula ruling 4 proposed (speed² = 2 g × the drop below the crest, in the wave's frame) matches the simulated wave.

**Status.** Not run at full size. The compile, a small smoke run and the packing were checked on the M1.
