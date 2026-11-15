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
