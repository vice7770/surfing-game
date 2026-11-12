const s = window.__shoot; const m = window.__tube();
const THIN = 'vSweptSheetWeight * ( 1.0 - smoothstep( 0.040, 0.150, vSweptSheet ) )';
window.__patch(m, 'gatev', window.__out(`vec3( ( ${THIN} ) > 0.0 ? 1.0 : 0.0, clamp( ( ${THIN} ) * 4.0, 0.0, 1.0 ), sweptStreakOwn )`)); await s('curl-lip', 'rich', 'midday', 'gatev-lip.png');
window.__patch(m, '', null);
const r = window.waterSheetRenderer ?? null;
return { aa: document.querySelector('canvas')?.getContext ? 'canvas' : '', samples: window.waterSheetRenderer?.getContext?.()?.getContextAttributes?.() ?? null };
