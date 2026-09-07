export const DEFAULT_SHAPE_COLOR = "#2f81f7";

// Spread colors around the hue wheel using the golden angle (~137.508 degrees) -- this is the
// same stepping phyllotaxis (sunflower seed packing) uses to keep each new point maximally
// separated from every point placed before it. Given the Nth distinct entity, colorForRank(N)
// stays visually distinct from the other N-1, which matters most while N is small: a plain hash
// of the entity's id/name can easily put two *different* entities' hues only a few degrees
// apart (they "differ" numerically but look identical at a glance) -- rank-based stepping avoids
// that by construction instead of leaving it to chance.
export function colorForRank(rank: number): string {
  const hue = (rank * 137.508) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
