import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { PathResult, Person, Profile, Relationship, Village } from "./types";
import { TreeCanvas } from "./components/TreeCanvas";
import { SearchBar } from "./components/SearchBar";
import { VillageLegend } from "./components/VillageLegend";
import { PersonDetailPanel } from "./components/PersonDetailPanel";
import { AddRelativeFlow } from "./components/AddRelativeFlow";
import { AccountPanel } from "./components/AccountPanel";
import { useAuth } from "./auth/AuthContext";
import { AuthPage } from "./auth/AuthPage";

function App() {
  const { session, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    api.profile.me().then(setProfile);
  }, [session]);

  if (authLoading) return null;
  if (!session) return <AuthPage />;
  if (!profile) return null;

  return <TreeApp profile={profile} onProfileUpdated={setProfile} />;
}

function TreeApp({
  profile,
  onProfileUpdated,
}: {
  profile: Profile;
  onProfileUpdated: (p: Profile) => void;
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [addFlowAnchorId, setAddFlowAnchorId] = useState<string | null>(null);
  const [activeVillageId, setActiveVillageId] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(() => localStorage.getItem(`selfId:${profile.id}`));
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

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
    localStorage.setItem(`selfId:${profile.id}`, id);
  }

  async function addSelf() {
    const { person } = await api.people.create({
      name: profile.displayName || profile.email.split("@")[0],
      gender: "other",
    });
    await refresh();
    setSelectedPersonId(person.id);
    setSelf(person.id);
  }

  const myPeople = people.filter((p) => p.ownerId === profile.id);
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
        <button className="legend-toggle" onClick={() => setAccountOpen(true)}>
          {profile.displayName || profile.email.split("@")[0]}
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
            <p>No one visible yet.</p>
            <button onClick={addSelf}>Add yourself to start your tree</button>
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
            onClick={() =>
              myPeople.length === 0
                ? addSelf()
                : setAddFlowAnchorId(selectedPersonId ?? myPeople[0].id)
            }
            aria-label={myPeople.length === 0 ? "Add yourself" : "Add relative"}
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

      {accountOpen && (
        <AccountPanel
          profile={profile}
          onProfileUpdated={onProfileUpdated}
          onClose={() => setAccountOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
