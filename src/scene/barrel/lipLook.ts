import { devParam } from '../../devTools';
import { ROLLER_LOOK } from '../water/rollerLook';
import { LIP_FRAY } from './brokenCrest';

/**
 * Dev switch `?lipLook=fray` (ruling 9 rank 1, 2026-11-11, `docs/research/lip-look-2026-11-11/README.md`): the Wave
 * Pool lip as a fraying sheet, not a clean stub. The owner's ride, 2026-11-11: the falling water "should start thinner
 * and with foam, then become thicker, also with foam". Drawing only: the collided surface, the void and the water a
 * rider feels do not change, and without the switch the lip is drawn as before.
 *
 * Step 1, built: thin water is white. The lip's foam follows its sheet's thickness (`LIP_FRAY`, `lipFoamAt`): white at
 * the tip, clean glass where the sheet is thick, and a white crest's foam is no longer capped on its lip. The frayed
 * part is lit as a thin sheet of drops, from both faces (`LIP_FRAY_VOLUME`).
 * Not built yet: the toothed tip, the drops off it, the crest's veil and the eased start (the ruling's table).
 */
export function lipLookFray(search?: string): boolean {
  return devParam('lipLook', search)?.trim().toLowerCase() === 'fray';
}

/** Read once, when the tube's mesh is made. */
export const LIP_LOOK_FRAY = lipLookFray();

/** The share of the light on a frayed sheet's far face that leaves its near face (the rest leaves the far face). P. */
export const LIP_FRAY_THROUGH = 0.5;

/**
 * GLSL (the tube's sheet light, after it): the frayed part of the lip lit as a thin sheet of ligaments and drops.
 * Each face takes the sun as the whitewater's band does, wrapped round it, (N·L + w) / (1 + w) (`ROLLER_LOOK.wrap`, the
 * coordinator's ruling of 2026-10-07), and a sheet this thin passes a share of what its far face takes
 * (`LIP_FRAY_THROUGH`), the sun and the light behind it (`sweptBack`, the clean sheet's own back light, here without
 * Beer–Lambert: scattered, not absorbed). At w = 1 and a half share the sun's part has no facing. Never below the
 * surface's own N·L, which the lit foam already takes. Measured without it (2026-11-11): the white tip drew near
 * black, (18, 40, 58), since both of the tip's faces turn from a high sun and its foam hid the light through the sheet.
 * Its albedo is fresh whitewater's, flat across the visible at the foam colour's brightest channel, as the band's crest
 * (`ROLLER_LOOK.wrap`'s comment). The frayed share is the sheet's weight by its thinness, per fragment, as `frayWhite`
 * per vertex.
 */
export const LIP_FRAY_VOLUME = /* glsl */ `
    float sweptFray = vSweptSheetWeight * clamp( vWaterFoam, 0.0, 1.0 ) * ( 1.0 - smoothstep( ${LIP_FRAY.white.toFixed(3)}, ${LIP_FRAY.clean.toFixed(3)}, vSweptSheet ) );
    float sweptFraySun = dot( waterN, waterSunDirection );
    float sweptFrayNear = max( 0.0, ( sweptFraySun + ${ROLLER_LOOK.wrap.toFixed(3)} ) / ${(1 + ROLLER_LOOK.wrap).toFixed(3)} );
    float sweptFrayFar = max( 0.0, ( ${ROLLER_LOOK.wrap.toFixed(3)} - sweptFraySun ) / ${(1 + ROLLER_LOOK.wrap).toFixed(3)} );
    totalEmissiveRadiance += sweptFray * max( waterFoamColor.r, max( waterFoamColor.g, waterFoamColor.b ) ) * RECIPROCAL_PI * (
      waterSunRadiance * max( 0.0, ${(1 - LIP_FRAY_THROUGH).toFixed(3)} * sweptFrayNear + ${LIP_FRAY_THROUGH.toFixed(3)} * sweptFrayFar - max( 0.0, sweptFraySun ) )
      + ${LIP_FRAY_THROUGH.toFixed(3)} * sweptBack );`;
