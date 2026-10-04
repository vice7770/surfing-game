#!/usr/bin/env python3
"""Source-only extraction/overlay. Run only after the parent supplies the accepted baseline ref."""
import argparse
import difflib
import hashlib
import json
import posixpath
import re
from pathlib import Path
import shutil
import subprocess

ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
OUT = Path(__file__).resolve().parent

def replace(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f'{path}: expected exactly one original source site, got {text.count(old)}')
    path.write_text(text.replace(old, new))

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

args = argparse.ArgumentParser()
args.add_argument('--ref', required=True)
opt = args.parse_args()
ref = subprocess.check_output(['git', 'rev-parse', '--verify', opt.ref + '^{commit}'], cwd=ROOT, text=True).strip()
if opt.ref != ref:
    raise RuntimeError('Require the explicit full accepted commit SHA, not a movable ref')
if (OUT / 'original').exists() or (OUT / 'candidate').exists():
    raise RuntimeError('Never overwrite an existing source preparation')
paths = ['src/wave/gpu/GpuBoussinesq.ts', 'src/physics/PhysicalSurfWater.ts', 'src/wave/PlungingLip.ts',
    'src/wave/SurfZoneSimulation.ts', 'src/game/surfZoneWorker.ts', 'src/wave/gpu/webgpu-env.d.ts']
