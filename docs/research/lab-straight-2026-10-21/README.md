# The Wave Lab's seas come in straight (2026-10-21)

**What the owner saw.** Two playtest clips from the Wave Lab:

- crests crossing in V's at the Canyon;
- a white wall that "closes out" at Padang Padang, from Hs 4.0 m, Tp 12 s, 10°, spread 0.6 (s 8).

The owner's standing rule is that waves form straight to the beach, crests parallel to it, and never come from more than one side at once. Irregular timing is fine.

**Why.** Surf and Practice give the tank's edge the swell refracted: s = 150 at 0° (`REFRACTED_SPREADING`). The lab passed its raw sliders straight in:

- the buoy at s 24 to 4 (s ≈ 8–10 at Mixed), from up to ±40° (10° by default);
- a near storm at s 4–10.

The tank's 160 m window has open, unfed sides (`SIDE_FEED_SPOTS = []`), so a spread sea drains out of them and sheds wake wedges. The lab's height also disagreed with its run: the slider and forecast said 4.0 m at the Canyon, but the run was capped at 3.0 m, where the Canyon breaks in four or five rows.

## The fix

- **Spread and direction** (`swellFor`, `src/game/PhysicalMode.ts`). A lab sea carries `PhysicalSettings.lab`, which the lab's settings and its host set.
  - The buoy's spread at the tank's edge is 150 · 0.5^spread (`labSpreadingFor`): 150 at Groundswell, 106 at Mixed, 75 at Windswell. 75 is the advisor's floor for swell at a tank edge (`LAB_SPREADING_FLOOR`).
  - A storm's spread is max(its own, 75). `stormSwell` caps s at 75, so every lab storm now arrives at s 75.
  - Both come from 0°.
- **Height.** The lab's limit at a spot is its Big (`labHeightLimit`): 2.4 m at the Beach, Point and Canyon, 3 m at the Reef, 3.8 m at Padang Padang, and the machine's Big (√2 · 1.05 ≈ 1.48 m) at the Wave Pool. The limit applies to the slider, the forecast, the run (buoy and storm) and saved settings, which load clamped.
- **The panel.** Direction shows 0° and is disabled for every source. Spread is now "Spread at the break".
- **Dev only.** `?labRawSea=1` brings back the raw spread and direction, and frees the Direction slider for Buoy and Storm. The height limit stays.
- **Unchanged.** Surf, Practice, online rooms and the dev pages pass no `lab`. All 870 Surf and Practice configs built by `physicalSettingsFor` → `surfZoneConfigFor` came out byte-identical: every spot, size, tide, wind, both stages, both tiers and the backdrops.

## The crest bend, before and after

The probe is `crest-lab.ts`: `scripts/crest-angle-report.ts` with the sea built exactly as the game builds it (`surfZoneConfigFor`, 64 components, on the CPU), and the bend's p90 added. Every run uses seed 1 and 300 s.

A crest's **bend** is |right − left|, the angle between its two halves along shore; a V-shaped crest has a large bend. The edge line is what the tank sends in, and the take-off line is 30 m seaward of the take-off. Each cell gives the bend's mean / p90 in degrees, then the straightness in metres.

| Sea | Edge | Take-off |
|---|---|---|
| Canyon, Surf Big: 2.4 m, 14 s, s 150, 0° | 2.8 / 6.7 · 0.52 m | 3.5 / 8.2 · 0.65 m |
| Canyon, lab Mixed **after**: 2.4 m, 14 s, s 106, 0° | 3.4 / 8.1 · 0.67 m | 5.5 / 9.5 · 0.99 m |
| Canyon, lab Mixed **before**: 2.4 m, 14 s, s 10, 10° | 12.5 / 33.0 · 2.27 m | 8.4 / 22.3 · 1.77 m |
| Canyon, owner's sea **after**: 4.0 → 2.4 m, 12 s, s 99, 0° | 4.9 / 11.7 · 1.02 m | 5.9 / 9.1 · 1.01 m |
| Canyon, owner's sea **before**: 4.0 → 3.0 m, 12 s, s 8, 10° | 10.9 / 30.5 · 2.05 m | 12.7 / 26.8 · 2.49 m |
| Padang, Surf Big: 3.8 m, 18 s, s 150, 0° | 2.7 / 4.7 · 1.07 m | 2.3 / 3.7 · 1.27 m |
| Padang, owner's sea **after**: 4.0 → 3.8 m, 12 s, s 99, 0° | 3.8 / 9.3 · 1.81 m | 4.1 / 9.9 · 2.14 m |
| Padang, owner's sea **before**: 4.0 m, 12 s, s 8, 10° | 9.2 / 20.6 · 3.70 m | 8.0 / 13.7 · 3.20 m |

**What it shows.**

- At a matching height and period, the lab's Mixed sea at the Canyon now bends within 0.6° (edge) and 2° (take-off) of Surf's mean, and within 1.5° of its p90. Before the fix, its p90 was 22–33°.
- The owner's two seas lose about half their mean bend (49–59 %), and their crests' straightness roughly halves.
- What is left over Surf comes from s 99–106 against 150 and, at Padang Padang, from 12 s against Surf's 18 s. Surf has no 12 s swell there, so the Padang Padang comparison is height-matched only.

The per-crest data are in `runs/`.

## Open

- **The Windswell end** (s 75, and every storm) was not measured; Mixed was.
- **Lower lab limits.** The lab's Beach and Point limit fell from 4 m to 2.4 m, and the Reef's from 4 m to 3 m.
- **Padang Padang at 12 s.** The lab still allows a short period there; whether 3.8 m at 12 s still closes out is the peel's question, not this one's.
- **The Wave Pool's limit** (1.48 m) is not on the slider's 0.1 m step, so the slider tops out at 1.4 m.
