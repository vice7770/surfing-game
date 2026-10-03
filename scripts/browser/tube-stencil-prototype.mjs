// Isolated prototype driver. The committed frozen harness is never modified.
// node scripts/browser/tube-stencil-prototype.mjs --plan
// After coordinating exclusive GPU use, add --url/--dir/--out as for tube-frozen-render.
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { installStencilOwnership } from './tube-stencil-helper.mjs';

const root = resolve(import.meta.dirname, '../..');
const basePath = join(root, 'scripts/browser/tube-frozen-render.mjs');
const helperPath = join(root, 'scripts/browser/tube-stencil-helper.mjs');
const sha = value => createHash('sha256').update(value).digest('hex');
const base = readFileSync(basePath, 'utf8');
let derived = base;
const patches = [];
function patch(name, before, after) {
  if (derived.split(before).length !== 2) throw Error('Committed frozen harness marker changed: ' + name);
  derived = derived.replace(before, after);
  patches.push({ name, beforeSha256: sha(before), afterSha256: sha(after) });
}
patch('absolute-cdp-import', "from './cdp.mjs'", `from ${JSON.stringify(pathToFileURL(join(root, 'scripts/browser/cdp.mjs')).href)}`);
patch('stencil-before-context', '(()=>{let seed=0x5eed;', `(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,options){return original.call(this,kind,kind==='webgl2'?{...options,stencil:true}:options);};let seed=0x5eed;`);
patch('install-isolated-helper', "  return { initializedCompute: 'cpu' };", `  const stencil = (${installStencilOwnership.toString()})({ d, mode, water, mesh, hash, getDiagnostic:()=>diagnostic, getCurrent:()=>current, diagnosticRender });
  return { initializedCompute: 'cpu', stencil };`);
patch('same-current-reference-geometry', 'const baseline = readGeometry(join(baselineDir, `at-${at}.baseline.json`), data, inputHash);',
  'const baseline = readGeometry(join(baselineDir, `at-${at}.current.json`), data, inputHash);');
patch('same-current-camera', "JSON.parse(readFileSync(join(baselineDir, `at-${at}.baseline.json`)))", "JSON.parse(readFileSync(join(baselineDir, `at-${at}.current.json`)))");
patch('same-current-geometry-check', "if (fixtures.some(f => !sameGrid", "if (fixtures.some(f => !f.current || f.baseline.metadata.geometryHash !== f.current.metadata.geometryHash || f.baseline.metadata.maskSha256 !== f.current.metadata.maskSha256)) throw Error('Stencil prototype requires identical current geometry/mask for reference and candidate');\nif (fixtures.some(f => !sameGrid");
patch('normal-variant-switch', '    for (const mode of plan.sequence) {', `    for (const mode of plan.sequence) {
      await bounded(page.eval(\`window.__tubeStencil.set(\${JSON.stringify(mode === 'current' ? 'stencil' : 'world')})\`), 'stencil normal variant');`);
patch('diagnostic-variant-switch', "        const held = await bounded(page.eval('window.__tubeFrozen.render(false)'), 'diagnostic held signature');", `        await bounded(page.eval(\`window.__tubeStencil.set(\${JSON.stringify(variant === 'current' ? 'stencil' : 'world')})\`), 'stencil diagnostic variant');
        const held = await bounded(page.eval('window.__tubeFrozen.render(false)'), 'diagnostic held signature');`);
patch('solid-pass-keeps-original-sampling', "          const state = await bounded(page.eval(`window.__tubeFrozen.diagnosticRender(${JSON.stringify(pass)})`), 'diagnostic ' + pass);", `          await bounded(page.eval(\`window.__tubeStencil.set(\${JSON.stringify(variant === 'current' && !pass.startsWith('swept-') ? 'stencil' : 'world')})\`), 'stencil pass mode');
          const state = await bounded(page.eval(\`window.__tubeFrozen.diagnosticRender(\${JSON.stringify(pass)})\`), 'diagnostic ' + pass);`);
patch('remember-ids-before-reset', "        const result = await bounded(page.eval('window.__tubeFrozen.finishDiagnostic()'), 'diagnostic ID comparison and source export');", `        await bounded(page.eval(\`window.__tubeStencil.remember(\${JSON.stringify(variant)})\`), 'remember ownership IDs');
        const result = await bounded(page.eval('window.__tubeFrozen.finishDiagnostic()'), 'diagnostic ID comparison and source export');
        await bounded(page.eval(\`window.__tubeStencil.set(\${JSON.stringify(variant === 'current' ? 'stencil' : 'world')})\`), 'restore stencil variant');`);
