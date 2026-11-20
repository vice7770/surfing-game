// The profile-point mask (red = point / 128) by a temporary cover table, on the same held frame (as step 15's 03).
const s = window.__shoot; const m = window.__tube(); const bm = window.waterSheetBarrel; const loft = window.waterSheetMode.barrelLoft;
const lip = await import('/src/scene/barrel/lipLook.ts');
const original = lip.LIP_STREAK.cover;
lip.LIP_STREAK.cover = [[31.5, 0], [32, 32 / 128], [112, 112 / 128], [112.5, 0]]; bm.update(loft);
for (const view of ['curl-front', 'curl-lip', 'curl-inside']) {
  window.__patch(m, 'maskP', window.__out('vec3( vSweptStreak.z, clamp( vSweptThroat.w, 0.0, 1.0 ), 1.0 )')); await s(view, 'rich', 'midday', `maskP-${view}.png`);
}
lip.LIP_STREAK.cover = original; bm.update(loft);
window.__patch(m, '', null);
// Check the frame is back: the after still again.
await s('curl-lip', 'rich', 'midday', 'after2-lip-midday.png');
return { restored: lip.LIP_STREAK.cover === original };
