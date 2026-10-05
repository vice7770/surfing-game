V3 source preparation is isolated from completed V2. The concrete rider-driver, control-policy, body-mesh classifier, criteria, loft snapshot helper and diagnostic entry are copied without edits. V2 owner/native schemas, every21-witness acceptance rule, authored interpolation gate, one-attempt limit, normal follower camera and public seed6238 settings stay the same. The following is the only intended production-controller behavior change; it belongs to root/c_formation_trial, not this helper preparation:

```
  // Existing wait-state actual positive-crest catch trigger stays unchanged.
+ // While tube-style positioning, recognize that same current positive crest before positioning finishes.
+ if (this.style === 'tube' && view.ride.phase === 'prone' && view.crestBehind > this.rise) {
+   this.go();
+   return this.next(view, 0);
+ }
```

This is Autopilot's internal existing transition. The helper still only invokes pilot.next and forwards its exact ordinary input; it never invokes go itself, places actors, resets visual interpolation, forces pop-up, or retries. The normal35-degree prone takeoff steer and the existing actual-cue-only pop-up latch remain production responsibilities.

Mechanical helper changes: W becomes `/private/tmp/tube-guided-ordinary-v3-native-20261005`; BUILD_ID becomes `tube-guided-early-crest-20261005`; inputs/report reference the completed V2 owner/report/analysis without copying them; prepare binds a fresh root application build and diagnostic module rather than reusing V1 assets; owner pre/post checks include the fresh root dist pins. README changes describe that future root build sequence and the prior failed physical observation. All resource ceilings remain1800steps/660swall and all protected previews4312–4315 remain untouched.

No helper execution, tests, checks, compilation, freeze, source adoption, asset copy, capture or listener operation was performed during preparation. No successful tube ride is claimed.
