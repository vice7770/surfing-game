import sys,re
root=sys.argv[1]
def sub(path, old, new, count=1):
    p=root+'/'+path; s=open(p).read()
    if s.count(old)<1: raise SystemExit('missing in '+path+': '+old[:60])
    s=s.replace(old,new,count); open(p,'w').write(s)
L='src/wave/barrel/sweptLoft.ts'
sub(L,"  seam?: Float32Array;\n}","  seam?: Float32Array;\n  /** Ruling 7 prototype: the hand-over's own rise at the vertex, m/s: the share's time rate times its height. */\n  rise?: Float32Array;\n}")
sub(L,"  private readonly seamBandRow = new Float64Array(MAX_SLICES + 1);","  private readonly seamBandRow = new Float64Array(MAX_SLICES + 1);\n  private readonly seamRateRow = new Float64Array(MAX_SLICES + 1);\n  private seamRate = 0;")
sub(L,"...(options.face.seam ? { seam: new Float32Array(vertices) } : {}),","...(options.face.seam ? { seam: new Float32Array(vertices), rise: new Float32Array(vertices) } : {}),")
sub(L,"        this.seamTauRow[slice] = seamTau;\n","        this.seamTauRow[slice] = seamTau;\n        // Ruling 7 prototype: d(alpha_tau)/dt = S'(u) / (full - on) x the slice clock's rate.\n        const seamU = (tau - seam.tau[0]) / (seam.tau[1] - seam.tau[0]);\n        this.seamRateRow[slice] = seamU > 0 && seamU < 1 ? (6 * seamU * (1 - seamU) / (seam.tau[1] - seam.tau[0])) * wallRate : 0;\n        this.seamRate = this.seamRateRow[slice];\n")
sub(L,"        r.positions[o + 1] = this.seamY(v, h, this.targetY[v], e, floor, this.seamTauRow[row], this.seamBandRow[row]);","        this.seamRate = this.seamRateRow[row];\n        r.positions[o + 1] = this.seamY(v, h, this.targetY[v], e, floor, this.seamTauRow[row], this.seamBandRow[row]);")
sub(L,"    const delta = e * (target - h);\n    if (!floor) {\n      if (share) share[v] = tau;","    const delta = e * (target - h);\n    const rise = this.result.wall?.rise;\n    if (rise) rise[v] = this.seamRate * (floor ? seamHeightWeight(delta, band) : 1) * delta;\n    if (!floor) {\n      if (share) share[v] = tau;")
C='src/wave/barrel/sweptContact.ts'
sub(C,"  seam?: number;\n  aheadSeam?: number;\n}","  seam?: number;\n  aheadSeam?: number;\n  /** Ruling 7 prototype: the hand-over's own rise at the crossing above the point, m/s (`WallWater.rise`). */\n  seamRise?: number;\n}")
sub(C,"        hit.seam = seam;\n      }","        hit.seam = seam;\n      }\n      if (wall.rise) {\n        let rise = 0;\n        for (let m = 0; m < 3; m += 1) rise += this.weights[3 * surface + m] * wall.rise[this.at[3 * surface + m]];\n        hit.seamRise = rise;\n      }")
sub(C,"      if (wall?.seam) hit.seam = Number.NaN;","      if (wall?.seam) hit.seam = Number.NaN;\n      hit.seamRise = 0;")
P='src/physics/PhysicalSurfWater.ts'
sub(P,"export function streamWallFlow(","/** Ruling 7 prototype (not for merge): carry the hand-over's rise in the stream flow; `form` 'normal' or 'up'. */\nexport const STREAM_RISE = { on: false, form: 'normal' as 'normal' | 'up', gain: 1 };\n\nexport function streamWallFlow(")
sub(P,"'wallTop' | 'wallSpeed' | 'wallB' | 'wallWeight'>,\n  share = 1,\n): void {","'wallTop' | 'wallSpeed' | 'wallB' | 'wallWeight'> & { seamRise?: number },\n  share = 1,\n): void {")
sub(P,"  out.flowY += w * (q * na - out.flowY);\n}","  out.flowY += w * (q * na - out.flowY);\n  // Ruling 7 prototype: the surface's own rise R (the hand-over's rate) as the water's speed along the surface's normal,\n  // R n_y n (or straight up), so the water rises with the surface it is drawn under.\n  const rise = STREAM_RISE.on && wall.seamRise === wall.seamRise && wall.seamRise !== undefined ? STREAM_RISE.gain * wall.seamRise : 0;\n  if (rise !== 0) {\n    if (STREAM_RISE.form === 'up') out.flowY += rise;\n    else {\n      out.flowX += rise * ny * na * rx;\n      out.flowZ += rise * ny * na * rz;\n      out.flowY += rise * ny * ny;\n    }\n  }\n}")
T='src/wave/probes/ruling7.probe.test.ts'
sub(T,"import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';","import { PhysicalSurfWater, STREAM_RISE } from '../../physics/PhysicalSurfWater';\n\nif (process.env.RISE) {\n  STREAM_RISE.on = true;\n  STREAM_RISE.form = process.env.RISE === 'up' ? 'up' : 'normal';\n  if (process.env.RISE_GAIN) STREAM_RISE.gain = Number(process.env.RISE_GAIN);\n}")
print('ok')
