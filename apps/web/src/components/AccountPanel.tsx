import { useEffect, useState } from "react";
import { api } from "../api";
import type {
  AdminProfile,
  ConnectionPermission,
  ConnectionRequestSummary,
  DiscoverProfile,
  Profile,
  TreeVisibility,
} from "../types";

type Tab = "profile" | "connections" | "admin";

interface Props {
  profile: Profile;
  onProfileUpdated: (p: Profile) => void;
  onClose: () => void;
}

export function AccountPanel({ profile, onProfileUpdated, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal account-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          close
        </button>
        <div className="tab-row">
          <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>
            Profile
          </button>
          <button className={tab === "connections" ? "active" : ""} onClick={() => setTab("connections")}>
            Connections
          </button>
          {profile.role === "super_admin" && (
            <button className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}>
              Admin
            </button>
          )}
        </div>

        {tab === "profile" && <ProfileTab profile={profile} onProfileUpdated={onProfileUpdated} />}
        {tab === "connections" && <ConnectionsTab />}
        {tab === "admin" && profile.role === "super_admin" && <AdminTab />}
      </div>
    </div>
  );
}

function ProfileTab({
  profile,
  onProfileUpdated,
}: {
  profile: Profile;
  onProfileUpdated: (p: Profile) => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [visibility, setVisibility] = useState<TreeVisibility>(profile.treeVisibility);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.profile.update({ displayName, treeVisibility: visibility });
      onProfileUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="muted-text">{profile.email}</p>
      <label>
        Display name
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={profile.email} />
      </label>
      <label>Tree visibility</label>
      <div className="visibility-choice">
        <button
          className={visibility === "private" ? "active" : ""}
          onClick={() => setVisibility("private")}
        >
          Private — only me
        </button>
        <button className={visibility === "open" ? "active" : ""} onClick={() => setVisibility("open")}>
          Open — visible to others
        </button>
      </div>
      <div className="step-actions">
        <button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

export function PermissionSelect({
  value,
  onChange,
}: {
  value: ConnectionPermission;
  onChange: (p: ConnectionPermission) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as ConnectionPermission)}>
      <option value="view">View only</option>
      <option value="edit">Can edit</option>
    </select>
  );
}

function ConnectionsTab() {
  const [discoverList, setDiscoverList] = useState<DiscoverProfile[]>([]);
  const [requests, setRequests] = useState<ConnectionRequestSummary[]>([]);
  const [acceptPermissions, setAcceptPermissions] = useState<Record<string, ConnectionPermission>>({});

  async function refresh() {
    const [d, r] = await Promise.all([api.discover(), api.connections.list()]);
    setDiscoverList(d);
    setRequests(r);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function sendRequest(toUserId: string) {
    await api.connections.create(toUserId, undefined, "view");
    await refresh();
  }

  async function acceptRequest(id: string) {
    await api.connections.accept(id, acceptPermissions[id] ?? "view");
    await refresh();
  }

  const incoming = requests.filter((r) => r.direction === "incoming" && r.status === "pending");

  return (
    <div>
      <p className="muted-text">
        To add people or manage their access to your tree, use the Share button on the main
        screen. This tab covers requests you've received and open trees you can browse.
      </p>

      {discoverList.length > 0 && (
        <div className="connections-section">
          <div className="relation-list-title">Open trees you can browse</div>
          {discoverList.map((d) => (
            <div key={d.id} className="connection-row">
              <span>
                {d.displayName} ({d.personCount} people)
              </span>
              <button onClick={() => sendRequest(d.id)}>Connect</button>
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <div className="connections-section">
          <div className="relation-list-title">Incoming requests</div>
          {incoming.map((r) => (
            <div key={r.id} className="connection-row">
              <span>
                {r.fromUser.displayName} — offers you <strong>{r.theirPermission === "edit" ? "edit" : "view"}</strong>{" "}
                access to their tree
              </span>
              <div className="connection-row-actions">
                <PermissionSelect
                  value={acceptPermissions[r.id] ?? "view"}
                  onChange={(p) => setAcceptPermissions((prev) => ({ ...prev, [r.id]: p }))}
                />
                <button onClick={() => acceptRequest(r.id)}>Accept</button>
                <button
                  onClick={async () => {
                    await api.connections.decline(r.id);
                    refresh();
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
          <div className="hint-text">The dropdown sets the access you'll grant them on your tree.</div>
        </div>
      )}

    </div>
  );
}

function AdminTab() {
  const [users, setUsers] = useState<AdminProfile[]>([]);

  useEffect(() => {
    api.admin.users().then(setUsers);
  }, []);

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Visibility</th>
            <th>People</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.displayName ?? "—"}</td>
              <td>{u.role}</td>
              <td>{u.treeVisibility}</td>
              <td>{u.personCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
