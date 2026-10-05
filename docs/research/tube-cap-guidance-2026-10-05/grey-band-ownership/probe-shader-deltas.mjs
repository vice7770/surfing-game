// Source-only proposed fragments. No application/runtime/browser/renderer invocation.
export const OWNER_DEFINE = 'BREAKLINE_TUBE_GREY_OWNER';
export const OWNERS = Object.freeze({ loft: 1, originalWater: 2, lateRepair: 3, seabed: 4, farOcean: 5 });
export const ENCODED_OWNER_RGB = Object.freeze({
  1: [255, 0, 255], 2: [0, 255, 255], 3: [255, 255, 0], 4: [255, 0, 0], 5: [0, 0, 255],
});
const COMMON = '#include <common>';
const FINAL = '#include <dithering_fragment>';
const BODY_COS = 'float waterViewCos = dot( waterN, waterV );';
const BODY_DECLARATION = '\nfloat tubeGreyMeasuredBodyCos = 2.0;';
const BODY_ASSIGNMENT = '\ntubeGreyMeasuredBodyCos = waterViewCos;';
const OUTPUTS = Object.freeze({
  owner: `\n// tube-grey-owner-output-begin
  if ( ${OWNER_DEFINE} == 1 ) gl_FragColor.rgb = vec3( 1.0, 0.0, 1.0 );
  else if ( ${OWNER_DEFINE} == 2 ) gl_FragColor.rgb = vec3( 0.0, 1.0, 1.0 );
  else if ( ${OWNER_DEFINE} == 3 ) gl_FragColor.rgb = vec3( 1.0, 1.0, 0.0 );
  else if ( ${OWNER_DEFINE} == 4 ) gl_FragColor.rgb = vec3( 1.0, 0.0, 0.0 );
  else if ( ${OWNER_DEFINE} == 5 ) gl_FragColor.rgb = vec3( 0.0, 0.0, 1.0 );
// tube-grey-owner-output-end`,
  rasterFace: `\n// tube-grey-raster-face-output-begin
  gl_FragColor.rgb = gl_FrontFacing ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
// tube-grey-raster-face-output-end`,
  bodyCos: `\n// tube-grey-body-cos-output-begin
  if ( ${OWNER_DEFINE} == 4 ) gl_FragColor.rgb = vec3( 0.0, 0.0, 1.0 );
  else if ( isnan( tubeGreyMeasuredBodyCos ) || isinf( tubeGreyMeasuredBodyCos ) ) gl_FragColor.rgb = vec3( 1.0, 0.0, 1.0 );
  else if ( tubeGreyMeasuredBodyCos >= 0.0 ) gl_FragColor.rgb = vec3( 0.0, 1.0, clamp( tubeGreyMeasuredBodyCos, 0.0, 1.0 ) );
  else gl_FragColor.rgb = vec3( 1.0, 0.0, clamp( -tubeGreyMeasuredBodyCos, 0.0, 1.0 ) );
// tube-grey-body-cos-output-end`,
});
const must = (value, why) => { if (!value) throw Error(why); };
const occurrences = (source, text) => source.split(text).length - 1;

/** Pure source delta: caller owns real baseline source capture, material identities and execution guards.
 * Final colour is assigned after the existing colour-space/fog/dithering chunks. All early discard, depth,
 * stencil, original alpha and lighting arithmetic remain intact. This is ownership instrumentation, no repair.
 */
export function addProbeFragment(fragment, stage, hasWaterBody) {
  must(Object.hasOwn(OUTPUTS, stage), 'Only the three declared finite probe stages exist');
  const output = OUTPUTS[stage];
  if (fragment.includes(output)) {
    // The late repair delegates to the original-water callback; it must inherit this one addition, not add twice.
    must(occurrences(fragment, output) === 1, 'Inherited late-repair probe must occur once');
    return { fragment, inheritedExactlyOnce: true };
  }
  must(!fragment.includes('tube-grey-') && !fragment.includes('tubeGreyMeasuredBodyCos'), 'No undeclared probe additions');
  must(occurrences(fragment, FINAL) === 1, 'One existing final dithering chunk required');
  const baseline = fragment;
  if (stage === 'bodyCos') {
    must(occurrences(fragment, COMMON) === 1, 'One common declaration anchor required');
    must(occurrences(fragment, BODY_COS) === (hasWaterBody ? 1 : 0), 'Actual body-cos ownership must match declared material');
    fragment = fragment.replace(COMMON, COMMON + BODY_DECLARATION);
    if (hasWaterBody) fragment = fragment.replace(BODY_COS, BODY_COS + BODY_ASSIGNMENT);
  }
  fragment = fragment.replace(FINAL, FINAL + output);
  must(stripProbeFragment(fragment, stage, hasWaterBody) === baseline, 'Only the declared reversible source delta is allowed');
  return { fragment, inheritedExactlyOnce: false, baselineRestoresExactly: true };
}

export function stripProbeFragment(fragment, stage, hasWaterBody) {
  must(Object.hasOwn(OUTPUTS, stage), 'Undeclared probe stage');
  must(occurrences(fragment, OUTPUTS[stage]) === 1, 'One declared final-output probe required');
  fragment = fragment.replace(OUTPUTS[stage], '');
  if (stage === 'bodyCos') {
    must(occurrences(fragment, BODY_DECLARATION) === 1, 'One declared cosine scalar required');
    fragment = fragment.replace(BODY_DECLARATION, '');
    must(occurrences(fragment, BODY_ASSIGNMENT) === (hasWaterBody ? 1 : 0), 'Body measurement assignment differs');
    if (hasWaterBody) fragment = fragment.replace(BODY_ASSIGNMENT, '');
  }
  return fragment;
}

/** Caller adds ONLY this per-material define to a fresh object, saving/restoring the original object identity.
 * Original-water mesh/patch share 2; late coarse/patch repair share 3. Distinct defines survive delegation through
 * the patched original-water callback. Do not derive the repair ID from that callback's `this` value.
 */
export function probeDefines(original, kind) {
  must(Object.hasOwn(OWNERS, kind), 'Undeclared actual drawable group');
  must(!original || !Object.hasOwn(original, OWNER_DEFINE), 'No prior owner define');
  return { ...original, [OWNER_DEFINE]: OWNERS[kind] };
}
