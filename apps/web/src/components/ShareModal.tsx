import { useEffect, useState } from "react";
import { api } from "../api";
import type { ConnectionPermission, MyInviteLink } from "../types";
import { PermissionSelect } from "./AccountPanel";

interface Props {
  onClose: () => void;
}

export function ShareModal({ onClose }: Props) {
  const [invite, setInvite] = useState<MyInviteLink | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.invites.mine().then(setInvite);
  }, []);

  async function changePermission(permission: ConnectionPermission) {
    setInvite(await api.invites.updateMine(permission));
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
      </div>
    </div>
  );
}
