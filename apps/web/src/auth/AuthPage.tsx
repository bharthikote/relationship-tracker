import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";

export function AuthPage() {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const result =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password);
    setSubmitting(false);
    if (result) {
      setError(result);
    } else if (mode === "signup") {
      setInfo("Account created. Check your email to confirm, then sign in.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Village Family Tree</h1>
        <p className="auth-sub">
          {mode === "signin" ? "Sign in to your tree." : "Create an account to start your tree."}
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="error-text">{error}</div>}
          {info && <div className="info-text">{info}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
