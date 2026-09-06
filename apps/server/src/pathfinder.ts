import type { Person, Relationship } from "./types.js";

interface Edge {
  neighborId: string;
  relationship: Relationship;
}

function labelFor(fromId: string, toPerson: Person, rel: Relationship): string {
  const female = toPerson.gender === "female";
  if (rel.type === "spouse") return female ? "wife" : "husband";
  if (rel.type === "sibling") return female ? "sister" : "brother";
  // parent-child
  const toIsParent = rel.personBId === fromId; // fromId is the child, toPerson is the parent
  if (toIsParent) return female ? "mother" : "father";
  return female ? "daughter" : "son";
}

export function buildAdjacency(relationships: Relationship[]): Map<string, Edge[]> {
  const adjacency = new Map<string, Edge[]>();
  const add = (from: string, to: string, rel: Relationship) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ neighborId: to, relationship: rel });
  };
  for (const rel of relationships) {
    add(rel.personAId, rel.personBId, rel);
    add(rel.personBId, rel.personAId, rel);
  }
  return adjacency;
}

export interface PathStep {
  personId: string;
  relationLabel: string;
}

export function findPath(
  fromId: string,
  toId: string,
  people: Person[],
  relationships: Relationship[]
): PathStep[] | null {
  if (fromId === toId) return [];
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const adjacency = buildAdjacency(relationships);

  const visited = new Set<string>([fromId]);
  const queue: string[] = [fromId];
  const prev = new Map<string, { personId: string; label: string }>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) break;
    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.neighborId)) continue;
      const neighborPerson = peopleById.get(edge.neighborId);
      if (!neighborPerson) continue;
      visited.add(edge.neighborId);
      prev.set(edge.neighborId, {
        personId: current,
        label: labelFor(current, neighborPerson, edge.relationship),
      });
      queue.push(edge.neighborId);
    }
  }

  if (!visited.has(toId)) return null;

  const steps: PathStep[] = [];
  let cursor = toId;
  while (cursor !== fromId) {
    const step = prev.get(cursor);
    if (!step) return null;
    steps.unshift({ personId: cursor, relationLabel: step.label });
    cursor = step.personId;
  }
  return steps;
}

export function captionFor(steps: PathStep[], targetName: string): string {
  if (steps.length === 0) return "That's the same person.";
  const labels = steps.map((s) => s.relationLabel);
  const chain =
    labels.length === 1
      ? labels[0]
      : labels.slice(0, -1).join("'s ") + "'s " + labels[labels.length - 1];
  return `${targetName} is your ${chain}.`;
}
