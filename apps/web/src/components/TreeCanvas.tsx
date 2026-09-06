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

const nodeTypes = { person: PersonNode };
const edgeTypes = { spouse: SpouseEdge };

interface Props {
  people: Person[];
  relationships: Relationship[];
  villages: Village[];
  onSelectPerson: (id: string) => void;
  highlightedPersonIds?: Set<string>;
  highlightedEdgeKeys?: Set<string>;
}

export function TreeCanvas({
  people,
  relationships,
  villages,
  onSelectPerson,
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
  }, [people, relationships, villageById, highlightedPersonIds, highlightedEdgeKeys]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={(_e, node) => onSelectPerson(node.id)}
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
