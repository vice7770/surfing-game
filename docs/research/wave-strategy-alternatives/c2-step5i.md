# C2 step 5i: what whitewater actually reflects (2026-11-15)

Tags: [M] measured here, [C] read in the code, [S] sourced, [R] reasoned, [P] provisional.

Step 5h measured the owner's standing complaint — *"the body of the wave itself is quite thin, in some waves a lot of
it is foam"* — found a cause with no free parameter in it, and **deliberately did not build the fix**, because it
changes how every spot looks. That call has been made. This round builds it, behind `?foamAlbedo=on`, default
unchanged.

**In one line: the foam's albedo is now the sourced one, the broken water's near-white share falls from 83.5 % of the
region to 18.7 % against the photograph's 14.6 %, its within-frame ratio goes 1.310 → 1.102 against the photograph's
0.748, and a third throwaway leg says the remaining gap is not the flat water's to close.**

| | |
| --- | --- |
| **Built** | `?foamAlbedo=on`. The foam colour is levelled in linear light to **0.50**, an active Stage A whitecap, in the **uniform**, so the tank, the roller front, the spilling curl, the swept lip's white and the far ocean take it from one place; and where the tank's Rich foam is drawn its albedo **ages** from 0.50 to **0.18**, thin foam, over the youth channel the drawing already has. Two sourced numbers and no third |
| **Measured** | the same held sea at **t 72 s** of the 2 m pool, four cameras, on against off, plus the owner's photograph through the same script. **`side`, the photograph's own geometry: 1.310 → 1.102** against **0.748**; near-white share **83.5 % → 18.7 %** against **14.6 %**; local relief **2.98 → 4.93** against **5.05** (§3) |
| **The control** | the off leg reproduces step 5h's published broken-section figures **to 0.1 of 255 and to three figures in linear light** — 229.9 / sd 10.0 / 83.5 % and a ratio of 1.310 against 5h's 229.9 / 10.0 / 83.5 % and 1.31 — so the two rounds are looking at the same frame of the same water [M] |
| **A third leg, thrown away after it was read** | the same frame with `waterFoamColor` set to **black** and nothing else changed. It puts the floor — the darkest the broken box can be made by the albedo alone — at a within-frame ratio of **0.518** on `side` and **0.296** on `bore-face`, both **below** the photograph's 0.748 (§4) |
| **Refuted, in step 5h and in my brief** | 5h §5.3's second half reads as though our flat water has no grazing Fresnel sky. **It has one**, by name and by design — `skyReflection.ts`, installed on the tank's own Rich program (§5). And §5.4's "these two together are the whole sign flip" is not what the floor leg says: **item 1 alone has the range to cross the target**; it stops where it stops because the sourced cap stops there |
| **Not built** | 5h §5.4 items 2 and 3, and the ten-second end of the age chain. §10 says what each would take, in order |
| **Worth the owner's ride?** | **Yes, and it is the first thing to ride.** It moves a quarter to a half of every frame (§3.3), and §6 says what will look wrong about it at first glance |

---

## 1. The premise, checked before anything was built

The brief's decisive number is the **within-frame ratio** — the broken water against the flat water *in the same
image* — and its whole claim to authority is that no exposure or grading difference can survive a ratio taken inside
one frame. 5h gives the pair as **0.75** for the photograph and **1.31** for ours, and **does not say in what
encoding it computed them**. Rule 1 of this round's brief exists because 5g was refuted on exactly that.

So the first thing this round did was reproduce them, from scratch, with the recipe written down
(`c2-step5i-runs/within_frame.py`):

> every frame here is sRGB-encoded — the renderer's output transfer is sRGB (`main.ts:262`) [C] and the owner's
> reference is an sRGB webp. Each channel goes through the **sRGB inverse EOTF** to radiance, the pixel's luminance is
> Rec. 709 of the three, and a box's figure is the **mean over its pixels of that luminance** — not the EOTF of the
> mean, which is a different number for any box with spread in it.

| | this round [M] | step 5h published |
| --- | --- | --- |
| the photograph, broken foam / glassy water | **0.748** (n 101 760 / 60 000 px) | 0.75 |
| ours, off leg, broken mass / flat foreground | **1.310** (n 63 800 / 50 000 px) | 1.31 |

