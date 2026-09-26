import { APP_MODULES } from "./modules.ts";
import type { ReplySuggestion } from "../types.ts";

const PERIODS: ReplySuggestion[] = [
  { label: "Today", question: "today" },
  { label: "This week", question: "this week" },
  { label: "This month", question: "this month" },
  { label: "Last month", question: "last month" },
  { label: "This year", question: "this year" },
];

const METRICS: ReplySuggestion[] = [
  { label: "By amount", question: "by amount" },
  { label: "By quantity", question: "by quantity" },
  { label: "By orders", question: "by number of orders" },
];

export const QUICK_ASKS: ReplySuggestion[] = APP_MODULES.flatMap((module) => module.actions.slice(0, 1));

export function fallbackSuggestions(content: string, hasView: boolean): ReplySuggestion[] {
  if (/Which period/.test(content)) return PERIODS;
  if (/amount, quantity, or number of orders/.test(content)) return METRICS;
  if (/sales order number for/.test(content)) {
    return [
      { label: "Order 42003", question: "42003" },
      { label: "Order 43002", question: "43002" },
    ];
  }
  if (hasView) {
    return [
      { label: "Compare last month", question: "Compare that with last month" },
      { label: "Download PDF", question: "Make this a PDF" },
      { label: "Quotations", question: "This month's quotations" },
      { label: "Materials", question: "Materials created this month" },
    ];
  }
  if (/do not have enough information|what can you do|across Sales/i.test(content)) return QUICK_ASKS;
  return [];
}
