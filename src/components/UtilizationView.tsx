import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Archive,
  CalendarClock,
  ChartColumn,
  ChartPie,
  ChevronsUpDown,
  Eraser,
  Factory,
  Funnel,
  Hash,
  Layers,
  LogOut,
  Network,
  Search,
  ShoppingBag,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { UtilizationLine, UtilizationOrder, UtilizationPayload, UtilizationTotals } from "../types.ts";

interface UtilizationViewProps {
  data: UtilizationPayload;
  onAsk?: (question: string) => void;
}

type QtyKey = "bom" | "planned" | "production" | "po" | "grn" | "issue";
type Highlight = "ge" | "lt" | null;

const QTY: Array<{ key: QtyKey; label: string; short: string; color: string; icon: ReactNode; tint: string }> = [
  { key: "bom", label: "BOM Qty", short: "BOM", color: "#0f766e", icon: <Network size={16} />, tint: "#e0f2fe" },
  { key: "planned", label: "Planned", short: "Planned", color: "#0284c7", icon: <CalendarClock size={16} />, tint: "#e0e7ff" },
  { key: "production", label: "Production", short: "Production", color: "#16a34a", icon: <Factory size={16} />, tint: "#dcfce7" },
  { key: "po", label: "PO Qty", short: "PO", color: "#d97706", icon: <ShoppingBag size={16} />, tint: "#ffedd5" },
  { key: "grn", label: "GRN Qty", short: "GRN", color: "#7c3aed", icon: <Archive size={16} />, tint: "#ede9fe" },
  { key: "issue", label: "Issue Qty", short: "Issue", color: "#e11d48", icon: <LogOut size={16} />, tint: "#ffe4e6" },
];

const MIX_COLORS = ["#0f766e", "#0284c7", "#7c3aed", "#d97706", "#16a34a", "#e11d48", "#0891b2", "#94a3b8"];

function qtyText(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function kpiText(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function kpiShort(value: number): string {
  if (value >= 10_000_000) return value.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
  return kpiText(value);
}

function axisText(value: number, compactFrom = 1_000_000): string {
  if (value >= compactFrom) return value.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function niceStep(max: number): number {
  const rough = max / 6;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1))));
  const n = rough / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

/** Same rule as the SAP report: BOM/planned/production/issue once per material; PO/GRN per line. */
function totalsOf(lines: UtilizationLine[]): UtilizationTotals {
  const totals: UtilizationTotals = { orders: 0, materials: 0, lines: lines.length, bom: 0, planned: 0, production: 0, po: 0, grn: 0, issue: 0 };
  const seen = new Set<string>();
  const orders = new Set<string>();
  for (const line of lines) {
    orders.add(line.salesOrder);
    totals.po += line.po;
    totals.grn += line.grn;
    const key = `${line.salesOrder}|${line.material}`;
    if (!line.material || seen.has(key)) continue;
    seen.add(key);
    totals.bom += line.bom;
    totals.planned += line.planned;
    totals.production += line.production;
    totals.issue += line.issue;
  }
  totals.materials = seen.size;
  totals.orders = orders.size;
  return totals;
}

function sumOrders(orders: UtilizationOrder[]): UtilizationTotals {
  return orders.reduce<UtilizationTotals>(
    (acc, order) => ({
      orders: acc.orders + 1,
      materials: acc.materials + order.materials,
      lines: acc.lines + order.lines,
      bom: acc.bom + order.bom,
      planned: acc.planned + order.planned,
      production: acc.production + order.production,
      po: acc.po + order.po,
      grn: acc.grn + order.grn,
      issue: acc.issue + order.issue,
    }),
    { orders: 0, materials: 0, lines: 0, bom: 0, planned: 0, production: 0, po: 0, grn: 0, issue: 0 },
  );
}

