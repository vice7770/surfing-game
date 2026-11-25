"""Inertness on the test wave: the benchmark's tw-catch none:straight and compress:straight frame rows against 3.5x's saved
catch runs (3.5v's sideways-falls.ts, RUN 0, cue and cueC, `&cueLater=on&plantFloor=6`, held 3 s).
usage: python3 inert_catch.py <run dir>"""
import json, sys
S = '/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad'
for mine, ref in (('tw-catch_none_straight.jsonl', 'c-cue-on-pf6-0.jsonl'), ('tw-catch_compress_straight.jsonl', 'c-cueC-on-pf6-0.jsonl')):
    a = [json.loads(l) for l in open(f'{sys.argv[1]}/{mine}')]
    b = [json.loads(l) for l in open(f'{S}/35x/catch/{ref}')]
    sa = next(r for r in a if r['kind'] == 'summary'); sb = next(r for r in b if r['kind'] == 'summary')
    fa = {r['t']: r for r in a if r['kind'] == 'f'}
    fb = {r['t']: r for r in b if r['kind'] == 'f' and r.get('tS') is not None and r['tS'] >= 0}
    common = sorted(set(fa) & set(fb))
    diff = [t for t in common if (fa[t]['vW'], fa[t]['vG'], fa[t]['ph']) != (fb[t]['vW'], fb[t]['vG'], fb[t]['ph'])]
    print(f'{mine} vs {ref}: cue {sa["cue"]} / {sb["cue"]}, stand {sa["stand"]} / {sb["stand"]}, fell {sa["fellAfterStand"]} / {sb["fellAfterStand"]} (ref held 3 s); '
          f'{len(common)} common standing frames (tS 0-{max(fb[t]["tS"] for t in common):.2f} s), vW, vG and phase identical on {len(common) - len(diff)}')
