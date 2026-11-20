// The one retune (ruling 25c): the lace cell 0.25 -> 0.15 m (its range 0.15-0.35), in the page on the same frame.
const s = window.__shoot; const m = window.__tube();
const A = 'vec2 laceCells = vSweptStreak.xy * 4.0000;', B = 'vec2 laceCells = vSweptStreak.xy * 6.6667;';
const re = (sh) => { if (!sh.fragmentShader.includes(A)) throw new Error('no lace line'); sh.fragmentShader = sh.fragmentShader.replace(A, B); };
const off = (sh) => { sh.fragmentShader = sh.fragmentShader.replace(window.__off[0], window.__off[1]); };
const THIN = 'vSweptSheetWeight * ( 1.0 - smoothstep( 0.040, 0.150, vSweptSheet ) )';
for (const [v, t] of [['curl-lip', 'midday'], ['curl-front', 'midday'], ['curl-inside', 'midday'], ['curl-lip', 'sunset']]) {
  window.__patch(m, 're15', re); await s(v, 'rich', t, `re-${v.replace('curl-', '')}-${t}.png`);
}
for (const view of ['curl-front', 'curl-lip', 'curl-inside']) {
  window.__patch(m, 'remaskS', (sh) => { re(sh); window.__out(`vec3( sweptStreakOwn / 0.85, ${THIN}, 0.5 )`)(sh); }); await s(view, 'rich', 'midday', `remaskS-${view}.png`);
}
window.__patch(m, '', null);
return 1;
