import { useState } from "react";
import { api } from "../api";
import type { Caste, Person, Subcaste, Village } from "../types";
import { AutosuggestInput } from "./AutosuggestInput";
import { PALETTE } from "../palette";

interface Props {
  person: Person;
  villages: Village[];
  castes: Caste[];
  subcastes: Subcaste[];
  onClose: () => void;
  onSaved: (updated: Person) => void;
}

function nameOf(list: { id: string; name: string }[], id?: string) {
  return list.find((x) => x.id === id)?.name ?? "";
}

export function EditPersonModal({ person, villages, castes, subcastes, onClose, onSaved }: Props) {
  const [name, setName] = useState(person.name);
  const [nameLocal, setNameLocal] = useState(person.nameLocal ?? "");
  const [dob, setDob] = useState(person.dob ?? "");
  const [isDeceased, setIsDeceased] = useState(person.isDeceased);
  const [caste, setCaste] = useState(nameOf(castes, person.casteId));
  const [subcaste, setSubcaste] = useState(nameOf(subcastes, person.subcasteId));
  const [nativeVillage, setNativeVillage] = useState(nameOf(villages, person.nativeVillageId));
  const [currentVillage, setCurrentVillage] = useState(nameOf(villages, person.currentVillageId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolveVillage(nameInput: string): Promise<string | undefined> {
    const trimmed = nameInput.trim();
    if (!trimmed) return undefined;
    const existing = villages.find((v) => v.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const color = PALETTE[villages.length % PALETTE.length];
    const created = await api.villages.create({ name: trimmed, color });
    return created.id;
  }

  async function resolveCaste(nameInput: string): Promise<string | undefined> {
    const trimmed = nameInput.trim();
    if (!trimmed) return undefined;
    const existing = castes.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    return (await api.castes.create(trimmed)).id;
  }

  async function resolveSubcaste(nameInput: string): Promise<string | undefined> {
    const trimmed = nameInput.trim();
    if (!trimmed) return undefined;
    const existing = subcastes.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    return (await api.subcastes.create(trimmed)).id;
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const [nativeVillageId, currentVillageId, casteId, subcasteId] = await Promise.all([
        resolveVillage(nativeVillage),
        resolveVillage(currentVillage),
        resolveCaste(caste),
        resolveSubcaste(subcaste),
      ]);
      const updated = await api.people.update(person.id, {
        name: name.trim(),
        nameLocal: nameLocal.trim() || undefined,
        dob: dob.trim() || undefined,
        isDeceased,
        casteId,
        subcasteId,
        nativeVillageId,
        currentVillageId,
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
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
        <h3>Edit {person.name}</h3>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label>
          Local name
          <input value={nameLocal} onChange={(e) => setNameLocal(e.target.value)} />
        </label>
        <label>
          Year of birth
          <input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 1985"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </label>
        <label>
          Native village (birth place)
          <AutosuggestInput value={nativeVillage} onChange={setNativeVillage} options={villages.map((v) => v.name)} />
        </label>
        <label>
          Current village
          <AutosuggestInput
            value={currentVillage}
            onChange={setCurrentVillage}
            options={villages.map((v) => v.name)}
          />
        </label>
        <label>
          Caste
          <AutosuggestInput value={caste} onChange={setCaste} options={castes.map((c) => c.name)} />
        </label>
        <label>
          Subcaste
          <AutosuggestInput value={subcaste} onChange={setSubcaste} options={subcastes.map((s) => s.name)} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={isDeceased} onChange={(e) => setIsDeceased(e.target.checked)} />
          Deceased
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
