import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Caste, ColorByMode, InfoField, Person, Relationship, Subcaste, Village } from "../types";
import { computeLayout, birthYear } from "../layout";
import { PersonNode, SHAPE_SIZE, type PersonNodeData } from "./PersonNode";
import { SpouseEdge, type SpouseEdgeData } from "./SpouseEdge";
import { JunctionNode } from "./JunctionNode";
import type { QuickRelation } from "../quickRelations";
import { EnterFullscreenIcon, ExitFullscreenIcon } from "../icons";
import { DEFAULT_SHAPE_COLOR, colorForRank } from "../palette";

function FullscreenControlButton() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggle() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  return (
    <ControlButton onClick={toggle} title={isFullscreen ? "Exit full screen" : "Full screen"}>
      {isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
    </ControlButton>
  );
}

const nodeTypes = { person: PersonNode, junction: JunctionNode };
const edgeTypes = { spouse: SpouseEdge };

const LEGEND_TITLE: Record<ColorByMode, string> = {
  none: "",
  village: "Village",
  location: "Location",
  caste: "Caste",
  subcaste: "Subcaste",
};

interface Props {
  people: Person[];
  relationships: Relationship[];
  villages: Village[];
  castes: Caste[];
  subcastes: Subcaste[];
  colorBy: ColorByMode;
  infoFields: Set<InfoField>;
  mode: "view" | "edit";
  editableOwnerIds: Set<string> | "all";
  onSelectPerson: (id: string) => void;
  onQuickAdd: (personId: string, qr: QuickRelation) => void;
  onEdit: (personId: string) => void;
  highlightedPersonIds?: Set<string>;
  highlightedEdgeKeys?: Set<string>;
}

