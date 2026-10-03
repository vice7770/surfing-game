# Inherited rider tests and Compress behavior

Read-only diagnosis, 2026-10-03. Rider production and tests remain unchanged from stable FPS commit `eea68720f`. These findings do not establish a performance or tube-contact regression.

The agreed [movement specification](../../superpowers/specs/2026-09-30-movement-flow-wave-pool.md) explicitly replaces the previous Compress depth and forward weight: Crouch uses about two thirds of the **depth**, Compress is deeper, and W/S controls weight in every stance. Thus three inherited `AttachedRider.test.ts` failures encode obsolete contracts: the Crouch standing-height ratio at line763, equal Crouch/Compress height at line789, and automatically forward CoP at line810. Current `CROUCH_SHARE=0.65` and 0.3m Compress depth yield 0.195m Crouch depth; the reported 0.7726 height ratio and 0.5514m versus0.6531m Compress/Crouch heights are consistent with the new ladder. A transient1.45cm backward CoP change alone is not a violated new requirement. The current semantic checks are `stanceLadder.test.ts`. The movement implementation plan explicitly left the slow legacy suite unedited, explaining the retained assertions. Expected-failure bottom-turn tests that now pass are also consistent with the deliberately added sharper turn/carry behavior.

The mid-turn instability is separate and meaningful. The exact flat-water fixture settles0.3s, steers0.5s, then applies Compress for1s. Current7/8m/s cases detach for balance0.867/0.750s after Compress: body bank reaches70° while its reference falls to15.9°/22.5°, with speed3.22/3.64m/s. The assist in `AttachedRider.ts:1588` immediately uses raw Compress input while `prepareLeg:1639` progresses the leg state. At11m/s the first step has only0.000859m of leg-rest shortening yet about427N of turn pull. Rider-only isolation retained real hull/contact physics: depth alone stays attached, and removing the reaching hand or carry does not prevent the low-speed falls, while disabling only the turn pull does.

| Exact legacy yaw-swing metric, rad/s | 7m/s | 8m/s | 10m/s | 11m/s |
| --- | --- | --- | --- | --- |
| Held, no Compress | 1.098 | 0.977 | 0.686 | 0.000 |
| Current Compress | 1.207, detached | 1.837, detached | 1.602 | 1.501 |
| Assist scaled by achieved leg-rest depth | 1.540, attached | 1.474, attached | 1.604 | 1.197 |

The11m/s relative criterion is zero because its held trace is monotonic; it cannot be interpreted as a physical tolerance for a stronger changing turn. The separate0.87rad/s absolute pin remains exceeded and is an unresolved concern; it was not weakened.

An untuned candidate confines effective Compress in `compressAssist` to `min(clampedInput, clamp(-leg.rest / CROUCH_DEPTH))`, retaining raw input in the leg controller. It prevents7/8m/s detaches and preserves the two measured sharp bottom turns:90° at1.067s, keeping0.893/0.876 of entry speed (current1.017/1.033s and0.909/0.900). It does not solve10/11m/s wobble. Sharpness relative to Crouch, analog transitions, releases, rail changes, rebounds and pumping were not established by this narrow probe. A stronger actual-bank/depth candidate reduced wobble but turned only60–61° at1s and missed90° by1.2s, so it is rejected. **No production candidate was adopted.** Do not change crouch constants, force forward weight, loosen contact limits, or weaken tests to obtain green results.

Meaningful next checks are short trajectory tests with finite state and attachment throughout the1s mid-turn window, preserving support/friction limits and preventing bank runaway; `stanceLadder.test.ts` and `compressTurn.test.ts`; then relevant `projection`, `projectionLean`, `leanOut` and pumping checks. Record bank versus reference, CoP/load/contact limits, yaw turning points, speed and assistance work throughout. For tube fit, assess world head/torso/hand clearance rather than a leg-height proxy. Any physics change affects deterministic replay and needs matching builds between peers.

The bounded read-only probes totaled about9.3s of CPU work, with no water solver, browser, constant tuning or long suite. They reuse the existing exact1/60s fixtures. Detailed diagnosis and per-step data are in `/private/tmp/attached-rider-diagnosis.md`, `/private/tmp/attached-midturn-probe.json`, `attached-midturn-isolation.json`, `attached-midturn-posture.json`, `attached-bottomturn-candidate.json`, and `attached-bottomturn-depth.json`.

Reproduce the preserved scratch probes from the repository root (these paths are local research artifacts):

```sh
./node_modules/.bin/rolldown /private/tmp/attached-midturn-probe.ts -o /private/tmp/attached-midturn-probe.mjs --format esm --platform node
node /private/tmp/attached-midturn-probe.mjs
./node_modules/.bin/rolldown /private/tmp/attached-bottomturn-depth.ts -o /private/tmp/attached-bottomturn-depth.mjs --format esm --platform node
node /private/tmp/attached-bottomturn-depth.mjs
```

No full legacy rider-suite pass is claimed. Its obsolete, meaningful and expected-failure cases must be reported separately.
