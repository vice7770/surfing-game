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

**Status (2026-11-11).** Run at full size on the M4 Pro (4.4 to 4.9 hours a case); the three files are in `data`. Every frame matches its stored profile (median 1.6 to 2.1 cm from the cell it took). Points without a sample: 32 (pool small), 0 (pool big), 4928 of 44288 (canyon).

## First look (2026-11-11)

`python3 tools/basilisk/analysis/velocity_first_look.py` prints `first-look-2026-11-11.txt`. Times are from the moment the face stands vertical (the throw). Speeds in m/s at the case's depth.

**1. The water at the crest's top, as a share of the crest's speed.** The game uses 0.85 before the throw and 1 from it (to 1 over 0.2 s with `tubeSeam=blend`).

| Case | 0.7 s before | 0.34 s before | 0.17 s before | At the throw | 0.34 s after | First at 1 |
|---|---|---|---|---|---|---|
| Pool small (1.5 m faces) | 0.59 | 0.66 | 0.74 | 0.84 | 0.99 | 0.36 s after |
| Pool big (1.8 m faces) | 0.52 | 0.68 | 0.72 | 0.74 | 0.95 | 0.42 s after |
| Canyon | 0.76 | 0.75 | 0.78 | 0.81 | 1.08 | 0.33 s after |

- The game's 0.85 is right at the throw only. Half a second before it the pool's crest water runs at about 0.6 of the crest's speed.
- The share reaches 1 about 0.35 s after the throw, not 0.2 s.
- In m/s the pool's small case is smooth: 2.5 at 2 s before, 3.7 at 0.7 s before, 5.0 at the throw, 5.3 after.

**2. Just under the surface.** In the top 10 cm the speed is the surface's (within 1 %). At 45 cm it is 2 to 6 % slower before the throw and about 14 % slower in the open tube. So one flow for the hull and the legs is a fair model before the throw.

**3. The streamline formula.** In the wave's frame, on the front face between 15 and 90 % of the way down:

| Pool small | 0.7 s before | 0.5 s before | 0.34 s before | At the throw | 0.34 s after | 0.7 s after |
|---|---|---|---|---|---|---|
| Measured over ruling 4's formula (speed² = 2 g × drop) | 1.16 | 1.25 | 1.22 | 1.02 | 0.67 | 0.92 |
| Measured over the same with the crest's own speed added | 1.03 | 1.12 | 1.13 | 1.00 | 0.67 | 0.92 |

- Before the throw the plain formula reads 15 to 25 % low. With the crest's own speed added it is within 13 %, and exact at the throw.
- Just after the throw both read a third too fast on the face. The flow is not steady there.

**Limits.** The crest's speed is read from the highest profile point over a ±0.17 s window, and that point hops (5.8 to 9.3 m/s in single rows). The shares before 0.7 s are not reliable for that reason. A steadier wave speed is the first thing to fix before any number here goes into the game.

**Next.** (1) A steadier wave speed. (2) Ask the water-physics advisor, then put the measured share (about 0.6 → 0.84 → 1 over 0.85 s) behind a switch in place of 0.85 → 1. (3) Compare `wallBody=stream`'s flow with the measured one point by point.

## A steadier wave speed (2026-11-11, second look)

`python3 tools/basilisk/analysis/velocity_wave_speed.py` prints `wave-speed-2026-11-11.txt`.

**What was tried.**
- The back face's half-height point, over a ±0.34 s window. It is not steadier: 4.3 to 8.6 m/s in the pool's small case. The back face changes shape as the crest steepens. Dropped.
- One straight line through the crest point over the 1.4 s before the throw. It fits within 7 cm in the pool's small case and the Canyon, so those waves do travel at one speed. In the pool's big case it misses by 35 cm: that crest does not hold one speed.

**The crest water's share of that one speed.**

| Case | Wave speed, m/s | 0.7 s before | 0.34 s before | 0.17 s before | At the throw | 0.17 s after | 0.34 s after |
|---|---|---|---|---|---|---|---|
| Pool small | 6.25 | 0.59 | 0.70 | 0.75 | 0.80 | 0.83 | 0.86 |
| Pool big (poor fit) | 8.10 | 0.48 | 0.56 | 0.61 | 0.66 | 0.73 | 0.76 |
| Canyon | 7.90 | 0.75 | 0.79 | 0.82 | 0.85 | 0.89 | 0.92 |

**What it changes.**
- At the throw the share is 0.80 to 0.85 where the wave holds one speed. The game's 0.85 is right there.
- Before the throw the pool's share is lower than the game's flat 0.85: about 0.6 at 0.7 s before, 0.7 at 0.34 s before. The Canyon is flatter (0.75 to 0.85).
- The first look's "reaches 1 about 0.35 s after the throw" was partly the measure. After the throw the highest point falls back as the lip goes forward, so its speed drops to about 5.4 m/s and the share rises. Against the wave's steady speed the crest's top is still at 0.86 to 0.92 then. The water that passes the wave's speed is the lip's front, not the crest's top.
- So the measured change to try is before the throw only: the pool's share rising from about 0.6 to 0.8 over the last 0.7 s, in place of a flat 0.85. After the throw the game's rise to 1 needs the lip's speed, not the crest's, to be judged.

**Limits.** One fit window. The pool's big case is not settled. The Canyon has 11 % of points without a sample.

**Next.** (1) The advisor on this ramp. (2) The ramp behind a switch. (3) `wallBody=stream`'s flow against the measured one, point by point, with the lip's front read after the throw.
