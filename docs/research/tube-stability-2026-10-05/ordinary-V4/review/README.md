# Actual ordinary rider V4 evidence review

The repaired normal follower camera worked, and this ordinary run reached its first real pop-up cue. The rider fell during landing before standing, so it did not enter a tube. This is a failed playable-entry result from one ordinary random seed, not an invalid capture or proof that every run fails.

The original completed native run remains unchanged at `/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/`. Its finite owner completed with exit 0, no first failure, diagnostic resources closed, source/build/helpers unchanged, and protected play port 4312 preserved. This review created no browser, port, build, retry, source change, or Git action.

## Actual trajectory

- Normal App Padang/Big seed **6238**, original menu spawn and warmed physical history. Exactly **1,366 × 1/60 s = 22.7666667 s**, sea clock **276.3293560552737 → 299.0960227219391**. The configured 36 s maximum was not reached because the first published fall stopped the run.
- Prone outputs 1–1299; first positive published cue **1299**; its cue is consumed by the single pop-up input at **1300**. Push outputs 1300–1342; landing 1343–1365; fallen **1366**, separation **“lost board”**, zero resets.
- No standing output, connected-air witness, contained residence, entry, or exit. The standing-and-near-band movie trigger was never met, so there is **no movie**. The only actual PNGs are initial and terminal.
- Every step has zero steer/trim/crouch/compress and pocket-reflex false, matching the declared prone/nonstanding control policy. Standing-only gentle steering and deep crouch were never exercised.

The takeoff window independently passes on cue output 1299. `SurfZoneRunner.cue` ORs this window with the rider's own planing cue; the exclusive source of the cue is not published. `AttachedRider` transitions from .72 s push through .48 s landing to standing, recording any support refusal without preventing the transition. This run separated roughly .1 s before that standing transition.

## Camera and proximity

All 1,366 recorded follower certificates and both checkpoint certificates pass: the real public authored camera exactly matches the same-class passive mirror, uses the actual drawn follow target, and leaves the recorded clock/body words unchanged. There is one declared `setRideView` cut after real HUD pause; this does not certify prior smoothing history or unpaused wall-time scheduling. The mirror repeats normal height reads. At terminal, drawing is one worker step behind and the camera correctly still follows the drawn board.

Indexed formed-band proximity started at **222.5054373 m**. First ≤15 m occurred at landing step **1353** (14.8590876 m). Minimum was **13.2304525 m**, landing step 1365; terminal was **13.2642209 m**. Fourteen outputs meet the broad 15 m proximity threshold.

The terminal sidecar independently reproduces the runtime board distance exactly. Its nearest eligible band is front **155**, rows **29/30**, phases **1/0**, formed weights **.2281651/0** and row weights **1/1**. The nearest XZ point is **(-55.5, -198.3430572)** while the board is **(-42.2357791, -198.3430572)**. Thus the terminal proximity is a lateral gap to a partly forming/prethrow boundary. It does not establish a complete overhead cavity, a collision, or an entry line. Seven published body landmarks remain 12.9579–13.6371 m from this broad eligible band at terminal.

Both actual PNGs were viewed directly, independently of root's pinned pixel note. Initial shows a local prone rider and board in the elevated follower view. Terminal shows the local rider beside a steep dark left face with spray/foam; this view does not show a convincing hollow mouth or ridden passage. Two PNGs cannot establish global absence of tubes.

## Decisive next step

Diagnose the first loss of board support during an ordinary cued pop-up. `AttachedRider.finish` can label **“lost board”** either when flight time exceeds .4 s or when posture error exceeds .25 m while flight dominates recent contact limits. Published balance/separation cannot distinguish these paths. Flight time, posture error, contact demand/projection/limits, leg extension, and the relevant water samples were not captured.

Add bounded step/substep observation of that existing worker path, preserving ordinary menu spawn, seed policy, real cue, physical stepping, and first-fall stop. Record phase clocks, contact feasibility/impulses/limits, flight time, posture error, leg extension, board/rider relative velocity, and local water surface/flow. Add actual first-pop-up and landing checkpoint/movie triggers so the failing transition is visible without first requiring standing. Find the first unsupported substep before changing cue or contact constants. After standing works, assess lateral line and mouth access; the terminal band is still over 13 m to the rider's left. Roof/seam retirement correction can continue independently.

`review.json` pins 26 actual evidence/source/helper inputs and records focused metrics, limits, and independently recomputed geometry. `analyze.py` exactly checks NDJSON against all report steps, all artifact pins, selected source hashes, every camera/control certificate, and all 37 sidecar arrays plus raw packets. Re-run it only to reproduce this offline review. No native run or tests are executed by it. Authored NaN sentinel counts are retained; an initially too strict offline decoder and its corrections are preserved in `analyze-first-failed.py` and `analysis-repair.txt`.

This result makes no FPS, full collision, statistical reliability, continuous playback, visual acceptance, or adoption claim.
