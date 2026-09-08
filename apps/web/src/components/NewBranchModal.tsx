import { useState } from "react";
import { api } from "../api";
import type { Gender, Person } from "../types";

interface Props {
  onClose: () => void;
  onCreated: (person: Person) => void;
}

export function NewBranchModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("other");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const { person } = await api.people.create({ name, gender });
      onCreated(person);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          close
        </button>
        <h3>Start a new family branch</h3>
        <p className="hint-text">
          This person won't be linked to anyone yet -- they'll appear as the start of a separate
          branch on the canvas. You can add their relatives and details afterward.
        </p>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label>
          Gender
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </label>
        {error && <div className="error-text">{error}</div>}
        <div className="step-actions">
          <button disabled={!name.trim() || submitting} onClick={submit}>
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
