import { describe, expect, it } from 'vitest';
import { APPROVED, CONFIDENCE_CAP, MEASURE_DOMAIN, PROVENANCE, SOURCES, STANCES } from './stanceMap';

const RANK = { high: 3, medium: 2, low: 1 } as const;

describe('the stance map', () => {
  it('cites a source for every target, best first, and claims no more confidence than its best source', () => {
    for (const stance of STANCES) {
      for (const [measure, target] of Object.entries(stance.targets)) {
        const where = `${stance.id}.${measure}`;
        expect(target.sources.length, where).toBeGreaterThan(0);
        for (const id of target.sources) {
          expect(SOURCES[id], `${where}: ${id}`).toBeDefined();
          // A link, or, for the thesis (not online), where it is held.
          expect(SOURCES[id].url ?? SOURCES[id].held, `${where}: ${id}`).toMatch(SOURCES[id].url ? /^https:\/\// : /\w+/);
        }
        // The provenance rule (Q20): measured, then the thesis, then coaching, then the videos as read.
        const ranks = target.sources.map((id) => PROVENANCE.indexOf(SOURCES[id].kind));
        expect(ranks, where).toEqual([...ranks].sort((a, b) => a - b));
        expect(RANK[target.confidence], where).toBeLessThanOrEqual(RANK[CONFIDENCE_CAP[SOURCES[target.sources[0]].kind]]);
      }
    }
  });

  it('keeps every range ordered and inside its measure’s domain', () => {
    for (const stance of STANCES) {
      for (const [measure, target] of Object.entries(stance.targets)) {
        const [low, high] = MEASURE_DOMAIN[measure as keyof typeof MEASURE_DOMAIN];
        expect(target.min, `${stance.id}.${measure}`).toBeLessThanOrEqual(target.max);
        expect(target.min, `${stance.id}.${measure}`).toBeGreaterThanOrEqual(low);
        expect(target.max, `${stance.id}.${measure}`).toBeLessThanOrEqual(high);
      }
    }
  });

  it('says how the game reaches every stance, and maps the turns on both sides', () => {
    const ids = STANCES.map((stance) => stance.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const stance of STANCES) expect(stance.reach.length, stance.id).toBeGreaterThan(10);
    for (const turn of ['compress', 'extension', 'top-turn', 'snap']) {
      expect(ids, turn).toContain(`${turn}-frontside`);
      expect(ids, turn).toContain(`${turn}-backside`);
    }
  });

  it('marks a video read as low confidence, a coaching cue no higher than medium', () => {
    expect(CONFIDENCE_CAP.video).toBe('low');
    expect(CONFIDENCE_CAP.coaching).toBe('medium');
    expect(CONFIDENCE_CAP.measured).toBe('high');
  });

  it('follows the pump\'s source: extending downhill onto the front foot, compressing uphill onto the back', () => {
    const weight = (id: string) => STANCES.find((stance) => stance.id === id)!.targets.weight!;
    expect(weight('pump-extension').min).toBeGreaterThanOrEqual(0.5);
    expect(weight('pump-compression').max).toBeLessThanOrEqual(0.5);
  });

  it('holds the thirteen references the user approved (Q19), each linked', () => {
    expect(APPROVED).toHaveLength(13);
    for (const id of APPROVED) expect(SOURCES[id]?.url, id).toMatch(/^https:\/\//);
  });
});
