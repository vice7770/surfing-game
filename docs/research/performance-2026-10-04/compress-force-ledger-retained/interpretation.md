# Retained Compress force ledger — unchanged physics

The one reviewed compact operation is valid as an observation: all 8 cases completed 108 observed and 108 separate unwrapped-control outer steps; 864 full own-data/typed-byte state comparisons passed, covering 27,004 observed hull substeps. The actual encoded output passed JSON decoding plus `isDeepStrictEqual` against the complete in-memory report. This establishes observer parity for this exact fixture; it does not validate or change the physical model.

Node PID 44541 started 2026-10-04T01:42:31.440179Z and exited 0 at 01:42:41.942310Z, without the 30 s hard timeout. The tuple payload is 64,258,882 bytes, below the unchanged 67,108,864-byte limit; its gzip is 19,064,261 bytes. Raw SHA256 `e6aafecbe0111cc8af9c024d9199c852cf425a5a683743b8646e4f84a67a0422`; gzip SHA256 `aaf554d89a123805abddbcc96d4cd9daefae17bcf3538bfbf179e30c71ea4f1e`. The recorded 4937.75125 ms driver value precedes final encoding/round-trip/gzip; neither it nor wall duration is FPS or optimization evidence. The first output-limit failure remains historical and invalid.

## Diagnostic phase collision and retained yaw

Raw outer rows were constructed `{phase, ...posture(...)}`. The posture's rider phase `standing` overwrote the maneuver phase, so the raw `outer.filter(x.phase === 'compress')` selected no rates and recorded empty/zero yaw summaries. This diagnostic-only bug was already in the first driver. Original source, bundle, raw report and stdout remain unchanged. It does not affect input chronology, state parity, substep maneuver phases or events.

Root authorized pure postprocessing from the retained exact step indexes. `postprocess.py` uses outer `step >= 48`, exactly 60 world yaw-rate samples, and the original turning-point deadband 0.2 rad/s/sign exclusion 0.05 rad/s. It checks all 108 step indexes per case, actual counts and input SHA, and crosschecks accumulated substep work differences against the recorded public cumulative work differences. `derived.json` retains witness states, forces, projections and turning points. No source repair, simulation, counterfactual or rerun occurred.

| Entry speed | Held yaw swing | Compress yaw swing | Compress final attachment |
| --- | ---: | ---: | --- |
| 7 m/s | 1.0976 rad/s | 1.2075 rad/s | Detached |
| 8 m/s | 0.9772 rad/s | 1.8369 rad/s | Detached |
| 10 m/s | 0.6859 rad/s | 1.6017 rad/s | Attached |
| 11 m/s | 0 rad/s | 1.5010 rad/s | Attached |

All rates keep their sign; rate swing is still present. The corrected derived metrics agree with the prior preserved diagnosis and do not resolve the meaningful wobble. The held 11 m/s zero remains a monotonic-trace metric, not a physical tolerance.

## First supported contact chronology

Times below are actual substep times after the Compress change. The original outer-step observations round first detach to 0.8667/0.7500 s; these are not contradictory clocks.

| Entry speed | First infeasible contact / tip | Body / reference bank then | First 70° cap | First separation |
| --- | ---: | ---: | ---: | ---: |
| 7 m/s | 0.12396 s | 27.73° / 42.02° | 0.60781 s | 0.85417 s |
| 8 m/s | 0.08646 s | 31.40° / 49.75° | 0.52083 s | 0.74635 s |
| 10 m/s | 0.12188 s | 33.10° / 50.00° | Unobserved | Unobserved |
| 11 m/s | 0.00990 s | 28.22° / 49.99° | Unobserved | Unobserved |

At every first infeasible contact the actual free desired CoP exceeds the +x support edge 0.13 m, and the projection clamps onto that edge. Desired x is 0.130683/0.130210/0.131529/0.1300148 m at 7/8/10/11 m/s. The actual projected normal impulses are 0.264574/0.246978/0.282009/0.426644 N·s against a 1.491938 N·s normal cap. Projected tangential impulses are 0.088407/0.082761/0.079678/0.057809 N·s against friction caps 0.238117/0.222280/0.253808/0.383979 N·s. These first failures are support-tip constraints, with room under both friction and load caps. They occur while the body still lags its reference, before later bank runaway in the low-speed cases.

This identifies the first coupled-to-projected contact transition to examine, not a proven cause of the later fall/wobble. The rail-edge excess is initially small, and the model's strict feasibility branch changes the solve from coupled 8×8 to projected-contact 6×6. The retained observations do not isolate that branch, or the pull/leg/ankle/swing contribution, from the rest of the unchanged model.

## Assistance and signed work

The first Compress substep forms pull forces of 300.605/412.783/426.607/426.607 N and carry forces of 123.906/148.741/151.744/150.774 N at 7/8/10/11 m/s. Force formation sees leg rest exactly 0; the following leg controller reaches only −0.0000016276 m in that first 1/1920 s substep. Thus full raw-input assistance starts before achieved rest depth. This records the existing chronological mismatch without repeating or adopting the prior achieved-depth candidate.

| Entry speed | Recorded turn-pull work over 1 s | Recorded carry work over 1 s | Lean-out work |
| --- | ---: | ---: | ---: |
| 7 m/s | −2.096 J | +1597.115 J | 0 J |
| 8 m/s | +11.946 J | +1868.329 J | 0 J |
| 10 m/s | −158.561 J | +2192.721 J | 0 J |
| 11 m/s | −135.883 J | +2426.156 J | 0 J |

Held cases have zero assistance work. Values sum original recorded signed ledger differences; after low-speed separation the attached rider no longer receives its update, so these totals follow the actual original integration. At the first tip, turn-pull instantaneous power on the body is −3.804/+68.344/−4.453/+210.323 W; its power along board path is numerically zero. Carry is consistently positive along the path. A transverse pull can alter momentum and contact demand while doing little or negative net work; these measurements do not support a blanket assertion that pull work injects excessive total kinetic energy. Carry supplies appreciable intentional model energy, but this observation does not prove it causes the failures. The stored full ledgers and force/RHS witnesses permit narrower later questions.

## Limits and next boundary

No force was removed, scaled or retuned. No clearance, support, friction, load, depth, meaningful test assertion or rider input changed. Original upright rider kinetic reporting excludes rotor/elastic/actuation terms; `ΔreportedK − ΣbookedWork` is not a closed total-energy proof. Correlation/first threshold crossing is not a causal counterfactual. The initial 10° bank-excess marker is only an observation label.

The useful new boundary is the actual first rail-edge contact projection and force/controller state preceding it, plus signed assistance work. Determining why that transition evolves into bank runaway or yaw swing requires a separately reviewed accounting or controlled causal experiment. No further operation, physics adoption, FPS, GPU/browser, tube-contact or tube-clearance claim is made here.
