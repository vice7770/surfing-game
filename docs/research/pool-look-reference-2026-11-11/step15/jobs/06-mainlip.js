const f = window.waterSheetShots.find((x) => x.name === 'curl-front');
const eye = f.eye.clone().sub(f.target).multiplyScalar(0.4).add(f.target);
await window.__shoot({ eye: eye.toArray(), target: f.target.toArray() }, 'rich', 'midday', 'f6-lip-midday.png');
return [eye.toArray(), f.target.toArray()];
