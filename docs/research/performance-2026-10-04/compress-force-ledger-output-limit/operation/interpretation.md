# First Compress ledger operation — output-bound failure

The one reviewed operation is invalid as retained force evidence. The unchanged compiled driver reached its declared output guard and refused to write a94,521,423-byteJSON payload above the64MiBlimit. Only `report.oversize-summary.json`, empty stdout, stderr and launcher terminal metadata were retained. The full in-memory report was discarded when Node exited; it cannot now support an all-eight parity, completion, force chronology or cause claim.

Actual launcher start2026-10-04T01:26:49.158579Z; terminal01:26:54.783344Z; NodePID40047; exit1; no30shard timeout. The failure summary reports driver elapsed4911.293ms measured before final JSON encoding. This is an observer diagnostic duration, not an FPS or optimization measurement.

The source can serialize both successful and caught-partial results through this guard, so payload size alone does not establish which cases finished or whether every parity assertion passed. The retained five-test pass includes only its separately defined real7m/s two-stepCompress parity fixture, not evidence for the unretained eight-case run.

`diagnostic-terminal.freeze.json` pins the retained failure records and confirms the prepared observer/driver, compiled bundle/readiness and35source authority files remained exact. No correction, retry, extension, force tuning or production change followed the operation. Any compact-schema preparation is a separate unexecuted source-only proposal and must preserve this first failure.
