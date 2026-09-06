import { Handle, Position } from "@xyflow/react";
import type { Person, Village } from "../types";

export interface PersonNodeData {
  person: Person;
  village?: Village;
  highlighted?: boolean;
  [key: string]: unknown;
}

export function PersonNode({ data }: { data: PersonNodeData }) {
  const { person, village, highlighted } = data;
  const isFemale = person.gender === "female";
  const shapeStyle: React.CSSProperties = isFemale
    ? { borderRadius: "50%" }
    : person.gender === "male"
      ? { borderRadius: 4 }
      : { borderRadius: 4, transform: "rotate(45deg)" };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 96,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          width: 52,
          height: 52,
          background: village?.color ?? "#8b8b8b",
          border: highlighted ? "3px solid #ffd23f" : "2px solid rgba(0,0,0,0.35)",
          opacity: person.isDeceased ? 0.55 : 1,
          boxShadow: highlighted ? "0 0 0 4px rgba(255,210,63,0.35)" : "none",
          ...shapeStyle,
        }}
        title={person.name}
      />
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: 96,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {person.name}
      </div>
      {!person.verified && (
        <div style={{ fontSize: 10, color: "#c07800" }}>unverified</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