**It reproduces to three figures, so 5h's instrument is the right one and its unwritten recipe is the one above.** It
is written down here so no later round has to find it again. One correction, and it is small: `#d8f2e9`'s linear
luminance is **0.83986**, which 5h gave as 0.840 [M].

**One caveat that belongs with every number in this file, and that 5h does not state.** The renderer tone-maps before
the sRGB encode — `NeutralToneMapping`, the Khronos PBR Neutral curve, at `DISPLAY_EXPOSURE` (`main.ts:264`) [C] —
and a photograph carries its camera's own curve. So "linear" here means **display-linear after a compressive tone
curve**, not scene radiance. The ratio is still exposure-free and still the right instrument, which is why 5h's
argument stands; but a change of albedo does **not** move a bright pixel in proportion, and §4 is where that bites.

---

## 2. What was built

### 2.1 The cap, in the uniform

`waterFoamColor` is `#d8f2e9` and `richWaterGlsl.ts` uses it **directly as the diffuse albedo** where foam covers
[C, 5h §5.3]. Its linear luminance is **0.83986** [M]. Against what foam actually reflects [S, Dierssen 2019 field
hyperspectral; Koepke 1984, via the water-physics advisor]: an **active Stage A whitecap ≈ 0.50**, bright thick foam
≈ 0.40, thin foam and residual plume ≈ **0.18**, a single bubble layer ≈ 0.10, 0.03–0.10 after ten seconds, and a
laboratory ceiling of 0.55–0.60.

With the switch on the colour is multiplied in linear light by **0.5953**, so its luminance is **0.50**. Its hue does
not move, and there is a test for that.

**It is applied to the uniform rather than to the one line 5h measured**, because `waterFoamColor` is an albedo in at
least five other places — `RollerFrontMesh` (`diffuseColor.rgb = waterFoamColor * rfCrease`), `SpillingCurlMesh`'s
streaks, `rollerGlsl`'s band albedo, `lipLook`'s swept curl white and `FarFieldOcean`'s whitecaps [C] — and the
roller front, the curl and the swept lip are all **in the broken region 5h measured**. One value; every site.

**0.50 is a cap, not a fit.** It is the published reflectance of the brightest, freshest foam there is, and the
laboratory ceiling sits above it at 0.55–0.60. Nothing here was tuned to a measurement, and §4 says what was
specifically *not* tuned.

### 2.2 The age, in the shader

Where the tank's Rich foam is drawn, the albedo runs from 0.50 to **0.18** — thin foam and residual plume — over the
youth channel the drawing already has:

> `waterCrease *= waterFoamAlbedoScale( vWaterAir, vWaterFoam )`, with the scale `mix( 0.36, 1.0, youth )` and
> `youth` exactly `foamYouth`'s.

It hooks on the **crease**, which is the one term every site that paints the surface white already multiplies in — the
tank's foam, the plume's creased white and the roller band's own `waterFoamColor * waterCrease` — so all of them age
together, while the band's `waterBandAlbedo`, which is a fresh crest, keeps the cap alone. One insertion point, and
it throws rather than drawing nothing if the crease ever moves.

### 2.3 The age the drawing has, and the one it does not

The brief said to use the foam field's age if it has one and to say so if it does not. **It has one in the physics and
not in the drawing**, and this is the honest version:

- `FoamField` carries **two** fields with their own e-folding times — dense whitewater at 3 s decaying into a residual
  lace at 8–20 s by spot (`SurfZoneSimulation.ts:1006–1013`) [C]. That is a real age.
- `SurfZoneSimulation`'s snapshot writes **their sum** into the surface texture (`:2950`) [C]. The drawing never sees
  the split.
- The one age the drawing has is the **plume's void fraction**, which empties as the bubbles rise out in **1–4 s**
  under a bore (`foamFreshness.ts` header) [C], and that is the channel used here.

**So this curve spans fresh to thin on a 1–4 s clock, and the sourced 0.03–0.10 at ten seconds is not drawn.** No
drawn channel has a ten-second clock to carry it, and this round did not invent one. §10 item 3 says what would.

---

## 3. What it does, measured

Both legs are the same held sea at **t 72 s** of the 2 m pool, `--compute=gpu`, the owner's own ride address with
`?wave=library` and without `&lipVeil=on` — which is 5h §5's own frame, the one its broken-section numbers come from.
The two legs differ by `&foamAlbedo=on` and nothing else. Commands in §9.