export function TreeCanvas({
  people,
  relationships,
  villages,
  castes,
  subcastes,
  colorBy,
  infoFields,
  mode,
  editableOwnerIds,
  onSelectPerson,
  onQuickAdd,
  onEdit,
  highlightedPersonIds,
  highlightedEdgeKeys,
}: Props) {
  const villageById = useMemo(() => new Map(villages.map((v) => [v.id, v])), [villages]);
  const casteById = useMemo(() => new Map(castes.map((c) => [c.id, c])), [castes]);
  const subcasteById = useMemo(() => new Map(subcastes.map((s) => [s.id, s])), [subcastes]);
  // castes/subcastes come back from the API already sorted by name, so their array index is a
  // stable rank to feed into colorForRank -- same list, same order, same rank every render.
  const casteRankById = useMemo(() => new Map(castes.map((c, i) => [c.id, i])), [castes]);
  const subcasteRankById = useMemo(() => new Map(subcastes.map((s, i) => [s.id, i])), [subcastes]);

  const colorFor = useMemo(() => {
    return (person: Person): string => {
      switch (colorBy) {
        case "village":
          return (person.nativeVillageId && villageById.get(person.nativeVillageId)?.color) || DEFAULT_SHAPE_COLOR;
        case "location":
          return (person.currentVillageId && villageById.get(person.currentVillageId)?.color) || DEFAULT_SHAPE_COLOR;
        case "caste": {
          const rank = person.casteId ? casteRankById.get(person.casteId) : undefined;
          return rank !== undefined ? colorForRank(rank) : DEFAULT_SHAPE_COLOR;
        }
        case "subcaste": {
          const rank = person.subcasteId ? subcasteRankById.get(person.subcasteId) : undefined;
          return rank !== undefined ? colorForRank(rank) : DEFAULT_SHAPE_COLOR;
        }
        default:
          return DEFAULT_SHAPE_COLOR;
      }
    };
  }, [colorBy, villageById, casteRankById, subcasteRankById]);

  // Optional per-person detail lines shown below their name, controlled by the Settings panel.
  const infoLinesFor = useMemo(() => {
    const thisYear = new Date().getFullYear();
    return (person: Person): string[] => {
      const lines: string[] = [];
      if (infoFields.has("age")) {
        const by = birthYear(person);
        if (by !== undefined) lines.push(`${thisYear - by}y`);
      }
      if (infoFields.has("currentLocation")) {
        const v = person.currentVillageId ? villageById.get(person.currentVillageId) : undefined;
        if (v) lines.push(v.name);
      }
      if (infoFields.has("nativeLocation")) {
        const v = person.nativeVillageId ? villageById.get(person.nativeVillageId) : undefined;
        if (v) lines.push(v.name);
      }
      if (infoFields.has("caste")) {
        const c = person.casteId ? casteById.get(person.casteId) : undefined;
        if (c) lines.push(c.name);
      }
      if (infoFields.has("subcaste")) {
        const s = person.subcasteId ? subcasteById.get(person.subcasteId) : undefined;
        if (s) lines.push(s.name);
      }
      return lines;
    };
  }, [infoFields, villageById, casteById, subcasteById]);

  // The set of distinct colors actually in use right now, so the legend only lists entries that
  // are on screen instead of every village/caste/subcaste ever recorded system-wide.
  const legendEntries = useMemo(() => {
    if (colorBy === "none") return [];
    const seen = new Map<string, { name: string; color: string }>();
    for (const person of people) {
      let id: string | undefined;
      let name: string | undefined;
      let color: string | undefined;
      if (colorBy === "village") {
        id = person.nativeVillageId;
        const v = id ? villageById.get(id) : undefined;
        name = v?.name;
        color = v?.color;
      } else if (colorBy === "location") {
        id = person.currentVillageId;
        const v = id ? villageById.get(id) : undefined;
        name = v?.name;
        color = v?.color;
      } else if (colorBy === "caste") {
        id = person.casteId;
        const rank = id ? casteRankById.get(id) : undefined;
        name = id ? casteById.get(id)?.name : undefined;
        color = rank !== undefined ? colorForRank(rank) : undefined;
      } else if (colorBy === "subcaste") {
        id = person.subcasteId;
        const rank = id ? subcasteRankById.get(id) : undefined;
        name = id ? subcasteById.get(id)?.name : undefined;
        color = rank !== undefined ? colorForRank(rank) : undefined;
      }
      if (id && name && color && !seen.has(id)) seen.set(id, { name, color });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [colorBy, people, villageById, casteById, subcasteById, casteRankById, subcasteRankById]);

  const { nodes, edges } = useMemo(() => {
    const layout = computeLayout(people, relationships);
    const posById = new Map(layout.map((l) => [l.person.id, { x: l.x, y: l.y }]));
    const centerOf = (id: string) => {
      const p = posById.get(id);
      return p ? { x: p.x + SHAPE_SIZE / 2, y: p.y + SHAPE_SIZE / 2 } : undefined;
    };

    const spousePairs = new Set<string>();
    for (const r of relationships) {
      if (r.type === "spouse") spousePairs.add([r.personAId, r.personBId].sort().join("|"));
    }

    // Group parent-child relationships by child so a child with two linked parents gets ONE
    // descent line from the midpoint of their marriage line, instead of two separate lines.
    const parentsOfChild = new Map<string, { parentId: string; relId: string }[]>();
    for (const r of relationships) {
      if (r.type !== "parent-child") continue;
      if (!parentsOfChild.has(r.personBId)) parentsOfChild.set(r.personBId, []);
      parentsOfChild.get(r.personBId)!.push({ parentId: r.personAId, relId: r.id });
    }

    const junctionNodes: Node<Record<string, never>>[] = [];
    const junctionIdByPair = new Map<string, string>();
    const familyEdges: Edge[] = [];

    for (const [childId, parents] of parentsOfChild) {
      const highlighted =
        highlightedEdgeKeys?.has(`${parents[0]?.parentId}-${childId}`) ||
        highlightedEdgeKeys?.has(`${childId}-${parents[0]?.parentId}`);
      const style = { stroke: highlighted ? "#ffd23f" : "#555", strokeWidth: highlighted ? 3 : 1.5 };

      const pairKey =
        parents.length === 2 ? [parents[0].parentId, parents[1].parentId].sort().join("|") : undefined;

      if (pairKey && spousePairs.has(pairKey)) {
        let junctionId = junctionIdByPair.get(pairKey);
        if (!junctionId) {
          const [aId, bId] = pairKey.split("|");
          const a = centerOf(aId);
          const b = centerOf(bId);
          if (a && b) {
            junctionId = `junction-${pairKey}`;
            junctionIdByPair.set(pairKey, junctionId);
            junctionNodes.push({
              id: junctionId,
              type: "junction",
              position: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
              data: {},
              draggable: false,
              selectable: false,
              width: 1,
              height: 1,
            });
          }
        }
        if (junctionId) {
          familyEdges.push({
            id: `family-${pairKey}-${childId}`,
            source: junctionId,
            target: childId,
            targetHandle: "top",
            type: "smoothstep",
            style,
          });
          continue;
        }
      }

      // Single recorded parent (or an un-partnered pair): direct line(s) from each parent.
      for (const { parentId, relId } of parents) {
        familyEdges.push({
          id: relId,
          source: parentId,
          sourceHandle: "bottom",
          target: childId,
          targetHandle: "top",
          type: "smoothstep",
          style,
        });
      }
    }

    const spouseEdges: Edge<SpouseEdgeData>[] = relationships
      .filter((r) => r.type === "spouse")
      .map((r) => {
        const key = `${r.personAId}-${r.personBId}`;
        const highlighted =
          highlightedEdgeKeys?.has(key) || highlightedEdgeKeys?.has(`${r.personBId}-${r.personAId}`);
        // personA sits left (right handle), personB sits right (left handle).
        return {
          id: r.id,
          source: r.personAId,
          sourceHandle: "right",
          target: r.personBId,
          targetHandle: "left",
          type: "spouse",
          data: { isConsanguineous: r.isConsanguineous, highlighted },
        };
      });

    // Siblings connect implicitly through their shared parents' descent line -- no direct edge.

    // Only render a person's connection dot on the sides that actually have a line attached --
    // an unconnected handle (e.g. no recorded spouse yet) shouldn't show a dangling dot.
    const usedHandles = new Map<string, Set<string>>();
    const noteHandle = (nodeId: string, handle: string | null | undefined) => {
      if (!handle) return;
      if (!posById.has(nodeId)) return; // junction, not a person
      if (!usedHandles.has(nodeId)) usedHandles.set(nodeId, new Set());
      usedHandles.get(nodeId)!.add(handle);
    };
    for (const e of [...spouseEdges, ...familyEdges]) {
      noteHandle(e.source, e.sourceHandle);
      noteHandle(e.target, e.targetHandle);
    }

    const personNodes: Node<PersonNodeData>[] = layout.map(({ person, x, y }) => ({
      id: person.id,
      type: "person",
      position: { x, y },
      // Declared explicitly (not left to React Flow's automatic DOM measurement) so the MiniMap
      // and fitView have real dimensions to work with on the very first render -- React Flow
      // skips drawing a MiniMap node entirely until it has *some* width/height for it, and
      // relying solely on ResizeObserver-based measurement left the MiniMap permanently blank.
      width: SHAPE_SIZE,
      height: SHAPE_SIZE,
      data: {
        person,
        color: colorFor(person),
        infoLines: infoLinesFor(person),
        handles: usedHandles.get(person.id) ?? new Set(),
        highlighted: highlightedPersonIds?.has(person.id),
        mode,
        editable: editableOwnerIds === "all" || editableOwnerIds.has(person.ownerId),
        onSelectPerson,
        onQuickAdd,
        onEdit,
      },
    }));

    return {
      nodes: [...personNodes, ...junctionNodes],
      edges: [...spouseEdges, ...familyEdges],
    };
  }, [
    people,
    relationships,
    colorFor,
    infoLinesFor,
    highlightedPersonIds,
    highlightedEdgeKeys,
    mode,
    editableOwnerIds,
    onSelectPerson,
    onQuickAdd,
    onEdit,
  ]);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls>
          <FullscreenControlButton />
        </Controls>
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "junction") return "transparent";
            const data = n.data as PersonNodeData;
            return data.color;
          }}
          pannable
          zoomable
        />
      </ReactFlow>

      {legendEntries.length > 0 && (
        <div className="color-legend">
          <div className="color-legend-title">{LEGEND_TITLE[colorBy]}</div>
          {legendEntries.map((entry) => (
            <div key={entry.name} className="color-legend-row">
              <span className="color-legend-swatch" style={{ background: entry.color }} />
              <span>{entry.name}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