const controls = `      const ownershipControls = [];
      for (const [name, renderMode, hide, inactive] of [['orderOnly','order',false,false],['reference','world',true,true],['inactive','stencil',false,true],['hidden','stencil',true,false]]) {
        ownershipControls.push(await bounded(page.eval(\`window.__tubeStencil.captureControl(\${JSON.stringify(name)},\${JSON.stringify(renderMode)},\${hide},\${inactive})\`), 'ownership control '+name));
        const screenshot = await bounded(page.send('Page.captureScreenshot',{format:'png'}),'control screenshot');
        writeFileSync(join(out,\`at-\${fixture.at}.control-\${name}.png\`),Buffer.from(screenshot.data,'base64'));
      }
      report.pairs.at(-1).ownership = { controlStates: ownershipControls, ...await bounded(page.eval('window.__tubeStencil.summary()'),'ownership summary') };
      const focus = await bounded(page.eval('window.__tubeStencil.focus()'),'focused roof location');
      report.pairs.at(-1).ownership.focus = focus;
      for (const renderMode of ['world','stencil']) {
        await bounded(page.eval(\`window.__tubeStencil.set(\${JSON.stringify(renderMode)});window.__tubeFrozen.finishDiagnostic()\`),'normal output restoration');
        await bounded(page.eval('window.__tubeFrozen.render(false)'),'focused normal render');
        for (const [region,location] of Object.entries(focus)) {
          const screenshot = await bounded(page.send('Page.captureScreenshot',{format:'png',clip:location.clip}),'focused roof/mouth screenshot');
          writeFileSync(join(out,\`at-\${fixture.at}.focus-\${region}-\${renderMode}.png\`),Buffer.from(screenshot.data,'base64'));
        }
      }
      await bounded(page.eval("window.__tubeStencil.set('world')"),'original world-mask restoration');
`;
// finishDiagnostic requires all passes; controls changed only masked-ids. For normal
// crops, simply switch its existing output uniform instead of rerunning comparison.
const safeControls = controls.replace("window.__tubeFrozen.finishDiagnostic()", "window.__tubeStencil.normalOutput()");
patch('controls-and-focused-normal', "      await bounded(page.eval(`window.__tubeFrozen.setGeometry(${JSON.stringify(fixture.baseline.payload)})`), 'post-diagnostic baseline upload');", safeControls + "      await bounded(page.eval(`window.__tubeFrozen.setGeometry(${JSON.stringify(fixture.baseline.payload)})`), 'post-diagnostic baseline upload');");
const metadata = { basePath, baseSha256: sha(base), helperPath, helperSha256: sha(readFileSync(helperPath)), patches,
  method: 'Same current continuous-plan geometry in both variants. Reference retains original world-mask rejection; prototype uses exact surviving swept screen samples with seabed depth first. Fixed caustic FBO is an isolated optics input.',
  productionChanged: false };
patch('prototype-provenance', "const plan = { schema: 1,", `const plan = { prototype: ${JSON.stringify(metadata)}, schema: 1,`);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
new AsyncFunction(derived.replace(/^import .*;$/gm, '').replace(/import\.meta/g, '({})')); // syntax check without launching Chrome
const runArgs = process.argv.slice(2);
if (runArgs.includes('--baseline-only=true') || runArgs.includes('--mask-diagnostic=false') || runArgs.includes('--freeze-caustics=false')) throw Error('Prototype requires both variants and fixed caustic/object-ID diagnostics');
for (const [key, value] of Object.entries({ 'mask-diagnostic': 'true', 'freeze-caustics': 'true', cdp: '9465' })) {
  if (!runArgs.some(a => a.startsWith('--' + key + '='))) runArgs.push('--' + key + '=' + value);
}
if (!runArgs.some(a => a.startsWith('--timeoutSeconds='))) runArgs.push('--timeoutSeconds=60');
if (Number(runArgs.find(a => a.startsWith('--timeoutSeconds=')).split('=')[1]) > 60) throw Error('Prototype is bounded to 60 seconds');
const scratch = mkdtempSync('/private/tmp/tube-stencil-driver-');
const script = join(scratch, 'derived-harness.mjs');
writeFileSync(script, derived);
const outArg = runArgs.find(a => a.startsWith('--out='));
const out = resolve(outArg?.slice(6) ?? '/private/tmp/tube-stencil-prototype');
if (!outArg) runArgs.push('--out=' + out);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'prototype-driver.json'), JSON.stringify({ ...metadata, derivedSha256: sha(derived), args: runArgs }, null, 2) + '\n');
try {
  const child = spawn(process.execPath, [script, ...runArgs], { cwd: root, stdio: 'inherit' });
  process.exitCode = await new Promise((resolveExit, reject) => { child.once('error', reject); child.once('exit', code => resolveExit(code ?? 1)); });
} finally { rmSync(scratch, { recursive: true, force: true }); }
