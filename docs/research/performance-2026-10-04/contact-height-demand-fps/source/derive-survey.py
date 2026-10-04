#!/usr/bin/env python3
"""Guarded text derivation only; never executes the survey or checks its syntax."""
from pathlib import Path
import difflib
import hashlib
import json

ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
WORK = Path('/private/tmp/contact-height-demand-fps-20261004')
source_path = ROOT / 'scripts/browser/fps-survey.mjs'
source = source_path.read_text()
derived = source
operations = []

def replace(label, before, after):
    global derived
    count = derived.count(before)
    if count != 1:
        raise RuntimeError(f'Guarded patch requires exactly one {label} match, found {count}')
    derived = derived.replace(before, after, 1)
    operations.append({'label': label, 'exactMatches': count, 'before': before, 'after': after})

replace('native launcher import', "import { launch, sleep } from './cdp.mjs';", "import { launch, sleep } from './native-owned.mjs';\nimport { AUDIT_PRELUDE, NativePassiveGuard, ordinaryNativePlan } from './passive-guard.mjs';")
start = derived.index('function ordinaryPlan() {')
end = derived.index('/** Graphics.PRESETS, kept in step by hand', start)
replace('ordinary observed-native plan', derived[start:end], "function ordinaryPlan() {\n  return ordinaryNativePlan({ args, pageUrl: PAGE_URL, swell: SWELL, gpuTimers: GPU_TIMERS, gpuDiagnostic: GPU_DIAGNOSTIC, rideSeconds: RIDE_SECONDS, preset: PRESET_VALUES.high, edition: EDITION });\n}\n\n")
replace('read-only guard instance', "const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');", "const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');\nconst passiveGuard = new NativePassiveGuard({ output: dirname(resolve(OUT)), baseline: BASELINE });")
replace('exclude menu practice worker from sampled publications', "if (perf.sampling) perf.snapshots.push({ wall: performance.now(), sea: status.seaTime, pipeline: status.pipelineMs });", "if (perf.sampling && this === window.breaklineDiagnostics?.mode?.host?.port && document.querySelector('#app')?.dataset.screen === 'ride') perf.snapshots.push({ wall: performance.now(), sea: status.seaTime, pipeline: status.pipelineMs });")
replace('native worker start observation', "await page.send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT });", "await page.send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT });\nawait page.send('Page.addScriptToEvaluateOnNewDocument', { source: AUDIT_PRELUDE });")
replace('record initial native dimensions without requiring canonical pixels', "if (ordinary && (browser.viewport !== ordinary.expectedViewport || browser.devicePixelRatio !== ordinary.expectedBrowserDpr)) {\n  throw new Error(`Ordinary viewport/DPR mismatch before gameplay: ${browser.viewport} / ${browser.devicePixelRatio}`);\n}", "if (browser.devicePixelRatio !== 2) throw new Error(`Initial native DPR differs: ${browser.devicePixelRatio}`);")
replace('outer finalizer-visible metadata binding', "let save = () => {};\ntry {", "let save = () => {};\nlet run;\ntry {")
replace('assign outer metadata binding without shadowing', "const run = { date: new Date().toISOString(),", "run = { date: new Date().toISOString(),")
replace('guard before and after exact original passive sample', "  await sleep(warmMs);\n  const stats = await sample(seconds);", "  await sleep(warmMs);\n  await passiveGuard.observe('sample-start', page, ordinary);\n  const stats = await sample(seconds);\n  await passiveGuard.observe('sample-end', page, ordinary);")
replace('record menu reference before ordinary route', "      await load(graphics);\n      await sleep(1500);", "      await load(graphics);\n      await passiveGuard.observe('menu', page, ordinary, true);\n      await sleep(1500);")
replace('guarded finalizer including early failure before metadata', "} finally {\n  save();\n  await page.close();\n}", "} finally {\n  if (run) {\n    run.nativeAudit = passiveGuard.finish(run);\n    run.valid = run.nativeAudit.valid;\n    save();\n  } else {\n    passiveGuard.state.firstFailure ??= { phase: 'before-survey-metadata', message: 'Early operation failed; original command stderr and launcher evidence retained by serial driver' };\n    passiveGuard.save();\n  }\n  await page.close();\n}\n")

def block(text, begin, end):
    start = text.index(begin)
    return text[start:text.index(end, start)].encode()

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

preserved = []
for label, begin, end in [
    ('all original numerical statistics', 'function quantile(values, q)', '/** Optional immutable-build check'),
    ('original passive sample', 'async function sample(seconds)', 'async function measure(setting'),
    ('original settings/menu load', 'async function load(graphics)', 'const SOLVER ='),
    ('original ordinary menu-to-ride route and quit', 'async function ride(setting', '/** Run one step;'),
]:
    before, after = block(source, begin, end), block(derived, begin, end)
    if before != after:
        raise RuntimeError('Unexpected change to preserved source block: ' + label)
    preserved.append({'label': label, 'bytes': len(before), 'sha256': sha(before), 'sourceBytesIdentical': True})

for name, raw in [
    ('survey.mjs', derived.encode()),
    ('survey.patch', ''.join(difflib.unified_diff(source.splitlines(True), derived.splitlines(True), fromfile='original/scripts/browser/fps-survey.mjs', tofile='owned/survey.mjs')).encode()),
    ('derivation.json', (json.dumps({'original': {'path': str(source_path), 'bytes': len(source.encode()), 'sha256': sha(source.encode())}, 'derived': {'path': str(WORK / 'survey.mjs'), 'bytes': len(derived.encode()), 'sha256': sha(derived.encode())}, 'operations': operations, 'preserved': preserved, 'execution': 'NOT_RUN; text derivation only'}, indent=2) + '\n').encode()),
]:
    target = WORK / name
    if target.exists():
        raise RuntimeError('Refusing to overwrite prepared source: ' + str(target))
    target.write_bytes(raw)
print(json.dumps({'operations': len(operations), 'preservedBlocks': len(preserved), 'surveyBytes': len(derived.encode()), 'surveySha256': sha(derived.encode())}))
