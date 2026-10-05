# V2 delta against sealed failed identity-core comparison

- Repoint WORK in run.py, prepare.py, native.mjs and measure.py to the fresh V2 directory; external immutable app/baseline/authority references remain unchanged.
- Add caller-only OwnedReadExpired for completed owned-read duration or age above the unchanged 2s limit, before pure observation and without accepted-state refresh.
- Catch only subprocess.TimeoutExpired and OwnedReadExpired on periodic/required paths. Genuine AnchorRejected remains fatal. Three attempts, poll interval, finite deadlines, same process/server and signal freshness are unchanged.
- Retain complete timing/live/read-count evidence with capped PIDs and notes. No fabricated successful identity or refreshed state is recorded for expiry.
- Reset pending owner/integration review/check flags; historical parent integration passes are explicitly prior evidence, not approval of this new recipe.
- Preserve exact pure helper and geometry observer; native/measurement differences are WORK substitutions only. No source coefficient, mask, camera, epoch, control, step, outcome or acceptance change.
- Add immutable lineage/copy pins and the new patch/provenance to future helper sealing. No preparation/build/source/assets/output/runtime has been created here.

All original parent bytes remain unchanged; its failed owner/report and actual root 690-pin closure are retained separately. Root owns all future review and execution.
