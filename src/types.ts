export type Role = "user" | "assistant";

export type AssistantViewMode = "count" | "report" | "details" | "table" | "pdf" | "dashboard" | "comparison" | "chart";

export interface ChartSpec {
  title: string;
  kind: "bar" | "line";
  labels: string[];
  series: Array<{ name: string; values: number[]; color?: string }>;
}

export interface AssistantView {
  mode: AssistantViewMode;
  title: string;
  kpis: Array<{ label: string; value: string }>;
  columns: string[];
  rows: string[][];
  charts?: ChartSpec[];
  sections?: Array<{ title: string; columns: string[]; rows: string[][] }>;
  bullets?: string[];
  source?: string;
  updatedAt?: string;
  note?: string;
  provenance?: { source: string; retrievedAt: string; period: string; recordCount: number; calculation: string };
  exportId?: string;
  exportFormats?: Array<"pdf" | "xlsx" | "csv">;
}

export interface ReplySuggestion {
  label: string;
  question: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  error?: boolean;
  view?: AssistantView;
  suggestions?: ReplySuggestion[];
}

export type WorkspaceId = "overview" | "sales" | "quotations" | "materials" | "procurement" | "bom" | "trims" | "fabric";

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
  module?: Exclude<WorkspaceId, "overview">;
  pinned?: boolean;
}
