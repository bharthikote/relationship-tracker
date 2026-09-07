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
import type { ColorByMode, Person, Relationship, Village } from "../types";
import { computeLayout } from "../layout";
import { PersonNode, SHAPE_SIZE, type PersonNodeData } from "./PersonNode";
import { SpouseEdge, type SpouseEdgeData } from "./SpouseEdge";
import { JunctionNode } from "./JunctionNode";
import type { QuickRelation } from "../quickRelations";
import { EnterFullscreenIcon, ExitFullscreenIcon } from "../icons";
import { DEFAULT_SHAPE_COLOR, colorForId } from "../palette";

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

interface Props {
  people: Person[];
  relationships: Relationship[];
  villages: Village[];
  colorBy: ColorByMode;
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
  colorBy,
  mode,
  editableOwnerIds,
  onSelectPerson,
  onQuickAdd,
  onEdit,
  highlightedPersonIds,
  highlightedEdgeKeys,
}: Props) {
  const villageById = useMemo(() => new Map(villages.map((v) => [v.id, v])), [villages]);

  const colorFor = useMemo(() => {
    return (person: Person): string => {
      switch (colorBy) {
        case "village":
          return (person.nativeVillageId && villageById.get(person.nativeVillageId)?.color) || DEFAULT_SHAPE_COLOR;
        case "location":
          return (person.currentVillageId && villageById.get(person.currentVillageId)?.color) || DEFAULT_SHAPE_COLOR;
        case "caste":
          return person.casteId ? colorForId(person.casteId) : DEFAULT_SHAPE_COLOR;
        case "subcaste":
          return person.subcasteId ? colorForId(person.subcasteId) : DEFAULT_SHAPE_COLOR;
        default:
          return DEFAULT_SHAPE_COLOR;
      }
    };
  }, [colorBy, villageById]);

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
      data: {
        person,
        color: colorFor(person),
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
    highlightedPersonIds,
    highlightedEdgeKeys,
    mode,
    editableOwnerIds,
    onSelectPerson,
    onQuickAdd,
    onEdit,
  ]);

  return (
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
  );
}
