## Builds printed back
- s1 A: cueLater on, (plantFloor, plantSpeed) [(6, None)], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s1 B: cueLater on, (plantFloor, plantSpeed) [(None, 'taper')], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s1 R: cueLater on, (plantFloor, plantSpeed) [(None, None)], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s1 Y: cueLater on, (plantFloor, plantSpeed) [(None, 'taper6')], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s2 A: cueLater on, (plantFloor, plantSpeed) [(6, None)], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s2 B: cueLater on, (plantFloor, plantSpeed) [(None, 'taper')], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s2 R: cueLater on, (plantFloor, plantSpeed) [(None, None)], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s2 Y: cueLater on, (plantFloor, plantSpeed) [(None, 'taper6')], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s3 A: cueLater on, (plantFloor, plantSpeed) [(6, None)], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s3 B: cueLater on, (plantFloor, plantSpeed) [(None, 'taper')], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s3 R: cueLater on, (plantFloor, plantSpeed) [(None, None)], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK
- s3 Y: cueLater on, (plantFloor, plantSpeed) [(None, 'taper6')], scripts ['cue', 'cueC', 'cueL', 'cueR', 'cueCL', 'cueCR'], standHold 5, lat True x35 True ledger True -> OK

## Reproduction (a): cue/cueC take-off rows over the first 3 s
- s1 A vs o-s1-on-pf6.jsonl.gz: riders 24 same / 0 differ; frame rows 3996 identical / 0 differ (every common field)
- s1 B vs o-s1-on-tp.jsonl.gz: riders 24 same / 0 differ; frame rows 0 identical / 0 differ (every common field)
- s1 R vs o-s1-on-base.jsonl.gz: riders 24 same / 0 differ; frame rows 3972 identical / 0 differ (every common field)
- s2 A vs o-s2-on-pf6.jsonl.gz: riders 22 same / 0 differ; frame rows 3401 identical / 0 differ (every common field)
- s2 B vs o-s2-on-tp.jsonl.gz: riders 22 same / 0 differ; frame rows 0 identical / 0 differ (every common field)
- s2 R vs o-s2-on-base.jsonl.gz: riders 22 same / 0 differ; frame rows 3216 identical / 0 differ (every common field)
- s3 A vs o-s3-on-pf6.jsonl.gz: riders 24 same / 0 differ; frame rows 4497 identical / 0 differ (every common field)
- s3 B vs o-s3-on-tp.jsonl.gz: riders 24 same / 0 differ; frame rows 0 identical / 0 differ (every common field)
- s3 R vs o-s3-on-base.jsonl.gz: riders 24 same / 0 differ; frame rows 4244 identical / 0 differ (every common field)

## Reproduction (b): cueLater off, seed 2, against 3.5o's population (shipped, steer only)
