import { useEffect, useMemo, useRef, useState } from "react";
import { insightFrom, kpiLines, PROCESS_STEPS, recommendedActions } from "../lib/copilot.ts";
import { NavIcon } from "./NavIcon.tsx";
import { exportUrl } from "../services/api.ts";
import { downloadPdf } from "../services/pdf.ts";
import { MiniChart } from "./MiniChart.tsx";
import { UtilizationView } from "./UtilizationView.tsx";
import type { AssistantView, WorkspaceId } from "../types.ts";

const MODE_LABEL: Record<AssistantView["mode"], string> = {
  count: "KPI",
  report: "Report",
  details: "Document",
  table: "Data table",
  pdf: "Export",
  dashboard: "Dashboard",
  comparison: "Comparison",
  chart: "Trend",
};

const FORMAT_LABEL: Record<"pdf" | "xlsx" | "csv", string> = { pdf: "PDF", xlsx: "Excel", csv: "CSV" };
const PAGE_SIZE = 12;

interface ResultViewProps {
  view: AssistantView;
  workspace: WorkspaceId;
  onAsk?: (question: string) => void;
}

function relativeTime(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

function compareCells(a: string, b: string): number {
  const left = Number(a.replace(/[^0-9.-]/g, ""));
  const right = Number(b.replace(/[^0-9.-]/g, ""));
  if (!Number.isNaN(left) && !Number.isNaN(right) && a.trim() !== "" && b.trim() !== "") return left - right;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function DataTable({ columns, rows, footer }: { columns: string[]; rows: string[][]; footer?: string[] }) {
  const [sort, setSort] = useState<{ index: number; dir: 1 | -1 } | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [copied, setCopied] = useState(false);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((left, right) => compareCells(left[sort.index] ?? "", right[sort.index] ?? "") * sort.dir);
  }, [rows, sort]);
  const shown = sorted.slice(0, visible);

  return (
    <div className="table-block">
      <div className="table-tools">
        <span>
          {shown.length} of {sorted.length} rows
        </span>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            void navigator.clipboard.writeText(
              [columns.join("\t"), ...sorted.map((row) => row.join("\t")), ...(footer ? [footer.join("\t")] : [])].join("\n"),
            );
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? "Copied" : "Copy data"}
        </button>
      </div>
      <div className="result-table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={column}>
                  <button
                    type="button"
                    className="th-sort"
                    onClick={() => setSort((current) => ({ index, dir: current?.index === index && current.dir === 1 ? -1 : 1 }))}
                  >
                    {column}
                    {sort?.index === index ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, index) => (
              <tr key={`${index}-${row[0] ?? ""}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${columns[cellIndex] ?? cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && footer.length > 0 && (
            <tfoot>
              <tr>
                {footer.map((cell, index) => (
                  <td key={`${columns[index] ?? index}-foot`}>{cell}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {visible < sorted.length && (
        <button type="button" className="btn-secondary show-more" onClick={() => setVisible((current) => current + PAGE_SIZE)}>
          Show more
        </button>
      )}
    </div>
  );
}

export function ResultView({ view, workspace, onAsk }: ResultViewProps) {
  const downloaded = useRef(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const utilization = view.utilization;
  const manyItems = view.mode === "details" && view.rows.length > 12;
  const showTable =
    !utilization &&
    view.columns.length > 0 &&
    (manyItems || ["table", "report", "pdf", "dashboard", "comparison", "chart"].includes(view.mode));
  const showDetails = !utilization && view.mode === "details" && !manyItems;
  const showCounts = !utilization && view.kpis.length > 0;
  const charts = utilization ? [] : (view.charts ?? []);
  const sections = view.sections ?? [];
  const insight = insightFrom(view);
  const actions = recommendedActions(workspace, view);
  const formats = view.exportId ? (view.exportFormats ?? ["pdf"]) : [];
  const retrieved = view.provenance?.retrievedAt ?? view.updatedAt;
  const showFlow = !utilization && /sales order|fabric|bom|procurement/i.test(view.title);

  useEffect(() => {
    const fresh = !view.updatedAt || Date.now() - new Date(view.updatedAt).getTime() < 60_000;
    if (view.mode === "pdf" && fresh && !downloaded.current) {
      downloaded.current = true;
      downloadPdf(view);
    }
  }, [view]);

  return (
    <section className="response-card">
      <header className="response-head">
        <div>
          <p className="result-mode">{MODE_LABEL[view.mode]}</p>
          <h3>{view.title}</h3>
        </div>
        <div className="export-actions">
          <button type="button" className="btn-secondary" onClick={() => downloadPdf(view)}>
            Export PDF
          </button>
          {formats
            .filter((format) => format !== "pdf")
            .map((format) => (
              <a key={format} className="btn-secondary" href={exportUrl(view.exportId!, format)} download>
                Export {FORMAT_LABEL[format]}
              </a>
            ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const text = [view.title, ...view.kpis.map((kpi) => `${kpi.label}: ${kpi.value}`)].join("\n");
              void navigator.clipboard.writeText(text).then(() => {
                setShared(true);
                window.setTimeout(() => setShared(false), 1400);
              });
            }}
          >
            {shared ? "Copied" : "Share report"}
          </button>
        </div>
      </header>

      {showFlow && (
        <ol className="process-flow" aria-label="Business process">
          {PROCESS_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}

      {utilization && <UtilizationView data={utilization} onAsk={onAsk} />}

      {showCounts && (
        <div className="result-kpis">
          {view.kpis.map((kpi) => (
            <article key={kpi.label} className="kpi-card">
              <span className="kpi-label">{kpi.label}</span>
              <div className="kpi-values">
                {kpiLines(kpi.value).map((line) => (
                  <strong key={line} className={line.length > 12 ? "is-long" : undefined}>
                    {line}
                  </strong>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {charts.length > 0 && (
        <div className="chart-grid">
          {charts.map((chart, index) => (
            <MiniChart key={`${chart.title}-${index}`} chart={chart} />
          ))}
        </div>
      )}

      {showTable && <DataTable columns={view.columns} rows={view.rows} footer={view.footer} />}

      {sections.map((section) => (
        <div key={section.title} className="result-section">
          <h4>{section.title}</h4>
          {section.rows.length > 0 ? <DataTable columns={section.columns} rows={section.rows} /> : <p className="empty-inline">Insufficient data.</p>}
        </div>
      ))}

      {showDetails && (
        <div className="detail-list">
          {view.rows.map((row, index) => (
            <article key={`${index}-${row[0] ?? ""}`} className="detail-card">
              <div className="detail-grid">
                {view.columns.map((column, cellIndex) => (
                  <div key={column} className="detail-row">
                    <span>{column}</span>
                    <strong>{row[cellIndex] || "—"}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {!utilization && insight && (
        <aside className="insight-card">
          <div className="insight-head">
            <NavIcon name="insight" />
            <p>AI insight</p>
          </div>
          <strong>{insight}</strong>
        </aside>
      )}

      {!utilization && onAsk && (
        <div className="action-row">
          <span>Recommended actions</span>
          {actions.map((action) => (
            <button key={action.question} type="button" className="btn-secondary" onClick={() => onAsk(action.question)}>
              {action.label}
            </button>
          ))}
        </div>
      )}

      {!utilization && (
      <details className="source-box" open={sourceOpen} onToggle={(event) => setSourceOpen(event.currentTarget.open)}>
        <summary>How this answer was generated</summary>
        <dl>
          <div>
            <dt>Data source</dt>
            <dd>{view.source ?? "SAP S/4HANA"}</dd>
          </div>
          <div>
            <dt>Period / object</dt>
            <dd>{view.provenance?.period ?? "Current request"}</dd>
          </div>
          <div>
            <dt>Retrieved</dt>
            <dd>{relativeTime(retrieved) ?? "Just now"}</dd>
          </div>
          <div>
            <dt>Records</dt>
            <dd>{view.provenance?.recordCount?.toLocaleString("en-US") ?? view.rows.length}</dd>
          </div>
          <div>
            <dt>Calculation</dt>
            <dd>{view.provenance?.calculation ?? "Approved SAP read"}</dd>
          </div>
        </dl>
        {view.exportId ? (
          <a className="btn-secondary source-link" href={exportUrl(view.exportId, "csv")} download>
            View source data
          </a>
        ) : view.columns.length > 0 ? (
          <button
            type="button"
            className="btn-secondary source-link"
            onClick={() => {
              void navigator.clipboard.writeText([view.columns.join("\t"), ...view.rows.map((row) => row.join("\t"))].join("\n"));
            }}
          >
            View source data
          </button>
        ) : null}
      </details>
      )}
    </section>
  );
}
