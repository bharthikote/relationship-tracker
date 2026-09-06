import { useState } from "react";
import { api } from "../api";
import type { AttachRelationType, Gender, Person, PersonSummary, Village } from "../types";

const PALETTE = ["#2f81f7", "#e0763a", "#3fb950", "#a371f7", "#db61a2", "#d29922", "#39c5cf"];

const RELATION_LABELS: Record<AttachRelationType, string> = {
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
};

interface Props {
  anchorPerson: Person;
  villages: Village[];
  preset?: { relationType: AttachRelationType; gender: Gender };
  onClose: () => void;
  onCreated: (village?: Village) => void;
}

type Step = "relation" | "details" | "consanguineous" | "location" | "duplicates" | "confirm";

export function AddRelativeFlow({ anchorPerson, villages, preset, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>(preset ? "details" : "relation");
  const [relationType, setRelationType] = useState<AttachRelationType | null>(preset?.relationType ?? null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>(preset?.gender ?? "female");
  const [isDeceased, setIsDeceased] = useState(false);
  const [caste, setCaste] = useState("");
  const [subcaste, setSubcaste] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [isConsanguineous, setIsConsanguineous] = useState(false);
  const [villageName, setVillageName] = useState("");
  const [migrated, setMigrated] = useState(false);
  const [currentPlaceName, setCurrentPlaceName] = useState("");
  const [sameAsVillage, setSameAsVillage] = useState(true);
  const [duplicates, setDuplicates] = useState<PersonSummary[]>([]);
  const [linkExisting, setLinkExisting] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anchorVillageName = villages.find((v) => v.id === anchorPerson.currentVillageId)?.name ?? "";

  async function resolveVillage(nameInput: string): Promise<Village> {
    const trimmed = nameInput.trim();
    const existing = villages.find((v) => v.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    const color = PALETTE[villages.length % PALETTE.length];
    return api.villages.create({ name: trimmed, color });
  }

  async function goToDuplicates() {
    const found = await api.people.duplicates(name);
    setDuplicates(found.slice(0, 5));
    setStep(found.length > 0 ? "duplicates" : "confirm");
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (linkExisting) {
        const [type, personAId, personBId] =
          relationType === "spouse"
            ? ["spouse", anchorPerson.id, linkExisting]
            : relationType === "child"
              ? ["parent-child", anchorPerson.id, linkExisting]
              : relationType === "parent"
                ? ["parent-child", linkExisting, anchorPerson.id]
                : ["sibling", anchorPerson.id, linkExisting];
        await api.relationships.create({ type, personAId, personBId, isConsanguineous });
        onCreated();
        return;
      }

      const nativeVillageNameToUse = villageName.trim() || anchorVillageName;
      const nativeVillage = nativeVillageNameToUse ? await resolveVillage(nativeVillageNameToUse) : undefined;

      let currentVillage: Village | undefined = nativeVillage;
      if (migrated && !sameAsVillage && currentPlaceName.trim()) {
        currentVillage = await resolveVillage(currentPlaceName);
      }

      await api.people.create({
        name,
        gender,
        isDeceased,
        caste: caste.trim() || undefined,
        subcaste: subcaste.trim() || undefined,
        dob: birthYear.trim() || undefined,
        nativeVillageId: nativeVillage?.id,
        currentVillageId: currentVillage?.id ?? nativeVillage?.id,
        attachTo: { personId: anchorPerson.id, relationType: relationType! },
        isConsanguineous,
      });
      onCreated(nativeVillage);
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

        {step === "relation" && (
          <>
            <h3>Adding someone related to {anchorPerson.name}. How are they related?</h3>
            <div className="big-choice-grid">
              {(["spouse", "child", "parent", "sibling"] as AttachRelationType[]).map((rt) => (
                <button
                  key={rt}
                  className="big-choice"
                  onClick={() => {
                    setRelationType(rt);
                    setStep("details");
                  }}
                >
                  {RELATION_LABELS[rt]}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "details" && (
          <>
            <h3>
              {preset
                ? `Add ${gender === "male" ? "male" : gender === "female" ? "female" : ""} ${relationType} of ${anchorPerson.name}`
                : "Basic details"}
            </h3>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            {!preset && (
              <label>
                Gender
                <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>
            )}
            <label>
              Caste
              <input value={caste} onChange={(e) => setCaste(e.target.value)} />
            </label>
            <label>
              Subcaste
              <input value={subcaste} onChange={(e) => setSubcaste(e.target.value)} />
            </label>
            <label>
              Year of birth
              <input
                type="number"
                inputMode="numeric"
                placeholder="e.g. 1985"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
              />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={isDeceased} onChange={(e) => setIsDeceased(e.target.checked)} />
              Deceased
            </label>
            <div className="step-actions">
              <button
                disabled={!name.trim()}
                onClick={() => setStep(relationType === "spouse" ? "consanguineous" : "location")}
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === "consanguineous" && (
          <>
            <h3>Is this marriage between two people who share a family ancestor (blood relatives)?</h3>
            <div className="step-actions">
              <button
                onClick={() => {
                  setIsConsanguineous(true);
                  setStep("location");
                }}
              >
                Yes
              </button>
              <button
                onClick={() => {
                  setIsConsanguineous(false);
                  setStep("location");
                }}
              >
                No
              </button>
            </div>
          </>
        )}

        {step === "location" && (
          <>
            <h3>Which village is {name || "this person"} from?</h3>
            <input
              value={villageName}
              onChange={(e) => setVillageName(e.target.value)}
              placeholder={anchorVillageName}
            />
            <label className="checkbox-row">
              <input type="checkbox" checked={migrated} onChange={(e) => setMigrated(e.target.checked)} />
              Has {name || "this person"} moved elsewhere?
            </label>
            {migrated && (
              <>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={sameAsVillage}
                    onChange={(e) => setSameAsVillage(e.target.checked)}
                  />
                  Same as village
                </label>
                {!sameAsVillage && (
                  <label>
                    Current place
                    <input value={currentPlaceName} onChange={(e) => setCurrentPlaceName(e.target.value)} />
                  </label>
                )}
              </>
            )}
            <div className="step-actions">
              <button onClick={goToDuplicates}>Next</button>
            </div>
          </>
        )}

        {step === "duplicates" && (
          <>
            <h3>We found a similar person — is this the same {name}?</h3>
            {duplicates.map((d) => (
              <button
                key={d.id}
                className={`duplicate-row ${linkExisting === d.id ? "selected" : ""}`}
                onClick={() => setLinkExisting(d.id)}
              >
                {d.name} ({d.gender})
              </button>
            ))}
            <div className="step-actions">
              <button onClick={() => setStep("confirm")}>No, this is a different person</button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <h3>Confirm</h3>
            <p>
              {linkExisting ? (
                <>
                  Link the existing person <strong>{duplicates.find((d) => d.id === linkExisting)?.name}</strong> as{" "}
                  {relationType} of {anchorPerson.name}?
                </>
              ) : (
                <>
                  Add <strong>{name}</strong> ({gender}) as {relationType} of {anchorPerson.name}?
                </>
              )}
            </p>
            {error && <div className="error-text">{error}</div>}
            <div className="step-actions">
              <button disabled={submitting} onClick={submit}>
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
