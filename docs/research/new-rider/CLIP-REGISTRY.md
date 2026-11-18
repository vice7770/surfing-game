# The clip registry — every surf video submitted, by URL

**Purpose: the owner asked for duplicates to be tracked by URL so the queue sorts itself.** This is the one place to
check before any clip is read. **The key is the YouTube ID**, because the same clip arrives with different query
strings (`?feature=share`, `?t=2`), so comparing full URLs misses duplicates that comparing IDs catches.

**Check a new submission in one command, from the repo root:**

```
grep -c "<THE_ID>" docs/research/new-rider/CLIP-REGISTRY.md
```

A non-zero count means it has already been submitted. **Add every new submission here when it is queued, not when it
is read** — the whole point is to catch a duplicate before a round is spent on it.

## Read

| # | ID | URL | document | state |
| --- | --- | --- | --- | --- |
| 1 | `3nfW6OLiyYw` | https://www.youtube.com/watch?v=3nfW6OLiyYw | `3.4/kirra-reference.md`, `3.4/kirra-reference-50-196s.md` | read (two passes) |
| 2 | `JBgWB825c-g` | https://www.youtube.com/watch?v=JBgWB825c-g | `3.4/video-ref-2.md` | read |
| 3 | `GD8vS7_faSo` | https://www.youtube.com/watch?v=GD8vS7_faSo | `3.4/video-ref-3.md` | read |
| 4 | — | — | **no document found** | ⚠️ the series numbering skips 4 in the files on `main`; recorded as a gap rather than invented |
| 5 | `rNDI0GcDDYU` | https://www.youtube.com/watch?v=rNDI0GcDDYU | `3.5/video-ref-5-dave-rasta.md` | read |
| 6 | `sjYBGrL1Q_U` | https://www.youtube.com/watch?v=sjYBGrL1Q_U | `3.5/video-ref-6-mason-ho.md` | read |
| 7 | `oCelSQ2iteU` | https://www.youtube.com/watch?v=oCelSQ2iteU | `3.5/video-ref-7-ripcurl-tube-and-trim.md` | read |
| 8 | `Th2TMrOUx1E` | https://www.youtube.com/watch?v=Th2TMrOUx1E | `3.5/video-ref-8-malibu-montage.md` | read |
| 9 | `qUm3eO2EFBc` | https://www.youtube.com/watch?v=qUm3eO2EFBc | `3.5/video-ref-9-ponta-preta.md` | read |
| 10 | `oRL0q5rDZWc` | https://www.youtube.com/watch?v=oRL0q5rDZWc | `3.5/video-ref-10-mentawai-drone.md` | read |
| 11 | `Ew5j1uqExVA` | https://www.youtube.com/shorts/Ew5j1uqExVA | `3.5/video-ref-11-one-ride-60fps.md` | read |
| 12 | `HhJo76wwkZc` | https://www.youtube.com/shorts/HhJo76wwkZc | `3.5/video-ref-12-maldives-montage.md` | read ⚠️ **headline withdrawn** — see its §CORRECTIONS |
| 13 | `9k-MU6Q5Lhc` | https://www.youtube.com/shorts/9k-MU6Q5Lhc | `3.5/video-ref-13-kandui-one-ride.md` | read — **PR #410, not merged** |
| 14 | `8d_lrXoiRa4` | https://www.youtube.com/shorts/8d_lrXoiRa4 | `3.5/video-ref-14-erin-brooks-last-wave.md` | read — **PR #412, not merged** |
| 15 | `3yxY-F_AEds` | https://www.youtube.com/shorts/3yxY-F_AEds | `3.5/video-ref-15-mikey-february-shortyhead.md` | read — **PR #414, not merged** |
| 16 | `NQ6dkvD2gHU` | https://www.youtube.com/shorts/NQ6dkvD2gHU | `3.5/video-ref-16-mid-length-trim-run.md` | read — **PR #415, not merged** |

## Queue

| # | ID | URL | state |
| --- | --- | --- | --- |
| 17 | `nyABF8GNwrU` | https://www.youtube.com/shorts/nyABF8GNwrU | **read — PR #417, not merged.** Row 17's first reproduced *absolute* foot position; **no foot slid in the whole clip** |
| 18 | `2Z_wZFjKAOU` | https://www.youtube.com/shorts/2Z_wZFjKAOU?t=2 | **read — PR #420, not merged.** ⛔ **No take-off in it** — the `?t=2` marker lands on the first turn. Fastest chaining measured (1.583 s) |
| 19 | `V8SCdpuYnKM` | https://www.youtube.com/shorts/V8SCdpuYnKM | **read — PR #422, not merged.** ⭐ **The first clip in nineteen that ENDS IN A WIPEOUT**, and its mechanism is the owner's own complaint |
| 20 | `G1qplJLdOJM` | https://www.youtube.com/shorts/G1qplJLdOJM | **read — PR #423, not merged.** ⭐ **The first RECOVERY from a lost stance in twenty clips** |
| 21 | `JyuQD2apZHQ` | https://www.youtube.com/shorts/JyuQD2apZHQ | ⏸️ **HELD, not dispatched.** Clip 20 proved the binding constraint is **the board's bearing to the lens**, which no new clip from a shore-side camera can fix. **Awaiting the owner's decision on whether to continue the queue.** |

**Dispatch rule: the owner's standing instruction is ONE VIDEO AT A TIME**, so the queue is dispatched in order as
each read reports. **Every brief is written blind** — an independent reviewer reads several of the same clips, and
its observations are withheld from our reader until that reader has published, because two blind reads that agree
are evidence and two reads that compared notes first are one read.

## Independently reviewed as well

A reviewer has published its own blind reads of clips **11–16** at `codex/surf-motion-11-13` and
`codex/surf-motion-14-16`. **Those are not substitutes for our reads and are not to be quoted into a brief.**
