# Ruling 15: `?poolSize=ref` on the 311 m window, after its measurement (2026-11-11)

Tags: [M] builder's probe (step2/), [C] code at 344e84fa, [KB], [R] reasoned, [U] recalled, [P] provisional. No run made.

## 1. The cause
The builder's reading of the throttle is right, but it is a fault of the PROBE'S path, not of the game's lip.
- **The gate is the onset clock first, the throw clock second [C].** `markBreakingOnsets` keeps one outermost breaking
  cell per column and asks `newBreaker` for 0.7 Tp since `lastOnset[column]` (`SurfZoneSimulation.ts:2279`, `:2331`).
  A beach onset sets `lastOnset` and `lastThrow` (`:2280`, `:2386`); a reef crest reaching that column inside 7.35 s is
  then no onset at all: no meter sample, no peel mark, no `throwLip`. `throwLip`'s own test (`:2375`) is a second lock
  behind it. Freeing `lastThrow` alone would change nothing.
- **In the game the pool's Barrel never reaches that code [C].** With the profile library loaded the sea has a swept
  crash and `throwLip` returns on its first line (`:2369-2372`; `CrashCounts.onsets`: "the solver's own lip throws none
  at a swept spot"). The lip is thrown by `SweptCrash` from the breaking front's points and clocks (`advanceFront`,
  `:2060-2095`), and the front takes crests on the reef only (`poolStraightFrontAt`, `barrelSpots.ts:328, 357`;
  `POOL_FRONT_REACH` s 20-100, 30 m behind). Neither clock gates it. The probe builds the sea WITHOUT the library, so it
  runs the fallback ballistic lip: reef jets by the fits, plus 270 beach jets in the window (5393 jets in the run) that
  the game never throws [M]. Bar D (55.6 %) measures water the player does not get; so does every reading those jets
  feed: the white line past u 60, the swash speed, part of the current.
- The onset clock's real cost in the game [C]: the surf meter and peel readout lose reef waves where the beach came first.

## 2. Answers
1. **Throttle.** Confirmed as above [C]. One break per column per 0.7 Tp is right for one break line, wrong for two: the
   unit is the crest, and one crest cannot be in two places 141-162 m apart [M] inside 7.35 s (19 m/s; crests here run
   4.3-7.0 m/s [R]). The rule dates from the first lip (24f7a210) and guards (i) a crest whose breaking cell flickers and
   re-starts over 5 m seaward throwing twice (double mass and momentum out of one crest), (ii) swash bores read as waves
   (the 0.4 h_b test). The Canyon already split its ONSET clock by place (`reefOnsets.lastOnReef`, `:1434`, `:2264-2281`),
   not its throw clock. The opt-in change is step 4 below.
2. **The beach throw.** By the game's own rule it plunges: 1:8 beach, H 1.82 m in 1.44 m, 10.5 s gives
   xi_b = 0.125 / sqrt(1.82 / 172) = 1.2, in Battjes' plunging band 0.4-2.0 [R, KB]. Do not make it spill by hand. But in
   the game no jet is thrown there (section 1): the inside line is Kennedy whitewater only. A gentler or absorbing
   beach, as real pools have [U], is the owner's call 2. Ranked below all of section 3.
3. **Bar A, 2.13 m: accept as scatter.** 280 m fed 0.966 of the copy's amplitude and read 2.00, so 311 m should read
   2.07 [R]; 12 waves over 1.91-2.33 put the median within about 0.05 m [R]. Platform 2.01 / 2.06 / 1.97 m [M]. Change
   nothing; re-read on 20 waves.
4. **Bar B.** The white line is read from breaking strength, not throws [C], so it is not the throttle directly; but the
   probe's water past u 60 carries the wrong jets, so the halves (8.9 / 5.1) are not evidence yet. The line's end is NOT
   a loss: today's ends at u 151, ref 311 at u 148; 280 m's u 181 came with the turned sea [M]. My stretch was too long
   (today: 5 readings of 21 to u 175). Restated below.
5. **Bar F passes, at the limit** (8.01 against 8.02, no margin). The 8.12 m/s is swash 0.44 m deep on the 1:8 beach,
   207 m from the reef, where the probe threw beach jets (78 on u 10-20) [M]; a run-up tip near 2 sqrt(g H) = 8.4 m/s is
   ordinary [U]. F guards the reef's thin water: report the swash apart.
7. **311 m is better than 280 m. Do not fall back.** Even platform, the copy's direction and feed, all 12 meter waves at
   the reef, a line as long as today's [M]. Its misses: a bar read on the wrong path (D), one I set too long (B), scatter (A).

