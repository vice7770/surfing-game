# G7 Part B · The Surfer card and the graphics presets

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the player picks their surfer (body, outfit, suit colour, board design) on the Surf screen, sees them in a slowly rotating preview under the chosen time-of-day sky, and rides as them; the Low–Ultra graphics presets pick the shadow level, the surfer's level of detail and its texture sizes.

**Architecture:** the choice is a new `surfer` section of P8's sanitised settings store. The physical mode applies it at the start of each ride: the body loads, the outfit and colour dress it, and the board mesh is rebuilt in the chosen design. The Surf screen gains a Surfer card whose preview renders a `SkinnedSurfer` on its board in its own small WebGL canvas, lit by the chosen `PhotoSky`. `resolveGraphics` gains the shadow level, the surfer's LOD distance and a texture cap per preset.

**Tech stack:** TypeScript, three.js (WebGL), Vitest, plain DOM (P8's `el` helpers).

**Spec:** [G7 spec](../specs/2026-09-26-g7-characters-and-sky.md), Part B.

## Global Constraints

- Plain TypeScript and native CSS: no framework and no new dependencies (P8).
- All player-facing text lives in `src/ui/strings.ts`, in English.
- Every menu works with arrows or D-pad, Enter or A, and Esc or B; no hover-only interactions (P8).
- Only the chosen surfer and the current sky load; the primitive surfer stays as the fallback (G7).
- Settings apply instantly and are saved in the browser; invalid stored values fall back field by field (P8).
- Performance is measured, never a gate.

## Review Focus

- A stored choice from an older build (a body or design id that no longer exists) must fall back to the default, not break the ride.
- A body change while a ride's surfer is still loading must end on the latest choice, not whichever load finished last.
- The rash-vest outfit is a bikini on the women's bodies and boardshorts on the men's: switching body keeps the outfit's kind.
- Reduced motion holds the preview still.
- The preview's renderer is released when the Surf screen closes, so leaving and returning does not leak WebGL contexts.

---

### Task 1: The choice in the settings store

**Files:** modify `src/game/Settings.ts`, `src/game/Settings.test.ts`; create `src/game/SurferChoice.ts`, `src/game/SurferChoice.test.ts`.

- `SurferSettings { body: SurferBody; outfit: 'fullsuit' | 'springsuit' | 'vest'; color: SuitColor; board: BoardDesignId }`, default `surfer1`, `fullsuit`, the first colour, `classic`.
- `SURFER_BODIES` from `public/assets/surfers/surfers.json`'s ids with their sex; `SUIT_COLORS` a small palette of accent colours; `boardDesignIds()` from `BOARD_DESIGNS`.
- `outfitFor(settings)` maps `vest` to `vestBikini` or `vestShorts` by the body's sex.
- `sanitizeSettings` checks each field against its allowed values.
- [ ] Failing tests: defaults; an unknown body, outfit, colour or board falls back field by field; `outfitFor` by sex. Implement; commit `feat: keep the player's surfer in the settings`.

### Task 2: Ride as the chosen surfer

**Files:** modify `src/game/PhysicalMode.ts`, `src/scene/character/SurferView.ts`, `src/scene/BoardMesh.ts` (if needed), `src/main.ts` (a few lines); tests in `src/game/PhysicalMode.test.ts` and `src/scene/character/*.test.ts`.

- `PhysicalMode.setSurfer(choice)`: loads the body (latest request wins), dresses it with `outfitFor` and the colour, and swaps the board mesh for the chosen design.
- `main.ts` applies the stored choice before a ride and when it changes; the `?surfer=` dev flag still overrides the body.
- [ ] Failing tests: the board's design follows the choice; two quick body changes end on the second; the outfit and colour reach the skinned surfer. Implement; commit `feat: ride as the chosen surfer and board`.

### Task 3: Presets pick the shadows, the level of detail and the texture sizes

**Files:** modify `src/game/Graphics.ts`, `src/game/Graphics.test.ts`, `src/scene/character/SkinnedSurfer.ts`, `src/main.ts`.

- `ResolvedGraphics` gains `shadows: ShadowLevel` (Low `blob`, Medium `rider`, High `surfaces`, Ultra `soft`), `surferDetail: number` (the LOD distance, m: Low 0, Medium 8, High 12, Ultra 20) and `textureCap: number` (px: Low 512, Medium 1024, High and Ultra 4096). Custom keeps the effective preset's.
- `SkinnedSurfer` takes the LOD distance and downsizes images above the cap at load.
- `main.ts` applies the shadow level and passes the detail on; `?shadows=` still overrides.
- [ ] Failing tests: the mapping per preset; Auto follows the detected preset; the LOD switch honours the distance; a texture above the cap is downsized. Implement; commit `feat: let the graphics presets pick shadows and surfer detail`.

### Task 4: The Surfer card

**Files:** modify `src/ui/SurfScreen.ts`, `src/ui/SurfScreen.test.ts`, `src/ui/strings.ts`, `style.css`, `src/ui/App.ts`; create `src/scene/character/SurferPreview.ts`.

- `surferModel(choice)`: the body, outfit, colour and board rows with the choice marked; the vest's label follows the body's sex.
- The card sits beside the spots: a preview canvas over four picker rows. Choices apply as they are made and are saved with the settings.
- `SurferPreview`: its own small `WebGLRenderer`, a `SkinnedSurfer` standing on its board, the chosen time's `PhotoSky`, turning at 0.15 rad/s (held still with reduced motion); `dispose()` releases the renderer. Where WebGL is missing the card shows the pickers alone.
- [ ] Failing tests: the model's rows and marks; a pick calls `change` with the new choice; the vest label by body. Implement, check the card in the browser (keyboard and gamepad paths too); commit `feat: pick and preview your surfer on the Surf screen`.

### Task 5: Record

- [ ] ROADMAP (G7 Part B), `docs/ASSETS.md` if anything is added, this plan's record. Commit `docs: record G7 Part B`.

## Record

(Filled in at the end.)
