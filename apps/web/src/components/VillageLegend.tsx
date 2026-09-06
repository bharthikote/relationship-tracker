import type { Person, Village } from "../types";

interface Props {
  villages: Village[];
  people: Person[];
  onFilter: (villageId: string | null) => void;
  activeVillageId: string | null;
}

export function VillageLegend({ villages, people, onFilter, activeVillageId }: Props) {
  const countFor = (villageId: string) =>
    people.filter((p) => p.currentVillageId === villageId).length;

  return (
    <div className="village-legend">
      <div className="village-legend-title">Villages</div>
      {villages.map((v) => (
        <button
          key={v.id}
          className={`village-row ${activeVillageId === v.id ? "active" : ""}`}
          onClick={() => onFilter(activeVillageId === v.id ? null : v.id)}
        >
          <span className="swatch" style={{ background: v.color }} />
          <span className="village-name">{v.name}</span>
          <span className="village-count">{countFor(v.id)}</span>
        </button>
      ))}
    </div>
  );
}
