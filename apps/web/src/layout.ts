import type { Person, Relationship } from "./types";

export interface LayoutNode {
  person: Person;
  x: number;
  y: number;
}

const GEN_HEIGHT = 200;
const NODE_WIDTH = 160;

export function computeLayout(people: Person[], relationships: Relationship[]): LayoutNode[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const parentsOf = new Map<string, string[]>();
  const spousesOf = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "parent-child") {
      if (!parentsOf.has(r.personBId)) parentsOf.set(r.personBId, []);
      parentsOf.get(r.personBId)!.push(r.personAId);
    } else if (r.type === "spouse") {
      if (!spousesOf.has(r.personAId)) spousesOf.set(r.personAId, []);
      if (!spousesOf.has(r.personBId)) spousesOf.set(r.personBId, []);
      spousesOf.get(r.personAId)!.push(r.personBId);
      spousesOf.get(r.personBId)!.push(r.personAId);
    }
  }

  const generation = new Map<string, number>();
  const parentChildEdges = relationships.filter((r) => r.type === "parent-child");

  // Roots: people with no recorded parents.
  for (const p of people) {
    if (!parentsOf.has(p.id)) generation.set(p.id, 0);
  }

  // Propagate generations via parent-child and spouse constraints until stable.
  let changed = true;
  let guard = 0;
  while (changed && guard < people.length + 5) {
    changed = false;
    guard++;
    for (const r of parentChildEdges) {
      const parentGen = generation.get(r.personAId);
      if (parentGen !== undefined && !generation.has(r.personBId)) {
        generation.set(r.personBId, parentGen + 1);
        changed = true;
      }
    }
    for (const [a, spouses] of spousesOf) {
      const genA = generation.get(a);
      if (genA === undefined) continue;
      for (const b of spouses) {
        if (!generation.has(b)) {
          generation.set(b, genA);
          changed = true;
        }
      }
    }
  }
  // Anyone still unplaced (disconnected fragments) gets generation 0.
  for (const p of people) {
    if (!generation.has(p.id)) generation.set(p.id, 0);
  }

  const byGen = new Map<number, string[]>();
  for (const p of people) {
    const g = generation.get(p.id)!;
    if (!byGen.has(g)) byGen.set(g, []);
    byGen.get(g)!.push(p.id);
  }

  const positions: LayoutNode[] = [];
  const sortedGens = [...byGen.keys()].sort((a, b) => a - b);

  for (const g of sortedGens) {
    const ids = byGen.get(g)!;
    const placed = new Set<string>();
    const ordered: string[] = [];
    for (const id of ids) {
      if (placed.has(id)) continue;
      ordered.push(id);
      placed.add(id);
      for (const spouseId of spousesOf.get(id) ?? []) {
        if (ids.includes(spouseId) && !placed.has(spouseId)) {
          ordered.push(spouseId);
          placed.add(spouseId);
        }
      }
    }
    ordered.forEach((id, index) => {
      const person = byId.get(id);
      if (!person) return;
      positions.push({ person, x: index * NODE_WIDTH, y: g * GEN_HEIGHT });
    });
  }

  return positions;
}
