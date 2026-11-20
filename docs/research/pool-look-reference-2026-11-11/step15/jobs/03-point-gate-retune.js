// (1) A profile-point mask (red = point / 128) by a temporary cover table, then (2) the thin-sheet gate as the ruling
// words it (fray share above 0 -> the light through the sheet is the clean lip's), and (3) the one inner-cover retune,
// all on the same held frame.
const s = window.__shoot; const m = window.__tube(); const bm = window.waterSheetBarrel; const loft = window.waterSheetMode.barrelLoft;
const lip = await import('/src/scene/barrel/lipLook.ts');
const original = lip.LIP_STREAK.cover;
const rebuild = (table) => { lip.LIP_STREAK.cover = table; bm.update(loft); };
const THIN = 'vSweptSheetWeight * ( 1.0 - smoothstep( 0.040, 0.150, vSweptSheet ) )';
const line = `float sweptStreakThrough = mix( sweptStreakLit, vWaterFoam, ${THIN} );`;
const gated = `float sweptStreakThrough = ( ${THIN} ) > 0.0 ? vWaterFoam : sweptStreakLit;`;
const gate = (sh) => { if (!sh.fragmentShader.includes(line)) throw new Error('no through line'); sh.fragmentShader = sh.fragmentShader.replace(line, gated); };
const off = (sh) => { sh.fragmentShader = sh.fragmentShader.replace(window.__off[0], window.__off[1]); };
rebuild([[31.5, 0], [32, 32 / 128], [112, 112 / 128], [112.5, 0]]);
for (const view of ['curl-front', 'curl-lip', 'curl-inside']) {
  window.__patch(m, 'maskP', window.__out('vec3( vSweptStreak.z, clamp( vSweptThroat.w, 0.0, 1.0 ), 1.0 )')); await s(view, 'rich', 'midday', `maskP-${view}.png`);
}
rebuild(original);
const shots = [['curl-lip', 'midday'], ['curl-front', 'midday'], ['curl-inside', 'midday'], ['curl-lip', 'sunset']];
for (const [v, t] of shots) { window.__patch(m, 'gate', gate); await s(v, 'rich', t, `gate-${v.replace('curl-', '')}-${t}.png`); }
// The retune: inner face 0.8 at the tip (as the outer face, so no step), 0.15 at the throat, 0 by point 90.
const retuned = [[32, 0], [48, 0.3], [64, 0.8], [88, 0.15], [90, 0]];
rebuild(retuned);
for (const [v, t] of shots) {
  window.__patch(m, 'gate', gate); await s(v, 'rich', t, `retune-${v.replace('curl-', '')}-${t}.png`);
  window.__patch(m, 'gateoff', (sh) => { gate(sh); off(sh); }); await s(v, 'rich', t, `retuneoff-${v.replace('curl-', '')}-${t}.png`);
}
for (const view of ['curl-front', 'curl-lip', 'curl-inside']) {
  window.__patch(m, 'rmask1', window.__out('vec3( vSweptStreak.z, clamp( vSweptThroat.w, 0.0, 1.0 ), 1.0 )')); await s(view, 'rich', 'midday', `rmask1-${view}.png`);
  window.__patch(m, 'rmaskS', window.__out(`vec3( sweptStreakOwn / 0.85, ${THIN}, 0.5 )`)); await s(view, 'rich', 'midday', `rmaskS-${view}.png`);
}
rebuild(original);
window.__patch(m, '', null);
return { restored: lip.LIP_STREAK.cover === original };
