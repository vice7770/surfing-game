# C1 · Steam Controller

Agreed in a grilling session on 2026-09-26 (two rounds, Q1–Q14, every recommendation accepted). This is the requirements record; the plan follows it.

## Goal

Play with the user's 2026 Steam Controller, using its analog sticks for precise steering and trim. Today the game cannot see this controller at all on a Mac.

## Starting point

- **The controller:** the 2026 Steam Controller (Valve's codename "Triton", released 4 May 2026). Steam's logs on the user's Mac show it through the Steam Controller Puck (USB `28de:1304`) and once by cable (`28de:1302`). Bluetooth LE is `28de:1303`.
- **Without Steam** its firmware runs "lizard mode": it acts as a keyboard and mouse. Game input travels on a vendor HID collection (usage page `0xFF00`, usage 1) as input report `0x42` (USB and Puck), `0x45` (Bluetooth) or `0x47` (a variant with a trackpad timestamp). Lizard mode comes back by itself a few seconds after the host stops sending feature reports.
- **Steam on macOS** makes no virtual gamepad. Linux got a kernel driver in August 2026, and Windows has community ViGEm bridges; macOS has neither. The browser's Gamepad API most likely sees nothing, which the hardware check confirms.
- **The game's gamepad input (P8, P9):**
  - `Bindings.readPads` reads `navigator.getGamepads()` as the standard mapping, into `PadState` (buttons, trigger values, axes);
  - the first pad's left stick steers (X) and trims (Y), with a 0.15 axial dead zone and a linear rescale;
  - LT's travel crouches, RT paddles, A pops up, X is the hand;
  - bindings are rebindable per action (two keyboard slots, one gamepad slot shown);
  - `MenuInput` navigates the menus with the D-pad or the left stick, A and B;
  - hints name Xbox buttons when the gamepad was used last.
- **The protocol is known from SDL** (`src/joystick/hidapi/SDL_hidapi_steam_triton.c` and `steam/controller_structs.h`, zlib licence), written against the real hardware, and from the Windows tool SteamlessController.

## Decisions

### How the controller gets in (Q1, Q2)

- **WebHID, inside the game.** The game opens the controller's vendor collection itself, turns lizard mode off, and decodes the state report into a standard-mapping `PadState`. Everything downstream (bindings, menus, hints, rebinding) works unchanged.
- **Browsers:** Chrome and Arc (Chromium, WebHID). Safari has no WebHID: it says "Steam Controller needs Chrome or Arc".
- **Hardware:** the 2026 controller over the Puck and USB, both required; Bluetooth best-effort. The 2015 controller and the Steam Deck are out.
- **Rejected:**
  - a native macOS bridge app, because virtual HID gamepads need a restricted Apple entitlement or a DriverKit extension;
  - Steam's desktop layout, because it turns the stick into digital keys.
- **Credit:** the decoder is a port of SDL's Triton driver, credited in its header comment and in `docs/ASSETS.md`.

### The hardware check comes first (Q7)

- **A dev page, `controller-check.html`**, like `gpu-check.html`:
  - lists what the Gamepad API sees;
  - connects over WebHID, turns lizard mode off and keeps it off;
  - shows the live buttons, sticks, triggers and grips;
  - records a few seconds of raw reports as JSON for the unit tests.
- **It passes if** the controller opens over the Puck and USB, lizard mode stays off (the stick no longer moves the mouse), and the sticks and buttons read correctly. **If it fails,** work stops and the user gets options (the native bridge of Q1).
- **The user runs it** (about 2 minutes, controller plugged in). Everything else is tested on recorded or built reports.
- **Done** is the user's hand check in a ride.

### Steam running alongside (Q8)

The check decides. If the game and Steam work together cleanly, nothing more is needed. Otherwise the connect row tells the player to quit Steam. Until the check has run, the connect row carries that advice as help text.

### Connecting (Q9)

- **Permission:** WebHID needs a click and Chrome's chooser once; after that the browser remembers the controller and the game reconnects it on every visit and whenever it is plugged in again.
- **Where:**
  - a **Steam Controller** row in Settings › Controls, with a Connect button (it shows Connected once connected);
  - a small **Connect Steam Controller** button in the main menu's strip, until the controller has connected once (a `seen` flag).
- **In Safari** both say "Steam Controller needs Chrome or Arc".

### Lizard mode (Q10)

- **Off whenever the game tab is visible** and the controller is connected. The game repeats the "off" command about every second, because the firmware reverts without it.
- **Hidden tab:** the game stops repeating and asks for lizard mode back straight away, so within about a second the controller is the Mac's mouse again.
- The menus already work with a gamepad, so the mouse is not needed in them.

### Sticks (Q3, Q4, Q13, Q14)

- **Steering** is the left stick's X, as today.
- **Trim moves to the right stick's Y by default**, for every gamepad. A Controls setting, **Trim stick: Right / Left**, puts it back on the left stick.
- **Stick response: Linear / Precise**, default Linear.
  - Precise is an expo curve: finer near centre, still full lock at the edge.
  - Linear stays the default until the turn-rate fix lands, since turns are about ten times too slow and Precise would weaken mid-stick turns further. It gets another look then.
- **Dead zone, per device:**
  - 0.05 for the Steam Controller, whose magnetic sticks barely drift;
  - 0.15 for other gamepads;
  - each with its own slider (0–0.3).
- **The pad touched last drives the sticks.** Buttons still work on any connected pad.
- The right stick does nothing while lying down.

### Buttons (Q5, Q11, Q12)

- **The Steam Controller as a standard pad:**
  - buttons 0–16 in the standard layout: View is Back (8), Menu is Start (9), Steam is Home (16);
  - extras 17–21: L4, R4, L5, R5 and the Quick Access (···) button;
  - axes 0–3 are the two sticks; LT and RT carry their travel.
- **Default changes:**
  - the hand moves from X to **LB**, for every gamepad (X becomes free);
  - on the Steam Controller the **L4** grip also does the hand and **R4** also pops up, so the thumbs stay on the sticks;
  - L5 and R5 start unbound.
- **Settings shows two gamepad slots** per action, like the keyboard.
- **Saved settings:** a saved binding still equal to its old default moves to the new one.
- **Button names by device, as text:** after the Steam Controller was used last, hints and Settings say View, Menu, Steam, L4, R4, L5, R5 and ···; A, B, X, Y, the bumpers and the triggers are named as on an Xbox pad.
- **The trim hint** names the stick trim is on.

### Scope

- **Now:** the WebHID driver, the check page, the settings above, the default and label changes, and the "last touched pad" rule.
- **Later, each with its own grilling:** gyro steering, the trackpads, rumble and haptics.
- **Unchanged:**
  - keyboard and touch controls;
  - no battery or connection display;
  - the new settings live in the existing settings store.
- **The check page is a dev tool,** with the others that will probably be turned off later.

## Testing

- **Unit tests:**
  - the report decoder, on built and recorded reports;
  - the lizard-mode commands' bytes;
  - the standard-pad mapping;
  - the response curves and dead zones;
  - the last-touched-pad rule;
  - the settings rows, sanitising and saved-binding migration;
  - the button labels.
- **The hardware check** (above), then **the user's hand check** in a ride.

## Execution

Branch `claude/steam-controller`. The plan is `docs/superpowers/plans/2026-09-26-c1-steam-controller.md`. The user asked for it to be built in the same session as this spec and **left uncommitted** for their review.
