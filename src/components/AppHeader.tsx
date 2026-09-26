import { useState } from "react";

interface AppHeaderProps {
  title: string;
  subtitle: string;
  health: "checking" | "ok" | "down";
  lastSync: string;
  contextOpen: boolean;
  onMenu: () => void;
  onToggleContext: () => void;
}

export function AppHeader({ title, subtitle, health, lastSync, contextOpen, onMenu, onToggleContext }: AppHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const status = health === "ok" ? "SAP LIVE" : health === "down" ? "SAP OFFLINE" : "CHECKING";

  return (
    <header className="app-header">
      <button type="button" className="menu-button" aria-label="Open navigation" onClick={onMenu}>
        Menu
      </button>
      <div className="header-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <span>SAP S/4HANA Connected</span>
      </div>
      <div className="header-meta">
        <span className={`sync-dot is-${health}`}>{status}</span>
        <span className="sync-time">{lastSync}</span>
        <button type="button" className="header-icon" aria-label="Notifications" title="Notifications">
          ●
        </button>
        <button type="button" className={`header-icon ${contextOpen ? "is-on" : ""}`} aria-label="Toggle context" onClick={onToggleContext}>
          Context
        </button>
        <div className="settings-wrap">
          <button
            type="button"
            className={`header-icon ${settingsOpen ? "is-on" : ""}`}
            aria-label="Settings"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            Settings
          </button>
          {settingsOpen && (
            <div className="settings-pop">
              <p>Environment</p>
              <strong>{status}</strong>
              <em>{lastSync}</em>
              <span>Answers use live SAP reads. No mock figures are shown as production data.</span>
            </div>
          )}
        </div>
        <span className="user-chip" title="Signed in">
          EV
        </span>
      </div>
    </header>
  );
}
