import { useMemo, useState } from "react";
import { APP_MODULES } from "../lib/modules.ts";
import type { Conversation, WorkspaceId } from "../types.ts";
import { NavIcon } from "./NavIcon.tsx";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  workspace: WorkspaceId;
  open: boolean;
  health: "checking" | "ok" | "down";
  lastSync: string;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onOpenWorkspace: (id: WorkspaceId) => void;
}

function shortTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dayGroup(iso: string): "Today" | "Yesterday" | "Earlier" {
  const date = new Date(iso);
  const now = new Date();
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = start(now) - start(date);
  if (diff === 0) return "Today";
  if (diff === 86400000) return "Yesterday";
  return "Earlier";
}

export function Sidebar({
  conversations,
  activeId,
  workspace,
  open,
  health,
  lastSync,
  onClose,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
  onPin,
  onOpenWorkspace,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = conversations.filter((conversation) => conversation.title.toLowerCase().includes(needle));
    const pinned = filtered.filter((conversation) => conversation.pinned);
    const rest = filtered.filter((conversation) => !conversation.pinned);
    const buckets: Array<{ label: string; items: Conversation[] }> = [];
    if (pinned.length) buckets.push({ label: "Pinned", items: pinned });
    for (const label of ["Today", "Yesterday", "Earlier"] as const) {
      const items = rest.filter((conversation) => dayGroup(conversation.updatedAt) === label);
      if (items.length) buckets.push({ label, items });
    }
    return buckets;
  }, [conversations, query]);

  function commitRename(id: string) {
    onRename(id, draft);
    setEditingId(null);
  }

  const healthLabel = health === "ok" ? "Connected" : health === "down" ? "Unreachable" : "Checking";

  return (
    <>
      <button type="button" className={`sidebar-backdrop ${open ? "is-visible" : ""}`} aria-label="Close navigation" onClick={onClose} />
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            EV
          </span>
          <div>
            <strong>EVOLV</strong>
            <span>AI COPILOT</span>
          </div>
        </div>

        <p className="sidebar-label">AI modules</p>
        <nav className="module-nav" aria-label="AI modules">
          <button type="button" className={`nav-item ${workspace === "overview" ? "is-active" : ""}`} onClick={() => onOpenWorkspace("overview")}>
            <NavIcon name="overview" />
            Overview
          </button>
          {APP_MODULES.map((module) => (
            <button
              key={module.id}
              type="button"
              className={`nav-item ${workspace === module.id ? "is-active" : ""}`}
              onClick={() => onOpenWorkspace(module.id)}
            >
              <NavIcon name={module.id} />
              <span className="nav-copy">
                <em>{module.name}</em>
                <small>{module.code}</small>
              </span>
            </button>
          ))}
        </nav>

        <button type="button" className="sidebar-new" onClick={onNewChat}>
          + New conversation
        </button>

        <label className="sidebar-search">
          <span className="sr-only">Search conversations</span>
          <input type="search" placeholder="Search conversations" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>

        <div className="history-list">
          {grouped.map((group) => (
            <section key={group.label}>
              <p className="sidebar-label">{group.label}</p>
              {group.items.map((conversation, index) => (
                <div key={conversation.id} className={`history-row ${conversation.id === activeId ? "is-active" : ""}`}>
                  {editingId === conversation.id ? (
                    <input
                      className="history-rename"
                      value={draft}
                      autoFocus
                      onChange={(event) => setDraft(event.target.value)}
                      onBlur={() => commitRename(conversation.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename(conversation.id);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <button type="button" className="history-item" onClick={() => onSelect(conversation.id)}>
                      <span>{conversation.title || `Conversation ${index + 1}`}</span>
                      <em>{shortTime(conversation.updatedAt)}</em>
                    </button>
                  )}
                  <div className="history-actions">
                    <button type="button" className="ghost-icon" onClick={() => onPin(conversation.id)} aria-label="Pin">
                      {conversation.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      type="button"
                      className="ghost-icon"
                      onClick={() => {
                        setEditingId(conversation.id);
                        setDraft(conversation.title);
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="ghost-icon" onClick={() => onDelete(conversation.id)}>
                      Del
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>

        <div className={`sidebar-foot is-${health}`}>
          <span className={`sync-dot is-${health}`} />
          <div>
            <strong>{healthLabel}</strong>
            <em>{lastSync}</em>
          </div>
        </div>
      </aside>
    </>
  );
}
