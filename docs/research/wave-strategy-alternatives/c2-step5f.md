# C2 step 5f: the A0 column completed, and what the clamp says with it in (2026-11-14)

Tags: [M] measured here, [C] read in the code, [S] sourced, [R] reasoned, [P] provisional.
The brief is ruling 39's "next" item 3: the five Basilisk runs landed, wire them, and read the A0 clamp and the
hand-over height bar again. Everything is inside `?wave=library`; **no new switch, and the default game does not
change** (§5).

**In one line:** ruling 38's rule is paid off — every bed in the library now carries its whole A0 column, four rows
each on six beds — and **the A0 clamp closes: 717 clamped slices of 1273 become 62 of 1274, a 91 % cut** [M]. But the
two things that were waiting on it do **not** follow: the τ clamp does not move at all (811 → 814 of the same
population), and **the hand-over's height bar barely moves** (median 1.045 → 1.043, 54.5 % → 53.8 % outside) — and the
sharpest finding of the round is that **step 5b's hopeful reading of the unclamped slices does not survive a larger
sample**: 57 slices at median 0.978 become 161 at 1.043, and the share outside the bar goes **12.3 % → 43.5 %**. The
five files cost **6.43 MB**, taking the library from 24.93 to **31.37 MB**, all of it still fetched up front.

