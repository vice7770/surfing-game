import { beforeAll, describe, expect, it } from 'vitest';
import { checkpointOracle, differentialReplay } from './field-fusion-report';

describe('fused foam and aeration versus the compiled canonical checkpoint', () => {
  let oracle: Awaited<ReturnType<typeof checkpointOracle>>;
  beforeAll(async () => { oracle = await checkpointOracle(); });

  it.each(['uniform', 'stretched', 'boundary', 'stale'] as const)('is byte exact through sources, decay, degassing and bubble ages on %s inputs', (scenario) => {
    const result = differentialReplay(oracle.before, scenario);
    expect(result.steps).toBe(90);
    expect(result.diagnostics.air).toBeGreaterThanOrEqual(0);
  });
});
