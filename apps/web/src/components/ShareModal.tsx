import { useEffect, useState } from "react";
import { api } from "../api";
import type { ConnectionPermission, ConnectionRequestSummary, MyInviteLink, Profile } from "../types";
import { LinkIcon } from "../icons";

interface Props {
  profile: Profile;
  onClose: () => void;
}

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

// Combines View/Edit/Remove into one dropdown per person, the way Google Sheets' share dialog
// puts Viewer/Editor/Remove access in a single select instead of a separate remove button.
function AccessSelect({
  value,
  onChange,
  onRemove,
}: {
  value: ConnectionPermission;
  onChange: (p: ConnectionPermission) => void;
  onRemove: () => void;
}) {
  return (
    <select
      className="share-access-select"
      value={value}
      onChange={(e) => {
        if (e.target.value === "remove") onRemove();
        else onChange(e.target.value as ConnectionPermission);
      }}
    >
      <option value="view">Viewer</option>
      <option value="edit">Editor</option>
      <option value="remove">Remove access</option>
    </select>
  );
}

export function ShareModal({ profile, onClose }: Props) {
  const [invite, setInvite] = useState<MyInviteLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [connections, setConnections] = useState<ConnectionRequestSummary[]>([]);
  const [email, setEmail] = useState("");
  const [newRequestPermission, setNewRequestPermission] = useState<ConnectionPermission>("view");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.invites.mine().then(setInvite);
    refreshConnections();
  }, []);

  async function refreshConnections() {
    setConnections(await api.connections.list());
  }

  async function addByEmail() {
    setMessage(null);
    const matches = await api.users.searchByEmail(email);
    if (matches.length === 0) return setMessage("No user found with that email.");
    try {
      await api.connections.create(matches[0].id, undefined, newRequestPermission);
      setEmail("");
      await refreshConnections();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not send invite");
    }
  }

  async function changeMyPermission(id: string, permission: ConnectionPermission) {
    await api.connections.updatePermission(id, permission);
    await refreshConnections();
  }

  async function disconnect(id: string) {
    await api.connections.remove(id);
    await refreshConnections();
  }

  async function changeLinkPermission(permission: ConnectionPermission) {
    setInvite(await api.invites.updateMine(permission));
  }

  const url = invite ? `${window.location.origin}/invite/${invite.id}` : "";

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const accepted = connections.filter((r) => r.status === "accepted");
  const pending = connections.filter((r) => r.status === "pending" && r.direction === "outgoing");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-header">
          <h3>Share your tree</h3>
          <button className="close-btn" onClick={onClose}>
            close
          </button>
        </div>

        <div className="share-add-row">
          <input
            placeholder="Add people by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            value={newRequestPermission}
            onChange={(e) => setNewRequestPermission(e.target.value as ConnectionPermission)}
          >
            <option value="view">Viewer</option>
            <option value="edit">Editor</option>
          </select>
          <button onClick={addByEmail} disabled={!email.trim()}>
            Send
          </button>
        </div>
        {message && <div className="error-text">{message}</div>}

        <div className="share-section-title">People with access</div>
        <div className="share-person-row">
          <span className="avatar-circle">{initialOf(profile.displayName || profile.email)}</span>
          <span className="share-person-name">
            {profile.displayName || profile.email} <span className="hint-text">(you)</span>
          </span>
          <span className="share-owner-tag">Owner</span>
        </div>
        {accepted.map((r) => {
          const other = r.direction === "outgoing" ? r.toUser : r.fromUser;
          return (
            <div key={r.id} className="share-person-row">
              <span className="avatar-circle">{initialOf(other.displayName)}</span>
              <span className="share-person-name">{other.displayName}</span>
              <AccessSelect
                value={r.myPermission}
                onChange={(p) => changeMyPermission(r.id, p)}
                onRemove={() => disconnect(r.id)}
              />
            </div>
          );
        })}
        {pending.map((r) => (
          <div key={r.id} className="share-person-row">
            <span className="avatar-circle avatar-circle-pending">{initialOf(r.toUser.displayName)}</span>
            <span className="share-person-name">
              {r.toUser.displayName} <span className="hint-text">(invited, not yet accepted)</span>
            </span>
            <button className="share-cancel-btn" onClick={() => disconnect(r.id)}>
              Cancel
            </button>
          </div>
        ))}

        <div className="share-section-title">General access</div>
        <div className="share-link-row">
          <span className="share-link-icon">
            <LinkIcon />
          </span>
          <div className="share-link-text">
            <div>Anyone with the link</div>
            <div className="hint-text">Signs in, then connects at the access level chosen</div>
          </div>
          {invite && (
            <select value={invite.permission} onChange={(e) => changeLinkPermission(e.target.value as ConnectionPermission)}>
              <option value="view">Viewer</option>
              <option value="edit">Editor</option>
            </select>
          )}
        </div>
        {invite && <input className="share-url-box" value={url} readOnly onFocus={(e) => e.target.select()} />}

        <div className="share-footer">
          <button onClick={copyLink} disabled={!invite}>
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button className="share-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
