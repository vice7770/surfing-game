const s = window.__shoot; const m = window.__tube();
const off = (sh) => { sh.fragmentShader = sh.fragmentShader.replace(window.__off[0], window.__off[1]); };
const terms = { alb: 'diffuseColor.rgb * 0.5', dif: '( reflectedLight.directDiffuse + reflectedLight.indirectDiffuse ) * 0.25', emi: 'totalEmissiveRadiance * 0.25', spec: '( reflectedLight.directSpecular + reflectedLight.indirectSpecular ) * 0.25' };
for (const [k, e] of Object.entries(terms)) for (const t of ['midday', 'sunset']) {
  window.__patch(m, 't' + k + t, window.__out(e)); await s('curl-lip', 'rich', t, `t-${k}-on-${t}.png`);
  window.__patch(m, 't' + k + t + 'o', (sh) => { off(sh); window.__out(e)(sh); }); await s('curl-lip', 'rich', t, `t-${k}-off-${t}.png`);
}
window.__patch(m, '', null);
return 1;
