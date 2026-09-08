import { useEffect, useState } from "react";
import { api } from "../api";
import type { ConnectionPermission, ConnectionRequestSummary, MyInviteLink } from "../types";
import { PermissionSelect } from "./AccountPanel";

interface Props {
  onClose: () => void;
}

export function ShareModal({ onClose }: Props) {
  const [invite, setInvite] = useState<MyInviteLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [connections, setConnections] = useState<ConnectionRequestSummary[]>([]);

  useEffect(() => {
    api.invites.mine().then(setInvite);
    refreshConnections();
  }, []);

  async function refreshConnections() {
    setConnections(await api.connections.list());
  }

  async function changePermission(permission: ConnectionPermission) {
    setInvite(await api.invites.updateMine(permission));
  }

  async function changeMyPermission(id: string, permission: ConnectionPermission) {
    await api.connections.updatePermission(id, permission);
    await refreshConnections();
  }

  async function disconnect(id: string) {
    await api.connections.remove(id);
    await refreshConnections();
  }

  const url = invite ? `${window.location.origin}/invite/${invite.id}` : "";

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    await navigator.share({ title: "Family Tree", text: "Join my family tree", url });
  }

  const accepted = connections.filter((r) => r.status === "accepted");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          close
        </button>
        <h3>Share your tree</h3>
        <p className="hint-text">
          Anyone with this link can create an account (or sign in) and connect to your tree with
          the access level below. They can also choose to start their own tree instead.
        </p>

        {!invite ? (
          <p>Loading...</p>
        ) : (
          <>
            <label>
              Access this link grants
              <PermissionSelect value={invite.permission} onChange={changePermission} />
            </label>
            <label>
              Link
              <input className="share-url-box" value={url} readOnly onFocus={(e) => e.target.select()} />
            </label>
            <div className="step-actions">
              <button onClick={copyLink}>{copied ? "Copied!" : "Copy link"}</button>
              {typeof navigator.share === "function" && (
                <button onClick={nativeShare}>Share...</button>
              )}
            </div>
          </>
        )}

        {accepted.length > 0 && (
          <div className="connections-section">
            <div className="relation-list-title">People with access</div>
            {accepted.map((r) => {
              const other = r.direction === "outgoing" ? r.toUser : r.fromUser;
              return (
                <div key={r.id} className="connection-row connection-row-accepted">
                  <span>{other.displayName}</span>
                  <div className="connection-row-actions">
                    {/* myPermission is the grant I control (what I give THEM on MY tree) --
                        editable. theirPermission is their grant to me on THEIRS -- read-only
                        here, they control it. */}
                    <label className="permission-label">
                      Their access to you
                      <PermissionSelect value={r.myPermission} onChange={(p) => changeMyPermission(r.id, p)} />
                    </label>
                    <label className="permission-label">
                      Your access to them
                      <span className="permission-readonly">
                        {r.theirPermission === "edit" ? "Can edit" : "View only"}
                      </span>
                    </label>
                    <button onClick={() => disconnect(r.id)}>Disconnect</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
