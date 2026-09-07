export const PALETTE = ["#2f81f7", "#e0763a", "#3fb950", "#a371f7", "#db61a2", "#d29922", "#39c5cf"];

export const DEFAULT_SHAPE_COLOR = "#2f81f7";

// Deterministic color for an id that has no color of its own (e.g. a Caste/Subcaste row) --
// same id always maps to the same palette entry, with no dependency on list order or count.
export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
