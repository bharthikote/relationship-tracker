import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { PathResult, Person, Relationship, Village } from "./types";
import { TreeCanvas } from "./components/TreeCanvas";
import { SearchBar } from "./components/SearchBar";
import { VillageLegend } from "./components/VillageLegend";
import { PersonDetailPanel } from "./components/PersonDetailPanel";
import { AddRelativeFlow } from "./components/AddRelativeFlow";

function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [addFlowAnchorId, setAddFlowAnchorId] = useState<string | null>(null);
  const [activeVillageId, setActiveVillageId] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(() => localStorage.getItem("selfId"));
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [p, r, v] = await Promise.all([
      api.people.list(),
      api.relationships.list(),
      api.villages.list(),
    ]);
    setPeople(p);
    setRelationships(r);
    setVillages(v);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function setSelf(id: string) {
    setSelfId(id);
    localStorage.setItem("selfId", id);
  }

  const visiblePeople = activeVillageId
    ? people.filter((p) => p.currentVillageId === activeVillageId)
    : people;
  const visiblePersonIds = new Set(visiblePeople.map((p) => p.id));
  const visibleRelationships = relationships.filter(
    (r) => visiblePersonIds.has(r.personAId) && visiblePersonIds.has(r.personBId)
  );

  const highlightedPersonIds = pathResult
    ? new Set([selfId, ...pathResult.steps.map((s) => s.personId)].filter(Boolean) as string[])
    : undefined;
  const highlightedEdgeKeys = pathResult
    ? new Set(
        pathResult.steps.map((_, i, arr) => {
          const fromId = i === 0 ? selfId! : arr[i - 1].personId;
          return `${fromId}-${arr[i].personId}`;
        })
      )
    : undefined;

  const anchorPerson = addFlowAnchorId ? people.find((p) => p.id === addFlowAnchorId) ?? null : null;

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1 className="app-title">Village Family Tree</h1>
        <SearchBar people={people} onSelect={setSelectedPersonId} />
        <button className="legend-toggle" onClick={() => setLegendOpen((o) => !o)}>
          Villages
        </button>
      </header>

      {legendOpen && (
        <div className="legend-drawer">
          <VillageLegend
            villages={villages}
            people={people}
            activeVillageId={activeVillageId}
            onFilter={setActiveVillageId}
          />
        </div>
      )}

      <main className="canvas-area">
        {people.length === 0 ? (
          <div className="empty-state">
            <p>No one in the tree yet.</p>
            <button
              onClick={async () => {
                const { person } = await api.people.create({ name: "Me", gender: "other" });
                await refresh();
                setSelectedPersonId(person.id);
              }}
            >
              Add the first person
            </button>
          </div>
        ) : (
          <TreeCanvas
            people={visiblePeople}
            relationships={visibleRelationships}
            villages={villages}
            onSelectPerson={setSelectedPersonId}
            highlightedPersonIds={highlightedPersonIds}
            highlightedEdgeKeys={highlightedEdgeKeys}
          />
        )}

        {people.length > 0 && (
          <button
            className="fab-add"
            onClick={() => setAddFlowAnchorId(selectedPersonId ?? people[0].id)}
            aria-label="Add relative"
          >
            +
          </button>
        )}
      </main>

      {selectedPersonId && (
        <PersonDetailPanel
          personId={selectedPersonId}
          villages={villages}
          selfId={selfId}
          onSetSelf={setSelf}
          onSelectPerson={(id) => {
            setPathResult(null);
            setSelectedPersonId(id);
          }}
          onAddRelative={(id) => setAddFlowAnchorId(id)}
          onClose={() => {
            setSelectedPersonId(null);
            setPathResult(null);
          }}
          onPathResult={setPathResult}
        />
      )}

      {anchorPerson && (
        <AddRelativeFlow
          anchorPerson={anchorPerson}
          villages={villages}
          onClose={() => setAddFlowAnchorId(null)}
          onCreated={async () => {
            setAddFlowAnchorId(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

export default App;
