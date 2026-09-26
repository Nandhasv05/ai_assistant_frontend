interface AppHeaderProps {
  title: string;
  subtitle: string;
  health: "checking" | "ok" | "down";
  lastSync: string;
  contextOpen: boolean;
  onMenu: () => void;
  onToggleContext: () => void;
  onNewChat: () => void;
}

export function AppHeader({
  title,
  subtitle,
  health,
  lastSync,
  contextOpen,
  onMenu,
  onToggleContext,
  onNewChat,
}: AppHeaderProps) {
  const status = health === "ok" ? "SAP LIVE" : health === "down" ? "SAP OFFLINE" : "CHECKING";

  return (
    <header className="app-header">
      <button type="button" className="menu-button" aria-label="Open navigation" onClick={onMenu}>
        Menu
      </button>
      <div className="header-brand">
        <span className="ai-badge" aria-hidden="true">
          EV
        </span>
        <div className="header-copy">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="header-meta">
        <span className={`live-badge is-${health}`}>
          <i />
          {status}
        </span>
        <span className="sync-time">{lastSync}</span>
        <button type="button" className="header-icon" onClick={onNewChat}>
          New chat
        </button>
        <button type="button" className={`header-icon ${contextOpen ? "is-on" : ""}`} onClick={onToggleContext}>
          Context
        </button>
        <span className="user-chip" title="Signed in">
          EV
        </span>
      </div>
    </header>
  );
}
