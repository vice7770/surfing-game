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
| 21 | `JyuQD2apZHQ` | https://www.youtube.com/shorts/JyuQD2apZHQ | **read — PR #428, not merged.** ⭐ **The second recovery**, and it **refutes** the arms rule clips 19+20 suggested |
| 22 | `YybXum0o4YI` | https://www.youtube.com/shorts/YybXum0o4YI | **read — PR #430, not merged.** ⭐ One unbroken ride, and a **deliberate layback snap recovers FASTER than either involuntary save** |
| 23 | `4cd6S0rD9pE` | https://www.youtube.com/shorts/4cd6S0rD9pE | **read — PR #432, not merged.** ⚠️ **SAME RIDER AND FILM AS CLIP 15, re-uploaded by a second channel (@cisurfboards)** — an ID grep cannot catch that. Three content tests say a **different ride**. **Registry rows should carry rider + film + channel, not just the ID** |
| 24 | `jPOoZnxF3Sw` | https://www.youtube.com/shorts/jPOoZnxF3Sw | **read — PR #433, not merged.** ⭐⭐ **The counterexample clip 19 needed**; rider Kelly Slater (uploader's title only), channel `@danscotttt`, a fifth poster, no overlap with any earlier clip |
| 25 | `wHMEeY29v9I` | https://www.youtube.com/shorts/wHMEeY29v9I | **read — PR #434, not merged.** ⛔ **HEADLINE STRUCK 2026-11-19: no separation is established**, so this is NOT clip 20's control and it kills nothing. The board's identity is unresolved (two boards in play 4.3–5.57 s; the loose board ENTERS lower-left at 7.084–7.267; a leash at 7.3008 with no attachment back to him) and foam makes *hidden* and *gone* identical. **Both halves of clip 19's rule are untested again.** What stands: a folded trunk and low arms through **40 consecutive frames** of heavy broken water. Channel `@hunterjoness` — **a FOURTH clip from one poster** |
| **26** | `uMfa7xmy53o` | https://www.youtube.com/shorts/uMfa7xmy53o | — | ⏳ **BEING READ 2026-11-19** — submitted as `?feature=share` |
| **27** | `OhZwR1dW_RQ` | https://www.youtube.com/shorts/OhZwR1dW_RQ | — | ⏳ **QUEUED 2026-11-19** — `?feature=share`; waits behind 26 (one video at a time) |
| **28** | `g3fe9BRoeaI` | https://www.youtube.com/shorts/g3fe9BRoeaI | — | ⭐⭐ **PRIORITY — the owner bypassed the queue for it.** He says it has **a take-off filmed before the feet are on the board**, a readable **sideways body speed relative to the board**, **filmed from the FRONT**, **long and unbroken with one rider**, and **slow motion** — five of the six things the series has been asking for. Read NEXT, ahead of 27. |
| **29** | `tqEm0RSmz6I` | https://www.youtube.com/shorts/tqEm0RSmz6I | — | ⏳ **BEING READ 2026-11-19.** The owner points at the **first 5 s** for **a take-off AND the sideways setup**. ⭐ Second clip that may carry a take-off, and the first submitted with the side-on geometry named. |

**Dispatch rule: the owner's standing instruction is ONE VIDEO AT A TIME**, so the queue is dispatched in order as
each read reports. **Every brief is written blind** — an independent reviewer reads several of the same clips, and
its observations are withheld from our reader until that reader has published, because two blind reads that agree
are evidence and two reads that compared notes first are one read.

## Independently reviewed as well

A reviewer has published its own blind reads of clips **11–16** at `codex/surf-motion-11-13` and
`codex/surf-motion-14-16`. **Those are not substitutes for our reads and are not to be quoted into a brief.**
