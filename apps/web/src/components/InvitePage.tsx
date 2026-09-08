import { useEffect, useState } from "react";
import { api } from "../api";
import type { InvitePreview } from "../types";
import { useAuth } from "../auth/AuthContext";
import { AuthPage } from "../auth/AuthPage";

interface Props {
  inviteId: string;
  onDone: () => void;
}

export function InvitePage({ inviteId, onDone }: Props) {
  const { session, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("pendingInviteId", inviteId);
    api.invites
      .get(inviteId)
      .then(setInvite)
      .catch(() => setNotFound(true));
  }, [inviteId]);

  function skip() {
    localStorage.removeItem("pendingInviteId");
    onDone();
  }

  async function accept() {
    setAccepting(true);
    setError(null);
    try {
      await api.invites.accept(inviteId);
      localStorage.removeItem("pendingInviteId");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept this invite");
    } finally {
      setAccepting(false);
    }
  }

  if (authLoading) return null;

  if (notFound) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Family Tree</h1>
          <p>This invite link isn't valid anymore.</p>
          <button onClick={skip}>Continue to the app</button>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const banner = (
    <p className="invite-banner">
      <strong>{invite.fromDisplayName}</strong> invited you to their family tree, offering{" "}
      <strong>{invite.permission === "edit" ? "edit" : "view"}</strong> access.
    </p>
  );

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          {banner}
          <AuthPage embedded />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Family Tree</h1>
        {banner}
        {error && <div className="error-text">{error}</div>}
        <div className="step-actions">
          <button onClick={accept} disabled={accepting}>
            {accepting ? "Connecting..." : "Accept and view their tree"}
          </button>
          <button onClick={skip}>Not now — start my own</button>
        </div>
      </div>
    </div>
  );
}
