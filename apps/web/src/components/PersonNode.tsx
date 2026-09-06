import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { Person, Village } from "../types";
import { QUICK_RELATION_GRID, QUICK_RELATION_LABELS, type QuickRelation } from "../quickRelations";

export interface PersonNodeData {
  person: Person;
  village?: Village;
  highlighted?: boolean;
  mode: "view" | "edit";
  editable: boolean;
  onSelectPerson: (id: string) => void;
  onQuickAdd: (personId: string, qr: QuickRelation) => void;
  onRename: (personId: string) => void;
  [key: string]: unknown;
}

export function PersonNode({ data }: { data: PersonNodeData }) {
  const { person, village, highlighted, mode, editable, onSelectPerson, onQuickAdd, onRename } = data;
  const [open, setOpen] = useState(false);
  const interactive = mode === "edit" && editable;

  const isFemale = person.gender === "female";
  const shapeStyle: React.CSSProperties = isFemale
    ? { borderRadius: "50%" }
    : person.gender === "male"
      ? { borderRadius: 4 }
      : { borderRadius: 4, transform: "rotate(45deg)" };

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (interactive) setOpen((o) => !o);
    else onSelectPerson(person.id);
  }

  return (
    <div
      className="person-node-wrap"
      onMouseEnter={() => interactive && setOpen(true)}
      onMouseLeave={() => interactive && setOpen(false)}
      style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: 96 }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div onClick={handleClick} style={{ cursor: "pointer" }}>
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
        {!person.verified && <div style={{ fontSize: 10, color: "#c07800" }}>unverified</div>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {interactive && open && (
        <div className="quick-menu" onClick={(e) => e.stopPropagation()}>
          <button
            className="quick-menu-rename"
            onClick={() => {
              onRename(person.id);
              setOpen(false);
            }}
          >
            Rename
          </button>
          <div className="quick-menu-grid">
            {QUICK_RELATION_GRID.flat().map((qr) => (
              <button
                key={qr}
                onClick={() => {
                  onQuickAdd(person.id, qr as QuickRelation);
                  setOpen(false);
                }}
              >
                {QUICK_RELATION_LABELS[qr as QuickRelation]}
              </button>
            ))}
          </div>
          <button
            className="quick-menu-details"
            onClick={() => {
              onSelectPerson(person.id);
              setOpen(false);
            }}
          >
            View details
          </button>
        </div>
      )}
    </div>
  );
}
