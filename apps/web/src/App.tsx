import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type {
  AttachRelationType,
  Caste,
  ColorByMode,
  Gender,
  InfoField,
  PathResult,
  Person,
  Profile,
  Relationship,
  Subcaste,
  Village,
} from "./types";
import { TreeCanvas } from "./components/TreeCanvas";
import { SearchBar } from "./components/SearchBar";
import { SettingsPanel } from "./components/SettingsPanel";
import { PersonDetailPanel } from "./components/PersonDetailPanel";
import { AddRelativeFlow } from "./components/AddRelativeFlow";
import { AccountPanel } from "./components/AccountPanel";
import { EditPersonModal } from "./components/EditPersonModal";
import { UserMenu } from "./components/UserMenu";
import { useAuth } from "./auth/AuthContext";
import { AuthPage } from "./auth/AuthPage";
import { quickRelationToPreset, type QuickRelation } from "./quickRelations";
import { EyeIcon, PencilIcon, GearIcon, AnalyticsIcon } from "./icons";

function App() {
  const { session, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    setProfileError(false);
    api.profile.me().then(setProfile).catch(() => setProfileError(true));
  }, [session]);

  useEffect(() => {
    if (profileError) signOut();
  }, [profileError, signOut]);

  if (authLoading) return null;
  if (!session) return <AuthPage />;
  if (profileError) return null;
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
  const { signOut } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [castes, setCastes] = useState<Caste[]>([]);
  const [subcastes, setSubcastes] = useState<Subcaste[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [addFlowAnchorId, setAddFlowAnchorId] = useState<string | null>(null);
  const [addFlowPreset, setAddFlowPreset] = useState<{ relationType: AttachRelationType; gender: Gender } | null>(
    null
  );
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(() => localStorage.getItem(`selfId:${profile.id}`));
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [colorBy, setColorByState] = useState<ColorByMode>(
    () => (localStorage.getItem(`colorBy:${profile.id}`) as ColorByMode | null) ?? "none"
  );
  const [infoFields, setInfoFieldsState] = useState<Set<InfoField>>(() => {
    const saved = localStorage.getItem(`infoFields:${profile.id}`);
    return new Set((saved ? saved.split(",") : []).filter(Boolean) as InfoField[]);
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [connectedOwnerIds, setConnectedOwnerIds] = useState<Set<string>>(new Set());

  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(async () => {
    const [p, r, v, c, sc] = await Promise.all([
      api.people.list(),
      api.relationships.list(),
      api.villages.list(),
      api.castes.list(),
      api.subcastes.list(),
    ]);
    setPeople(p);
    setRelationships(r);
    setVillages(v);
    setCastes(c);
    setSubcastes(sc);
    setRefreshToken((t) => t + 1);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    api.connections.list().then((requests) => {
      const ids = new Set<string>();
      for (const r of requests) {
        if (r.status !== "accepted") continue;
        ids.add(r.fromUser.id);
        ids.add(r.toUser.id);
      }
      setConnectedOwnerIds(ids);
    });
  }, [profile.id]);

  function setSelf(id: string) {
    setSelfId(id);
    localStorage.setItem(`selfId:${profile.id}`, id);
  }

  function setColorBy(mode: ColorByMode) {
    setColorByState(mode);
    localStorage.setItem(`colorBy:${profile.id}`, mode);
  }

  function setInfoFields(fields: Set<InfoField>) {
    setInfoFieldsState(fields);
    localStorage.setItem(`infoFields:${profile.id}`, [...fields].join(","));
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

  function openQuickAdd(personId: string, qr: QuickRelation) {
    setAddFlowPreset(quickRelationToPreset(qr));
    setAddFlowAnchorId(personId);
  }

  const myPeople = people.filter((p) => p.ownerId === profile.id);
  const editableOwnerIds: Set<string> | "all" =
    profile.role === "super_admin" ? "all" : new Set([profile.id, ...connectedOwnerIds]);

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
  const editPerson = editPersonId ? people.find((p) => p.id === editPersonId) ?? null : null;
  const selectedPerson = selectedPersonId ? people.find((p) => p.id === selectedPersonId) ?? null : null;
  const canEditSelected =
    mode === "edit" &&
    !!selectedPerson &&
    (editableOwnerIds === "all" || editableOwnerIds.has(selectedPerson.ownerId));

  return (
    <div className="app-shell">
      <main className="canvas-area">
        <div className="floating-controls-left">
          <span className="app-title-floating">Family Tree</span>
          <SearchBar people={people} onSelect={setSelectedPersonId} />
        </div>
        <div className="floating-controls-right">
          <button
            className="icon-toggle"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-label="Settings"
            title="Settings"
          >
            <GearIcon />
          </button>
          <button className="icon-toggle" aria-label="Analytics" title="Analytics (coming soon)">
            <AnalyticsIcon />
          </button>
          <div className="mode-toggle">
            <button
              className={mode === "view" ? "active" : ""}
              onClick={() => setMode("view")}
              aria-label="View mode"
              title="View"
            >
              <EyeIcon />
            </button>
            <button
              className={mode === "edit" ? "active" : ""}
              onClick={() => setMode("edit")}
              aria-label="Edit mode"
              title="Edit"
            >
              <PencilIcon />
            </button>
          </div>
          <UserMenu
            displayName={profile.displayName || profile.email.split("@")[0]}
            onOpenProfile={() => setAccountOpen(true)}
            onSignOut={signOut}
          />
        </div>

        {settingsOpen && (
          <div className="legend-drawer">
            <SettingsPanel
              colorBy={colorBy}
              onColorByChange={setColorBy}
              infoFields={infoFields}
              onInfoFieldsChange={setInfoFields}
            />
          </div>
        )}

        {people.length === 0 ? (
          <div className="empty-state">
            <p>No one visible yet.</p>
            <button onClick={addSelf}>Add yourself to start your tree</button>
          </div>
        ) : (
          <TreeCanvas
            people={people}
            relationships={relationships}
            villages={villages}
            castes={castes}
            subcastes={subcastes}
            colorBy={colorBy}
            infoFields={infoFields}
            mode={mode}
            editableOwnerIds={editableOwnerIds}
            onSelectPerson={setSelectedPersonId}
            onQuickAdd={openQuickAdd}
            onEdit={setEditPersonId}
            highlightedPersonIds={highlightedPersonIds}
            highlightedEdgeKeys={highlightedEdgeKeys}
          />
        )}

        {mode === "edit" && people.length > 0 && (
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
          refreshToken={refreshToken}
          villages={villages}
          castes={castes}
          subcastes={subcastes}
          selfId={selfId}
          canEdit={canEditSelected}
          onSetSelf={setSelf}
          onSelectPerson={(id) => {
            setPathResult(null);
            setSelectedPersonId(id);
          }}
          onAddRelative={(id) => setAddFlowAnchorId(id)}
          onEdit={setEditPersonId}
          onClose={() => {
            setSelectedPersonId(null);
            setPathResult(null);
          }}
          onPathResult={setPathResult}
          onPersonUpdated={refresh}
        />
      )}

      {anchorPerson && (
        <AddRelativeFlow
          anchorPerson={anchorPerson}
          villages={villages}
          castes={castes}
          subcastes={subcastes}
          relationships={relationships}
          preset={addFlowPreset ?? undefined}
          onClose={() => {
            setAddFlowAnchorId(null);
            setAddFlowPreset(null);
          }}
          onCreated={async () => {
            setAddFlowAnchorId(null);
            setAddFlowPreset(null);
            await refresh();
          }}
        />
      )}

      {editPerson && (
        <EditPersonModal
          person={editPerson}
          villages={villages}
          castes={castes}
          subcastes={subcastes}
          onClose={() => setEditPersonId(null)}
          onSaved={async () => {
            setEditPersonId(null);
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
