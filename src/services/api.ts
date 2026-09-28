import { newId } from "../lib/id.ts";
import type { AssistantView, ReplySuggestion, Role } from "../types.ts";

export interface ChatHistoryItem {
  role: Role;
  content: string;
}

interface ChatSuccess {
  success: true;
  message: string;
  view?: AssistantView | null;
  suggestions?: ReplySuggestion[];
}

export interface ChatReply {
  message: string;
  view?: AssistantView;
  suggestions?: ReplySuggestion[];
}

export interface HealthStatus {
  ok: boolean;
  sapConfigured: boolean;
  lastSapOkAt?: string | null;
}

interface ChatFailure {
  success: false;
  message?: string;
}

function sessionId(): string {
  const key = "ai-assistant-session";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = newId();
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return "anonymous";
  }
}

const CONTEXT_KEY = "ai-assistant-ctx";

/** Signed portal identity token (?ctx=…) — kept for this tab only and removed from the address bar. */
function portalContext(): string | null {
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("ctx");
    if (fromUrl) {
      sessionStorage.setItem(CONTEXT_KEY, fromUrl);
      url.searchParams.delete("ctx");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      return fromUrl;
    }
    return sessionStorage.getItem(CONTEXT_KEY);
  } catch {
    return null;
  }
}

portalContext();

function apiPath(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function exportUrl(exportId: string, format: "pdf" | "xlsx" | "csv"): string {
  return apiPath(`/api/sales/export/${encodeURIComponent(exportId)}?format=${format}`);
}

export async function sendChatMessage(message: string, history: ChatHistoryItem[]): Promise<ChatReply> {
  let response: Response;
  try {
    response = await fetch(apiPath("/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(portalContext() ? { "X-Evolv-Context": portalContext()! } : {}) },
      body: JSON.stringify({ message, history, sessionId: sessionId() }),
    });
  } catch {
    throw new Error("Cannot reach the assistant API. Start the backend on port 5000 and try again.");
  }

  let payload: ChatSuccess | ChatFailure | null = null;
  try {
    payload = (await response.json()) as ChatSuccess | ChatFailure;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true || typeof payload.message !== "string") {
    const fallback = payload && "message" in payload && payload.message
      ? payload.message
      : "The assistant could not complete this request.";
    throw new Error(fallback);
  }

  return {
    message: payload.message,
    view: payload.view && Array.isArray(payload.view.columns) ? payload.view : undefined,
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : undefined,
  };
}

export async function fetchHealth(): Promise<HealthStatus> {
  const response = await fetch(apiPath("/api/health"));
  const payload = (await response.json()) as { success?: boolean; sapConfigured?: boolean; lastSapOkAt?: string | null };
  return {
    ok: response.ok && payload.success === true,
    sapConfigured: payload.sapConfigured === true,
    lastSapOkAt: payload.lastSapOkAt,
  };
}
