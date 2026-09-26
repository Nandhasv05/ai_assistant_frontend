import { ChevronRight, LayoutGrid, LogOut, Menu, MessageSquarePlus, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { APP_MODULES, getModule, moduleTitle } from "../lib/modules.ts";
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
  onOpen: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onOpenWorkspace: (id: WorkspaceId) => void;
}

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

const PROFILE_KEY = "ai-assistant.profile";

function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed?.name || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  onOpen,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
  onPin,
  onOpenWorkspace,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Sales Manager");
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });
  const modulesBtnRef = useRef<HTMLButtonElement>(null);
  const modulesMenuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const activeModuleLabel = workspace === "overview" ? "Overview" : getModule(workspace)?.name ?? moduleTitle(workspace);
  const initials = profile ? initialsFrom(profile.name) : "G";

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

  function placeFlyout() {
    const box = modulesBtnRef.current?.getBoundingClientRect();
    if (!box) return;
    const width = 220;
    const gap = 10;
    let left = box.right + gap;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, box.left - width - gap);
    }
    setFlyoutPos({ top: box.top, left });
  }

  useEffect(() => {
    if (!modulesOpen) return;
    placeFlyout();
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (modulesBtnRef.current?.contains(target) || modulesMenuRef.current?.contains(target)) return;
      setModulesOpen(false);
    }
    function onReposition() {
      placeFlyout();
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [modulesOpen]);

  useEffect(() => {
    function syncProfile() {
      setProfile(loadProfile());
    }
    function onDocClick(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
        setLoginOpen(false);
      }
    }
    window.addEventListener("ai-assistant-profile", syncProfile);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      window.removeEventListener("ai-assistant-profile", syncProfile);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (modulesOpen) setModulesOpen(false);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, modulesOpen]);

  function commitRename(id: string) {
    onRename(id, draft);
    setEditingId(null);
  }

  function pickModule(id: WorkspaceId) {
    onOpenWorkspace(id);
    setModulesOpen(false);
  }

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    const next = {
      name: name.trim() || "Evolv User",
      email: email.trim() || "user@evolv.com",
      role: role.trim() || "Sales Manager",
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setProfile(next);
    setLoginOpen(false);
    setProfileMenuOpen(false);
    window.dispatchEvent(new Event("ai-assistant-profile"));
  }

  function handleLogout() {
    localStorage.removeItem(PROFILE_KEY);
    setProfile(null);
    setProfileMenuOpen(false);
    setLoginOpen(false);
    window.dispatchEvent(new Event("ai-assistant-profile"));
  }

  function openLogin() {
    setName(profile?.name ?? "");
    setEmail(profile?.email ?? "");
    setRole(profile?.role ?? "Sales Manager");
    setLoginOpen(true);
    setProfileMenuOpen(false);
  }

  const healthLabel = health === "ok" ? "LIVE SAP" : health === "down" ? "SAP OFFLINE" : "CHECKING";

  const modulesMenu =
    modulesOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={modulesMenuRef}
            className="module-flyout"
            role="menu"
            style={{ top: flyoutPos.top, left: flyoutPos.left }}
          >
            <button
              type="button"
              role="menuitem"
              className={workspace === "overview" ? "is-active" : ""}
              onClick={() => pickModule("overview")}
            >
              <NavIcon name="overview" />
              <span>Overview</span>
              <ChevronRight size={14} className="module-flyout-chevron" />
            </button>
            <div className="module-flyout-sep" />
            {APP_MODULES.slice(0, 3).map((module) => (
              <button
                key={module.id}
                type="button"
                role="menuitem"
                className={workspace === module.id ? "is-active" : ""}
                onClick={() => pickModule(module.id)}
              >
                <NavIcon name={module.id} />
                <span className="module-flyout-copy">
                  <em>{module.name}</em>
                  <small>{module.code}</small>
                </span>
                <ChevronRight size={14} className="module-flyout-chevron" />
              </button>
            ))}
            <div className="module-flyout-sep" />
            {APP_MODULES.slice(3).map((module) => (
              <button
                key={module.id}
                type="button"
                role="menuitem"
                className={workspace === module.id ? "is-active" : ""}
                onClick={() => pickModule(module.id)}
              >
                <NavIcon name={module.id} />
                <span className="module-flyout-copy">
                  <em>{module.name}</em>
                  <small>{module.code}</small>
                </span>
                <ChevronRight size={14} className="module-flyout-chevron" />
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" className="mobile-nav-btn" aria-label="Open menu" onClick={onOpen}>
        <Menu size={18} />
      </button>
      <button type="button" className={`sidebar-backdrop ${open ? "is-visible" : ""}`} aria-label="Close navigation" onClick={onClose} />
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-brand-block">
          <div className="sidebar-brand-glow" aria-hidden="true" />
          <div className="sidebar-brand-row">
            <img
              className="evolv-logo evolv-logo--light"
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="evolv"
              height={26}
            />
            <div className="sidebar-brand-actions">
              <button
                type="button"
                className="sidebar-icon-tool"
                title="New chat"
                aria-label="New chat"
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
              >
                <MessageSquarePlus size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={`sidebar-icon-tool ${searchOpen ? "is-on" : ""}`}
                title="Search chats"
                aria-label="Search chats"
                onClick={() => {
                  setSearchOpen((value) => !value);
                  setHistoryOpen(true);
                }}
              >
                <Search size={16} strokeWidth={2} />
              </button>
              <button type="button" className="sidebar-close-btn" aria-label="Close menu" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>
          <p className="sidebar-kicker">SAP Chatbot</p>
          {searchOpen && (
            <label className="sidebar-search sidebar-search--brand">
              <span className="sr-only">Search conversations</span>
              <input
                type="search"
                placeholder="Search chats…"
                value={query}
                autoFocus
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-flyout-wrap">
            <button
              ref={modulesBtnRef}
              type="button"
              className={`sidebar-group-toggle ${modulesOpen ? "is-open" : ""}`}
              onClick={() => {
                setModulesOpen((value) => {
                  const next = !value;
                  if (next) queueMicrotask(placeFlyout);
                  return next;
                });
              }}
              aria-expanded={modulesOpen}
              aria-haspopup="menu"
            >
              <span>
                <LayoutGrid size={13} />
                Modules
              </span>
              <em className="sidebar-module-hint">{activeModuleLabel}</em>
              <ChevronRight size={12} className={modulesOpen ? "is-open" : ""} />
            </button>
          </div>
          {modulesMenu}

          <div className="sidebar-group">
            <button type="button" className="sidebar-group-toggle" onClick={() => setHistoryOpen((value) => !value)}>
              <span>Today history</span>
              <ChevronRight size={12} className={historyOpen ? "is-open" : ""} />
            </button>

            {historyOpen && (
              <div className="sidebar-group-body">
                {grouped.length === 0 ? (
                  <p className="sidebar-empty">No conversations yet.</p>
                ) : (
                  grouped.map((group) => (
                    <section key={group.label} className="history-section">
                      <p className="sidebar-section-label">{group.label}</p>
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
                            <button
                              type="button"
                              className="history-item"
                              onClick={() => {
                                onSelect(conversation.id);
                                onClose();
                              }}
                            >
                              <span>{conversation.title || `Conversation ${index + 1}`}</span>
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
                  ))
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="sidebar-profile" ref={profileRef}>
          <button
            type="button"
            className="sidebar-profile-trigger"
            onClick={() => {
              if (profile) {
                setProfileMenuOpen((value) => !value);
                setLoginOpen(false);
              } else {
                openLogin();
              }
            }}
          >
            <span className="sidebar-avatar">{initials}</span>
            <span className="sidebar-profile-copy">
              <strong>{profile?.name ?? "Guest"}</strong>
              <em>{profile ? profile.role : "Not signed in"}</em>
            </span>
            <span className={`sidebar-health is-${health}`} title={lastSync}>
              {healthLabel}
            </span>
          </button>

          {profileMenuOpen && profile && (
            <div className="sidebar-profile-menu" role="menu">
              <div className="profile-card">
                <span className="sidebar-avatar large">{initials}</span>
                <div>
                  <strong>{profile.name}</strong>
                  <em>{profile.email}</em>
                  <span>{profile.role}</span>
                </div>
              </div>
              <button type="button" role="menuitem" onClick={openLogin}>
                <UserRound size={14} />
                Profile details
              </button>
              <button type="button" role="menuitem" className="is-danger" onClick={handleLogout}>
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}

          {loginOpen ? (
            <form className="sidebar-login-pop" onSubmit={handleLogin}>
              <p>{profile ? "Profile details" : "Sign in"}</p>
              <label>
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
              </label>
              <label>
                Email
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@evolv.com" required />
              </label>
              <label>
                Role
                <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Sales Manager" />
              </label>
              <div className="login-actions">
                <button type="button" className="header-new" onClick={() => setLoginOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-send">
                  {profile ? "Save" : "Login"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </aside>
    </>
  );
}
