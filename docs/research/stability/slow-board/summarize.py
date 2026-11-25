"""3.6a part 2: the tables of `results.md` from identify.ts's JSON outputs (README §0.6, §0.8, §0.9).

    python3 summarize.py <dir>   # reads fit.json, val.json, check.json, and rec-K1/, rec-K2/ (fit.json, val.json,
                                 # check.json each) from <dir>; prints Markdown and writes <dir>/final.json
"""
import json
import os
import sys

DEG = 180 / 3.141592653589793
STATES = ['φ', 'φ̇', 'θ', 'θ̇', 'r', 'β', 'θ_t', 'ω_u', 'δ', 'τ_a']
DECIDING = [0, 2, 4, 5]
HZ = ['6', '15', '30']
ORDER = ['tall', 'crouch', 'compress', 'tuck']


def key(cell):
    b, g = cell.split('|')
    return (ORDER.index(g), float(b.split('-')[0]))


def load(path):
    return json.load(open(path)) if os.path.exists(path) else None


def d(x):
    return '—' if x is None else ('div' if x <= -0.999 else f'{x:+.2f}')


def recovery(rec, known_name):
    """Per cell: (a) the recovered plant's n-step RMS over the known plant's own, worst over φ, θ, r, β and horizons; (b) the check."""
    out = {}
    if not rec:
        return out
    val = {v['cell']: v for v in rec['val']}
    for c in rec['check']:
        cell = c['cell']
        v = val.get(cell)
        ratio = None
        if v and v['enough'] and v['rms']['id'][HZ[0]]:
            ratio = max(v['rms']['id'][h][i] / max(1e-300, v['rms']['known'][h][i]) for h in HZ for i in DECIDING if v['rms']['id'][h] and v['rms']['known'][h])
        worst, sign_ok, div_ok = 0.0, True, True
        for arm in ('A', 'R'):
            for ts in ('5', '6', '7'):
                got, want = c[arm][ts][0], c[f'known{arm}'][ts][0]
                if got is None or want is None:
                    sign_ok = False
                    continue
                gd, wd = got <= -0.999, want <= -0.999
                if gd != wd:
                    div_ok = False
                    continue
                if not gd:
                    worst = max(worst, abs(got - want))
                    if abs(want) >= 0.05 and (got > 0) != (want > 0):
                        sign_ok = False
        pass_a = ratio is not None and ratio <= 1.25
        pass_b = worst <= 0.10 and sign_ok and div_ok
        out[cell] = {'ratio': ratio, 'worst': worst, 'sign': sign_ok, 'div': div_ok, 'a': pass_a, 'b': pass_b, 'pass': pass_a and pass_b, 'enough': bool(v and v['enough'])}
    return out


