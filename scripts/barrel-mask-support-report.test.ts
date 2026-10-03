import { describe, expect, it } from 'vitest';
import { maskAlphaAt, nominalShaderClip, reportMaskSupport, type SupportInput } from './barrel-mask-support-report';

const tinyFootprint = (): SupportInput => ({
  capture: { held: true, clocks: { water: 10, mask: 10, mesh: 10 } },
  mask: { grid: { xMin: 0, zMin: 0, spacing: 1, nx: 3, nz: 3 }, bytes: new Uint8Array([255, 0, 0, 0, 0, 0, 0, 0, 0]), active: true },
  mesh: { positions: new Float32Array([0, 1, 0, 0.2, 1, 0, 0, 1, 0.2]), indices: new Uint32Array([0, 1, 2]), start: 0, count: 3, visible: true },
  probes: [{ label: 'outside triangle', xz: [0.5, 0.5], fragCoord: [12.5, 20.5], shaderDither: 0.1 }],
});

describe('actual linear mask support diagnostics', () => {
  it('finds water clipping outside a small indexed triangle, despite correct node containment', () => {
    const input = tinyFootprint();
    expect(maskAlphaAt(input.mask, 0.5, 0.5)).toBe(0.25);
    const report = reportMaskSupport(input);
    expect(report.sampled.outsideSamples).toBeGreaterThan(0);
    expect(report.probes[0].indexedProjectionCount).toBe(0);
    expect(report.probes[0].clip!.waterDiscard).toBe(true);
    expect(report.probes[0].classification.filteredMaskOutsideIndexedProjection).toBe(true);
  });

  it('reports the existing inactive-mask asymmetry using retained bytes instead of regenerating them', () => {
    const input = tinyFootprint();
    input.mask.active = false;
    const clip = nominalShaderClip(input.mask, 0.5, 0.5, [12.5, 20.5], 0.1);
    expect(clip.waterDiscard).toBe(false);
    expect(clip.sweptPass).toBe(true);
    expect(clip.inactiveSweptPass).toBe(true);
    expect(reportMaskSupport(input).sampled.activePotentialDiscardAreaSquareMeters).toBe(0);
  });

  it('does not flag positive texels covered by actual indexed geometry', () => {
    const input = tinyFootprint();
    input.mesh.positions = new Float32Array([0, 1, 0, 2, 1, 0, 0, 1, 2, 2, 1, 2]);
    input.mesh.indices = new Uint32Array([0, 1, 2, 1, 3, 2]);
    input.mesh.count = 6;
    expect(reportMaskSupport(input).sampled.outsideSamples).toBe(0);
    input.mesh.visible = false;
    expect(reportMaskSupport(input).sampled.outsideSamples).toBeGreaterThan(0);
  });

  it('uses the actual draw range and labels bounded sampling as partial', () => {
    const input = tinyFootprint();
    input.mesh.count = 0;
    input.mask.bytes.fill(255);
    const report = reportMaskSupport(input, 1, 2);
    expect(report.sampled.truncated).toBe(true);
    expect(report.sampled.cells).toBe(1);
    expect(report.sampled.sampled).toBe(4);
    expect(report.sampled.outsideSamples).toBe(4);
  });

  it('distinguishes dry packing evidence from an unverified photographed terrain identity', () => {
    const input = tinyFootprint();
    input.water = { grid: input.mask.grid, surface: Float32Array.from(Array.from({ length: 18 }, (_, k) => k % 2 === 0 ? -0.05 : 0)),
      bed: new Float32Array(9), look: 'rich' };
    const probe = reportMaskSupport(input).probes[0];
    expect(probe.water!.packedDryNeighbors).toBe(4);
    expect(probe.water!.shaderColumnMeters).toBeCloseTo(-0.05, 7);
    expect(probe.samePixelUnmaskedWaterPointProvided).toBe(false);
    expect(probe.classification.maskedObjectID).toContain('not supplied');
  });
});
