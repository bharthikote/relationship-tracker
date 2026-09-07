export const DEFAULT_SHAPE_COLOR = "#2f81f7";

// Deterministic color for a key that has no color of its own (e.g. a Caste/Subcaste id, or a
// Village name) -- the same key always maps to the same color, with no dependency on list order
// or count, so two different sessions/callers never disagree about which color a given
// village/caste/subcaste gets. Spread across a continuous hue wheel (not a small fixed palette)
// so two different entities only collide by coincidence, rather than by pigeonhole -- a handful
// of discrete colors is guaranteed to repeat once there are more entities than colors (this is
// exactly what happened with the original 7-color, then 14-color, fixed palette: e.g. two
// genuinely different villages landing on the exact same stored color).
export function colorForId(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
