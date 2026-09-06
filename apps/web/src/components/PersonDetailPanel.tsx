import { useEffect, useState } from "react";
import { api } from "../api";
import type { Caste, PathResult, PersonDetail, PersonSummary, Subcaste, Village } from "../types";

interface Props {
  personId: string;
  villages: Village[];
  castes: Caste[];
  subcastes: Subcaste[];
  selfId: string | null;
  canEdit: boolean;
  onSetSelf: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onAddRelative: (id: string) => void;
  onRename: (id: string) => void;
  onClose: () => void;
  onPathResult: (result: PathResult | null) => void;
}

function nameOf(list: { id: string; name: string }[], id?: string) {
  return list.find((x) => x.id === id)?.name;
}

function RelationList({
  title,
  people,
  onSelectPerson,
}: {
  title: string;
  people: PersonSummary[];
  onSelectPerson: (id: string) => void;
}) {
  if (people.length === 0) return null;
  return (
    <div className="relation-list">
      <div className="relation-list-title">{title}</div>
      {people.map((p) => (
        <button key={p.id} className="relation-chip" onClick={() => onSelectPerson(p.id)}>
          {p.name}
        </button>
      ))}
    </div>
  );
}

export function PersonDetailPanel({
  personId,
  villages,
  castes,
  subcastes,
  selfId,
  canEdit,
  onSetSelf,
  onSelectPerson,
  onAddRelative,
  onRename,
  onClose,
  onPathResult,
}: Props) {
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [pathCaption, setPathCaption] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setPathCaption(null);
    api.people.get(personId).then(setDetail).catch(() => setDetail(null));
  }, [personId]);

  if (!detail) return <div className="detail-panel">Loading...</div>;

  const born = nameOf(villages, detail.nativeVillageId) ?? "Unknown";
  const livesIn = nameOf(villages, detail.currentVillageId) ?? "Unknown";
  const moved = detail.nativeVillageId !== detail.currentVillageId;
  const casteName = nameOf(castes, detail.casteId);
  const subcasteName = nameOf(subcastes, detail.subcasteId);

  const findRelationship = async () => {
    if (!selfId) return;
    const result = await api.path(selfId, detail.id);
    setPathCaption(result.caption);
    onPathResult(result);
  };

  const markVerified = async () => {
    const updated = await api.people.update(detail.id, { verified: true });
    setDetail({ ...detail, verified: updated.verified });
  };

  return (
    <div className="detail-panel">
      <button className="close-btn" onClick={onClose}>
        close
      </button>
      <h2>
        {detail.name} {detail.isDeceased ? "(deceased)" : ""}
      </h2>
      <div className="gender-badge">{detail.gender}</div>
      {!detail.verified && <div className="unverified-tag">Not yet verified</div>}

      <div className="location-block">
        <div>
          Born in <strong>{born}</strong>
        </div>
        {moved && (
          <div>
            Now living in <strong>{livesIn}</strong>
          </div>
        )}
        {detail.dob && (
          <div>
            Born <strong>{detail.dob}</strong>
          </div>
        )}
        {(casteName || subcasteName) && (
          <div>
            {casteName}
            {casteName && subcasteName ? " — " : ""}
            {subcasteName}
          </div>
        )}
      </div>

      <RelationList title="Spouse(s)" people={detail.relations.spouses} onSelectPerson={onSelectPerson} />
      <RelationList title="Parents" people={detail.relations.parents} onSelectPerson={onSelectPerson} />
      <RelationList title="Children" people={detail.relations.children} onSelectPerson={onSelectPerson} />
      <RelationList title="Siblings" people={detail.relations.siblings} onSelectPerson={onSelectPerson} />

      <div className="detail-actions">
        {canEdit && <button onClick={() => onRename(detail.id)}>Rename</button>}
        {canEdit && <button onClick={() => onAddRelative(detail.id)}>Add relative to this person</button>}
        {canEdit && !detail.verified && <button onClick={markVerified}>Mark as verified</button>}
        {selfId && selfId !== detail.id && (
          <button onClick={findRelationship}>Find my relationship to this person</button>
        )}
        {!selfId && <button onClick={() => onSetSelf(detail.id)}>This is me</button>}
      </div>

      {pathCaption && <div className="path-caption">{pathCaption}</div>}
    </div>
  );
}
