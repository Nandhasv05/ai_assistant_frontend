import { useEffect, useMemo, useRef, useState } from "react";
import { ChatWindow } from "../components/ChatWindow.tsx";
import { CommandBar } from "../components/CommandBar.tsx";
import { Sidebar } from "../components/Sidebar.tsx";
import { followUpsFor, SNAPSHOT_QUERY } from "../lib/copilot.ts";
import { newId } from "../lib/id.ts";
import { fetchHealth, sendChatMessage } from "../services/api.ts";
import type { AssistantView, ChatMessage, Conversation, WorkspaceId } from "../types.ts";

const STORAGE_KEY = "ai-assistant.conversations";

function createConversation(module?: Exclude<WorkspaceId, "overview">): Conversation {
  return {
    id: newId(),
    title: "New conversation",
    messages: [],
    updatedAt: new Date().toISOString(),
    module,
  };
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createConversation()];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [createConversation()];
    return parsed;
  } catch {
    return [createConversation()];
  }
}

function syncLabel(iso?: string | null): string {
  if (!iso) return "Last synchronized: waiting";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Last synchronized: waiting";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "Last synchronized: just now";
  return `Last synchronized: ${minutes} min ago`;
}

export function Chat() {
  const [boot] = useState(() => {
    const loaded = loadConversations();
    return { conversations: loaded, activeId: loaded[0].id };
  });
  const [conversations, setConversations] = useState<Conversation[]>(boot.conversations);
  const [activeId, setActiveId] = useState(boot.activeId);
  const [workspace, setWorkspace] = useState<WorkspaceId>("overview");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<"checking" | "ok" | "down">("checking");
  const [lastSapOkAt, setLastSapOkAt] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Partial<Record<WorkspaceId, AssistantView>>>({});
  const [, setSnapshotLoading] = useState(false);
  const sendingRef = useRef(false);
  const snapshotInflight = useRef<WorkspaceId | null>(null);

  useEffect(() => {
    const slim = conversations.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) => {
        const util = message.view?.utilization;
        if (!message.view || !util || util.scope !== "summary" || !util.lines) return message;
        return { ...message, view: { ...message.view, utilization: { ...util, lines: undefined } } };
      }),
    }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      // History is best-effort; a full quota must not break the chat.
    }
  }, [conversations]);

  useEffect(() => {
    let cancelled = false;
    async function ping(): Promise<void> {
      try {
        const status = await fetchHealth();
        if (cancelled) return;
        setHealth(status.ok ? "ok" : "down");
        setLastSapOkAt(status.lastSapOkAt ?? null);
      } catch {
        if (!cancelled) setHealth("down");
      }
    }
    void ping();
    const timer = window.setInterval(() => void ping(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const query = SNAPSHOT_QUERY[workspace];
    if (!query || snapshots[workspace] || snapshotInflight.current === workspace) return;
    snapshotInflight.current = workspace;
    setSnapshotLoading(true);
    let cancelled = false;
    void sendChatMessage(query, [])
      .then((reply) => {
        if (cancelled || !reply.view) return;
        setSnapshots((current) => ({ ...current, [workspace]: reply.view }));
      })
      .catch(() => undefined)
      .finally(() => {
        if (snapshotInflight.current === workspace) snapshotInflight.current = null;
        if (!cancelled) setSnapshotLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace, snapshots]);

  const active = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];
  const lastSync = syncLabel(lastSapOkAt);
  const commandSuggestions = useMemo(() => {
    if (!active?.messages.length) return [];
    if (active.messages.at(-1)?.view?.utilization) return [];
    return followUpsFor(workspace, active.messages.at(-1)?.content);
  }, [workspace, active]);

  function startNewChat(module = workspace === "overview" ? undefined : workspace) {
    const conversation = createConversation(module);
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setDraft("");
    setSidebarOpen(false);
    if (module) setWorkspace(module);
    else setWorkspace("overview");
  }

  function selectChat(id: string) {
    const conversation = conversations.find((item) => item.id === id);
    setActiveId(id);
    setWorkspace(conversation?.module ?? "overview");
    setSidebarOpen(false);
  }

  function openWorkspace(id: WorkspaceId) {
    setWorkspace(id);
    setSidebarOpen(false);
    if (id === "overview") return;
    if (active?.messages.length) {
      startNewChat(id);
      return;
    }
    setConversations((current) =>
      current.map((conversation) => (conversation.id === active?.id ? { ...conversation, module: id } : conversation)),
    );
  }

  function renameChat(id: string, title: string) {
    const next = title.trim().slice(0, 64);
    if (!next) return;
    setConversations((current) =>
      current.map((conversation) => (conversation.id === id ? { ...conversation, title: next } : conversation)),
    );
  }

  function deleteChat(id: string) {
    const remaining = conversations.filter((conversation) => conversation.id !== id);
    const next = remaining.length > 0 ? remaining : [createConversation()];
    setConversations(next);
    if (activeId === id) {
      setActiveId(next[0].id);
      setWorkspace(next[0].module ?? "overview");
    }
  }

  function pinChat(id: string) {
    setConversations((current) =>
      current.map((conversation) => (conversation.id === id ? { ...conversation, pinned: !conversation.pinned } : conversation)),
    );
  }

  async function sendMessage(text: string, replaceFromId?: string, module = workspace) {
    const trimmed = text.trim();
    if (!trimmed || !active || sendingRef.current) return;
    if (module !== "overview") setWorkspace(module);

    const replaceIndex = replaceFromId ? active.messages.findLastIndex((message) => message.id === replaceFromId) : -1;
    const baseMessages = replaceIndex >= 0 ? active.messages.slice(0, replaceIndex) : active.messages;
    const history = baseMessages
      .filter((message) => !message.error)
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content }));

    const userMessage: ChatMessage = { id: newId(), role: "user", content: trimmed };
    sendingRef.current = true;
    setLoading(true);
    setDraft("");
    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== active.id) return conversation;
        const priorIndex = replaceFromId ? conversation.messages.findLastIndex((message) => message.id === replaceFromId) : -1;
        const prior = priorIndex >= 0 ? conversation.messages.slice(0, priorIndex) : conversation.messages;
        const hasUserMessage = prior.some((message) => message.role === "user");
        return {
          ...conversation,
          title: hasUserMessage ? conversation.title : trimmed.slice(0, 56),
          messages: [...prior, userMessage],
          updatedAt: new Date().toISOString(),
          module: module === "overview" ? conversation.module : module,
        };
      }),
    );

    const scoped =
      (module === "fabric" || module === "trims") &&
      !/\b(fabrics?|trims?)\b/i.test(trimmed) &&
      (/^\d{4,12}$/.test(trimmed) || /\b(dashboard|summary|overview|totals?|report|this month|last month|this week|last week)\b/i.test(trimmed));
    const outgoing = scoped ? `${module} ${trimmed}` : trimmed;

    try {
      const reply = await sendChatMessage(outgoing, history);
      const assistantMessage: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: reply.message,
        view: reply.view,
        suggestions: reply.suggestions,
      };
      if (reply.view) {
        const view = reply.view;
        const snapshotModule = module === "overview" ? workspace : module;
        setSnapshots((current) => ({ ...current, [snapshotModule]: view }));
      }
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === active.id
            ? { ...conversation, messages: [...conversation.messages, assistantMessage], updatedAt: new Date().toISOString() }
            : conversation,
        ),
      );
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: error instanceof Error ? error.message : "The request could not be completed.",
        error: true,
      };
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === active.id
            ? { ...conversation, messages: [...conversation.messages, assistantMessage], updatedAt: new Date().toISOString() }
            : conversation,
        ),
      );
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  }

  function regenerate() {
    const lastUser = [...(active?.messages ?? [])].reverse().find((message) => message.role === "user");
    if (!lastUser) return;
    void sendMessage(lastUser.content, lastUser.id);
  }

  return (
    <div className="app-shell">
      <Sidebar
        conversations={conversations}
        activeId={active?.id ?? ""}
        workspace={workspace}
        open={sidebarOpen}
        health={health}
        lastSync={lastSync}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
        onNewChat={() => startNewChat()}
        onSelect={selectChat}
        onRename={renameChat}
        onDelete={deleteChat}
        onPin={pinChat}
        onOpenWorkspace={openWorkspace}
      />
      <div className="app-column">
        <main className={`main-stage ${!(active?.messages.length) && !loading ? "is-landing" : ""}`}>
          <ChatWindow
            messages={active?.messages ?? []}
            loading={loading}
            workspace={workspace}
            onAsk={(question, nextModule) => void sendMessage(question, undefined, nextModule ?? workspace)}
            onRetry={regenerate}
          />
          <CommandBar
            value={draft}
            disabled={loading}
            workspace={workspace}
            suggestions={commandSuggestions}
            onChange={setDraft}
            onSend={() => void sendMessage(draft)}
            onQuickAsk={(question) => void sendMessage(question)}
            onUpload={(file) => {
              setDraft((current) => {
                const note = `Analyze uploaded file: ${file.name}`;
                return current.trim() ? `${current.trim()}\n${note}` : note;
              });
            }}
          />
        </main>
      </div>
    </div>
  );
}