## 3. First choice (answer 6): read the game's own lip before changing any rule
| Rank | Step | Numbers | Decided by |
|---|---|---|---|
| 1 | Probe only: the sea WITH the profile library (third constructor value, as `SurfZoneRunner.ts:448`); today and ref 311, 300 s | `sim.crash.counts` and the front's points per 10 m bin | new bar D; A, B, F re-read on this water |
| 2 | The join table's ref row | today's 10 s row: times x 1.054, lengths x 1.11 | stills at the same moment of the wave: the fold gone |
| 3 | Along-line lengths x 1.11 | knots 0, 33.3, 72.2, 194.3, 227.6, 260.9; startX 127.7; takeOffS 44.4; and `POOL_FRONT_REACH` 22.2 / 111 / 33.3 (ruling 14 missed it) | line's end, first break depth, D per bin |
| 4 | Onset clock by break line, opt-in (`?onsetClock=line`, name provisional; ref only at first) | below | the meter and peel readouts; the library-less path |

**Step 4's rule [R, P].** Each column keeps TWO clocks (onset and throw each): one for the reef band, one for the rest.
The reef band is within **50 m** of the reef line, square to it (`poolStraightFrame(x, z).n`): the farthest a crest goes
in 0.7 Tp (sqrt(9.81 x 5.0) x 7.35 = 51 m); the face's foot is 34 m out, the beach line 141-162 m. Inside a band the
0.7 Tp wait and the 0.4 h_b test stay as they are, so a flickering crest still throws once. Two clocks, not one clock
with a remembered place: a beach onset between a reef onset and its flicker would wipe the memory. The new arrays exist
only with the switch (default byte-identical) and must join `exportState` (`:1755`); online rooms pin the default.
**If ever the default** (bands by 51 m apart, not by the pool's line): the Canyon is a spilling spot with its own reef
onset clock, so only its roller count moves; Padang and the pool run the crash, so only readouts move; the Reef, Point
and any bar-plus-shore-break floor throw MORE jets. Check there: jets per wave, lip volume, peel readouts (they will
shift, as after the fuse fix), fastest water and finite on the extreme seas (`holdPlunge` switches dispersion off where
jets land), the Canyon hash and fps trace.
**The fold [R, not traced].** Under ref the case is drawn larger on the 10 s join row: times 5 % short, seam lengths 11 %
short (ruling 5's "case arrives early" in small). So step 2 before 3; its stills must hold the line's end at the same u.

## 4. The bars, re-stated
- **A.** 2.0 +/- 0.1 m as before, over the waves of 60-270 s (about 20).
- **B.** u 65-145, median **6.5-7.2 m/s**, at least 15 of 21 waves. Apart: the line's end (today u 151), u 40-65, halves.
- **C.** First break depth: today x 1.11 = 2.03 +/- 0.15 m (1.85 misses by 0.03); on the line's unscaled start, so step 3's bar [R].
- **D, replaced.** On the game's path: of the front's points reaching their throw on s 20-100, `throws` at least 90 %;
  `thrown / asked` at least 0.9; `starved`, `missed`, `covered`, `lost` per 10 m bin, ref against today.
- **E.** As ruling 14 (shares 0.73 / 0.71 / 0.69 [M]). **Drift.** As ruling 14, once A, B, D pass on step 1's water.
- **F.** Within 60 m of the reef line: at most 8.02 m/s, finite. Swash: reported, finite, not growing.

## 5. Must not
- Do not change `throwLip`'s or `newBreaker`'s default, or free `lastThrow` alone, to lift bar D.
- Do not make the beach line spill by hand or reshape the beach to hit a bar; no factor, feed or direction change for A.
- Do not judge the plunge, the line past u 60 or the swash from a library-less run again. One change at a time after it.

## 6. Not settled
- Section 1 is a code reading; step 1 tests it. If the crash's throws also fall on u 60-100, D stays missed, cause elsewhere.
- How far the fallback jets moved A, B and the current; why the pace's halves swapped; the fold's cause.
- The drawn tube's height at the throw (step 1 can report it). The growing current (600 s run owed). Real pools' beaches [U].

## 7. The owner's calls
1. Fastest water at the limit with no margin: accept, or ask for margin (ruling 14's call 4, still open).
2. The inside: a 1.8 m wave re-forms and breaks hard on the 1:8 beach. Keep, or an opt-in gentler beach (with ruling 12's)?
3. Ride length: the line ends near u 150 at both sizes; step 3 should carry it to about u 165. Wanted?
