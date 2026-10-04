# Rich render height-only candidate

Prepared source only; production unchanged. The two-path [patch](candidate.patch) replaces the Rich barrel's height-and-slopes lookup with an allocation-free height-only helper. The old public sampler and GLSL are unchanged. [Plan](plan.md) records exact arithmetic, callback bounds, proposed parity and complete drawing-cost gates, and retained-fixture limitations. No candidate code or checks have executed and no saving/FPS result is claimed.
