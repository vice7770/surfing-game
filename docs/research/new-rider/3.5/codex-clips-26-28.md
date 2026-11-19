# Clip 28 and the next movement references

Independent review for the movement coordinator and Vicente, 19 November 2026. Times below are positions on the published video timelines. Vicente judges whether the resulting movement feels right in Canyon.

## Clip 28 · Gabriel Medina’s take-off

The front-oblique view shows the transition from paddling to riding in one sequence. **Medina looks toward the open face while he is still low on the board. The hands and legs reorganize, and the arms take different positions as he starts the drop.** This gives the builder a sequence to compare with the game. Spray and the changing board angle conceal the precise support transfer. [Original clip](https://www.youtube.com/shorts/g3fe9BRoeaI)

| Player time | Visible movement | What the game comparison can establish |
| --- | --- | --- |
| 2.00–2.33 s | Head turns toward screen-left while chest is still low and elbows draw in. | Compare the direction of the gaze before the rise and the direction of the board afterward. This does not identify the torque that starts the turn. |
| 2.50–3.06 s | Chest rises. The screen-right hand remains visually close to the rail and foam at 2.97. By 3.06 a forward foot is visible on deck and that hand is visibly clear. | Compare rail overlap, first visible foot and the clearing hand separately. Pressure on either palm, the first instant of foot contact, and the order of release and landing are unresolved. |
| 3.15–4.38 s | A staggered stance opens. One arm sweeps upward and out around 3.24–3.50, while the other remains low. Rider flexes into the drop around 3.59–3.77. Both feet are clear to the reader by 4.38. | Compare arm timing and knee flexion during entry. A hand near the rail gives no evidence that an automatic grab should engage. |
| 9.75–12.40 s | The rider extends at the aerial exit, draws the knees up in flight, and bends after returning to the face. The arms are down near the deck again as he compresses. | Compare extension, tuck and landing absorption as transitions. A single crouch value cannot describe the simultaneous change in arm carriage. |
| 24.20–25.26 s | Rider folds toward the deck during another direction change and rises again, with one hand still trailing low. | Another instance of trunk, arms and legs changing on different schedules within the same ride. |

The blind reader used an independent Chrome tab (307542411), a 608 × 1080 stream displayed at 327 × 581, paused player times and checked screenshots. I also inspected the original timestamped image sheets, including the rail crops and later aerial and recovery frames. The first clearly visible foot can already be carrying weight. The screen-right hand still appearing next to the rail at 2.97 s admits contact, clearance and occlusion. I would mark a contact interval as unknown here. In particular, a mandatory hands-free gap before landing cannot be derived from these frames.

The early view loses the pelvis and the board’s transverse axis in spray as the board turns. Head position in the image cannot supply a board-relative sideways body speed in metres per second or an initial condition for the balance controller. Claude’s estimate of about 0.55 real seconds per media second fits a later aerial around 9.70–10.93 s. Applying it to the take-off around 3 s assumes the editor maintained the same playback speed across both sections. Preserve player-clock timings and that condition whenever quoting the take-off duration. [Claude’s aerial time calibration](https://github.com/vice7770/surfing-game/blob/135c397b/docs/research/new-rider/3.5/video-ref-28-medina-takeoff.md#22-two-independent-length-scales-which-agree)

On playable revision `85fb6cb9`, the 0.72 s push and 0.48 s landing lead into the standing phase and a separate 0.80 s settle. The first visible foot and the beginning of the standing phase are different events. Each phase blends part positions with its own minimum-jerk curve, whose ideal slope is zero at both ends. An apparent pause in head height alone offers little reason to add a pause or shorten the whole sequence. A better check is whether the model can lift the chest, bring the legs under the body and open one arm while the other remains low at the observed landmarks. The existing standing arm-carriage option controls drawing. A visible arm movement does not establish physical hand support. [Phase durations and transitions](https://github.com/vice7770/surfing-game/blob/85fb6cb9/src/physics/AttachedRider.ts#L1798) · [Posture interpolation](https://github.com/vice7770/surfing-game/blob/85fb6cb9/src/physics/AttachedRider.ts#L5720) · [Arm carriage](https://github.com/vice7770/surfing-game/blob/85fb6cb9/src/physics/AttachedRider.ts#L2275)

## Clip 27 · A climb, high turn and low recovery

The 8.62 s Short begins with the rider already standing. It shows one change of direction, from climbing up-left to descending down-right on screen. The camera follows the rider. The entry before the climb and the return to trim after the exit are outside the readable sequence. [Original clip](https://www.youtube.com/shorts/OhZwR1dW_RQ)

| Player time | What changes |
| --- | --- |
| 0.07–1.79 s | Rider is low, with chest folded forward and gaze directed up the line. Head and chest rise as the board points farther up-left. One arm reaches while the other trails. |
| 2.04–2.90 s | The nose-side leg lengthens toward a visible foot while the opposite knee stays folded. One arm lifts above the head. The other remains low. The projected hips are farther behind the nose-side foot. |
| 3.15–4.50 s | Head and chest begin facing the down-right exit while the nose still points left or is nearly end-on. The board then rolls enough to expose its underside. The turn of the upper body and the change of board heading overlap. |
| 4.50–6.53 s | The nose points down-right. As the board flattens, the previously raised arm moves across the chest, the opposite arm reaches, and the nose-side knee bends over the planted foot. |
| 6.75–8.46 s | Hips are low and the trunk folds forward again. Spray and the right edge eventually hide the rider. The last clear pose is a recovery still in progress. |

The closest game comparison is a high-face turn followed by flexion on descent. The leg that lengthened during the climb bends on exit. The torso starts facing the exit before the board finishes redirecting, and the two arms exchange roles. Compare that ordering against the board’s actual path if evaluating a Canyon turn. The view cannot establish rail pressure, joint torque, a deliberate grab, sideways speed or the percentage of standing hip height. It supplies a timing reference for recovery and no measured speed-carry target.

The independent reader checked 31 paused positions in Chrome tab 307542413, including 0.462, 1.348, 1.791, 2.262, 2.898, 3.591, 4.061, 4.504, 5.390, 6.055, 6.525, 7.190 and 8.242 s. The stream was 608 × 1080, displayed at 327 × 581. The reader estimated about 200–380 source pixels from head to visible foot on clear frames. Retiming is unknown. No clear aerial release or foot reposition was resolved.

## Clip 26 · The yellow-board climb and redirect

This Short opens with a rider already on her feet. Across the sampled 14.22 s clip the yellow board climbs, redirects high on the face and descends. The changing relationship between the knees, trunk and board is visible in one continuous-looking sequence. The uploader calls the clip “Steph & Lances Right”. [Original clip](https://www.youtube.com/shorts/uMfa7xmy53o)

| Player time | What changes |
| --- | --- |
| 0–3.3 s | Rider starts low and looks down the line. Chest folds farther, one hand reaches down over the yellow deck and the other opens as the head and shoulders turn into the face. Spray hides the feet. Hand-to-rail contact is uncertain. |
| 3.4–5.1 s | Hips rise and the legs visibly lengthen while the chest stays pitched forward. The yellow nose rises and traverses up the face. |
| 5.2–6.6 s | Knees start to bend again while the nose still points uphill. One arm lowers toward the nose side and the other opens and rises. |
| 6.6–9.7 s | As the board banks and redirects downhill, the leg nearer the nose initially looks longer. By 8.93–9.68 it is visibly bent while the leashed leg extends toward the tail pad. Arms open wide. |
| 9.7–13.9 s | After the redirect both knees bend and the arms lower. Then the hips rise with the trunk still pitched before the chest comes up. The board disappears into spray. |

For the Canyon bottom turn, the strongest visual reference is **extension into the climb followed by renewed flexion before the climb ends**. Check each knee against its planted foot through the redirect. The shipped physics has one leg spring and the rig has separate knees. The projected difference in bend can guide the rig’s timing. It cannot determine how much pressure each foot applied or establish a need for a second spring. [Body-channel inventory](https://github.com/vice7770/surfing-game/blob/85fb6cb9/docs/research/new-rider/3.5/body-channels.md#L27)

The independent reader used timestamped screenshots captured from the original player. Four distinct frames confirm the 8.93–9.68 s leg comparison. A repeated crop was excluded. I also inspected the original image sheets, including the marked tail and pad. The opening and the later side view gave approximately 350 and 500 source pixels respectively from head to visible foot. Camera angle and foreshortening change through the turn. Leg length percentages, knee angles, board speed, load and real-time durations remain undetermined. [Claude’s original clip 26 report](https://github.com/vice7770/surfing-game/blob/f6b4fd83/docs/research/new-rider/3.5/video-ref-26-steph-lances-right.md)

## Advice for the Canyon movement builder

| Reference | Compare with the game | Measure separately |
| --- | --- | --- |
| 28 · Getting to the feet | Direction of gaze during the push, visible support transfer, then the opening arm and flexed drop. The game has push, landing and standing phases. | Phase timestamps, first visible foot, verified contact load and later torso settling. |
| 27 · Direction change | When the rider starts looking toward the exit, when the board rolls and changes course, and how low the rider remains during recovery. | Board heading, course of travel and visible trunk orientation. |
| 26 · Climb and recovery | Whether the legs extend out of the low turn while the trunk stays folded, and whether the knees can start bending again as the board still rises. | Hip height, front and rear knee shape, and actual height gained on the face. |

For speed carry, use saved board telemetry at comparable positions on the climb. In the 60 Hz Canyon seed 2, wave 2 left-turn trace, both the stock and lateral-mass riders cross 0.50 m above the moving trough at +2.067 s after standing, travelling at about 4.25 m/s through the water on a +49° ground course. At the first sample above 0.90 m, the stock rider is at +2.783 s, 3.31 m/s and +46.37°. The experimental rider is at +2.850 s, 3.11 m/s and +32.48°. The early climb survives. The later course and exit speed differ at matched height. The rider had already released steering and used no Compress. Face height here means the sampled water surface under the rider relative to the moving trough. Through-water speed is along the board heading, and course is the direction of horizontal ground velocity. The gauge sample precedes the motion reading by one 1/60 s step. These are comparisons from an existing builder trace. Vicente’s sharp-turn feel remains the playtest criterion. [Archived trace and reader](https://github.com/vice7770/surfing-game/tree/898dff9d/docs/research/new-rider/3.5/results/35k)

— Codex, independent movement review, 19 November 2026
