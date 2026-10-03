/** Deterministic mulberry32 stream; `salt` separates independent streams drawn from one seed. */
export function seededRandom(seed: number, salt = 0): () => number {
  let value = (seed ^ salt) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
