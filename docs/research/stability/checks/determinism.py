"""Determinism: two runs' rides.jsonl identical, and every ride file's rows identical but the wall-clock fields.
usage: python3 determinism.py <run A> <run B> [id prefix]"""
import glob, json, os, sys
a, b = sys.argv[1], sys.argv[2]
pre = sys.argv[3] if len(sys.argv) > 3 else ''
ra = {json.loads(l)['id']: l for l in open(f'{a}/rides.jsonl') if l.strip()}
rb = {json.loads(l)['id']: l for l in open(f'{b}/rides.jsonl') if l.strip()}
ids = sorted(i for i in set(ra) | set(rb) if i.startswith(pre))
same = [i for i in ids if ra.get(i) == rb.get(i)]
print(f'rides.jsonl: {len(same)} of {len(ids)} ride lines identical')
for i in ids:
    if ra.get(i) != rb.get(i):
        print('  differs:', i)
CLOCK = {'spinUp', 'seconds'}
nf = nrows = nsame = 0
for p in sorted(glob.glob(f'{a}/*.jsonl')):
    name = os.path.basename(p)
    if name == 'rides.jsonl' or not name.replace('_', ':').startswith(pre):
        continue
    q = f'{b}/{name}'
    if not os.path.exists(q):
        continue
    nf += 1
    la = [json.loads(l) for l in open(p)]
    lb = [json.loads(l) for l in open(q)]
    strip = lambda d: {k: v for k, v in d.items() if k not in CLOCK}
    nrows += max(len(la), len(lb))
    nsame += sum(1 for x, y in zip(la, lb) if strip(x) == strip(y))
print(f'ride files: {nf} compared, {nsame} of {nrows} rows identical (wall-clock fields spinUp and seconds left out)')