### 3.1 The headline, on the photograph's own geometry

`side` is "along the crest, 14 m out — the geometry of the owner's own photograph" (5h's stills README), and its
boxes are **5h's own, unchanged**. Display-linear, as §1 defines it:

| `side`, step 5h's boxes | broken mass (n 63 800) | flat foreground (n 50 000) | **ratio** | clean teal face (n 72 200) | **ratio** |
| --- | --- | --- | --- | --- | --- |
| **off** | 0.7975 | 0.6089 | **1.310** | 0.2202 | **3.622** |
| **on** | 0.6627 | 0.6012 | **1.102** | 0.2202 | **3.009** |
| the photograph | 0.5672 (n 101 760) | 0.7582 (n 60 000) | **0.748** | 0.2227 (n 50 000) | **2.547** |

Two references, because the two frames agree about one of them and not the other. **Our clean teal face and the
photograph's agree to 1 %** — 0.2202 against 0.2227 — so the face is the better-controlled reference of the two, and
against it the gap closes from **+42 % over target to +18 %**. Against the flat foreground, which ours reads at
**0.80×** the photograph's (0.6089 / 0.7582), it closes from 1.310 to 1.102 against 0.748.

**The sharpest single number in 5h §5.1 is the near-white share, and it very nearly lands** (sRGB **code values**,
5h's own `foam-relief.py` at tile 8, `c2-step5i-runs/boxes-srgb.txt`):

| the broken region | mean of 255 | sd | **share over 220** | local sd, 8 px tiles |
| --- | --- | --- | --- | --- |
| ours, **off** (n 63 800) | 229.9 | 10.0 | **83.5 %** | 2.98 |
| ours, **on** (n 63 800) | 211.4 | 12.4 | **18.7 %** | 4.93 |
| the photograph (n 101 760) | 194.6 | 26.2 | **14.6 %** | 5.05 |

**Five sixths of the region was already near-white; now under a fifth is, against the photograph's one seventh** [M].
5h's point was that there is no room under the white point for a lump to be lighter than its neighbour; that ceiling
is off, and §3.2 says how much relief actually followed. (The local sd rows here are at `foam-relief.py`'s own
default tile of 8 px; 5h's published rows use 16 and 48, so compare these with each other and not with those.)

### 3.2 Relief, which came for free and only halfway

5h §5.4 item 3 predicted that relief would arrive by itself once the mean came off the white point. **It partly did,
and the two ways of measuring it disagree about how far**, so both are here:

| | off | **on** | the photograph |
| --- | --- | --- | --- |
| local sd over 8 px tiles, sRGB code values | 2.98 | **4.93** | 5.05 |
| contrast inside the region, sd / mean, display-linear | 0.093 | **0.129** | 0.248 |

**The local relief now matches the photograph's; the whole region's contrast is still about half of it** [M, n 63 800
/ 101 760]. The first says the lumps are there at the scale of a few pixels; the second says the region still lacks
the large-scale light and shade the photograph has. Neither is wrong, and nothing here should be reported as "relief
is fixed".

### 3.3 All four cameras, and what the switch moves

Each camera has its own flat-water box, drawn on the **off** leg before the on leg was looked at and used unchanged
for both legs. **Only `side` is comparable with the photograph** — the others' flat boxes are unbroken face water
rather than a glassy foreground, so their ratios are comparable off-against-on and not across cameras.

| camera | broken n | flat n | off | **on** | the switch's footprint | footprint, on / off |
| --- | --- | --- | --- | --- | --- | --- |
| `side` | 63 800 | 50 000 | 1.310 | **1.102** | 232 564 px, **25.2 %** of the frame | **0.844** |
| `front` | 33 750 | 23 400 | 1.861 | **1.682** | 429 392 px, **46.6 %** | **0.896** |
| `above` | 41 400 | 39 600 | 1.616 | **1.316** | 453 855 px, **49.3 %** | **0.870** |
| `bore-face` | 108 000 | 40 000 | 1.358 | **1.021** | 505 127 px, **54.8 %** | **0.817** |

The footprint is simply the pixels the two legs differ on, with no box drawn at all, and it is the honest answer to
"how big a change is this": **the switch moves a quarter to a half of every frame, and darkens what it moves by
10–18 % in display-linear light** [M]. On `bore-face` the broken water comes within 2 % of the flat water
beside it (**1.021**, n 108 000 / 40 000) — as near as any of these four frames gets to the photograph's sign. It is
still above 1: level with the water, not darker than it.

And a control worth having: the **clean teal face is byte-identical between the legs** — 113.0 of 255, sd 31.2, local
sd 2.74 on both (n 72 200) [M]. The switch touches foam and nothing else.

---

## 4. The third leg: how far the albedo can ever go

5h §5.4 says item 1 alone "will leave the broken section too dark against a water that is itself too dark", and ranks
item 2 — the flat water's grazing Fresnel sky — as needed with it: *"these two together are the whole sign flip."*
That is a prediction about range, and it can be measured directly.

A third leg was rendered with `waterFoamColor` set to **black** and nothing else changed, so every term driven by the
foam's albedo is zero and everything else — the sky the surface mirrors, the sun's specular and glitter, the backlit
glow, and the water showing through where the cover is short of 1 — is untouched. It was read and thrown away; the
tree does not carry it.

| `side`, the broken box, n 63 800 | display-linear mean | within-frame ratio |
| --- | --- | --- |
| off | 0.7975 | 1.310 |
| **on** | 0.6627 | **1.102** |
| foam colour black | **0.3044** | **0.518** |
| the photograph | — | 0.748 |

and on `bore-face` (n 108 000) the floor is **0.1650**, a ratio of **0.296**. Every ratio in that column divides a
leg's broken box by **its own leg's** flat water, never another leg's — the flat water moves a little between the
legs too (0.6089 off, 0.6012 on, 0.5882 black), because a little aged lace lies on it.

**The floor is below the photograph's 0.748 on both cameras**, so **item 1 alone has the range to cross the target**
and does not need item 2 to get there. This round stops at 1.102 because **0.50 is where the sourced cap stops**, not
because anything is in the way — and §5.4's "together" is, on this measurement, not right.

**I did not then move the cap to land on 0.748.** That is rule 3 of the brief and it is also the round's own
discipline: 0.50 is a published reflectance, 0.748 is one photograph's ratio under an unknown camera curve, and
tuning the first to hit the second would bury the renderer's tone mapping inside a physical constant. If the owner
wants it darker after a ride, the honest lever is §10 item 2, which replaces the single aged value with a bubble-layer
count, not the cap.

**What the floor leg does not say.** The arithmetic `off = D + S`, `black = S` looks like a split of the pixel into
the foam's diffuse term and everything else, and it is not a clean one: the renderer tone-maps (§1), so display-linear
values are not additive in scene radiance. It would make the foam's own share **62 %** of the off leg on `side` and
**79 %** on `bore-face`, which is the right order and should not be quoted to two figures. **The floor itself is a
measured leg and stands whatever the curve does**, because it is a rendered frame and not an inference.

---

## 5. What I am refuting in step 5h, with the code

**5h §5.3, second half.** It says: *"our flat water is too dark in a grazing view … a renderer only gets it right if
the flat water carries its grazing Fresnel sky."* Read as a statement about our code, **it is wrong, and the module
is there by name**:

`src/scene/water/skyReflection.ts` is the Rich water's mirror of the sky (the horizon plan, item 3), installed on the
**tank's** own Rich program by `withRichHorizon(shader)` (`WaterSurface.ts:434`) [C]. It carries the grazing
behaviour explicitly — the mirror's normal tilting toward the viewer at grazing angles, reflections below the horizon
folded back up, and **Schlick's Fresnel from a normal blended 45 % toward up, used in place of three's split-sum DFG
precisely so that "far water at grazing stays as reflective as a real sea"** [C, the module's own header].

So the flat water's shortfall — **0.6089 against the photograph's 0.7582, 0.80×** [M, n 50 000 / 60 000], which
reproduces 5h's 0.77× — is not a missing term. The nearest suspect in the code is `RICH_WATER.reflection = 0.5`,
which scales the mirrored sky to half (`RICH_REFLECTION`: `radiance *= waterReflection`) [C], and the pool's own
bright shallow bed is another. **I did not test either**, and neither is this round's change.

**This matters beyond the wording**, because §5.4 ranked a rebuild of the flat water's reflection as the second half
of the fix, and §4 shows the fix did not need it.

---

## 6. What the owner will see, and what to compare

**It will look dirty at first glance. That reaction is correct and it is the point.** Real whitewater is not white,
and in a side-on view it is the darker thing in the frame.

Looking at `c2-step5i-stills/foam-on-side.jpg` beside `foam-off-side.jpg`:

- the broken mass right of the curl is now a **grey-green**, not a white sheet. Its hue is the same `#d8f2e9` it
  always was — only its level moved — but at 0.18 that hue reads as a dull tint rather than as white;
- **the wave's body reads thicker against it**, which is the owner's own complaint turned round;
- the **aged lace far behind the break is the biggest change and the likeliest objection**: it is the oldest foam in
  the frame, so it takes the full 0.18, and over the pool's bright bed it can read as a sandy or dirty stain. If
  that is what looks wrong, the number to move is the **aged end**, not the cap, and §10 item 2 is the principled way
  to move it;
- the lace's network is **visible** now, where before it was white on white.

**Judge it by foam against water inside one picture, never by the foam alone.** The question is not "is the foam the
right brightness" — that depends on the exposure, which is unknown — but "is the broken water darker or brighter than
the flat water beside it, and by how much". In the owner's own photograph it is **darker**.

---

## 7. What I will not claim

- **That this is the photograph.** On `side` it is 1.102 against 0.748, and 3.009 against 2.547 on the better-matched
  reference. As a share of the gap closed that is **37 %** on the flat-water ratio, **57 %** on the face-referenced
  one and **94 %** on the near-white share — three numbers that do not agree, and the smallest of them is the one
  the brief named as the judge.
- **That the remaining gap is the flat water's.** §5 names the suspect and says plainly that it was not tested.
- **That the foam's own share of the pixel is 62 %.** §4 says why that arithmetic is not radiometric.
- **That the age is ten seconds, or that it is an age at all in the physics' sense.** It is the plume's void
  fraction, a 1–4 s clock, and §2.3 says what it is not.
- **That `foamYouth`'s own brackets are sourced.** `YOUTH_AIR` and `YOUTH_COVER` come from `foamFreshness.ts` (G9,
  web-ocean item 7) and are reused **unchanged**; this round added no parameter, and it also did not audit theirs.
- **That 0.50 and 0.18 are measurements of our foam.** They are published reflectances of real whitewater, used as a
  cap and as an aged end. Our foam is not a measured population.
- **That relief is fixed.** §3.2 gives two measures that disagree, and the larger-scale one is still at half.
- **Anything about the other spots, the Classic look, the worker path, or the owner's machine.** Everything here is
  the 2 m pool Barrel, Rich, midday, in-page, on this machine. The cap reaches the far ocean and every mesh sharing
  the uniform, which is a change at every spot, and **none of those frames were measured**.
- **Anything about cost.** The Canyon legs (§8) bound the simulation's cost at zero, because nothing in the
  simulation changed. The fragment's extra work — two `smoothstep`s and a `mix` — was **not** timed.
- **Anything about motion.** Every number here is one held frame per camera, and the aged lace's look as it drifts
  is exactly the kind of thing a still cannot show.
- **That the owner will like it.**

---

## 8. Seatbelts

| | |
| --- | --- |
| `npx tsc --noEmit -p .` and `npx tsc --noEmit -p server/tsconfig.json` | **exit 0 each**, read on their own line (`c2-step5i-runs/tsc.txt`) |
| the suites | **353 of 353** over 13 files (`c2-step5i-runs/suite.txt`): `SprayCloud.test.ts`, `PlungingLip.test.ts` and `PhysicalMode.test.ts` as the brief asks, plus everything that covers the water shading this touches — `waterLooks.test.ts` (which holds the **shader snapshots**, unchanged), `water/foamLook`, `water/foamFreshness`, `water/rollerLook`, `water/skyReflection`, `water/specular`, `RollerFrontMesh`, `barrel/brokenCrest`, `barrel/SweptBarrelMesh`, and the new `water/foamAlbedo.test.ts` (13 tests) |
| **the default, byte for byte** | four ways. (1) `foamAlbedo.test.ts` compiles the tank's Rich program with the switch off, on, and off again and asserts the first and third are **`toEqual`** and that the vertex shader never moves at all. (2) The same file asserts the uniform's luminance is 0.83986 with the switch off, in the tank **and** in the far ocean. (3) `foamAlbedoProgramKey()` is `''` with the switch off, so the program cache key is unchanged and today's program is reused. (4) `waterLooks.test.ts`'s shader snapshots pass **unmodified** — `git status` lists no snapshot file |
| **the Canyon byte check, both protocols, with leg C** | §8.1 |
| **the deletions column** | §8.2 |
| `src/wave/SurfZoneSimulation.test.ts` | **not run, and closed by reading**, as `c2-step5g.md` §7.3 and `c2-step5h.md` §6.1 do. §8.3 |

### 8.1 The Canyon byte check

Run from `scripts/m1-cpu-bench.ts`, bundled with rolldown, three legs, in `c2-step5i-runs/canyon-bytes.txt`. Leg C
sets `location.search` to `?foamAlbedo=on` through a two-line wrapper, and the module **is** in the bundle — the
bundle contains `src/scene/water/foamAlbedo.ts` and reads `devParam("foamAlbedo")` [M] — so the leg is a real test of
the switch and not a test of an absent file.

**This round expects something stronger than 5h's, and got it.** 5h's `?lipVeil=on` moved the *snapshot* hash,
because the veil writes drawn particles into the snapshot; the state hash held, and that was the pass. **This change
writes nothing into the snapshot at all** — it is a fragment shader and one uniform's value, entirely downstream of
it — so **both** hashes had to be main's, and a moved snapshot hash would have been a bug rather than a pass.

| | snapshots | state | |
| --- | --- | --- | --- |
| main's published figures, unchanged 5f → 5h | `ea3d57a4d49f4b48` | `a1a2555739210f96` | fresh spin-up |
| **leg A**, switch off, fresh spin-up | **`ea3d57a4d49f4b48`** | **`a1a2555739210f96`** | main's, byte for byte |
| main's published figures | `a8ac71b70eac2add` | `6319ed883e54b32e` | cache read |
| **leg D**, switch off, cache read | **`a8ac71b70eac2add`** | **`6319ed883e54b32e`** | main's, byte for byte |
| **leg C**, `?foamAlbedo=on`, cache read | **`a8ac71b70eac2add`** | **`6319ed883e54b32e`** | **both unmoved** |

[M, 3 600 steps each]. The switch touches no water, no foam, no air, no snapshot and nothing a rider feels.

### 8.2 The deletions column, and main moving under the branch

`origin/main` moved from `f7f08766` to **`9b3bb346`** while this round was running (steps 3.2w, the surfer track).
Checked rather than assumed: `git diff --name-only f7f08766 origin/main -- src/ scripts/ server/` is **empty** — all
three commits are under `docs/` [M] — which is why §8.1's legs did not have to be re-run after the rebase.

`git diff --stat origin/main HEAD` reads **24 files changed, 1 128 insertions, 5 deletions**, and
`c2-step5i-runs/deletions.txt` prints **all five deleted lines in full** so the number is not taken on trust: the two
`waterFoamColor: { value: new Color('#d8f2e9') }` uniform literals, `WaterSurface`'s fragment-pars line and its
cache-key line, and the one line of the reference README this round replaced. `git diff --name-only origin/main HEAD
-- src/` lists **four files**, all under `src/scene/`.

### 8.3 `SurfZoneSimulation.test.ts`, closed by reading

The file declares 644.5 minutes of per-test timeout budget with one test allowed four hours alone, so it cannot gate
a merge; the brief withdraws it and asks for the reading instead.

**What this change can reach.** It touches four files under `src/`: `scene/water/foamAlbedo.ts` (new),
`scene/water/foamAlbedo.test.ts` (new), `scene/WaterSurface.ts` and `scene/FarFieldOcean.ts`. **Every one of them is
under `src/scene/`** — the drawing — and inside them the change is (1) a uniform's `Color` value, (2) a GLSL function
appended to the Rich fragment's pars, (3) one extra line in the Rich fragment, (4) a program-cache-key part, and (5)
a listener that re-levels the uniform. No solver field, no foam field, no aeration field, no snapshot, no
`SurfZoneConfig` key, and nothing in `src/wave/` at all.

**Every assertion in that file that touches any of it.** Grepped for `waterFoamColor`, `foamAlbedo`,
`FOAM_REFLECTANCE`, `albedo`, `WaterSurface`, `FarFieldOcean`, `richWaterGlsl` and `scene/` over its 2 301 lines:
**no hits of any kind** [M]. The file never imports anything under `src/scene/` and never reads a drawn colour. The
reason is structural rather than lucky — it tests the simulation, and all of this is downstream of the simulation in
modules it does not import. §8.1's byte check is the harder version of the same claim, taken from the bytes.

---

## 9. Files, and how to run them again

- **The switch: `?foamAlbedo=on`.** A new parameter, and the brief asked for an existing one to be extended if one
  fitted. None does: `?foamLook` is a part-**selector** whose every part is on by default (`off`, or `lace`/`dense`/
  `light` to keep exactly one), so a part that defaults **off** cannot be said in it, and `?foamFresh` is the
  freshness pattern's own switch. `window.waterFoamAlbedo(true)` switches it in a page.
- The constants, their sources and their provisional marks: `src/scene/water/foamAlbedo.ts`.
- The stills, both legs at the four cameras step 5h used: `c2-step5i-stills/`, and its README says what to look at.
- The measurements, in `c2-step5i-runs/`: `within_frame.py` (the headline — the within-frame ratio, with the encoding
  written into its header), `floor.py` (the black-foam leg, §4), `within-frame.txt`, `floor.txt`,
  `boxes-srgb.txt` (step 5h's own box script on this round's three legs), `canyon-bytes.txt`, `suite.txt`, `tsc.txt`,
  `deletions.txt`, and `png.py`, step 5d's pure-Python PNG reader that the scripts use.
- Both legs, from the repository's root — step 5h's command with `&lipVeil=on` dropped, because §5's broken-section
  frame is the veil-off one:
  ```
  node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5361 --out=<dir> --compute=gpu \
    --spot="pool&waves=barrel&swell=big&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library" \
    --shots='bore-face:rich:midday;view@27.4,2.8,-150.6@40.8,1.5,-153.1:rich:midday;view@44.7,3.5,-134.6@40.8,1.5,-153.1:rich:midday;view@39.0,7.0,-133.0@40.8,1.5,-153.1:rich:midday' \
    --advance=40 --first=skip
  ```
  The on leg is the same address with `&foamAlbedo=on`. The four shots come out as `bore-face`, then the three
  `view@…` in order, which are **`side`, `front`, `above`** — the naming step 5h used and did not write down.
  `ref.png` is the owner's webp through `sips -s format png`; it is already 1280 × 720 and is not resized.
- Not run: `SurfZoneSimulation.test.ts` (§8.3); rider sessions, catch reports and autopilot rides (the brief's rule);
  Classic; the other spots; the worker path; any timing of the fragment; and everything in §10.

---

## 10. Next, in order

1. **The owner's ride.** `?foamAlbedo=on` at the pool and at Canyon B, judged by §6 — foam against water inside one
   picture. The aged lace behind the break is the thing most likely to be wrong, and the only way to find out is a
   ride.
2. **Drive the fresh end from the bubble layers** (5h §5.4 item 3), which is also the honest way to move the aged end
   if the ride says it is too dark. Reflectance is set by the number of bubble layers along the path,
   N ≈ α·h/d_bubble, through R(N) ≈ 0.55(1 − e^(−0.2N)) — 0.10 at one layer, 0.47 at ten [S] — not by a single
   constant. `AerationField` already carries the void fraction **and** the plume depth, so N is arithmetic on fields
   that exist, and it would replace this round's one aged value with a measured depth.
3. **The ten-second clock, if it is wanted.** `FoamField` carries `dense` and `residual` separately with their own
   e-folding times and the snapshot sums them (§2.3). Splitting the drawn channel is the only honest route to the
   sourced 0.03–0.10 end, and it costs a channel in the surface texture and a pass through the worker path. Worth
   pricing only if the ride says the oldest foam still reads too bright.
4. **The flat water** (5h §5.4 item 2), now with §5 under it rather than a missing-term diagnosis: test whether
   `RICH_WATER.reflection = 0.5` is the 0.80×, on the one camera where the photograph gives a comparable box. Cheap,
   and it is a look decision the owner owns.
5. **The large-scale contrast** (§3.2): the local relief matches the photograph and the region's overall light and
   shade does not. Nothing here was aimed at it and it is now the largest remaining difference in that region.
6. **The swept veil band** (5h §8 item 2), unchanged and still right.
