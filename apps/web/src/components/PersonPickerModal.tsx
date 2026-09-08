import { useState } from "react";
import type { Person } from "../types";

interface Props {
  people: Person[];
  onPickPerson: (id: string) => void;
  onStartNewBranch: () => void;
  onClose: () => void;
}

export function PersonPickerModal({ people, onPickPerson, onStartNewBranch, onClose }: Props) {
  const [query, setQuery] = useState("");
  const filtered = people
    .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          close
        </button>
        <h3>Add a relative to whom?</h3>
        <button className="duplicate-row" onClick={onStartNewBranch}>
          + Start a new family branch (not related to anyone yet)
        </button>
        <input
          className="picker-search"
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="picker-list">
          {filtered.map((p) => (
            <button key={p.id} className="duplicate-row" onClick={() => onPickPerson(p.id)}>
              {p.name}
            </button>
          ))}
          {filtered.length === 0 && <div className="hint-text">No one matches "{query}"</div>}
        </div>
      </div>
    </div>
  );
}