| Passes | Misses |
|---|---|
| the A0 clamp **717 → 62 of 1274** (112 of 1517 slices made, below the nine-case library's own 277 of 1518); the hand-over's crest place, median 0.044 → **0.003 m**, over its 0.25 m bar 8.8 → 7.4 %; the ratio's tails, 90 % 1.356 → 1.246, 99 % 2.210 → 1.983, worst 5.885 → 5.175; every listed case loads with its own keys (24 of 24, 0 mismatches); `tsc -b` clean on exit 0; the library tests 37 of 37; the default game untouched by construction | **the height bar still misses**, median 1.043 against 0.95–1.05 and 53.8 % outside, 0.7 points better than with nineteen cases; **the τ clamp does not move** (814 of 1274, every one low) — the complete column was not its cause; **the unclamped population's bar goes backwards**, 12.3 → 43.5 % outside on 161 slices against 57, so ruling 38's "the shape is right wherever the keys reach" **does not hold** at three times the sample; the files 24.93 → **31.37 MB**, further over the plan's 15 MB |

---

## 1. What was wired, and what it cost

Ruling 38 asked for four runs (the A0 0.12 and 0.15 rows on `b15` and `b25`); ruling 39's `C2_FILL` added `b3s-a0`, so
five ran. All five finished on 2026-11-14 and **all five produced a tube** (`docs/research/pool-c2-library-r38/`,
`barrel-cases.md`; every one ✓ against Mead & Black's L/W for reefs).

They are packed with the same command the other nineteen were, into the same format and folder:

```
npm run barrels -- --format brl3 --game --assets public/library \
  --c2 docs/research/pool-c2-library-r38/data/periodic_pool_c2_b15_a0_L12_c2.json.gz … (five)
```

| case | A0 | slope | HS/h0 | frames (own / refill) | file |
| --- | --- | --- | --- | --- | --- |
| `b15-a0` | 0.1271 | 0.055 | 0.199 | 614 (444 / 170) | 1.28 MB |
| `b15-a1` | 0.1512 | 0.055 | 0.199 | 619 (486 / 133) | 1.29 MB |
| `b25-a0` | 0.1289 | 0.085 | 0.249 | 618 (514 / 104) | 1.29 MB |
| `b25-a1` | 0.1532 | 0.085 | 0.249 | 618 (561 / 57) | 1.29 MB |
| `b3s-a0` | 0.1301 | 0.105 | 0.200 | 612 (526 / 86) | 1.28 MB |

**The column is now whole on every bed** — checked by reading the twenty-four committed files' own headers, not the
list (`libraryCases.ts` carries the same keys, and a check confirmed every entry matches its file's header) [M]:

| bed (slope / HS over h0) | its A0 rows |
| --- | --- |
| 0.036 / 0.19 (`b1`) | 0.1263 0.1506 0.2503 0.3553 |
| 0.055 / 0.199 (`b15`) | **0.1271 0.1512** 0.2510 0.3569 |
| 0.068 / 0.205 (`b2`) | 0.1278 0.1519 0.2520 0.3586 |
| 0.085 / 0.249 (`b25`) | **0.1289 0.1532** 0.2532 0.3597 |
| 0.105 / 0.20 (`b3s`) | **0.1301** 0.1545 0.2546 0.3611 |
| 0.105 / 0.30 (`b3`) | 0.1294 0.1535 0.2526 0.3577 |

**The cost.** The five files are 6,431,456 bytes. `public/library` goes **24.93 → 31.37 MB**, and every byte of it is
still fetched before the first wave (`loadWaveCaseBytes()` fetches the whole list; `PhysicalMode.ts:1458` calls it only
when `config.wave === 'library'`) [C, M]. Ruling 38's accepted judgment call stands and gets worse by a quarter: this
is fine for an opt-in switch on a dev server and is **a real bar before `?wave=library` can be the default**, together
with the question ruling 38 posed and nobody has answered — whether all the cases are fetched up front or only the ones
the matcher reaches. At 1.3 MB a case, each future bed costs about 5 MB.

## 2. The A0 clamp: the regression closes, and the 277 in my brief was the wrong frame

### 2.1 First, a correction to the brief's own number

My brief, and ruling 38 before it, report the regression as **"277 → 717 clamped slices"**. Those two numbers are from
**two different probes counting two different populations**, and the repository holds both frames:

- **277** is step 3b's *slices made* counter — `277 of 1518 slices made` over its window
  (`c2-step3b-runs/bars-nine-cases.txt`, line 2).
- **717** is step 5b's part F *hand-over* counter — slices whose A0 clamped at the moment their blend starts, `of 1274`
  (`c2-step5b-runs/round1-bars.txt`).

The nine-case run reports the hand-over frame too, four lines further down the same file: **`A0-clamped 211`** on the
same ~1274-slice population. So the like-for-like regression was larger than the brief says, not smaller:

| | 9 cases (step 3b) | 19 cases (step 5b) | 19 cases (here, control) |
| --- | --- | --- | --- |
| A0 clamped **at the hand-over** | 211 | 717 | **717** of 1273 |
| A0 clamped among **slices made** | 277 of 1518 | – | **966** of 1833 |

The control reproduces step 5b's reading to a slice (1273 against 1274; A0 717 against 717; the height median 1.045
against 1.046) [M], so the two frames below are measured by one probe, on one machine, over one window.

### 2.2 The reading

The probe is step 5b's own (`c2-step5b-bars.ts`, part F), unchanged, run twice over the same window from the same
spun-up sea: once on the nineteen committed cases and once on all twenty-four
(`c2-step5f-runs/f19.txt`, `c2-step5f-runs/f24.txt`). Population: every slice at its hand-over over 40–130 s of the
2 m pool, 153 lanes, no rider, no page. The nine-case column of the tables below is step 3b's own run
(`c2-step3b-runs/bars-nine-cases.txt`), a different probe over its own window — it is there for shape, not for
subtraction.

| at the hand-over | 19 cases (control) | 24 cases | |
| --- | --- | --- | --- |
| slices read | 1273 | 1274 | |
| **A0 clamped** | **717** | **62** | −91 % |
| τ clamped | 811 | 814 | no change |
| slope clamped | 336 | 337 | no change (no new slope) |
| HS/h0 clamped | 336 | 336 | no change (no new reef depth) |

| among slices made | 9 cases (step 3b) | 19 cases | 24 cases |
| --- | --- | --- | --- |
| slices made | 1518 | 1833 | 1517 |
| A0 clamped | 277 | 966 | **112** |
| τ clamped | 1138 | 1121 | 958 |
| slope clamped | 414 | 497 | 414 |

Three things to say about that, in order of how much they matter.

**1. The clamp closes, and what is left is honest.** 62 slices of 1274 still clamp their A0. That cannot be a missing
row any more: with four rows on every bed the only way to clamp is to sit outside **0.1263–0.3611**, the library's
whole A0 span — a slice genuinely smaller or larger than any case run. Ruling 38's cure was the right cure and it
worked: **a bed goes in with its whole A0 column or it does not go in** is now a rule with a measurement behind it,
and the next bed should be budgeted at four runs and about 5 MB, never two.

**2. The 19-case library made 300 more slices than either the 9- or the 24-case one** (1833 against 1518 and 1517;
the crest tracker's raws, 2261 against 1868 and 1867) [M]. With the column complete the counts return to the
nine-case figures almost exactly. I am reporting this and not explaining it: the tracker reads the shown wave, so a
half-filled library plausibly feeds it a different surface, but I did not measure the mechanism and will not guess at
it. It matters because **every per-slice share quoted across steps 3b, 5b and here has a different denominator**, and
two of the three agree only now.

**3. The τ clamp is untouched, which settles something.** 814 of 1274, every one low, exactly as with nineteen cases.
A low τ clamp means the slice's H/d is below the case's own at its **first stored frame** — the case starts too
developed for it ([C] `StateMatcher.matchCase`: `hd < envelope[0]` → `clamp = -1`). A smaller-A0 case on the same bed
has a lower envelope start, so it was reasonable to expect the new rows to absorb some of these; they did not. What
*did* move is the weight: `b15-a2`'s low-clamped share of its own weight falls **0.49 → 0.17**, and the two new `b15`
rows take 141 and 653 slices, `b15-a0` clamping low on 139 of its 141. So the slices moved to better-matched cases and
**still** clamp. Ruling 38's reading of this lead — "the runs themselves want a longer lead-in", not more cases — is
confirmed by its own cure failing to touch it. (It is not pursued further here; see §4.)

## 2b. The hand-over's height bar, re-read — and a result that goes the wrong way

| the case's H over the sea's at the hand-over (bar 0.95–1.05) | 9 cases | 19 cases | 24 cases |
| --- | --- | --- | --- |
| all slices | 1.065, 63.1 % outside (1266) | 1.045, 54.5 % (1264) | **1.043, 53.8 %** (1265) |
| 90 % / 99 % / worst | 1.320 / 2.059 / 5.437 | 1.356 / 2.210 / 5.885 | **1.246 / 1.983 / 5.175** |
| the field's whole lanes | 1.071, 64.9 % (1175) | 1.050, 55.7 % (1173) | 1.049, 54.9 % (1174) |
| no τ clamp over 5 % of the weight | 0.973, 26.7 % (240) | 0.996, 34.0 % (471) | 1.004, 33.9 % (487) |
| **no clamp at all** | 1.121, 80.0 % (10) | 0.978, **12.3 %** (57) | 1.043, **43.5 %** (161) |
| the crest's place, m (bar 0.25) | 0.027, 6.9 % over | 0.044, 8.8 % over | **0.003, 7.4 % over** |

**The bar still misses, and the complete column moved it by 0.7 of a percentage point.** The median is 1.043 where the
bar wants 0.95–1.05 — inside it, in fact — but more than half of all slices sit outside, and that has been true at
nine, nineteen and twenty-four cases alike. **The A0 clamp was not what the height bar was waiting for.** The one real
gain is in the tails and in the crest's place: the worst ratio falls from 5.885 to 5.175 and the median crest gap from
4.4 cm to 3 mm, which is what a better-matched case should buy.

**And the sub-population ruling 38 was hopeful about reverses.** Ruling 38 wrote: "the unclamped population grows from
10 slices at median 1.121 to 57 at 0.978, 90 % within 1.028, which says the shape is right wherever the keys reach."
With the column complete that population triples — 161 slices, because the A0 clamp no longer disqualifies them — and
it reads **median 1.043 with 43.5 % outside the bar**, against 12.3 % on the 57. The shape is **not** right wherever
the keys reach. The 57 were a small, self-selected sample: a slice could only be in it by clamping on nothing at all,
which at nineteen cases meant living in the corner of the keys where `b1` and `b2` both had four rows. This is the
round's own instance of the standing error — one small population promoted to a statement about the method — and the
statement does not survive its own cure.

What this says for the next round that cares: the height bar's miss is **not** a key-coverage problem, and three
libraries now agree on that. It is the case's own H against the live sea's at the same place and instant, and the
candidates left are the hand-over's own timing, the sea's smearing of a steep crest (ruling 21 measured the solver's
crest 0.2 m low), and the periodic train's height against this sea's. None of them is a case count.

## 3. The hand-back, read in passing

The same run read part A, because it costs nothing extra once the simulation is stepping. Its headline bar — the jump
across the hand-back itself, the one step a slice is dropped on — reads **place 0.5 % over its 0.3 m bar and height
0.3 % over its 0.05 m bar on 380 hand-backs** [M], against step 5b's **0.0 % and 0.0 % on 312**
(`c2-step5b-runs/round3-a.txt`).

**That is two misses of 380 and one of 380, and it is not attributable.** Step 5b's reading was over **40–115 s** and
mine is over **40–130 s**: two things differ at once (the window and the case count), so the right statement is that
the bar is no longer clean over the longer window, not that the five cases broke it. A 19-case control over 40–130 s
is the one run that would settle it; it was started and **stopped unfinished** when the owner redirected the track,
and I did not restart it, because part A is not what this round was asked for. The command is in §6 for whoever wants
it. The worst single jump is 0.96 m of place and 0.35 m of height, both on one hand-back — large enough to see if a
rider were on that wave, and the reason this is written down rather than waved past.

The rest of part A is unchanged in character: the gap the blend-out pays back is a median **1.37 m** (393 hand-backs),
against 1.27 m at nineteen cases over the shorter window, and the sea's crest was never lost on a step (0 over the
whole run).

## 4. Not this round

The two other items carried to me — **the τ clamp lead** and **the pay-back's course** — are dropped on the owner's
redirection of 2026-11-14: the wave track's next round is **foam and particles where the falling lip hits the water
inside the tube**. The τ clamp's own number is reported above because the same run prints it, not because it was
chased. The pay-back's course is untouched: §3 reports the gap it pays back because the same run prints it, and
nothing was built or tuned for it.

### One thing the next round will want, from this round's reading

`docs/research/tube-spray-reference-2026-11-14/README.md` (landed on main while this branch was measuring) already
makes the right first guess: the question is not whether we have a particle system but why the one we have does not
reach the screen on this wave, and it names the likely cause — `?wave=library` replaces the whole breaking zone, so
the **sea's** own plunging-lip impacts may never fire there. This round's reading adds the other half of that: **if
the sea's impacts do not fire, the library knows the impact anyway.** The case files already carry when the lip lands,
where, and how fast, so a library-side source has a physical key and needs no new asset:

- **When.** The header carries `touchdown`, the τ at which the jet lands (`caseFormat.ts:50–52`), and each live slice
  knows it in game seconds: `SliceField.ts:133` builds `goFrom` from `throwAt + touchdown + SLICE_LIFE.hold`. Step 5b's
  `boreFoam` already ages its foam from that same instant [C].
- **Where.** The lip tip is a *named point* on each stored 128-point profile — `WAVE_LANDMARK.lip = 64`, with
  `throat` at 88 and `toe` at 112 (`caseFormat.ts:29`) — so the jet's place at any τ, the touchdown frame included, is
  read straight off the curve.
- **How fast.** Every stored point carries the water's own `(u, v)` and `(du/dt, dv/dt)` at each stored depth
  (`FLOW_VALUES = 4`, `WaveLibrary.ts:523, 703`), so the impact velocity is in the file.
- **How much water is not.** The jet's area (`A_J/H²`, 0.118–0.246 across these five), the void's L × W and the lip's
  thickness in cells live in the runs' `summary.json` and `barrel-cases.md`, **not** in the `.bin`. A particle budget
  that wants a mass or a volume would either read those per case or derive it from the curve.

This is a read, offered because it was already in hand; nothing was investigated for it, and whether `SprayCloud`,
`BubbleCloud`, `particleSources` and `particleBudget` fire at a slice's touchdown at all is untouched here.

## 5. Seatbelts

**The default game does not change.** Stated by construction, which is stronger than a hash (ruling 39's standard):
the only `.ts` edited is `src/wave/library/libraryCases.ts`, a list of case ids and asset paths whose only consumers
are `loadWaveCaseBytes()` and `readWaveCases()`; `loadWaveCaseBytes()` is called from exactly one place,
`PhysicalMode.ts:1458`, behind `config.wave === 'library'` [C]. The other changes are five new `.bin` files that
nothing fetches unless the switch is on, a comment in `tools/basilisk/run_periodic.sh`, and `tools/basilisk/README.md`.

| seatbelt | result |
| --- | --- |
| `npx tsc -b` | clean, **exit 0**, in a worktree whose `node_modules` is present (checked: an injected type error exits 1, so it really ran) [M] |
| `src/wave/library` tests (`WaveLibrary`, `caseFormat`, `zone`) | 3 files, **37 of 37** passed [M] |
| every listed case loads and its keys are its file's | 24 listed, 24 decoded, **0 mismatches** [M] |
| no test reads `public/library` or `libraryCases` | searched; none does, so the data cannot move the suite [C] |
| the Canyon's bytes | running when this was written; `c2-step5f-runs/canyon-bytes.txt` if it landed before the hand-back, otherwise **not run** — the construction argument above is the seatbelt, and the two spin-ups' expected hashes are step 5b's `a367d938f15fa934` / `9e5831f80e38abd9` (Canyon B) and `ea3d57a4d49f4b48` / `a1a2555739210f96` (the default Canyon) |

## 6. For the next round, and for the pipeline

**A note went into `tools/basilisk/README.md`**, because these five runs were nearly lost. `canyon_pipeline.py`
resolves `CANYON_OUT` against `REPO`, and `REPO` is derived from the script's own path — so a *relative* `CANYON_OUT`
run from a worktree or a scratchpad copy writes the report inside that copy, where the main checkout's `git status`
never sees it and a worktree cleanup deletes it. Seven to ten hours of runs sat in a scratchpad that was being emptied
for disk space and were rescued by hand. The note says to run the pipeline from the main checkout, or give an absolute
`CANYON_OUT`, and to check `git status` there when the batch ends.

**And a correction of ruling 39, in the script's own comment.** Ruling 39 expected `pool_c2_b3s_a0` to come back with
no tube, because its scout showed no touchdown and both of ruling 31's no-touchdown scouts came back without one. It
came back **with** a tube. A scout with no touchdown says nothing about whether the fine phase will overturn; it is not
a reason to drop or discount a row.

**How to run any of this again**, from the repository's root:

```
# the five cases into public/library (already done; this is the recipe for the next five)
npm run barrels -- --format brl3 --game --assets public/library \
  --c2 docs/research/pool-c2-library-r38/data/periodic_pool_c2_b15_a0_L12_c2.json.gz   # … one --c2 per case

# the keys and the fetch cost
npx tsx docs/research/wave-strategy-alternatives/c2-step5f-keycheck.ts

# the clamp and the height bar, on any case folder
npx rolldown docs/research/wave-strategy-alternatives/c2-step5b-bars.ts -o <scratch>/s5f.mjs --format esm --platform node
node <scratch>/s5f.mjs --parts F --cases public/library --cache <scratch>/sea.bin --from 40 --until 130

# the part A control this round did not finish: the same, --parts A, against a 19-case folder
node <scratch>/s5f.mjs --parts A --cases <nineteen-case folder> --cache <scratch>/sea.bin --from 40 --until 130
```

`--cache` writes a spun-up sea on the first run and reads it afterwards, so the control and the branch see the same
water. A 19-case folder is this branch's `public/library` with the five files of §1 taken out.
