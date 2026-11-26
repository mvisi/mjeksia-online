export type Random = () => number;

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Picks `count` items so every group is represented in proportion to its
 * size (largest-remainder rounding), then shuffles the result. A mock exam
 * built this way covers the whole syllabus instead of whatever RANDOM()
 * happened to pick.
 */
export function stratifiedSample<T>(
  items: readonly T[],
  count: number,
  groupOf: (item: T) => string | number,
  random: Random = Math.random,
): T[] {
  if (count >= items.length) return shuffle(items, random);
  if (count <= 0) return [];

  const groups = new Map<string | number, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const quotas = [...groups.entries()].map(([key, members]) => {
    const exact = (members.length / items.length) * count;
    return { key, members, take: Math.floor(exact), remainder: exact % 1 };
  });

  let missing = count - quotas.reduce((sum, q) => sum + q.take, 0);
  for (const quota of [...quotas].sort((a, b) => b.remainder - a.remainder)) {
    if (missing === 0) break;
    if (quota.take < quota.members.length) {
      quota.take++;
      missing--;
    }
  }

  return shuffle(
    quotas.flatMap((q) => shuffle(q.members, random).slice(0, q.take)),
    random,
  );
}
