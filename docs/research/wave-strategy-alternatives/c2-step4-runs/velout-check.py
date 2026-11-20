import json, struct, gzip, sys, glob, os
def read(p):
    b = open(p, 'rb').read()
    n = struct.unpack_from('<I', b, 4)[0]
    h = json.loads(b[8:8+n].decode())
    secs = {s['name']: (s['offset'], s['bytes']) for s in h['sections']}
    return b, h, secs
worst = 0.0; worstwhere = None; worstabs = 0.0; pairs = 0; nanmis = 0
for src in sorted(glob.glob(sys.argv[1] + '/*_c2.json.gz')):
    name = os.path.basename(src).replace('_c2.json.gz', '').replace('_', '-').lower()
    bp = f"{sys.argv[2]}/{name}.bin"
    d = json.load(gzip.open(src))
    b, h, secs = read(bp)
    nf = h['frames']; nd = len(h['velocityDepths']); o = secs['velocity'][0]
    cw = 0.0; ca = 0.0
    step = max(1, nf // 60)          # every ~60th frame: the whole file is 170k samples a case
    for k in range(0, nf, step):
        fr = d['frames'][k]
        if not fr.get('u'): continue
        base = o + k * 128 * nd * 2 * 2
        got = struct.unpack_from('<%de' % (128 * nd * 2), b, base)
        for i in range(128):
            for j in range(nd):
                for comp, arr in ((0, fr['u']), (1, fr['v'])):
                    row = arr[i]
                    a = row[j] if row is not None else None
                    g = got[(i * nd + j) * 2 + comp]
                    if a is None:
                        if g == g: nanmis += 1
                        continue
                    if g != g: nanmis += 1; continue
                    pairs += 1
                    dv = abs(g - a); ca = max(ca, dv)
                    r = dv / max(abs(a), 1e-3)
                    cw = max(cw, r)
    print(f"{name}: worst relative {cw:.5f}, worst absolute {ca:.6f}")
    if cw > worst: worst, worstwhere = cw, name
    worstabs = max(worstabs, ca)
print(f"ALL: pairs {pairs}, worst relative {worst:.5f} ({worstwhere}), worst absolute {worstabs:.6f} sqrt(g h0), NaN mismatches {nanmis}")
