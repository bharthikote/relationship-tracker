import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Person, Relationship, Village } from "../types";
import { computeLayout } from "../layout";
import { PersonNode, type PersonNodeData } from "./PersonNode";
import { SpouseEdge, type SpouseEdgeData } from "./SpouseEdge";
import type { QuickRelation } from "../quickRelations";

const nodeTypes = { person: PersonNode };
const edgeTypes = { spouse: SpouseEdge };

interface Props {
  people: Person[];
  relationships: Relationship[];
  villages: Village[];
  mode: "view" | "edit";
  editableOwnerIds: Set<string> | "all";
  onSelectPerson: (id: string) => void;
  onQuickAdd: (personId: string, qr: QuickRelation) => void;
  onRename: (personId: string) => void;
  highlightedPersonIds?: Set<string>;
  highlightedEdgeKeys?: Set<string>;
}

export function TreeCanvas({
  people,
  relationships,
  villages,
  mode,
  editableOwnerIds,
  onSelectPerson,
  onQuickAdd,
  onRename,
  highlightedPersonIds,
  highlightedEdgeKeys,
}: Props) {
  const villageById = useMemo(() => new Map(villages.map((v) => [v.id, v])), [villages]);

  const { nodes, edges } = useMemo(() => {
    const layout = computeLayout(people, relationships);

    const nodes: Node<PersonNodeData>[] = layout.map(({ person, x, y }) => ({
      id: person.id,
      type: "person",
      position: { x, y },
      data: {
        person,
        village: person.currentVillageId ? villageById.get(person.currentVillageId) : undefined,
        highlighted: highlightedPersonIds?.has(person.id),
        mode,
        editable: editableOwnerIds === "all" || editableOwnerIds.has(person.ownerId),
        onSelectPerson,
        onQuickAdd,
        onRename,
      },
    }));

    const edges: Edge<SpouseEdgeData>[] = relationships.map((r) => {
      const key = `${r.personAId}-${r.personBId}`;
      const highlighted = highlightedEdgeKeys?.has(key) || highlightedEdgeKeys?.has(`${r.personBId}-${r.personAId}`);
      if (r.type === "spouse") {
        return {
          id: r.id,
          source: r.personAId,
          target: r.personBId,
          type: "spouse",
          data: { isConsanguineous: r.isConsanguineous, highlighted },
        };
      }
      if (r.type === "sibling") {
        return {
          id: r.id,
          source: r.personAId,
          target: r.personBId,
          type: "straight",
          style: { stroke: highlighted ? "#ffd23f" : "#aaa", strokeDasharray: "4 3" },
        };
      }
      return {
        id: r.id,
        source: r.personAId,
        target: r.personBId,
        type: "smoothstep",
        style: { stroke: highlighted ? "#ffd23f" : "#555", strokeWidth: highlighted ? 3 : 1.5 },
      };
    });

    return { nodes, edges };
  }, [
    people,
    relationships,
    villageById,
    highlightedPersonIds,
    highlightedEdgeKeys,
    mode,
    editableOwnerIds,
    onSelectPerson,
    onQuickAdd,
    onRename,
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
      <Controls />
      <MiniMap
        nodeColor={(n) => {
          const data = n.data as PersonNodeData;
          return data.village?.color ?? "#8b8b8b";
        }}
        pannable
        zoomable
      />
    </ReactFlow>
  );
}
