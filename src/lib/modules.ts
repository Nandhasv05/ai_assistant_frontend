import type { ReplySuggestion } from "../types.ts";

export type ModuleId = "overview" | "sales" | "quotations" | "materials" | "procurement" | "bom" | "trims" | "fabric";

export interface AppModule {
  id: Exclude<ModuleId, "overview">;
  name: string;
  code: string;
  blurb: string;
  source: string;
  placeholder: string;
  actions: ReplySuggestion[];
}

export const APP_MODULES: AppModule[] = [
  {
    id: "sales",
    name: "Sales",
    code: "SD",
    blurb: "Orders, quantity, amount, plants, pending deliveries, trends, and reports.",
    source: "ZI_SalesApi_HUB",
    placeholder: "Ask for today’s orders, this month, a comparison, or a sales document…",
    actions: [
      { label: "Today", question: "How many sales orders today?" },
      { label: "This month", question: "This month's sales summary" },
      { label: "Dashboard", question: "This month's sales dashboard" },
      { label: "Report", question: "Show this month's sales report" },
      { label: "Compare", question: "Compare this month with last month" },
      { label: "Pending", question: "Show pending sales orders this month" },
      { label: "Top materials", question: "Top 10 materials this month" },
      { label: "By plant", question: "Sales by plant this month" },
    ],
  },
  {
    id: "quotations",
    name: "Quotations",
    code: "QT",
    blurb: "Quotation count, quantity, and value by period from live SAP.",
    source: "ZI_QuotationSalesOrder_HUB",
    placeholder: "Ask for this month’s quotations, last month, or this week…",
    actions: [
      { label: "This month", question: "This month's quotations" },
      { label: "Last month", question: "Last month's quotations" },
      { label: "This week", question: "This week's quotations" },
      { label: "Today", question: "Today's quotations" },
    ],
  },
  {
    id: "materials",
    name: "Materials",
    code: "MM",
    blurb: "Product master records created in a period, or a single product code.",
    source: "ZI_MaterialAPI_HUB",
    placeholder: "Ask for materials created this month, this week, or a product code…",
    actions: [
      { label: "This month", question: "Materials created this month" },
      { label: "This week", question: "Materials created this week" },
      { label: "Today", question: "Materials created today" },
    ],
  },
  {
    id: "procurement",
    name: "Procurement",
    code: "PR",
    blurb: "Component requirements and open quantity for a sales document.",
    source: "ProcurementDashboardSet",
    placeholder: "Enter a sales document number for procurement…",
    actions: [
      { label: "Ask for order", question: "View procurement details for a sales order" },
    ],
  },
  {
    id: "bom",
    name: "BOM / COOIS",
    code: "PP",
    blurb: "Bill of material components for a sales order.",
    source: "ZC_COOISComp_Hub",
    placeholder: "Enter a sales order number for BOM components…",
    actions: [
      { label: "Ask for order", question: "Show BOM components for a sales order" },
    ],
  },
  {
    id: "trims",
    name: "Trims",
    code: "TR",
    blurb: "Trims utilization: required, issued, and balance by sales order.",
    source: "TRIMS_UTILIZATIONSet",
    placeholder: "Enter a sales order number for trims utilization…",
    actions: [
      { label: "Ask for order", question: "Show trims utilization for a sales order" },
    ],
  },
  {
    id: "fabric",
    name: "Fabric",
    code: "FB",
    blurb: "Fabric utilization: required, issued, and balance by sales order.",
    source: "FABRIC_UTILIZATIONSet",
    placeholder: "Enter a sales order number for fabric utilization…",
    actions: [
      { label: "Ask for order", question: "Show fabric utilization for a sales order" },
    ],
  },
];

export function getModule(id: ModuleId): AppModule | undefined {
  return APP_MODULES.find((module) => module.id === id);
}

export function moduleTitle(id: ModuleId): string {
  if (id === "overview") return "Overview";
  return getModule(id)?.name ?? "Workspace";
}
