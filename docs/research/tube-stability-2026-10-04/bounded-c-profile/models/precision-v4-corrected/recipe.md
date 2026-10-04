# Bounded C precision-v4 implementation repair

Full geometric recipe is unchanged from `/private/tmp/tube-bounded-c-precision-v4-20261004/recipe.md` (preserved hash aaca5b63fdf377d0d24f18a5b0ac01e8ef7415201d93d927de8574a9f2a123e6). Same coefficients,8ULP/64ULP gates,.001envelope budget, ownership, lifecycle, phase/frame/case/precision query grids and40 switch pairs. No tuning.

The original v4 prototype used weighted vector `mix(K,Cfloor,t)` to generate a mathematically constant-X line. At a stored midpoint, multiplying identical x values by two weights can move a half-ULP tie infinitesimally and toggle storedF32 rounding by1ULP. The same form fails exact equal-endpoint identity. The retained original failed receipt is `/private/tmp/tube-bounded-c-precision-v4-20261004/monotonicity-failure.json`.

The corrected implementation is exactly `[K.x, K.y+(Cfloor.y-K.y)*share]`. CommonX is literal and scalarY difference zero gives exactK.y. This is the stated frozen vertical/zero connector, not a new geometry parameter. Original v4 recipe/prototype/results are immutable; this correction is frozen before rerunning the identical original5+1224+3648+376+672 and522 precision queries/40switch pairs. No source port until all required numerical invariants pass. No native/production/Git/ports actions.
