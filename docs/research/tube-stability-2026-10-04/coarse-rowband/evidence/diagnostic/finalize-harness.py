from pathlib import Path
W=Path('/private/tmp/surf-tube-rowband-diagnostic-20261004')
s=(W/'entry.ts').read_text()
s=s.replace("  const pngCanvas = document.createElement('canvas'); pngCanvas.width = WIDTH; pngCanvas.height = HEIGHT;\n  const pngContext = pngCanvas.getContext('2d'); assert(pngContext, 'Lossless raw-RGBA PNG encoder unavailable');\n  const pngImage = pngContext.createImageData(WIDTH, HEIGHT);\n",'')
s=s.replace('const uniforms = (water as unknown as PassiveWater).uniforms', "const uniforms = water.materialUniforms as unknown as PassiveWater['uniforms']")
s=s.replace('Read actual existing owner fields without calling mutating mask-grid getters or cache hooks.', 'Read the pure materialUniforms getter without mutating mask-grid getters or cache hooks.')
a=s.index('      // Lossless PNG encodes ');b=s.index('      const loft = ',a)
s=s[:a]+s[b:]
a=s.index('        payload: { rgbaBase64:');b=s.index('        primaryGeometry:',a)
s=s[:a]+"        payload: { rgbaBase64: base64(retained) },\n"+s[b:]
s=s.replace("const gpu = materialProperties.currentProgram;", "const gpu = materialProperties.currentProgram;\n    const shaderSource = (shader: WebGLShader) => gl.isShader(shader) ? gl.getShaderSource(shader) : null;")
s=s.replace('textHash(gl.getShaderSource(gpu.vertexShader))','textHash(shaderSource(gpu.vertexShader))').replace('textHash(gl.getShaderSource(gpu.fragmentShader))','textHash(shaderSource(gpu.fragmentShader))')
(W/'entry.ts').write_text(s)
s=(W/'device-gate.mjs').read_text().replace("import { spawn } from 'node:child_process';", "import { spawn } from 'node:child_process';\nimport { deflateSync } from 'node:zlib';")
pos=s.index('function comparePixels(')
encoder='''// Ordinary lossless PNG file encoding of SAVED raw RGBA; the only transform is WebGL bottom-up→PNG top-down row order.
// No canvas/compositor, premultiplication, color conversion, resizing, or renderer mutation is involved.
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function pngChunk(type, bytes) {
  const tag = Buffer.from(type, 'ascii'), head = Buffer.alloc(4), tail = Buffer.alloc(4); head.writeUInt32BE(bytes.length);
  let crc = 0xffffffff; for (const value of Buffer.concat([tag, bytes])) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
  tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0); return Buffer.concat([head, tag, bytes, tail]);
}
function framebufferPNG(rgba, width, height) {
  if (rgba.length !== width * height * 4) throw Error('Saved normal RGBA byte dimensions differ');
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = width * 4, rows = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(rows, y * (stride + 1) + 1, (height - y - 1) * stride, (height - y) * stride);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', Buffer.alloc(0))]);
}
'''
s=s[:pos]+encoder+s[pos:]
s=s.replace("const payload = frame.payload, rgba = Buffer.from(payload.rgbaBase64, 'base64'), png = Buffer.from(payload.pngBase64, 'base64');", "const payload = frame.payload, rgba = Buffer.from(payload.rgbaBase64, 'base64');\n      const png = framebufferPNG(rgba, frame.framebuffer.width, frame.framebuffer.height);")
s=s.replace('encoding: payload.pngEncoding', "encoding: 'Lossless PNG RGBA8 from saved raw bytes, only bottom-up→top-down rows; node:zlib DEFLATE, no compositor/color conversion/resizing.'")
s=s.replace(" || png.length !== payload.pngBytes || sha256(png) !== payload.pngSha256", '')
(W/'device-gate.mjs').write_text(s)