def main():
    root = sys.argv[1]
    fit = load(os.path.join(root, 'fit.json'))
    val = {v['cell']: v for v in load(os.path.join(root, 'val.json'))}
    chk = {c['cell']: c for c in load(os.path.join(root, 'check.json'))}
    recs = {}
    for k in ('K1', 'K2'):
        p = os.path.join(root, f'rec-{k}')
        if os.path.exists(os.path.join(p, 'check.json')):
            recs[k] = recovery({'val': load(os.path.join(p, 'val.json')), 'check': load(os.path.join(p, 'check.json'))}, k)
    fits = sorted(fit['fits'], key=lambda f: key(f['cell']))
    print('## The cells (identification data, seeds 1–3)\n')
    print('| cell | pairs | rides | median v / depth | |φ| > 20° | κ | VIF δ̄ / τ̄ | R² φ̇, θ̇, r, β, ω_u |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for f in fits:
        r2 = ', '.join(f'{f["r2"][i]:.3f}' for i in (1, 3, 4, 5, 7))
        print(f"| {f['cell']}{'' if f['enough'] else ' (no data)'} | {f['pairs']} | {f['rides']} | {f['medV']:.2f} / {f['medDep']:.3f} | {100 * f['bigRoll']:.0f} % | {f['kappa']:.0f} | {f['vif'][8]:.1f} / {f['vif'][9]:.1f} | {r2} |")
    print('\n## The validation (held out: seeds 4–9 and the test wave), RMS error at 0.1 / 0.25 / 0.5 s\n')
    print('Deciding states, deg or deg/s: identified / `table` / `game` / persistence. Pass: the identified plant below both truths on all twelve.\n')
    print('| cell | starts (rides) | φ | θ | r | β | pass | beats persistence at 0.25 s on φ, θ, r |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for cell in sorted(val, key=key):
        v = val[cell]
        cols = []
        for i in DECIDING:
            parts = []
            for h in HZ:
                if not v['rms']['id'][h]:
                    parts.append('—')
                    continue
                parts.append('/'.join(f"{v['rms'][m][h][i] * DEG:.2f}" for m in ('id', 'table', 'game', 'persist')))
            cols.append('<br>'.join(parts))
        verdict = 'no data' if not v['enough'] else ('**pass**' if v['pass'] else 'fail: ' + ', '.join(v['fails']))
        print(f"| {cell} | {v['starts']} ({v['rides']}) | {' | '.join(cols)} | {verdict} | {'yes' if v['skill'] else 'no'} |")
    if recs:
        print('\n## The known-plant recovery (§0.8)\n')
        print('(a) the recovered plant\'s n-step RMS over the known plant\'s own, worst of φ, θ, r, β × 3 horizons (≤ 1.25); (b) the check on the recovered plant against the known plant: worst |Δ| of A and R at 5, 6, 7 ticks (≤ 0.10), signs, div.\n')
        print('| cell | K1 (a) | K1 (b) | K1 | K2 (a) | K2 (b) | K2 |')
        print('| --- | --- | --- | --- | --- | --- | --- |')
        cells = sorted(set().union(*[set(r) for r in recs.values()]), key=key)
        for cell in cells:
            row = [cell]
            for k in ('K1', 'K2'):
                r = recs.get(k, {}).get(cell)
                if not r:
                    row += ['—', '—', '—']
                    continue
                row += [('—' if r['ratio'] is None else f"{r['ratio']:.2f}"), f"{r['worst']:.2f}{'' if r['sign'] else ', sign'}{'' if r['div'] else ', div'}", '**pass**' if r['pass'] else 'fail']
            print('| ' + ' | '.join(row) + ' |')
    print('\n## The check: least damping at 5 / 6 / 7 ticks (−1 = div, a real root outside the unit circle)\n')
    print('| cell | validated | recovered (K1, K2) | A identified | R identified | A (IV) at 6 | A bootstrap 5–50–95 % at 6 | A on `table` | A on `game` | identified open loop, leading s (1/s) |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    final = []
    for cell in sorted(chk, key=key):
        c = chk[cell]
        v = val.get(cell)
        validated = bool(v and v['pass'])
        rk = [recs.get(k, {}).get(cell, {}).get('pass', False) for k in ('K1', 'K2')]
        f = next(x for x in fits if x['cell'] == cell)
        boot = c.get('boot') or [None, None, None]
        credible = validated and all(rk) and f['kappa'] <= 1e4 and f['vif'][8] <= 100 and bool(v and v['skill']) and boot[0] is not None and ((boot[0] > 0) == (boot[2] > 0))
        lead = c['open'][0]
        print(f"| {cell} | {'yes' if validated else 'no'} | {'/'.join('yes' if x else 'no' for x in rk)} | {' / '.join(d(c['A'][t][0]) for t in ('5', '6', '7'))} | {' / '.join(d(c['R'][t][0]) for t in ('5', '6', '7'))} | {d(c['Aiv']['6'][0]) if c.get('Aiv') else '—'} | {' '.join(d(x) for x in boot)} | {' / '.join(d(c['tableA'][t][0]) for t in ('5', '6', '7'))} | {' / '.join(d(c['gameA'][t][0]) for t in ('5', '6', '7'))} | {lead[0]:+.2f}{'' if abs(lead[1]) < 1e-6 else f' ± {abs(lead[1]):.2f}i'} |")
        final.append({**c, 'validated': validated, 'recovered': rk, 'passed': validated and all(rk), 'credible': credible})
    json.dump(final, open(os.path.join(root, 'final.json'), 'w'))


if __name__ == '__main__':
    main()