# Exact static/type import closure only: no Main, app assets, test suites or unrelated rendering tree.
names = set(subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', ref], cwd=ROOT, text=True).splitlines())
source = {}
pending = paths[:]
while pending:
    name = pending.pop()
    if name in source:
        continue
    data = subprocess.check_output(['git', 'show', ref + ':' + name], cwd=ROOT)
    source[name] = data
    if name.endswith('.ts'):
        specs = re.findall(r'''(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]''', data.decode())
        for spec in specs:
            if not spec.startswith('.'):
                continue
            base = posixpath.normpath(posixpath.join(posixpath.dirname(name), spec))
            dependency = next((x for x in [base, base + '.ts', base + '/index.ts'] if x in names), None)
            if not dependency:
                raise RuntimeError(f'Unresolved original relative import {name}: {spec}')
            pending.append(dependency)
    if len(source) > 160:
        raise RuntimeError('Unexpectedly broad dependency closure; stop rather than copying hundreds of files')
for name in ['package.json', 'tsconfig.json', 'vitest.config.ts']:
    source[name] = subprocess.check_output(['git', 'show', ref + ':' + name], cwd=ROOT)
original = OUT / 'original'
original.mkdir()
for name, data in source.items():
    path = original / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
candidate = OUT / 'candidate'
shutil.copytree(original, candidate)
for tree in [original, candidate]:
    (tree / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
    (tree / 'public').symlink_to(ROOT / 'public', target_is_directory=True)
if not (OUT / 'node_modules').exists():
    (OUT / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)

tracker = candidate / 'src/wave/gpu/cpuWaterEdits.ts'
shutil.copyfile(OUT / 'drafts/cpuWaterEdits.ts', tracker)
gpu = candidate / 'src/wave/gpu/GpuBoussinesq.ts'
replace(gpu, "import { PERIODIC, WALL, cflSubsteps } from '../ShallowWaterSolver';", "import { PERIODIC, WALL, cflSubsteps } from '../ShallowWaterSolver';\nimport { releaseCpuWaterEdits, trackCpuWaterEdits, type CpuWaterEdits } from './cpuWaterEdits';")
replace(gpu, '  private disposed = false;', '  private disposed = false;\n  /** Present only for the worker-exclusive factory; public/generic devices still upload every field. */\n  private cpuEdits?: CpuWaterEdits;')
replace(gpu, '  /** Advance the solver by dt seconds on the device, sub-stepping as the CFL condition requires. */', '''  /** @internal WorkerCore exclusively retains its solver; replies and exported state never expose these arrays. */
  static async createForWorker(solver: BoussinesqSolver, gpu: GPU | undefined = globalThis.navigator?.gpu): Promise<GpuBoussinesq | undefined> {
    const device = await GpuBoussinesq.create(solver, gpu);
    if (device) device.cpuEdits = trackCpuWaterEdits(solver);
    return device;
  }

  /** Advance the solver by dt seconds on the device, sub-stepping as the CFL condition requires. */''')
replace(gpu, '    const layout = solver.deviceLayout();\n    if (layout.version !== this.version) {', '''    const layout = solver.deviceLayout();
    const normalReadback = this.cpuEdits !== undefined && this.readback && this.kernels.length === STEP_KERNELS.length
      && this.kernels.every((kernel, i) => kernel === STEP_KERNELS[i]);
    if (layout.version !== this.version) {
      this.cpuEdits?.invalidate();''')
replace(gpu, '''    DEVICE_UPLOAD.forEach((index, k) => {
      const source = index === FIELD.H ? solver.h : index === FIELD.QX ? solver.qx : solver.qz;
      this.upload.set(source, k * n);
    });
    device.queue.writeBuffer(this.fields, FIELD.H * n * 4, this.upload);''', '''    const ranges = normalReadback ? this.cpuEdits?.prepare() ?? -1 : -1;
    // Any exception/failed submission leaves the next step on the original full path.
    this.cpuEdits?.invalidate();
    if (ranges < 0) {
      DEVICE_UPLOAD.forEach((index, k) => {
        const source = index === FIELD.H ? solver.h : index === FIELD.QX ? solver.qx : solver.qz;
        this.upload.set(source, k * n);
      });
      device.queue.writeBuffer(this.fields, FIELD.H * n * 4, this.upload);
    } else {
      for (let range = 0; range < ranges; range += 1) {
        const start = this.cpuEdits!.ranges[2 * range];
        const end = this.cpuEdits!.ranges[2 * range + 1];
        for (let k = 0; k < DEVICE_UPLOAD.length; k += 1) {
          const source = k === 0 ? solver.h : k === 1 ? solver.qx : solver.qz;
          const offset = k * n;
          for (let i = start; i < end; i += 1) this.upload[offset + i] = source[i];
          // TypedArray dataOffset and size are elements; the GPU buffer offset is bytes.
          device.queue.writeBuffer(this.fields, (DEVICE_UPLOAD[k] * n + start) * 4, this.upload, offset + start, end - start);
        }
      }
    }''')
replace(gpu, '    this.staging.unmap();\n    solver.adoptDeviceStep(dt);', '''    // Scan the existing mapped view before unmapping, without a payload or view allocation.
    // NaNs retain full conversion: widening/repacking may canonicalize their original F32 payload.
    const resident = normalReadback && this.cpuEdits?.readbackIsExact(back, DEVICE_UPLOAD.length * n);
    this.staging.unmap();
    solver.adoptDeviceStep(dt);
    if (resident) this.cpuEdits!.adoptReadback();''')
replace(gpu, '    this.disposed = true;\n    this.device.destroy();', '''    this.disposed = true;
    if (this.cpuEdits) releaseCpuWaterEdits(this.solver, this.cpuEdits);
    this.device.destroy();''')

water = candidate / 'src/physics/PhysicalSurfWater.ts'
replace(water, "import type { ShallowWaterSolver } from '../wave/ShallowWaterSolver';", "import type { ShallowWaterSolver } from '../wave/ShallowWaterSolver';\nimport { markCpuWaterCell } from '../wave/gpu/cpuWaterEdits';")
replace(water, '      solver.qz[i] -= (impulseZ * share) / mass;', '      solver.qz[i] -= (impulseZ * share) / mass;\n      markCpuWaterCell(solver, i);')

lip = candidate / 'src/wave/PlungingLip.ts'
replace(lip, "import type { ShallowWaterSolver } from './ShallowWaterSolver';", "import type { ShallowWaterSolver } from './ShallowWaterSolver';\nimport { markCpuWaterCell } from './gpu/cpuWaterEdits';")
replace(lip, '      for (const index of rings.slice(0, reached).flat()) q[index] -= (sign * taken * Math.max(0, sign * q[index])) / carried;', '''      for (const index of rings.slice(0, reached).flat()) {
        q[index] -= (sign * taken * Math.max(0, sign * q[index])) / carried;
        markCpuWaterCell(this.solver, index);
      }''')
replace(lip, '      h[index] -= share * weights[n];', '      h[index] -= share * weights[n];\n      markCpuWaterCell(this.solver, index);')
replace(lip, '    solver.qz[cell] += momentumZ / area;', '    solver.qz[cell] += momentumZ / area;\n    markCpuWaterCell(solver, cell);')

shallow = candidate / 'src/wave/ShallowWaterSolver.ts'
replace(shallow, "import { GRAVITY } from './dispersion';", "import { GRAVITY } from './dispersion';\nimport { invalidateCpuWater } from './gpu/cpuWaterEdits';")
replace(shallow, '    const substeps = cflSubsteps(dt, this.maxStableStep());', '    invalidateCpuWater(this);\n    const substeps = cflSubsteps(dt, this.maxStableStep());')
replace(shallow, '    // The edges move: their columns get the spot\'s seabed back before they slide inside.', '    invalidateCpuWater(this);\n    // The edges move: their columns get the spot\'s seabed back before they slide inside.')

warm = candidate / 'src/wave/warmStart.ts'
replace(warm, "import type { ShallowWaterSolver } from './ShallowWaterSolver';", "import type { ShallowWaterSolver } from './ShallowWaterSolver';\nimport { invalidateCpuWater } from './gpu/cpuWaterEdits';")
replace(warm, 'export function warmStart(solver: ShallowWaterSolver, sea: SeaState, options: WarmStartOptions): void {', 'export function warmStart(solver: ShallowWaterSolver, sea: SeaState, options: WarmStartOptions): void {\n  invalidateCpuWater(solver);')

simulation = candidate / 'src/wave/SurfZoneSimulation.ts'
replace(simulation, "import { BoussinesqSolver, madsenSorensenWaveNumber } from './BoussinesqSolver';", "import { BoussinesqSolver, madsenSorensenWaveNumber } from './BoussinesqSolver';\nimport { invalidateCpuWater } from './gpu/cpuWaterEdits';")
replace(simulation, '    const arrays = this.stateArrays();\n    for (const [name, values] of Object.entries(state.arrays)) {', '    const arrays = this.stateArrays();\n    invalidateCpuWater(solver);\n    for (const [name, values] of Object.entries(state.arrays)) {')

entry = candidate / 'src/game/surfZoneWorker.ts'
replace(entry, '(solver) => GpuBoussinesq.create(solver)', '(solver) => GpuBoussinesq.createForWorker(solver)')

files = sorted(set(str(p.relative_to(original)) for p in original.rglob('*') if p.is_file() and not p.is_symlink())
    | set(str(p.relative_to(candidate)) for p in candidate.rglob('*') if p.is_file() and not p.is_symlink()))
authority = {'baseline': ref, 'extraction': paths, 'public': str(ROOT / 'public'), 'node_modules': str(ROOT / 'node_modules'), 'files': []}
diff = []
for name in files:
    a = original / name
    b = candidate / name
    old = a.read_bytes() if a.exists() else b''
    new = b.read_bytes() if b.exists() else b''
    authority['files'].append({'path': name, 'originalSha256': sha(old) if a.exists() else None,
        'candidateSha256': sha(new) if b.exists() else None, 'originalBytes': len(old), 'candidateBytes': len(new), 'changed': old != new})
    if old != new:
        diff.extend(difflib.unified_diff(old.decode().splitlines(True), new.decode().splitlines(True),
            fromfile='a/' + name if a.exists() else '/dev/null', tofile='b/' + name))
(OUT / 'candidate.patch').write_text(''.join(diff))
(OUT / 'source-authority.json').write_text(json.dumps(authority, indent=2) + '\n')
(OUT / 'prepared.json').write_text(json.dumps({'baseline': ref, 'patchSha256': sha((OUT / 'candidate.patch').read_bytes()),
    'sourceAuthoritySha256': sha((OUT / 'source-authority.json').read_bytes()), 'changed': [x['path'] for x in authority['files'] if x['changed']],
    'executedChecks': [], 'hardwareRun': False}, indent=2) + '\n')
