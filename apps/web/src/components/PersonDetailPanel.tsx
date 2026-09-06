import { useEffect, useState } from "react";
import { api } from "../api";
import type { PathResult, PersonDetail, PersonSummary, Village } from "../types";

interface Props {
  personId: string;
  villages: Village[];
  selfId: string | null;
  canEdit: boolean;
  onSetSelf: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onAddRelative: (id: string) => void;
  onRename: (id: string) => void;
  onClose: () => void;
  onPathResult: (result: PathResult | null) => void;
}

function villageName(villages: Village[], id?: string) {
  return villages.find((v) => v.id === id)?.name ?? "Unknown";
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

  const born = villageName(villages, detail.nativeVillageId);
  const livesIn = villageName(villages, detail.currentVillageId);
  const moved = detail.nativeVillageId !== detail.currentVillageId;

  const findRelationship = async () => {
    if (!selfId) return;
    const result = await api.path(selfId, detail.id);
    setPathCaption(result.caption);
    onPathResult(result);
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
        {(detail.caste || detail.subcaste) && (
          <div>
            {detail.caste}
            {detail.caste && detail.subcaste ? " — " : ""}
            {detail.subcaste}
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
        {selfId && selfId !== detail.id && (
          <button onClick={findRelationship}>Find my relationship to this person</button>
        )}
        {!selfId && <button onClick={() => onSetSelf(detail.id)}>This is me</button>}
      </div>

      {pathCaption && <div className="path-caption">{pathCaption}</div>}
    </div>
  );
}
