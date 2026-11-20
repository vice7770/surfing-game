const m = window.__tube();
const s = window.waterSheetShots.find((x) => x.name === 'curl-lip');
const view = { eye: s.eye.toArray(), target: s.target.toArray() };
const set = async (tag) => {
  window.__patch(m, 'f5w-' + tag, window.__out('vec3( sweptStreakOwn / 0.85, fract( vWaterWorld.x / 4.0 ), fract( vSweptStreak.x / 4.0 ) )'));
  await window.__shoot(view, 'rich', 'midday', `f5w-maskS-${tag}.png`);
  window.__patch(m, 'f5wm1-' + tag, window.__out('vec3( vSweptStreak.z, clamp( vSweptThroat.w, 0.0, 1.0 ), 1.0 )'));
  await window.__shoot(view, 'rich', 'midday', `f5w-mask1-${tag}.png`);
  window.__patch(m, 'f5wm0-' + tag, window.__out('vec3( vSweptStreak.z, clamp( vSweptThroat.w, 0.0, 1.0 ), 0.0 )'));
  await window.__shoot(view, 'rich', 'midday', `f5w-mask0-${tag}.png`);
};
await set('a');
const t1 = await window.waterSheetStep(0.1);
await set('b');
window.__patch(m, '', null);
return { t1 };
