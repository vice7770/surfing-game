# Jev plays Breakline

A test player for the physical surf zone: [Jev](https://docs.typesafe.ai/introduction), TypeSafe's System One model, makes every decision a player makes (when to paddle, which way to point, when to pop up, what line to ride, where the weight goes, what to do after a fall) and the game's own code does everything else. It runs headless in Node as a test, and in the page as a film.

Jev is not a chat model: it takes a state and a map of typed questions (Choice, Score, Noul) and returns typed answers with calibrated probabilities, in about 220–300 ms over the network. That is a human's visual reaction time, so it can play at a human's pace. The design follows TypeSafe's own advice and the [doom-war](https://github.com/rythmn1111/doom-war) demo: code reads the game state and does the arithmetic, the model only picks among options that exist.

```
sea + rider ──► senses ──► phrases ──► typed questions ──► Jev ──► plan ──► RideRequest every step
                 (code)      (code)        (code)                    (code)
```

## Run it

The key is read from `TYPESAFE_API_KEY`, or from `~/.config/typesafe/api_key` (chmod 600). It never goes in the repository or the page.

```sh
npm run play:jev                                   # Canyon, Practice swell, seed 1: until a wave is caught, or 3 min of sea
npm run play:jev -- --seed 2 --minutes 5 --log /tmp/jev.jsonl --out /tmp/jev.md
npm run play:jev -- --spot point --natural         # a spot's buoy swell instead of the Practice swell
npm run play:jev -- --reaction 250                 # a fixed 250 ms reaction (simulated time); 0 is lockstep
npm run play:jev -- --pilot script                 # the dev autopilot through the same loop: the baseline
npm run play:jev -- --keep-going --verbose         # ride the whole session, print every answer
npm run play:jev -- --trace /tmp/trace.jsonl       # every step from a pop-up on: controls, balance, flight, the wave
```

Exit code 0 when a wave was caught, 1 when none was, 2 on an error, so it can gate a build. A catch is a ride of at least `--min-ride` seconds (3 by default, the length the online feed shows) as the game's own ride analyzer measures it (`SurfZoneStatus.ride.report`).

The film: Jev plays in the page and the game's renderer films it (`?inpage&record&pilot=jev`, [src/dev/jevRecorder.ts](../src/dev/jevRecorder.ts)). The page posts its looks to a local bridge that holds the key:

```sh
npm run film:jev -- recordings                     # the bridge, on 5199 (JEV_BRIDGE_PORT to change it)
# then open http://localhost:5173/?inpage&record&pilot=jev   (&receiver=http://localhost:PORT for another port)
```

It writes `jev-ride.mp4` (from a few seconds before the caught wave to just after the ride), `looks.jsonl` (every landed look) and `log.txt`. Over the picture: what is happening, and Jev's latest look, what it saw and what it answered, with the call's latency and tokens. A headless Chrome films it without a window: `--headless=new --enable-unsafe-webgpu --use-angle=metal`. Do not edit `src/` while it films: Vite's hot reload restarts the page.

## How it works

- **Senses** ([senses.ts](../src/dev/jev/senses.ts)): the rider's phase, the HUD's POP UP NOW prompt, speed, balance, the rider measured against the wave under it (`WaveFrame`), and whether water stands high just behind the board. Read the same way from the runner in Node and from the host's snapshot in the page.
- **Phrases** ([observe.ts](../src/dev/jev/observe.ts)): the senses as a few short named buckets, never raw metres (`wave: "head-high, unbroken, lifting your board"`, `pace: "matching the wave"`, `curl: "right beside you, in the pocket"`). Jev 1.13 reads numbers poorly and phrases well (its [jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13) page). The open face's side is held for a whole ride: the gauge's curl jumps between crests, and a side that flipped between looks flipped the rider's line with it.
- **Questions** ([questions.ts](../src/dev/jev/questions.ts)), by phase. Lying down: paddle or wait (and go back out, only when inside the break with nothing coming), which way to point, and stand up or not (only while the prompt shows). Standing: the line, the weight, and the stance (crouched low, upright, or pumping). Fallen: swim to the board, or go back out. Each criterion states its condition literally, since Jev reads them literally.
- **The pilot** ([pilot.ts](../src/dev/jev/pilot.ts)): ten looks a second of simulated time, and one at once when the prompt lights or the phase changes; several are in flight together, as a player keeps watching while acting on what they saw. Each answer lands at its look's time plus the call's own measured latency, the sea stepping on meanwhile with the last plan held, and the sea never runs ahead of the wall clock while a look is unanswered, so no answer lands late. An answer to an older look than one already landed is dropped.
- **The motor** ([motor.ts](../src/dev/jev/motor.ts)): holds the plan and turns it into a `RideRequest` every step, steering onto the planned heading the way a thumb would (the heading and the weight ease in over a few tenths of a second), pressing the pop-up and the fresh start once each. It adds no decision of its own; an unanswered question keeps the last plan and is counted. Like the dev autopilot, it keeps its hands off while the rider pops up, and steers a standing rider only on a look taken standing: a full lean drains the balance, and with nothing held the rider holds its own line. It sends the game's pocket reflex as the game does for a player: on the Practice swell, by the default setting.
- **The film** ([jevRecorder.ts](../src/dev/jevRecorder.ts)) runs the same pilot in the page; its latency is the page's own round trip through the bridge.

## Payload and cost

About 460–600 input tokens a call (the API's own overhead is most of it: a one-question call is ~280), $0.042 per million: ten looks a second for an hour is about $0.70. TypeSafe charges no output tokens. Warm latency stays flat around 220–240 ms from 290 to 830 tokens, so the payload's size moves the cost, not the reaction; the first call of a connection takes ~3 s, so both entry points warm it up first.

## Results

See the table below (each run: Canyon, Practice swell, 4 min of sea at most, stopping at the first catch).
