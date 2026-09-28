import { APP_MODULES } from "./modules.ts";
import type { AssistantView, ChatMessage, ReplySuggestion, WorkspaceId } from "../types.ts";

export const LANDING_CARDS = [
  { label: "Analyze Sales", question: "This month's sales summary", module: "sales" as const },
  { label: "Track Procurement", question: "View procurement details for a sales order", module: "procurement" as const },
  { label: "Check Materials", question: "Materials created this month", module: "materials" as const },
  { label: "Analyze BOM", question: "Show BOM components for a sales order", module: "bom" as const },
  { label: "Review Fabric", question: "Show fabric utilization for a sales order", module: "fabric" as const },
  { label: "Quotation Insights", question: "This month's quotations", module: "quotations" as const },
  { label: "Production Overview", question: "Show pending sales orders this month", module: "sales" as const },
];

export const LANDING_EXAMPLES = [
  "Which sales orders have pending deliveries this month?",
  "Show pending procurement for this month.",
  "Materials created this month.",
  "Compare this month's quotations with last month.",
  "Show BOM components for an active sales order.",
];

export const DEFAULT_COMMAND_SUGGESTIONS = [
  { label: "Analyze sales order 42003", question: "Show sales order 42003" },
  { label: "Show pending materials", question: "Materials created this month" },
  { label: "Compare fabric utilization", question: "Show fabric utilization for a sales order" },
];

export const WORKSPACE_CHIPS: ReplySuggestion[] = [
  { label: "Sales Order Analysis", question: "This month's sales summary" },
  { label: "Fabric Utilization", question: "Show fabric utilization for a sales order" },
  { label: "Pending Procurement", question: "View procurement details for a sales order" },
  { label: "Material Availability", question: "Materials created this month" },
  { label: "BOM Analysis", question: "Show BOM components for a sales order" },
  { label: "Quotation Conversion", question: "This month's quotations" },
  { label: "Production Status", question: "Show pending sales orders this month" },
];

export const PROCESS_STEPS = ["Sales Order", "BOM", "Materials", "Procurement", "Fabric", "Production"];

export const LOADING_STEPS = [
  "Connecting to SAP…",
  "Fetching business data…",
  "Analyzing records…",
  "Generating insights…",
];

export const SNAPSHOT_QUERY: Partial<Record<WorkspaceId, string>> = {
  overview: "This month's sales summary",
  sales: "This month's sales summary",
  quotations: "This month's quotations",
  materials: "Materials created this month",
};

export function kpiLines(value: string): string[] {
  const parts = value.split(/,\s+(?=[A-Z]{3}\s)/);
  return parts.length > 0 ? parts : [value];
}

export function factsFromView(view?: AssistantView | null): Array<{ label: string; value: string }> {
  if (!view) return [];
  const facts = view.kpis.slice(0, 6).map((kpi) => ({ label: kpi.label, value: kpi.value }));
  if (view.provenance) {
    facts.push({ label: "Records", value: view.provenance.recordCount.toLocaleString("en-US") });
    facts.push({ label: "Period", value: view.provenance.period });
  }
  return facts;
}

export function isEmptyAnswer(content: string): boolean {
  return /no records were found|no quotations were found|no sales records were found/i.test(content);
}

export function recommendedActions(module: WorkspaceId, view?: AssistantView): ReplySuggestion[] {
  const utilKind = module === "fabric" || module === "trims" ? module : /^(fabric|trims)\b/i.exec(view?.title ?? "")?.[1]?.toLowerCase();
  if (utilKind === "fabric" || utilKind === "trims") {
    const name = utilKind === "fabric" ? "Fabric" : "Trims";
    const other = utilKind === "fabric" ? "trims" : "fabric";
    const order = view?.title.match(/Sales order (\d{4,12})/i)?.[1];
    if (order) {
      return [
        { label: `${other === "fabric" ? "Fabric" : "Trims"} for ${order}`, question: `Show ${other} utilization for ${order}` },
        { label: "BOM components", question: `Show BOM components for ${order}` },
        { label: "Sales order details", question: `Show sales order ${order}` },
        { label: `${name} dashboard`, question: `${name} dashboard this month` },
      ];
    }
    return [
      { label: `${name} last month`, question: `${name} dashboard last month` },
      { label: `${other === "fabric" ? "Fabric" : "Trims"} dashboard`, question: `${other} dashboard this month` },
      { label: "Export report", question: "Make this a PDF" },
    ];
  }
  if (module === "sales" || view?.mode === "dashboard" || view?.mode === "report") {
    return [
      { label: "Compare last month", question: "Compare that with last month" },
      { label: "Pending orders", question: "Show pending sales orders" },
      { label: "By plant", question: "Sales by plant" },
      { label: "Export report", question: "Make this a PDF" },
    ];
  }
  if (module === "bom") {
    return [
      { label: "View procurement", question: "View procurement details for a sales order" },
      { label: "View fabric", question: "Show fabric utilization for a sales order" },
      { label: "View materials", question: "Materials created this month" },
    ];
  }
  if (module === "procurement") {
    return [
      { label: "View BOM", question: "Show BOM components for a sales order" },
      { label: "View materials", question: "Materials created this month" },
    ];
  }
  const first = APP_MODULES.find((item) => item.id === module)?.actions.slice(0, 3) ?? [];
  return [...first, { label: "Export report", question: "Make this a PDF" }];
}

export function followUpsFor(module: WorkspaceId, lastUser?: string): ReplySuggestion[] {
  const order = lastUser?.match(/\b(\d{4,12})\b/)?.[1];
  if (order) {
    return [
      { label: "Fabric utilization", question: `Show fabric utilization for ${order}` },
      { label: "Trims utilization", question: `Show trims utilization for ${order}` },
      { label: "BOM", question: `Show BOM components for ${order}` },
      { label: "Procurement", question: `View procurement details for ${order}` },
      { label: "Sales details", question: `Show sales order ${order}` },
    ];
  }
  return recommendedActions(module);
}

export function insightFrom(view?: AssistantView, content?: string): string | null {
  if (view?.note) return view.note;
  if (view?.bullets?.length) return view.bullets.join(" ");
  if (view?.kpis.length) {
    return view.kpis.map((kpi) => `${kpi.label}: ${kpi.value}`).join(". ") + ".";
  }
  if (content && !isEmptyAnswer(content) && content.length < 400) return content;
  return null;
}

export function extractOrder(messages: ChatMessage[]): string | null {
  for (const message of [...messages].reverse()) {
    const match = `${message.content} ${message.view?.title ?? ""} ${message.view?.provenance?.period ?? ""}`.match(
      /\b(\d{5,12})\b/,
    );
    if (match) return match[1];
  }
  return null;
}

export function contextFacts(messages: ChatMessage[], fallback?: AssistantView | null): Array<{ label: string; value: string }> {
  const lastView = [...messages].reverse().find((message) => message.view)?.view ?? fallback;
  return factsFromView(lastView);
}
