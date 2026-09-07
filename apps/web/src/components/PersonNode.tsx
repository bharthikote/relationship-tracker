import { useEffect, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { Person } from "../types";
import { QUICK_RELATION_GRID, QUICK_RELATION_LABELS, type QuickRelation } from "../quickRelations";

export interface PersonNodeData {
  person: Person;
  color: string;
  handles: Set<string>;
  highlighted?: boolean;
  mode: "view" | "edit";
  editable: boolean;
  onSelectPerson: (id: string) => void;
  onQuickAdd: (personId: string, qr: QuickRelation) => void;
  onRename: (personId: string) => void;
  [key: string]: unknown;
}

export const SHAPE_SIZE = 52;

export function PersonNode({ data }: { data: PersonNodeData }) {
  const { person, color, handles, highlighted, mode, editable, onSelectPerson, onQuickAdd, onRename } = data;
  const [open, setOpen] = useState(false);
  const interactive = mode === "edit" && editable;
  const dotColor = color;

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [open]);

  const isFemale = person.gender === "female";
  const shapeStyle: React.CSSProperties = isFemale
    ? { borderRadius: "50%" }
    : person.gender === "male"
      ? { borderRadius: 4 }
      : { borderRadius: 4, transform: "rotate(45deg)" };

  function handleClick() {
    setOpen(false);
    onSelectPerson(person.id);
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (!interactive) return;
    e.preventDefault();
    setOpen((o) => !o);
  }

  return (
    <div className="person-node-wrap" style={{ position: "relative", width: SHAPE_SIZE, height: SHAPE_SIZE }}>
      {/* Parent-child: child's top connects to parent's bottom. */}
      {handles.has("top") && (
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{ background: dotColor, borderColor: dotColor }}
        />
      )}
      {/* Siblings: elder's right connects to younger's left. Spouses: personA's right to personB's left. */}
      {handles.has("left") && (
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          style={{ background: dotColor, borderColor: dotColor }}
        />
      )}

      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          width: "100%",
          height: "100%",
          background: dotColor,
          border: highlighted ? "3px solid #ffd23f" : "2px solid rgba(0,0,0,0.35)",
          opacity: person.isDeceased ? 0.55 : 1,
          boxShadow: highlighted ? "0 0 0 4px rgba(255,210,63,0.35)" : "none",
          cursor: "pointer",
          ...shapeStyle,
        }}
        title={interactive ? `${person.name} (right-click for options)` : person.name}
      />

      {handles.has("bottom") && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ background: dotColor, borderColor: dotColor }}
        />
      )}
      {handles.has("right") && (
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{ background: dotColor, borderColor: dotColor }}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: 6,
          width: 96,
          fontSize: 12,
          textAlign: "center",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {person.name}
      </div>

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
