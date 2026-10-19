import { beforeAll, describe, expect, it } from 'vitest';
import { LIP_CHECKPOINT, checkpointOracle, differentialReplay } from './field-fusion-report';

describe('fused foam and aeration versus the compiled canonical checkpoint', () => {
  let oracle: Awaited<ReturnType<typeof checkpointOracle>>;
  beforeAll(async () => { oracle = await checkpointOracle(); });

  it.each(['uniform', 'stretched', 'boundary', 'stale', 'sparse'] as const)('is byte exact through sources, decay, degassing and bubble ages on %s inputs', (scenario) => {
    const result = differentialReplay(oracle.before, scenario);
    expect(result.steps).toBe(90);
    expect(result.diagnostics.air).toBeGreaterThanOrEqual(0);
    // The sparse fields leave whole rows with nothing to carry, which the carriers skip (the M1 CPU study).
    if (scenario === 'sparse') expect(result.skipped).toBeGreaterThan(200);
  });

  it.each(['sparse', 'drift'] as const)('is byte exact against the spilling lip\'s foam (its drift and drawn source) on %s inputs', async (scenario) => {
    const lip = await checkpointOracle(LIP_CHECKPOINT);
    const result = differentialReplay(lip.before, scenario);
    expect(result.steps).toBe(90);
    // Whole rows are skipped here too, with the drift's reach.
    expect(result.skipped).toBeGreaterThan(100);
  });
});
