export type Role = "user" | "assistant";

export type AssistantViewMode = "count" | "report" | "details" | "table" | "pdf" | "dashboard" | "comparison" | "chart";

export interface ChartSpec {
  title: string;
  kind: "bar" | "line" | "donut";
  labels: string[];
  series: Array<{ name: string; values: number[]; color?: string }>;
  colors?: string[];
}

export interface UtilizationTotals {
  orders: number;
  materials: number;
  lines: number;
  bom: number;
  planned: number;
  production: number;
  po: number;
  grn: number;
  issue: number;
}

export interface UtilizationLine {
  salesOrder: string;
  material: string;
  category: string;
  purchaseOrder: string;
  poLine: string;
  bom: number;
  planned: number;
  production: number;
  po: number;
  grn: number;
  issue: number;
  additionalOrders: string[];
}

export interface UtilizationOrder {
  salesOrder: string;
  materials: number;
  lines: number;
  bom: number;
  planned: number;
  production: number;
  po: number;
  grn: number;
  issue: number;
}

export interface UtilizationPayload {
  kind: "fabric" | "trims";
  scope: "order" | "summary";
  salesOrder?: string;
  period?: string;
  totals: UtilizationTotals;
  lines?: UtilizationLine[];
  orders?: UtilizationOrder[];
  mix?: { title: string; labels: string[]; values: number[] };
}

export interface AssistantView {
  mode: AssistantViewMode;
  title: string;
  kpis: Array<{ label: string; value: string }>;
  columns: string[];
  rows: string[][];
  footer?: string[];
  charts?: ChartSpec[];
  utilization?: UtilizationPayload;
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
