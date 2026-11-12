const s = window.__shoot; const m = window.__tube();
const off = (sh) => { if (!sh.fragmentShader.includes(window.__off[0])) throw new Error('no streak anchor'); sh.fragmentShader = sh.fragmentShader.replace(window.__off[0], window.__off[1]); };
const THIN = 'vSweptSheetWeight * ( 1.0 - smoothstep( 0.040, 0.150, vSweptSheet ) )';
for (const [v, t] of [['curl-lip', 'midday'], ['curl-front', 'midday'], ['curl-inside', 'midday'], ['curl-lip', 'sunset']]) {
  const tag = `${v.replace('curl-', '')}-${t}`;
  window.__patch(m, '', null); await s(v, 'rich', t, `after-${tag}.png`);
  window.__patch(m, 'off', off); await s(v, 'rich', t, `off-${tag}.png`);
}
for (const view of ['curl-front', 'curl-lip', 'curl-inside']) {
  window.__patch(m, 'mask1', window.__out('vec3( vSweptStreak.z, clamp( vSweptThroat.w, 0.0, 1.0 ), 1.0 )')); await s(view, 'rich', 'midday', `mask1-${view}.png`);
  window.__patch(m, 'mask0', window.__out('vec3( vSweptStreak.z, clamp( vSweptThroat.w, 0.0, 1.0 ), 0.0 )')); await s(view, 'rich', 'midday', `mask0-${view}.png`);
  window.__patch(m, 'maskU', window.__out('vec3( fract( vSweptStreak.x / 4.0 ), fract( vSweptStreak.y / 4.0 ), vSweptStreak.w )')); await s(view, 'rich', 'midday', `maskU-${view}.png`);
  window.__patch(m, 'maskS', window.__out(`vec3( sweptStreakOwn / 0.85, ${THIN}, 0.5 )`)); await s(view, 'rich', 'midday', `maskS-${view}.png`);
}
window.__patch(m, '', null);
return window.waterSheetSeconds;
