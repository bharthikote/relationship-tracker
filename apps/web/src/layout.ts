import type { Person, Relationship } from "./types";

export interface LayoutNode {
  person: Person;
  x: number;
  y: number;
}

const GEN_HEIGHT = 200;
const NODE_WIDTH = 160;

export function birthYear(p?: Person): number | undefined {
  if (!p?.dob) return undefined;
  const year = parseInt(p.dob, 10);
  return Number.isFinite(year) ? year : undefined;
}

// A couple (or single person) treated as one horizontal unit for layout purposes, with the child
// units it parents in the next generation down.
interface Unit {
  members: string[];
  childrenUnits: Unit[];
}

export function computeLayout(people: Person[], relationships: Relationship[]): LayoutNode[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const spousesOf = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "parent-child") {
      if (!parentsOf.has(r.personBId)) parentsOf.set(r.personBId, []);
      parentsOf.get(r.personBId)!.push(r.personAId);
      if (!childrenOf.has(r.personAId)) childrenOf.set(r.personAId, []);
      childrenOf.get(r.personAId)!.push(r.personBId);
    } else if (r.type === "spouse") {
      if (!spousesOf.has(r.personAId)) spousesOf.set(r.personAId, []);
      if (!spousesOf.has(r.personBId)) spousesOf.set(r.personBId, []);
      spousesOf.get(r.personAId)!.push(r.personBId);
      spousesOf.get(r.personBId)!.push(r.personAId);
    }
  }

  const generation = new Map<string, number>();
  const parentChildEdges = relationships.filter((r) => r.type === "parent-child");

  // Roots: people with no recorded parents. A parentless person married to someone who *does*
  // have recorded parents (e.g. a spouse marrying into the family) is not a root -- their real
  // generation comes from their spouse via the propagation loop below, so seeding them at 0 here
  // would wrongly strand them at the top instead of next to the spouse they married.
  for (const p of people) {
    if (parentsOf.has(p.id)) continue;
    const spouses = spousesOf.get(p.id) ?? [];
    const marriedIntoBloodline = spouses.some((s) => parentsOf.has(s));
    if (!marriedIntoBloodline) generation.set(p.id, 0);
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
  const sortedGens = [...byGen.keys()].sort((a, b) => a - b);

  // Elder siblings (earlier year of birth) end up left, younger right. When either side has no
  // parsable birth year, leave their relative order untouched (stable sort) rather than guessing.
  function sortByBirthYear(ids: string[]): string[] {
    return [...ids].sort((a, b) => {
      const ya = birthYear(byId.get(a));
      const yb = birthYear(byId.get(b));
      return ya === undefined || yb === undefined ? 0 : ya - yb;
    });
  }

  // Walk a sorted id list, grouping each id with its spouse (if present in `universe` and not yet
  // placed) into one unit -- keeps couples together as a single layout unit everywhere.
  function groupIntoUnits(sortedIds: string[], universe: Set<string>, placed: Set<string>): string[][] {
    const units: string[][] = [];
    for (const id of sortedIds) {
      if (placed.has(id)) continue;
      placed.add(id);
      const spouseId = (spousesOf.get(id) ?? []).find((s) => universe.has(s) && !placed.has(s));
      if (spouseId) {
        placed.add(spouseId);
        units.push([id, spouseId]);
      } else {
        units.push([id]);
      }
    }
    return units;
  }

  // Build the family forest: each Unit (a person, or a couple) knows the child Units it parents in
  // the next generation down. Reserving whole-subtree width bottom-up (see unitWidth below) and
  // then centering each unit within its own reserved band is what keeps an ancestor's bracket
  // centered over its full descendant block, instead of drifting when a sibling family is wider.
  const placedByGen = new Map<number, Set<string>>();
  function placedSetFor(g: number): Set<string> {
    let set = placedByGen.get(g);
    if (!set) {
      set = new Set<string>();
      placedByGen.set(g, set);
    }
    return set;
  }

  function attachChildren(unit: Unit, gen: number) {
    const nextGenIds = byGen.get(gen + 1);
    if (!nextGenIds || nextGenIds.length === 0) return;
    const nextGenSet = new Set(nextGenIds);
    const placedNext = placedSetFor(gen + 1);

    const kids = new Set<string>();
    for (const pid of unit.members) {
      for (const cid of childrenOf.get(pid) ?? []) {
        if (nextGenSet.has(cid) && !placedNext.has(cid)) kids.add(cid);
      }
    }
    const childUnits = groupIntoUnits(sortByBirthYear([...kids]), nextGenSet, placedNext).map(
      (members): Unit => ({ members, childrenUnits: [] })
    );
    unit.childrenUnits = childUnits;
    for (const c of childUnits) attachChildren(c, gen + 1);
  }

  const roots: Unit[] = [];

  if (sortedGens.length > 0) {
    const gen0 = sortedGens[0];
    const gen0Set = new Set(byGen.get(gen0)!);
    const gen0Units = groupIntoUnits(sortByBirthYear([...gen0Set]), gen0Set, placedSetFor(gen0)).map(
      (members): Unit => ({ members, childrenUnits: [] })
    );
    roots.push(...gen0Units);
    for (const u of gen0Units) attachChildren(u, gen0);
  }

  // Anyone left unplaced after that walk (no recorded parent reached from a gen0 root -- a
  // disconnected fragment, or a data gap) becomes an additional forest root at their own
  // generation, still birth-year sorted, and recurses the same way for their own descendants.
  for (const g of sortedGens) {
    const thisGenSet = new Set(byGen.get(g)!);
    const placedThisGen = placedSetFor(g);
    const leftover = [...thisGenSet].filter((id) => !placedThisGen.has(id));
    if (leftover.length === 0) continue;
    const units = groupIntoUnits(sortByBirthYear(leftover), thisGenSet, placedThisGen).map(
      (members): Unit => ({ members, childrenUnits: [] })
    );
    for (const u of units) {
      roots.push(u);
      attachChildren(u, g);
    }
  }

  const widthByUnit = new Map<Unit, number>();
  function unitWidth(u: Unit): number {
    const cached = widthByUnit.get(u);
    if (cached !== undefined) return cached;
    const ownWidth = u.members.length * NODE_WIDTH;
    const width =
      u.childrenUnits.length === 0
        ? ownWidth
        : Math.max(ownWidth, u.childrenUnits.reduce((sum, c) => sum + unitWidth(c), 0));
    widthByUnit.set(u, width);
    return width;
  }

  const xById = new Map<string, number>();
  function positionUnit(u: Unit, leftEdge: number) {
    const width = unitWidth(u);
    const center = leftEdge + width / 2;
    if (u.members.length === 2) {
      xById.set(u.members[0], center - NODE_WIDTH / 2);
      xById.set(u.members[1], center + NODE_WIDTH / 2);
    } else {
      xById.set(u.members[0], center);
    }
    if (u.childrenUnits.length > 0) {
      const childrenWidth = u.childrenUnits.reduce((sum, c) => sum + unitWidth(c), 0);
      let cursor = leftEdge + (width - childrenWidth) / 2;
      for (const c of u.childrenUnits) {
        positionUnit(c, cursor);
        cursor += unitWidth(c);
      }
    }
  }

  let cursor = 0;
  for (const root of roots) {
    positionUnit(root, cursor);
    cursor += unitWidth(root);
  }

  const positions: LayoutNode[] = [];
  for (const p of people) {
    positions.push({ person: p, x: xById.get(p.id) ?? 0, y: generation.get(p.id)! * GEN_HEIGHT });
  }
  return positions;
}
