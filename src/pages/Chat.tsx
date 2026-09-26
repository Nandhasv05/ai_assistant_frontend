import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader.tsx";
import { ChatWindow } from "../components/ChatWindow.tsx";
import { CommandBar } from "../components/CommandBar.tsx";
import { ContextPanel } from "../components/ContextPanel.tsx";
import { Sidebar } from "../components/Sidebar.tsx";
import { contextFacts, DEFAULT_COMMAND_SUGGESTIONS, extractOrder, followUpsFor } from "../lib/copilot.ts";
import { newId } from "../lib/id.ts";
import { getModule } from "../lib/modules.ts";
import { fetchHealth, sendChatMessage } from "../services/api.ts";
import type { ChatMessage, Conversation, WorkspaceId } from "../types.ts";

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
  const [contextOpen, setContextOpen] = useState(true);
  const [health, setHealth] = useState<"checking" | "ok" | "down">("checking");
  const [lastSapOkAt, setLastSapOkAt] = useState<string | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (!conversations.some((conversation) => conversation.id === activeId)) {
      setActiveId(conversations[0]?.id ?? createConversation().id);
    }
  }, [activeId, conversations]);

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

  const active = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];
  const lastSync = syncLabel(lastSapOkAt);
  const order = extractOrder(active?.messages ?? []);
  const facts = contextFacts(active?.messages ?? []);
  const commandSuggestions = useMemo(() => {
    if (!active?.messages.length) return DEFAULT_COMMAND_SUGGESTIONS;
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
    setConversations((current) => {
      const remaining = current.filter((conversation) => conversation.id !== id);
      return remaining.length > 0 ? remaining : [createConversation()];
    });
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

    try {
      const reply = await sendChatMessage(trimmed, history);
      const assistantMessage: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: reply.message,
        view: reply.view,
        suggestions: reply.suggestions,
      };
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

  const module = workspace === "overview" ? undefined : getModule(workspace);
  const heading = module ? `${module.name} Intelligence` : "Fabric & Sales Intelligence";

  return (
    <div className={`app-shell ${contextOpen ? "has-context" : ""}`}>
      <AppHeader
        title="AI Copilot"
        subtitle={heading}
        health={health}
        lastSync={lastSync}
        contextOpen={contextOpen}
        onMenu={() => setSidebarOpen(true)}
        onToggleContext={() => setContextOpen((open) => !open)}
      />
      <Sidebar
        conversations={conversations}
        activeId={active?.id ?? ""}
        workspace={workspace}
        open={sidebarOpen}
        health={health}
        lastSync={lastSync}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => startNewChat()}
        onSelect={selectChat}
        onRename={renameChat}
        onDelete={deleteChat}
        onPin={pinChat}
        onOpenWorkspace={openWorkspace}
      />
      <main className="main-stage">
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
        />
      </main>
      <ContextPanel
        open={contextOpen}
        workspace={workspace}
        order={order}
        facts={facts}
        onAction={(question) => void sendMessage(question)}
        onClose={() => setContextOpen(false)}
      />
    </div>
  );
}
