import { useState } from "react";
import "../theme/login.css";
import mewahLogo from "./assets/mewah.png";
import ipomasLogo from "./assets/ipomas-white.png";
import premierLogo from "./assets/premier.png";

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.message || "Login failed");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUsername("");
      setPassword("");
      if (data && data.user) {
        localStorage.setItem("kip_token", data.token);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="som-login-shell">
      <div className="som-login-panel">
        <header className="som-login-header">
          <div className="som-login-logo-group">
            <img src={mewahLogo} alt="MEWAH" className="som-login-mewah-logo" />
            <div className="som-login-divider"></div>
          </div>
        </header>
        <form className="som-login-form" onSubmit={handleLogin}>
          <div className="som-login-field">
            <div className="som-login-input-wrapper">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="som-login-icon"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="som-login-field">
            <div className="som-login-input-wrapper">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="som-login-icon"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && <p className="som-login-error">{error}</p>}
          <button className="som-login-button" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "LOGIN"}
          </button>
        </form>
        <footer className="som-login-footer">
          <span className="som-login-status-dot" />
          <span className="som-login-status-text">
            Designed by{" "}
            <span className="premier-brand">
              PREMIER<sup>TM</sup>
            </span>{" "}
            <span className="smart-brand">Smart Solutions</span>
          </span>
        </footer>
      </div>
    </div>
  );
}

export default LoginPage;
