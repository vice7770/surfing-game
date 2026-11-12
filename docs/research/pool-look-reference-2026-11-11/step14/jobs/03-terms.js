const m = window.__tube();
const F = window.__full;
const terms = { out: 'outgoingLight', alb: 'diffuseColor.rgb', dd: 'reflectedLight.directDiffuse', id: 'reflectedLight.indirectDiffuse',
  sp: 'reflectedLight.directSpecular + reflectedLight.indirectSpecular', em: 'totalEmissiveRadiance',
  ndl: 'vec3( max( 0.0, dot( normalize( normal ), normalize( ( viewMatrix * vec4( waterSunDirection, 0.0 ) ).xyz ) ) ), max( 0.0, -dot( normalize( normal ), normalize( ( viewMatrix * vec4( waterSunDirection, 0.0 ) ).xyz ) ) ), 0.0 )' };
window.__patch(m, 'full', (sh) => { sh.fragmentShader = sh.fragmentShader.replace(F[0], F[1]); });
await window.__shoot('curl-lip', 'rich', 'midday', 'full-lip-midday.png');
await window.__shoot('curl-front', 'rich', 'midday', 'full-front-midday.png');
for (const [k, e] of Object.entries(terms)) {
  window.__patch(m, 'full-' + k, window.__out(`( ${e} ) / 4.0`, [F]));
  await window.__shoot('curl-lip', 'rich', 'midday', `dbg-full-${k}-lip.png`);
}
for (const [k, e] of Object.entries(terms)) {
  window.__patch(m, 'base-' + k, window.__out(`( ${e} ) / 4.0`));
  await window.__shoot('curl-lip', 'rich', 'midday', `dbg-base-${k}-lip.png`);
}
window.__patch(m, '', null);
return true;
