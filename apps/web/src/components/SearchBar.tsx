import { useState } from "react";
import type { Person } from "../types";

interface Props {
  people: Person[];
  onSelect: (id: string) => void;
}

export function SearchBar({ people, onSelect }: Props) {
  const [q, setQ] = useState("");
  const results =
    q.trim().length > 0
      ? people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
      : [];

  return (
    <div className="search-bar">
      <input
        placeholder="Search by name..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {results.length > 0 && (
        <div className="search-results">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p.id);
                setQ("");
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
