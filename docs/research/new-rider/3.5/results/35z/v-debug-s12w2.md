# 3.5z: the `cueCTv` release on s12w2 (debug rerun)

`MODE=organic SEED=12 PERIODS=3 ONLY_WAVE=2 STAND_HOLD=1.5 SCRIPTS=cueCT,cueCTv`, the `cueCTv` bundle with one `console.error` added at the release check (scratch copy, not committed).

The release check, before the step at t = 9.15 s (tS 0.0167):

    {"dbg": "check", "time": 9.150000000000034, "since": 0.01666666666666572, "v": 4.670816775734046, "ph": "standing", "px": -122.11788520678243, "py": 0.710958362814206, "pz": -114.50754343898039, "vx": 0.3266803152178944, "vz": 6.273611243419518, "fx": -0.017242682679174292, "fz": 1.6154735979654806, "out": false}

The frame rows on either side (after their steps):

- t 9.1333, tS 0: vG 6.282, vW 3.039, trim 0
- t 9.15, tS 0.0167: vG 6.268, vW 2.961, trim 0
- t 9.1667, tS 0.0333: vG 6.251, vW 2.903, trim 0
- t 9.1833, tS 0.05: vG 6.233, vW 2.868, trim 0
