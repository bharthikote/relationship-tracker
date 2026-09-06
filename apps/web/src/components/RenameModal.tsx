import { useState } from "react";
import { api } from "../api";
import type { Person } from "../types";

interface Props {
  person: Person;
  onClose: () => void;
  onRenamed: (updated: Person) => void;
}

export function RenameModal({ person, onClose, onRenamed }: Props) {
  const [name, setName] = useState(person.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.people.update(person.id, { name: name.trim() });
      onRenamed(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          close
        </button>
        <h3>Rename</h3>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        {error && <div className="error-text">{error}</div>}
        <div className="step-actions">
          <button disabled={saving || !name.trim()} onClick={save}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
