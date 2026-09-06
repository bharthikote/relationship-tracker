import type { AttachRelationType, Gender } from "./types";

export type QuickRelation = "father" | "mother" | "brother" | "sister" | "son" | "daughter" | "wife" | "husband";

export const QUICK_RELATION_LABELS: Record<QuickRelation, string> = {
  father: "Add Father",
  mother: "Add Mother",
  brother: "Add Brother",
  sister: "Add Sister",
  son: "Add Son",
  daughter: "Add Daughter",
  wife: "Add Wife",
  husband: "Add Husband",
};

export const QUICK_RELATION_GRID: [QuickRelation, QuickRelation][] = [
  ["father", "mother"],
  ["brother", "sister"],
  ["son", "daughter"],
  ["husband", "wife"],
];

export function quickRelationToPreset(qr: QuickRelation): { relationType: AttachRelationType; gender: Gender } {
  switch (qr) {
    case "father":
      return { relationType: "parent", gender: "male" };
    case "mother":
      return { relationType: "parent", gender: "female" };
    case "brother":
      return { relationType: "sibling", gender: "male" };
    case "sister":
      return { relationType: "sibling", gender: "female" };
    case "son":
      return { relationType: "child", gender: "male" };
    case "daughter":
      return { relationType: "child", gender: "female" };
    case "husband":
      return { relationType: "spouse", gender: "male" };
    case "wife":
      return { relationType: "spouse", gender: "female" };
  }
}
