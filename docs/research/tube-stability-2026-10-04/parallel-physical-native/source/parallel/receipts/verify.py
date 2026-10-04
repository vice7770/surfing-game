from pathlib import Path
import hashlib
import json

W = Path(__file__).resolve().parent
H = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def check(root, pins):
    for pin in pins:
        p = root / pin['path']
        assert p.stat().st_size == pin['bytes'] and H(p) == pin['sha256'], str(p)


parent = json.loads((W / 'parent-pins.json').read_text())
pre = json.loads((W / 'pre-validation-freeze.json').read_text())
ready = json.loads((W / 'readiness.json').read_text())
check(Path(parent['parent']), parent['files'])
check(W / 'source', pre['sourcePins'])
assert pre['sourcePins'] == ready['sourcePins']
assert H(W / 'recipe.json') == pre['recipeSHA256']
current = (W / 'source/src/wave/barrel/crestRays.ts').read_text()
old = (Path(parent['parent']) / 'src/wave/barrel/crestRays.ts').read_text()
start = current.index("    if (this.library.options.geometry === 'bounded-C') {", current.index('  private prepareBound()'))
after = current.index('      return;\n    }', start) + len('      return;\n    }')
end = current.index('    const last = this.count - 1;', after)
removed = current[:start] + current[end:]
removed = removed.replace("    if (this.library.options.geometry === 'bounded-C') { into[0] = 0; into[1] = 1; return into; }\n", '')
assert removed == old
commands = json.loads((W / 'commands.json').read_text())
assert all(c['exitCode'] == 0 for c in commands)
assert '246 passed | 1 skipped' in (W / 'first-focused.log').read_text()
assert (W / 'first-strict-ts.log').stat().st_size == 0
assert json.loads((W / 'consumer-mesh-receipt.json').read_text())['failures'] == []
assert not (W / 'cpu-cost-evidence.json').exists()
print(json.dumps({'pass': True, 'parentPins': len(parent['files']), 'sourcePins': len(pre['sourcePins']),
                  'RAWSourceBodyExact': True, 'runtimeSHA256': H(W / 'source/src/wave/barrel/crestRays.ts'),
                  'runtimePatchSHA256': H(W / 'runtime.patch'), 'readinessSHA256': H(W / 'readiness.json')}))
