import { insightFrom, kpiLines } from "../lib/copilot.ts";
import type { AssistantView } from "../types.ts";
import { NavIcon } from "./NavIcon.tsx";

interface MetricStripProps {
  view?: AssistantView;
  loading?: boolean;
}

export function MetricStrip({ view, loading }: MetricStripProps) {
  if (loading && !view) {
    return (
      <div className="result-kpis snapshot-kpis" aria-busy="true">
        {["a", "b", "c"].map((key) => (
          <article key={key} className="kpi-card">
            <span className="skeleton" />
            <span className="skeleton" />
          </article>
        ))}
      </div>
    );
  }

  if (!view?.kpis.length) return null;
  const insight = insightFrom(view);

  return (
    <div className="snapshot-block">
      <div className="result-kpis snapshot-kpis">
        {view.kpis.map((kpi) => (
          <article key={kpi.label} className="kpi-card">
            <span className="kpi-label">{kpi.label}</span>
            <div className="kpi-values">
              {kpiLines(kpi.value).map((line) => (
                <strong key={line}>{line}</strong>
              ))}
            </div>
          </article>
        ))}
      </div>
      {insight && (
        <aside className="insight-card">
          <div className="insight-head">
            <NavIcon name="insight" />
            <p>AI insight</p>
          </div>
          <strong>{insight}</strong>
        </aside>
      )}
    </div>
  );
}
