/** Small seeded generator so the demo dataset is identical on every load. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) =>
      Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T =>
      items[Math.floor(next() * items.length)],
    hex: (length: number) => {
      let out = "";
      while (out.length < length) out += Math.floor(next() * 16).toString(16);
      return out;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

/** A 64-character hex string that looks like a SHA-256 digest. It is not one. */
export function fakeDigest(seedText: string): string {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return createRng(seed).hex(64);
}

let counter = 0;
/** Short unique id for records minted at runtime. */
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
