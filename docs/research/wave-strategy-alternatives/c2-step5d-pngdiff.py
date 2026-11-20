"""Two 8-bit PNGs, pixel by pixel: how many differ by more than tol of 255 in any channel, and where."""
import sys, zlib, struct

def read_png(path):
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', path
    pos = 8
    idat = b''
    w = h = bits = colour = None
    while pos < len(data):
        (length,) = struct.unpack('>I', data[pos:pos+4])
        kind = data[pos+4:pos+8]
        body = data[pos+8:pos+8+length]
        if kind == b'IHDR':
            w, h, bits, colour, comp, filt, inter = struct.unpack('>IIBBBBB', body)
            assert bits == 8 and inter == 0, (bits, inter)
        elif kind == b'IDAT':
            idat += body
        elif kind == b'IEND':
            break
        pos += 12 + length
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[colour]
    raw = zlib.decompress(idat)
    stride = w * channels
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if f == 1:
            for i in range(channels, stride): line[i] = (line[i] + line[i-channels]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i-channels] if i >= channels else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-channels] if i >= channels else 0
                b = prev[i]
                c = prev[i-channels] if i >= channels else 0
                pp = a + b - c
                pa, pb, pc = abs(pp-a), abs(pp-b), abs(pp-c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    return w, h, channels, bytes(out)

a, b = sys.argv[1], sys.argv[2]
tol = int(sys.argv[3]) if len(sys.argv) > 3 else 2
wa, ha, ca, da = read_png(a)
wb, hb, cb, db = read_png(b)
assert (wa, ha) == (wb, hb), ((wa, ha), (wb, hb))
n = 0; total = 0; worst = 0; brighter = 0
box = [10**9, 10**9, -1, -1]
for y in range(ha):
    for x in range(wa):
        i = (y*wa + x)*ca
        j = (y*wb + x)*cb
        d = max(abs(da[i]-db[j]), abs(da[i+1]-db[j+1]), abs(da[i+2]-db[j+2]))
        if d <= tol: continue
        n += 1; total += d; worst = max(worst, d)
        if da[i]+da[i+1]+da[i+2] > db[j]+db[j+1]+db[j+2]: brighter += 1
        box[0] = min(box[0], x); box[1] = min(box[1], y); box[2] = max(box[2], x); box[3] = max(box[3], y)
print({'a': a.split('/')[-1], 'b': b.split('/')[-1], 'pixels': wa*ha, 'differing': n,
       'share': round(n/(wa*ha), 5), 'meanDelta': round(total/n, 1) if n else 0, 'worst': worst,
       'brighterInA': brighter, 'box': box if n else None})
