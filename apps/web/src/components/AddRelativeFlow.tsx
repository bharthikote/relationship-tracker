import { useState } from "react";
import { api } from "../api";
import type { AttachRelationType, Gender, Person, PersonSummary, Village } from "../types";

const PALETTE = ["#2f81f7", "#e0763a", "#3fb950", "#a371f7", "#db61a2", "#d29922", "#39c5cf"];

interface Props {
  anchorPerson: Person;
  villages: Village[];
  onClose: () => void;
  onCreated: (village?: Village) => void;
}

type Step = "relation" | "details" | "consanguineous" | "location" | "duplicates" | "confirm";

export function AddRelativeFlow({ anchorPerson, villages, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>("relation");
  const [relationType, setRelationType] = useState<AttachRelationType | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [isDeceased, setIsDeceased] = useState(false);
  const [isConsanguineous, setIsConsanguineous] = useState(false);
  const [nativeVillageName, setNativeVillageName] = useState("");
  const [hasMoved, setHasMoved] = useState(true);
  const [duplicates, setDuplicates] = useState<PersonSummary[]>([]);
  const [linkExisting, setLinkExisting] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anchorVillageName = villages.find((v) => v.id === anchorPerson.currentVillageId)?.name ?? "";
  const isWomanMarryingIn = relationType === "spouse" && gender === "female";

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

      let village: Village | undefined;
      const villageNameToUse = nativeVillageName.trim() || anchorVillageName;
      if (villageNameToUse) village = await resolveVillage(villageNameToUse);

      const currentVillageId =
        relationType === "spouse" && gender === "female" && hasMoved
          ? anchorPerson.currentVillageId
          : village?.id;

      await api.people.create({
        name,
        gender,
        isDeceased,
        nativeVillageId: village?.id,
        currentVillageId: currentVillageId ?? village?.id,
        attachTo: { personId: anchorPerson.id, relationType: relationType! },
        isConsanguineous,
      });
      onCreated(village);
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
                  {rt === "spouse" ? "Spouse" : rt === "child" ? "Child" : rt === "parent" ? "Parent" : "Sibling"}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "details" && (
          <>
            <h3>Basic details</h3>
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
            <label className="checkbox-row">
              <input type="checkbox" checked={isDeceased} onChange={(e) => setIsDeceased(e.target.checked)} />
              Deceased
            </label>
            <div className="step-actions">
              <button disabled={!name.trim()} onClick={() => setStep(relationType === "spouse" ? "consanguineous" : "location")}>
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
            {isWomanMarryingIn ? (
              <>
                <h3>Which village is she from originally?</h3>
                <input value={nativeVillageName} onChange={(e) => setNativeVillageName(e.target.value)} />
                <label className="checkbox-row">
                  <input type="checkbox" checked={hasMoved} onChange={(e) => setHasMoved(e.target.checked)} />
                  Has she moved to {anchorVillageName || "his village"} after marriage?
                </label>
              </>
            ) : (
              <>
                <h3>Which village is {gender === "male" ? "he" : "she"} from?</h3>
                <input
                  value={nativeVillageName || anchorVillageName}
                  onChange={(e) => setNativeVillageName(e.target.value)}
                  placeholder={anchorVillageName}
                />
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