function TrendBadge({ value, bom, isBom }: { value: number; bom: number; isBom: boolean }) {
  if (isBom) {
    return (
      <span className="util-trend util-trend-target" title="Reference quantity">
        <Target size={11} />
      </span>
    );
  }
  if (bom <= 0) return null;
  const up = value >= bom;
  return (
    <span className={`util-trend ${up ? "util-trend-up" : "util-trend-down"}`} title={up ? "≥ BOM" : "< BOM"}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
    </span>
  );
}

function KpiRow({ totals, summary }: { totals: UtilizationTotals; summary: boolean }) {
  return (
    <div className={`util-kpis${summary ? " is-summary" : ""}`}>
      {summary && (
        <article className="util-kpi">
          <span className="util-kpi-icon" style={{ background: "#ccfbf1", color: "#0f766e" }}>
            <Hash size={16} />
          </span>
          <div>
            <strong>{kpiText(totals.orders)}</strong>
            <span>Sales orders</span>
          </div>
        </article>
      )}
      <article className="util-kpi">
        <span className="util-kpi-icon" style={{ background: "#ccfbf1", color: "#0f766e" }}>
          <Layers size={16} />
        </span>
        <div>
          <strong>{kpiText(totals.materials)}</strong>
          <span>Materials</span>
        </div>
      </article>
      {QTY.map((item) => (
        <article key={item.key} className="util-kpi" title={`${item.label}: ${kpiText(totals[item.key])}`}>
          <span className="util-kpi-icon" style={{ background: item.tint, color: item.color }}>
            {item.icon}
          </span>
          <div>
            <strong>
              {kpiShort(totals[item.key])}
              <TrendBadge value={totals[item.key]} bom={totals.bom} isBom={item.key === "bom"} />
            </strong>
            <span>{item.label}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function BarPanel({ totals }: { totals: UtilizationTotals }) {
  const [boxRef, W] = useElementWidth<HTMLDivElement>(600);
  const H = W < 420 ? 230 : 300;
  const left = W < 420 ? 50 : 70;
  const right = 16;
  const top = 16;
  const bottom = 36;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const peak = Math.max(1, ...QTY.map((item) => totals[item.key]));
  const step = niceStep(peak);
  const max = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  const slot = plotW / QTY.length;
  const barW = Math.min(46, slot * 0.5);

  return (
    <section className="util-panel">
      <header className="util-panel-head">
        <span className="util-panel-icon">
          <ChartColumn size={16} />
        </span>
        <div>
          <h4>Sale Order Quantity Utilization</h4>
          <p>BOM, planned, production, PO, GRN, and issue</p>
        </div>
      </header>
      <div ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="util-bar-svg" role="img" aria-label="Sale order quantity utilization">
        {ticks.map((tick) => {
          const y = top + plotH - (plotH * tick) / max;
          return (
            <g key={tick}>
              <line x1={left} x2={W - right} y1={y} y2={y} stroke="#e2e8f0" />
              <text x={left - 8} y={y + 4} textAnchor="end" className="util-axis">
                {axisText(tick, W < 420 ? 10_000 : 1_000_000)}
              </text>
            </g>
          );
        })}
        {QTY.map((item, index) => {
          const value = totals[item.key];
          const h = (plotH * value) / max;
          const x = left + slot * index + (slot - barW) / 2;
          const y = top + plotH - h;
          const r = Math.min(8, barW / 2, h);
          const path =
            h <= 0
              ? ""
              : `M${x},${top + plotH} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${top + plotH} Z`;
          return (
            <g key={item.key}>
              {path && (
                <path d={path} fill={item.color}>
                  <title>{`${item.short}: ${value.toLocaleString("en-US")}`}</title>
                </path>
              )}
              <text x={x + barW / 2} y={H - 12} textAnchor="middle" className="util-axis util-axis-x">
                {W < 420 && item.short === "Production" ? "Prod." : item.short}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
    </section>
  );
}

function DonutPanel({ mix }: { mix: NonNullable<UtilizationPayload["mix"]> }) {
  const total = mix.values.reduce((sum, value) => sum + Math.max(0, value), 0);
  const radius = 70;
  const stroke = 30;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <section className="util-panel">
      <header className="util-panel-head">
        <span className="util-panel-icon util-panel-icon-alt">
          <ChartPie size={16} />
        </span>
        <div>
          <h4>{mix.title}</h4>
          <p>Share of BOM quantity</p>
        </div>
      </header>
      <div className="util-donut">
        <svg viewBox="0 0 180 180" role="img" aria-label={mix.title}>
          {total > 0 &&
            mix.values.map((value, index) => {
              const length = (Math.max(0, value) / total) * circumference;
              const node = (
                <circle
                  key={`${mix.labels[index]}-${index}`}
                  cx={90}
                  cy={90}
                  r={radius}
                  fill="none"
                  stroke={MIX_COLORS[index % MIX_COLORS.length]}
                  strokeWidth={stroke}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 90 90)"
                >
                  <title>{`${mix.labels[index]}: ${value.toLocaleString("en-US")} (${Math.round((value / total) * 100)}%)`}</title>
                </circle>
              );
              offset += length;
              return node;
            })}
        </svg>
        <ul>
          {mix.labels.map((label, index) => (
            <li key={`${label}-${index}`}>
              <i style={{ background: MIX_COLORS[index % MIX_COLORS.length] }} />
              <span title={label}>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function OrderChips({ orders, onOpen }: { orders: string[]; onOpen: (order: string) => void }) {
  const [open, setOpen] = useState(false);
  if (orders.length === 0) return <span className="util-muted">—</span>;
  const shown = open ? orders : orders.slice(0, 3);
  return (
    <span className={open ? "util-chips is-open" : "util-chips"}>
      {shown.map((order) => (
        <button key={order} type="button" className="util-chip" onClick={() => onOpen(order)} title={`Open ${order}`}>
          {order}
        </button>
      ))}
      {orders.length > 3 && (
        <button type="button" className="util-chip util-chip-more" onClick={() => setOpen((value) => !value)}>
          {open ? "Less" : `+${orders.length - 3}`}
        </button>
      )}
    </span>
  );
}

interface Column<T> {
  key: string;
  label: string;
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  qty?: QtyKey;
  numeric?: boolean;
}

function cellClass<T>(column: Column<T>, row: T, highlight: Highlight, bomOf: (row: T) => number): string {
  if (!highlight || !column.qty || column.qty === "bom") return "";
  const value = Number(column.value(row));
  const bom = bomOf(row);
  if (bom <= 0) return "";
  if (highlight === "ge" && value >= bom) return "util-cell-ge";
  if (highlight === "lt" && value < bom) return "util-cell-lt";
  return "";
}

interface GroupOption<T> {
  key: string;
  label: string;
  get: (row: T) => string;
}

const PAGE = 150;

function UtilTable<T>({
  rows,
  columns,
  span,
  totalsFor,
  searchPlaceholder,
  noun,
  bomOf,
  groupOptions = [],
}: {
  rows: T[];
  columns: Array<Column<T>>;
  /** Columns covered by the "Total" label before the per-column totals start. */
  span: number;
  totalsFor: (rows: T[]) => string[];
  searchPlaceholder: string;
  noun: string;
  bomOf: (row: T) => number;
  groupOptions?: Array<GroupOption<T>>;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [highlight, setHighlight] = useState<Highlight>(null);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [groupKey, setGroupKey] = useState("none");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [limit, setLimit] = useState(PAGE);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((row) => {
      if (q && !columns.some((column) => String(column.value(row)).toLowerCase().includes(q))) return false;
      return columns.every((column) => {
        const f = filters[column.key]?.trim().toLowerCase();
        return !f || String(column.value(row)).toLowerCase().includes(f);
      });
    });
    if (sort) {
      const column = columns.find((item) => item.key === sort.key);
      if (column) {
        out = [...out].sort((a, b) => {
          const left = column.value(a);
          const right = column.value(b);
          if (typeof left === "number" && typeof right === "number") return (left - right) * sort.dir;
          return String(left).localeCompare(String(right), undefined, { numeric: true }) * sort.dir;
        });
      }
    }
    return out;
  }, [rows, columns, query, filters, sort]);

  const group = groupOptions.find((option) => option.key === groupKey);
  const groups = useMemo(() => {
    if (!group) return [];
    const map = new Map<string, T[]>();
    for (const row of visible) {
      const key = group.get(row) || "—";
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [group, visible]);
  const groupsOpenByDefault = visible.length <= 200;
  const trailing = Math.max(0, columns.length - span - totalsFor([]).length);

  const renderRow = (row: T, serial: number, key: string) => (
    <tr key={key}>
      {columns.map((column) => (
        <td key={column.key} className={cellClass(column, row, highlight, bomOf)}>
          {column.key === "sno" ? serial : column.render ? column.render(row) : column.value(row)}
        </td>
      ))}
    </tr>
  );

  let serial = 0;
  const body: ReactNode[] = [];
  if (group) {
    for (const [name, groupRows] of groups) {
      const open = openGroups[name] ?? groupsOpenByDefault;
      body.push(
        <tr key={`g-${name}`} className="util-group-row" onClick={() => setOpenGroups((current) => ({ ...current, [name]: !open }))}>
          <td colSpan={span}>
            <span className="util-group-caret">{open ? "▾" : "▸"}</span> {group.label}: <strong>{name}</strong>
            <span className="util-group-count">
              {groupRows.length} {noun}
            </span>
          </td>
          {totalsFor(groupRows).map((cell, index) => (
            <td key={index}>{cell}</td>
          ))}
          {trailing > 0 && <td colSpan={trailing} />}
        </tr>,
      );
      if (open) for (const row of groupRows.slice(0, 500)) body.push(renderRow(row, ++serial, `${name}-${serial}`));
    }
  } else {
    for (const row of visible.slice(0, limit)) body.push(renderRow(row, ++serial, `r-${serial}`));
  }

  return (
    <section className="util-panel util-table-panel">
      <div className="util-table-bar">
        <label className="util-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
        </label>
        <div className="util-table-actions">
          <span className="util-count">
            Showing {visible.length} of {rows.length} {noun}
          </span>
          <span className="util-legend">
            <button type="button" className={`util-legend-ge${highlight === "ge" ? " on" : ""}`} onClick={() => setHighlight((h) => (h === "ge" ? null : "ge"))}>
              <TrendingUp size={11} /> ≥ BOM
            </button>
            <button type="button" className={`util-legend-lt${highlight === "lt" ? " on" : ""}`} onClick={() => setHighlight((h) => (h === "lt" ? null : "lt"))}>
              <TrendingDown size={11} /> &lt; BOM
            </button>
          </span>
          {groupOptions.length > 0 && (
            <label className={`util-btn util-group-btn${group ? " util-btn-on" : ""}`}>
              <Layers size={14} /> Group By
              <select
                value={groupKey}
                onChange={(event) => {
                  setGroupKey(event.target.value);
                  setOpenGroups({});
                }}
              >
                <option value="none">None</option>
                {groupOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="util-btn" onClick={() => setExpanded((value) => !value)}>
            <ChevronsUpDown size={14} /> {expanded ? "Collapse Table" : "Expand Table"}
          </button>
          <button type="button" className={`util-btn${showFilters ? " util-btn-on" : ""}`} onClick={() => setShowFilters((value) => !value)}>
            <Funnel size={14} /> Column Filters
          </button>
        </div>
      </div>
      <div
        className={`util-table-wrap${expanded ? " expanded" : ""}`}
        onScroll={(event) => {
          const el = event.currentTarget;
          if (!group && limit < visible.length && el.scrollTop + el.clientHeight > el.scrollHeight - 240) setLimit((current) => current + PAGE);
        }}
      >
        <table className="util-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.numeric ? "num" : ""}>
                  <button
                    type="button"
                    onClick={() => setSort((current) => ({ key: column.key, dir: current?.key === column.key && current.dir === 1 ? -1 : 1 }))}
                  >
                    {column.label}
                    {sort?.key === column.key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
            {showFilters && (
              <tr className="util-filter-row">
                {columns.map((column, index) =>
                  index === 0 ? (
                    <th key={column.key}>
                      <button type="button" className="util-clear" title="Clear filters" onClick={() => setFilters({})}>
                        <Eraser size={13} />
                      </button>
                    </th>
                  ) : (
                    <th key={column.key}>
                      <input
                        value={filters[column.key] ?? ""}
                        onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))}
                        placeholder={`Filter ${column.label}…`}
                      />
                    </th>
                  ),
                )}
              </tr>
            )}
          </thead>
          <tbody>
            {body}
            {!group && limit < visible.length && (
              <tr>
                <td colSpan={columns.length} className="util-more">
                  <button type="button" className="util-btn" onClick={() => setLimit((current) => current + PAGE * 2)}>
                    Show more ({visible.length - limit} remaining)
                  </button>
                </td>
              </tr>
            )}
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="util-empty">
                  No {noun} match these filters.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={span}>
                Total ({visible.length.toLocaleString("en-US")} {noun})
              </td>
              {totalsFor(visible).map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
              {trailing > 0 && <td colSpan={trailing} />}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export function UtilizationView({ data, onAsk }: UtilizationViewProps) {
  const trims = data.kind === "trims";
  const summary = data.scope === "summary";
  const [category, setCategory] = useState("All");
  const lines = data.lines ?? [];
  const orders = data.orders ?? [];

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of lines) if (line.category) counts.set(line.category, (counts.get(line.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [lines]);

  const hasLines = lines.length > 0;
  const [tableMode, setTableMode] = useState<"lines" | "orders">(hasLines ? "lines" : "orders");
  const showLines = !summary || (hasLines && tableMode === "lines");
  const shownLines = useMemo(() => (category === "All" ? lines : lines.filter((line) => line.category === category)), [lines, category]);
  const totals = category === "All" || !hasLines ? data.totals : totalsOf(shownLines);
  const shownOrders = useMemo(() => {
    if (category === "All" || !hasLines) return orders;
    const map = new Map<string, UtilizationLine[]>();
    for (const line of shownLines) {
      const bucket = map.get(line.salesOrder);
      if (bucket) bucket.push(line);
      else map.set(line.salesOrder, [line]);
    }
    return [...map.entries()]
      .map(([salesOrder, rows]) => ({ salesOrder, ...totalsOf(rows) }))
      .sort((a, b) => b.bom - a.bom);
  }, [category, hasLines, orders, shownLines]);

  const openOrder = (order: string) => onAsk?.(`Show ${data.kind} utilization for ${order}`);
  const qtyColumns = <T extends Record<QtyKey, number>>(format: (value: number) => string): Array<Column<T>> =>
    QTY.map((item) => ({ key: item.key, label: item.label, value: (row: T) => row[item.key], render: (row: T) => format(row[item.key]), qty: item.key, numeric: true }));

  const lineColumns: Array<Column<UtilizationLine>> = [
    { key: "sno", label: "S.No", value: () => "" },
    ...(trims
      ? [
          {
            key: "category",
            label: "Category",
            value: (row: UtilizationLine) => row.category,
            render: (row: UtilizationLine) => (
              <span className="util-cat">
                <Tag size={11} /> {row.category}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "salesOrder",
      label: "Sales Order",
      value: (row) => row.salesOrder,
      render: (row) =>
        summary ? (
          <button type="button" className="util-so util-so-link" onClick={() => openOrder(row.salesOrder)} title="Open full report">
            {row.salesOrder}
          </button>
        ) : (
          <span className="util-so">{row.salesOrder}</span>
        ),
    },
    { key: "material", label: "Material", value: (row) => row.material, render: (row) => <strong className="util-mat">{row.material}</strong> },
    { key: "purchaseOrder", label: "Purchase Order", value: (row) => row.purchaseOrder },
    { key: "poLine", label: "PO Line", value: (row) => row.poLine },
    ...qtyColumns<UtilizationLine>(qtyText),
    {
      key: "additional",
      label: "Additional Sale Orders",
      value: (row) => row.additionalOrders.join(" "),
      render: (row) => <OrderChips orders={row.additionalOrders.filter((order) => order !== row.salesOrder)} onOpen={openOrder} />,
    },
  ];

  const orderColumns: Array<Column<UtilizationOrder>> = [
    { key: "sno", label: "S.No", value: () => "" },
    {
      key: "salesOrder",
      label: "Sales Order",
      value: (row) => row.salesOrder,
      render: (row) => (
        <button type="button" className="util-so util-so-link" onClick={() => openOrder(row.salesOrder)} title="Open full report">
          {row.salesOrder}
        </button>
      ),
    },
    { key: "materials", label: "Materials", value: (row) => row.materials, numeric: true },
    { key: "lines", label: "Lines", value: (row) => row.lines, numeric: true },
    ...qtyColumns<UtilizationOrder>(kpiText),
    {
      key: "issuePct",
      label: "Issue % of BOM",
      value: (row) => (row.bom > 0 ? Math.round((row.issue / row.bom) * 100) : 0),
      render: (row) => (row.bom > 0 ? `${Math.round((row.issue / row.bom) * 100)}%` : "—"),
      numeric: true,
    },
  ];

  const qtyFooter = (t: UtilizationTotals) => QTY.map((item) => kpiText(t[item.key]));
  const pctText = (t: UtilizationTotals) => (t.bom > 0 ? `${Math.round((t.issue / t.bom) * 100)}%` : "—");
  const lineGroups: Array<GroupOption<UtilizationLine>> = [
    ...(trims ? [{ key: "category", label: "Category", get: (row: UtilizationLine) => row.category }] : []),
    ...(summary ? [{ key: "salesOrder", label: "Sales Order", get: (row: UtilizationLine) => row.salesOrder }] : []),
    { key: "material", label: "Material", get: (row) => row.material },
    { key: "purchaseOrder", label: "Purchase Order", get: (row) => row.purchaseOrder },
  ];

  return (
    <div className={`util-view util-${data.kind}`}>
      {((summary && hasLines) || (trims && categories.length > 0)) && (
      <div className="util-toolbar">
        {summary && hasLines && (
          <div className="util-seg util-seg-sm" role="tablist" aria-label="Table view">
            <button type="button" role="tab" aria-selected={tableMode === "lines"} className={tableMode === "lines" ? "on" : ""} onClick={() => setTableMode("lines")}>
              All lines
            </button>
            <button type="button" role="tab" aria-selected={tableMode === "orders"} className={tableMode === "orders" ? "on" : ""} onClick={() => setTableMode("orders")}>
              By sales order
            </button>
          </div>
        )}
        {trims && categories.length > 0 && (
          <label className="util-cat-select">
            <Funnel size={13} />
            <span>Category:</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="All">All ({lines.length.toLocaleString("en-US")})</option>
              {categories.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count.toLocaleString("en-US")})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      )}

      <KpiRow totals={totals} summary={summary} />

      <div className="util-charts">
        <BarPanel totals={totals} />
        {data.mix && data.mix.labels.length > 0 && <DonutPanel mix={data.mix} />}
      </div>

      {showLines ? (
        <UtilTable
          key={`lines-${category}`}
          rows={shownLines}
          columns={lineColumns}
          span={trims ? 6 : 5}
          totalsFor={(rows) => qtyFooter(totalsOf(rows))}
          searchPlaceholder="Quick search table (Material, PO, Qty…)"
          noun="lines"
          bomOf={(row) => row.bom}
          groupOptions={lineGroups}
        />
      ) : (
        <UtilTable
          key={`orders-${category}`}
          rows={shownOrders}
          columns={orderColumns}
          span={2}
          totalsFor={(rows) => {
            const t = sumOrders(rows);
            return [kpiText(t.materials), kpiText(t.lines), ...qtyFooter(t), pctText(t)];
          }}
          searchPlaceholder="Quick search table (Sales order, Qty…)"
          noun="orders"
          bomOf={(row) => row.bom}
        />
      )}
    </div>
  );
}
