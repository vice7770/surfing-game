# Ruling 12. A shallow inside behind the Barrel's reef (2026-11-11, main 8ef41fa0)

Tags: [M] measured, [S] sourced (page opened), [KB] our notes, [R] reasoned, [P] provisional, [U] recalled or search-only, not opened.
Layout: the default Barrel is `POOL_STRAIGHT` (`poolFloorOf`, `src/wave/pool.ts:382-385`). Behind its crest: a top `flatWidth` 6 m at the crest's depth (0.9 m), then `backSlope` 1:10 straight down to `platformDepth` 4.5 m (`pool.ts:530-533`). It has no `lagoonDepth` or `lagoonSlope`; those are the A-frame's.

## 0. Two findings before the floor
- **Where things happen** [M, my rerun of the probe with DUMP, 20 s, 108 touchdowns, placed in the reef's frame]. Throws start 4.9 m seaward of the crest line (1.6 m deep). Touchdowns sit on the crest line (1.2 m behind it, p10–p90 6.2 behind to 0.4 ahead; 0.9 m deep), and only over s 46–94 m. Live lens crests sit 15 m behind the crest line (3–28 m), in 1.9 m of still water.
- **The Froude test reads low on a falling bed** [R, from `SpillingRoller.ts:491-495`]. It takes r = crest depth / trough depth as if the bed were level. On the back slope the trough lies about 6 m further in z, so 0.4–0.5 m deeper in still water. Example: H 0.97 m, crest in 1.5 m, trough in 1.96 m gives Fr 1.22, although H / h_trough is 0.58 (a real bore: the bar is 0.4). The solver agrees: B at the shed is 0.46 median, 1.00 at p90 [M]. So part of the 1.2 s life is the reader, not the water.
- Both are true: by 2.1–2.4 m of still water a 1 m bore really is at H ≈ 0.4 h and should stop [KB]. The floor ends it by about 4 s; the reader ends it at the hold's end, 1.35 s [M].
- **Step 0, no floor change:** in the pool's roller only, read r = 1 + H / h_trough (the same thing on a level bed). Expected life about 3–4 s on today's floor [R]. Drawn only, no risk to the wave. Re-probe before judging the floor.

## 1. Is a shallow inside the physical way? Yes
- Wavegarden Cove: average depth 0.5–1.2 m in the Bays, 1.0–2.5 m in the Reefs [S, wavegarden.com technical requirements].
- Lost Shore (a Cove): the bay is the shallowest part, up to 1.2 m; reef waves "enter the bay as whitewater"; a channel up to 2.5 m deep beside it is "designed to create a rip current that flows from the bay to the reef"; "strong currents" [S, lostshore.com surf terms].
- So a real pool pairs the shallow inside with a deep return channel. Ours must keep one too.
- Surf Ranch: no source for its inside depth could be opened. Search-only: breaks in 3–4 ft, deepest 9 ft, side gutters against bounce-back [U]; 3–4 minutes of calm between waves [KB]. PerfectSwell, Endless Surf: nothing opened.
- Both pages were read as web pages through a summariser, not as PDFs. Dally et al. 1985 and Lowe et al. 2009 returned 403; the ICCE site is down today.
- This reverses my 2026-11-01 advice ("no shallow lagoon"), which was given for the treadmill current and a periodic bed. Those reasons still stand as risks (section 3).

## 2. The floor: `?poolFloor=inside` [P]
New constants, mutable for probes, as `POOL_LEDGE`: `POOL_INSIDE = { step: 0.3, width: 16 }`. Everything seaward of the top's inner edge is `POOL_STRAIGHT`'s, unchanged.
With m = metres behind the top, square to the reef (m = −n − `flatWidth`), and c(s) the crest's depth from `crestProfile`:
- shelf depth D(s) = min(`platformDepth`, c(s) + step);
- depth = min(D, c + m·`backSlope`) for m ≤ m₁ = step/`backSlope` + width (3 + 16 = 19 m);
- depth = min(`platformDepth`, D + (m − m₁)·`backSlope`) beyond; then min with the beach, as today.
- On the barrel (s 65–175): 0.9 m top, down to a level 1.2 m shelf from 9 to 25 m behind the crest line, then 1:10 to 4.5 m at 58 m (today: 4.5 m at 42 m).
- **Along the crest** it tapers by the crest's own profile: 1.9 m behind s 30, the platform at s 0 and s 235, 2.3 m at s 205. No new taper constant. The deep ends (s < 20, s > 215), the 25 m to each wrap and the trough between shelf and beach are the return channels.
- **Why 1.2 m, not 0.9:** the top's least water is already 0.10–0.17 m, under my 0.2 bar [M, 2026-11-01]; a wider 0.9 m top would spread thin cells. And the crest stays the shallowest line, so it still sets the throw [R].
- **Why level, not rising:** a shelf rising along the reef would end as a bar and a second break line [R].
- **Why 16 m:** on a level bed a bore decays toward H ≈ 0.4 h with an e-fold of h/K ≈ 8 m of travel (Dally et al. 1985, K 0.15, Γ 0.4) [U]. From H 1.0 to 0.5 h (0.6 m) is about 14 m of travel, 11 m square to the reef [R]. A wider shelf buys nothing and feeds the current. Probe 12, 16, 24.
- **Both sizes, one floor.** 1.5 m: H_s at touchdown 1.15 m [M], H/h 0.96 on entry, shed bar 0.4 h_trough ≈ 0.42 m. 1.8 m: H_s about 1.4 m [R, scaled, not measured], H/h 1.15. If 1.8 m drains the shelf under 0.3 m, set step 0.5 (shelf 1.4 m).
- **Expected:** lens life 4–6 s after touchdown; 30–40 m of broken crest behind the tube at the 6.45 / 7.1 m/s peel [R]. Then the wave reforms over the trough and breaks on the beach, as today.
- **Not "to the shore".** A level shelf holds a bore only until H ≈ 0.4–0.55 h [KB, Nelson; U, Dally]. White to the shore needs a bay rising to a beach parallel to the reef: a new layout (call 2).
- A-frame (`?poolBarrel=aframe`): same idea is `lagoonDepth` 1.8 → `armCrestDepth` + 0.3 = 1.2. Not in step 1.

## 3. What it must not disturb, and the check (headless, no rider, against the default floor, same seed and times)
| Item | Expectation | Bar |
|---|---|---|
| Throw place | bed unchanged from the platform to 6 m behind the crest line | throw and touchdown places within 1 m (median); touchdowns still over s 46–94 |
| Wave before the throw | only reflection, set-up and current can reach it | surf meter within ±5 % over 12 periods and at 300 s; jets' share of onsets within 5 points |
| Peel | unchanged bed under the break | start x 93–94 (sd ≤ 2 m); peel 6.45 / 7.1 m/s within ±5 %; line's end median not more than 10 m short |
| Set-up | small: the shelf's back is open to the 4.5 m trough, so water runs off instead of piling [R]. Closed-bay bound about 0.3 m [R] | mean level on the crest line within 0.03 m of default |
| Return over the crest | wave mass flux across the reef about 0.1 m²/s, so about 0.1 m/s if it all returned over the top; 2 % of the crest's speed [R] | mean flow across the crest line within 0.1 m/s of default |
| Along-reef current | the main risk. Today −0.33 m/s at 600 s and still growing, faces −7 % [M]. The shelf spends more of the bore's along-reef push in thin water; expect 2–3 times the rate [R, rough] | on-shelf mean ≤ 0.5 m/s and behind-reef (z −100…−45) ≤ default + 0.1 m/s, at 300 s; report 600 s |
| Reflection | the back drop is the same 1:10 kind, from 1.2 m not 0.9 m: no worse [R] | covered by the meter and the throw place |
| Thin water | shelf is deeper than the top | least water on the shelf ≥ 0.3 m; on the top not under default's; 0 Froude caps; finite over 600 s; volume drift ≤ 0.3 %; fastest water ≤ default + 1 m/s |

## 4. The probe's bars (solver + loft, `afterTube=roller`, 1.5 and 1.8 m)
- A. Lens life after touchdown: median ≥ 4 s, p10 ≥ 2.5 s (was 1.17 s) [P].
- B. Why shed: at least 80 % shed on the shelf's end drop or by strength, not on the level shelf.
- C. Outer region: H_s at 5–8 h_b in 0.55–0.75 H_b [S, Svendsen 1984]. Note: 5–8 h_b of travel ends at about touchdown + 1 s here, and today's 0.60–0.71 of the drawn height already sits inside [M]. Keep it as a no-regression bar.
- D. Inner region: H_s / still depth on the shelf's last 5 m in 0.4–0.6 [KB]. Report H / h_trough beside the lens's own Fr, to expose the reader's bias.
- E. Broken crest behind the tube: ≥ 30 m at 1.5 m (was about 12 m) [P]. Report it for the spilling run s 100–175 too.
- F. No flicker: zero born–shed–born within 0.5 s per column; `disagree` count not above default's.
- G. Section 3's table, all rows.
- H. Default floor: probe print identical to today's without the switch; Canyon roller tests unchanged.
Add to the probe: reef-frame place (s, n) and H/h at touchdown, +1, +3, +5 s and at the shed.

## 5. Risks, ranked
1. The along-reef current grows faster and lowers the next waves (the wrap has no wall to stop it). Real pools have this current and answer it with walls and channels [S].
2. The life gain is small because the reader, not the floor, was shedding. Step 0 separates the two.
3. Thin cells on the shelf at 1.8 m (drawdown ahead of the next wave).
4. A second white line: the reformed wave re-breaking on the shelf's back edge or early on the beach.
5. The bore decays slower in the solver than Dally's rate (lens H was still 0.6 of the drawn height at +3 s [M]), so it reaches the shelf's end high and sheds there at once. Then widen to 24 m.

Must not:
- add a source, sink, damping or sponge zone on the inside; if the current fails its bar, the real remedies are the wrap wall (built, off) or a deeper channel;
- change any bed seaward of the top's inner edge, `crestProfile`, `flatWidth`, the machine's heights, or the beach;
- change the default floor, `POOL_LEDGE`, the A-frame, the Training floor or the Canyon by one byte; online rooms pin the default;
- retune `ROLLER_DEFAULTS`, or lower the 1.3 Froude bar, to make bar A pass;
- combine `inside` with `ledge` in step 1; judge it on a start-up sea (settle ≥ 27 s; currents at 300 s).

## 6. The owner's calls
1. Step 0 first (the reader's fix, drawn only), or straight to the floor?
2. A shelf strip (this ruling: 30–40 m of white, then the wave reforms), or a full bay rising to a beach behind the reef (white to the shore, as a Cove; a new layout, the shore break goes, the current is largest)?
3. If the current fails its bar: accept it, turn the wrap wall on (it cost 16 m of line and added fast water on 2026-11-01), or a deeper channel?
4. If `inside` passes: does it become the Barrel's default, and does the A-frame get it?
5. Still open from ruling 11: the lens is drawn only (call 1), the collapsing tube (call 3), Classic (call 5).

Sources opened: https://wavegarden.com/wavegarden-cove/technical-requirements/ ; https://www.lostshore.com/surf/surf-terms/ . Probe rerun: `scratchpad/after-tube/run/probe.txt` and `.dump`; placing script `scratchpad/after-tube/an.py`.
